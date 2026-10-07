import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * The picture to show with an article, for server components.
 *
 * An article carries its own (uploaded in the admin, or shipped under /public). One that
 * has none falls back to a photo named after its slug if the site ships one, and otherwise
 * to nothing, so a page never points at a file that is not there.
 */
export function articleImage(slug: string, image?: string): string {
  if (image) return image;
  const shipped = `/images/articles/${slug}.jpg`;
  return existsSync(join(process.cwd(), "public", shipped)) ? shipped : "";
}
