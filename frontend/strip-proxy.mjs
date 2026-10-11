/*
  A thin server in front of `next start` that keeps the page source readable.

  The HTML Next.js sends carries every <script>, stylesheet <link> and the page-data
  scripts inline, which is what makes "view source" dense. This server takes them out of
  the HTML and leaves one small loader in their place. The loader adds the same stylesheets
  and scripts, in the same order, as soon as the page arrives, so the design and everything
  that moves behave as before.

  What it does NOT do: remove the `class` attributes. Those are what the stylesheet hangs
  its rules on, so the design needs them.

  Run (production only):

      npx next build
      npx next start -p 3100                      # Next itself, on a private port
      UPSTREAM=http://127.0.0.1:3100 node strip-proxy.mjs     # the public port, 3000

  STRIP_SOURCE   all (default): every visitor gets the lean source
                 bots: only search-engine crawlers do (browsers get the normal page)
                 off: pass everything through untouched

  The stripped scripts are kept in memory under a hash of their content and served from
  /__s/<hash>. Structured data (<script type="application/ld+json">) stays in the page,
  because that is content a crawler reads.
*/

import http from "node:http";
import crypto from "node:crypto";
import zlib from "node:zlib";

const PORT = Number(process.env.PORT ?? 3000);
const UPSTREAM = new URL(process.env.UPSTREAM ?? "http://127.0.0.1:3100");
const MODE = process.env.STRIP_SOURCE ?? "all";
const BOTS = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link|whatsapp|telegram|linkedinbot|twitterbot|pinterest|lighthouse|google-inspectiontool|ahrefs|semrush/i;

/** hash -> { type, body }. Scripts and styles cut out of pages, served back on request. */
const parts = new Map();
const MAX_PARTS = 5000;

function remember(type, body) {
  const hash = crypto.createHash("sha1").update(body).digest("base64url").slice(0, 16);
  if (!parts.has(hash)) {
    if (parts.size >= MAX_PARTS) parts.delete(parts.keys().next().value);
    parts.set(hash, { type, body });
  }
  return hash;
}

function attributes(text) {
  const out = {};
  for (const m of text.matchAll(/([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

/** The page with its scripts and stylesheets taken out and one loader put back. */
function lean(html) {
  const items = [];

  // Stylesheets, in their order. Same attributes, so React finds them where it expects.
  html = html.replace(/<link\b([^>]*?)\/?>/gi, (whole, raw) => {
    const a = attributes(raw);
    const rel = (a.rel ?? "").toLowerCase();
    if (rel === "stylesheet") {
      items.push(["l", a]);
      return "";
    }
    // Hints that only speed up loading the things above. The loader fetches them anyway.
    if (rel === "preload" || rel === "modulepreload" || rel === "prefetch") return "";
    return whole;
  });

  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, raw, body) => {
    const a = attributes(raw);
    const type = (a.type ?? "").toLowerCase();
    if (type === "application/ld+json" || type === "application/json" || type === "importmap") return whole;
    if ("nomodule" in a) return ""; // for browsers that no longer exist
    if (a.src) {
      const { src, id, crossorigin, nonce } = a;
      items.push(["s", { src, ...(id !== undefined && { id }), ...(crossorigin !== undefined && { crossorigin }), ...(nonce !== undefined && { nonce }) }]);
      return "";
    }
    if (body.trim() === "") return "";
    items.push(["s", { src: `/__s/${remember("js", body)}`, ...(a.id !== undefined && { id: a.id }) }]);
    return "";
  });

  // The loader. The page stays hidden until the stylesheets are in, so there is no flash of
  // unstyled content; then every script is added in its original order.
  const loader =
    "<script>(function(d,i){var h=d.documentElement,n=0,c=i.filter(function(e){return e[0]==='l'}),q=i.filter(function(e){return e[0]==='s'});" +
    "function m(t,a){var o=d.createElement(t);for(var p in a)o.setAttribute(p,a[p]);return o}" +
    "function go(){h.hidden=false;q.forEach(function(e){var o=m('script',e[1]);o.async=false;d.body.appendChild(o)})}" +
    "h.hidden=true;if(!c.length)return go();" +
    "c.forEach(function(e){var o=m('link',e[1]);o.onload=o.onerror=function(){if(++n===c.length)go()};d.head.appendChild(o)})" +
    `})(document,${JSON.stringify(items).replace(/</g, "\u003c")})</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${loader}</body>`) : html + loader;
}

function wantsLean(req) {
  if (MODE === "off") return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (req.headers.rsc || req.headers["next-router-state-tree"] || req.headers["next-action"]) return false;
  if (!(req.headers.accept ?? "").includes("text/html")) return false;
  if (MODE === "bots") return BOTS.test(req.headers["user-agent"] ?? "");
  return true;
}

function forward(req, res) {
  const lean_ = wantsLean(req);
  const headers = { ...req.headers, host: UPSTREAM.host };
  // The page is rewritten as text, so it has to arrive uncompressed. Everything else passes through as sent.
  if (lean_) headers["accept-encoding"] = "identity";

  const upstream = http.request(
    { hostname: UPSTREAM.hostname, port: UPSTREAM.port, method: req.method, path: req.url, headers },
    (back) => {
      const isHtml = lean_ && (back.headers["content-type"] ?? "").includes("text/html");
      if (!isHtml) {
        res.writeHead(back.statusCode, back.headers);
        back.pipe(res);
        return;
      }
      const chunks = [];
      back.on("data", (c) => chunks.push(c));
      back.on("end", () => {
        const body = Buffer.from(lean(Buffer.concat(chunks).toString("utf8")));
        const out = { ...back.headers };
        delete out["content-length"];
        delete out["transfer-encoding"];
        const accepts = req.headers["accept-encoding"] ?? "";
        if (/\bbr\b/.test(accepts)) {
          out["content-encoding"] = "br";
          out.vary = "Accept-Encoding";
          res.writeHead(back.statusCode, out);
          res.end(zlib.brotliCompressSync(body));
        } else if (/\bgzip\b/.test(accepts)) {
          out["content-encoding"] = "gzip";
          out.vary = "Accept-Encoding";
          res.writeHead(back.statusCode, out);
          res.end(zlib.gzipSync(body));
        } else {
          out["content-length"] = body.length;
          res.writeHead(back.statusCode, out);
          res.end(body);
        }
      });
    }
  );
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "content-type": "text/plain" });
    res.end("Bad gateway");
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    const m = /^\/__s\/([\w-]+)$/.exec(req.url ?? "");
    if (m) {
      const part = parts.get(m[1]);
      if (!part) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=3600" });
      return res.end(part.body);
    }
    forward(req, res);
  })
  .listen(PORT, () => console.log(`strip-proxy: :${PORT} -> ${UPSTREAM.origin} (STRIP_SOURCE=${MODE})`));
