import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";

const dist = resolve(import.meta.dirname, "../dist");
const paths = ["/", "/demo", "/spelregels", "/veelgestelde-vragen", "/over-busbende", "/verantwoord-spelen"];
const titles = new Set();
let checkedLinks = 0;
for (const path of paths) {
  const file = join(dist, path === "/" ? "index.html" : `${path.slice(1)}/index.html`);
  const html = await readFile(file, "utf8");
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${path}: one main heading`);
  assert(html.includes(`data-bb-prerender="${path}"`), `${path}: populated static root`);
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  assert(title && !titles.has(title), `${path}: unique page title`);
  titles.add(title);
  assert(html.includes('name="description"'), `${path}: description`);
  assert(html.includes(`rel="canonical" href="https://busbende.nl${path === "/" ? "/" : path + "/"}"`), `${path}: canonical`);
  assert(!/<script[^>]+src=["'][^"']*adsbygoogle/.test(html), `${path}: no global advertising loader`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#([^"\s]+))?"/g)) {
    const urlPath = match[1];
    const target = join(dist, urlPath.endsWith("/") ? `${urlPath.slice(1)}index.html` : urlPath.slice(1));
    await access(target.split("?")[0]);
    if (match[2]) {
      const targetHtml = await readFile(target, "utf8");
      assert(targetHtml.includes(`id="${match[2]}"`), `${path}: link anchor ${match[0]}`);
    }
    checkedLinks++;
  }
}
const rules = await readFile(join(dist, "spelregels/index.html"), "utf8");
for (const anchor of ["vier-kaarten", "boom", "bus", "voorbeelden", "instellingen"]) assert(rules.includes(`id="${anchor}"`));
const game = await readFile(join(dist, "spelen/index.html"), "utf8");
assert(game.includes('<div id="root"></div>'), "Game entry must not contain the public homepage");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, paths.length + 1);
assert((await readFile(join(dist, "robots.txt"), "utf8")).includes("https://busbende.nl/sitemap.xml"));
console.log(`PASS: ${paths.length} static pages, unique metadata, ${checkedLinks} local links/assets, rule anchors, separate game entry and sitemap.`);
