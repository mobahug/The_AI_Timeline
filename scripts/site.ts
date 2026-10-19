// Where the site is served, for everything the build writes that names an
// address: the prerendered pages, the sitemap, the feed. GitHub Pages serves the
// project from /<repo>/ on the owner's host; BASE_PATH moves it, as it moves
// Vite's base (vite.config.ts).
export const HOST = 'https://mobahug.github.io';
export const BASE = process.env.BASE_PATH || '/The_AI_Timeline/';
/** The site's own address, ending in a slash. */
export const ORIGIN = HOST + BASE;
