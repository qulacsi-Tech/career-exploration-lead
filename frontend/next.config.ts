import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output for the Docker image (frontend/Dockerfile only).
  // Left off elsewhere: Vercel manages its own output and fails the build with it on.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

  // Hides the floating Next.js dev badge in the bottom-left corner. Compile and
  // runtime errors are still surfaced. Dev-only — it never shipped to prod.
  devIndicators: false,

  experimental: {
    // Admin image uploads go through a Server Action. The default 1 MB cap is
    // below the 4 MB the API accepts. Vercel itself caps a request body at 4.5 MB.
    serverActions: { bodySizeLimit: "5mb" },
  },

  images: {
    /*
      The card art under /public/images is authored in this repo and served
      from our own origin, so the usual reason the optimizer refuses SVG —
      remote, untrusted files can carry <script> — does not apply here.
      Without this every .svg 400s with "image type is not allowed" and the
      article, programme, university, data and banner art renders blank; only
      the .jpg photos survive.

      The two settings below keep the exemption narrow rather than trusting
      SVG wholesale: the CSP strips scripting from anything the optimizer
      returns, and the attachment disposition stops an SVG from being opened
      as a top-level document. Revisit if images ever start coming from user
      uploads or a remote host.
    */
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
