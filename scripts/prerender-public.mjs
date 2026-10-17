import { build } from "vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const project = resolve(import.meta.dirname, "..");
const temporary = join(project, "node_modules/.tmp/public-site-ssr");
const dist = join(project, "dist");
const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
try {
  await build({ root: project, logLevel: "warn", build: {
    ssr: "scripts/public-site-entry.ts", outDir: temporary, emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "public-site.mjs" } },
  } });
  const { PublicPage, publicPages } = await import(pathToFileURL(join(temporary, "public-site.mjs")).href);
  const template = await readFile(join(dist, "index.html"), "utf8");
  // The game has a separate empty root, including on static hosts with no rewrite rules.
  await mkdir(join(dist, "spelen"), { recursive: true });
  await writeFile(join(dist, "spelen/index.html"), template);
  for (const [path, meta] of Object.entries(publicPages)) {
    const url = `https://busbende.nl${path === "/" ? "/" : path + "/"}`;
    const markup = renderToString(createElement(PublicPage, { path }));
    const html = template.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escape(meta.description)}" />`)
      .replace("</head>", `    <link rel="canonical" href="${url}" />\n  </head>`)
      .replace('<div id="root"></div>', () => `<div id="root" data-bb-prerender="${path}">${markup}</div>`);
    if (!html.includes('data-bb-prerender=')) throw new Error(`Prerender root missing: ${path}`);
    const directory = path === "/" ? dist : join(dist, path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), html);
  }
  const paths = [...Object.keys(publicPages), "/privacy"];
  const urls = paths.map(path => `  <url><loc>https://busbende.nl${path === "/" ? "/" : path + "/"}</loc></url>`);
  await writeFile(join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
  await writeFile(join(dist, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: https://busbende.nl/sitemap.xml\n");
  console.log(`Prerendered ${Object.keys(publicPages).length} public pages, game entry and sitemap.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
