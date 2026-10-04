const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * The browser address for an uploaded image.
 *
 * The database keeps only the relative path (/api/uploads/...), so the files can
 * move to another disk or host without breaking saved pages. The path is served
 * by the API, so it is joined to the API's origin: the public domain behind the
 * reverse proxy on a server, or the API host when the site is hosted apart.
 * Anything that is not an upload path (the built-in /images art) is returned as is.
 */
export function mediaUrl(path: string): string {
  if (!path) return "";
  if (!path.startsWith("/api/")) return path;
  return `${API_BASE.replace(/\/api\/v1\/?$/, "")}${path}`;
}
