# Getting the board found

A web search on 19 October 2026 found no trace of the site. Three things stand
in its way, and only the last is already done in the repository.

1. **Crawlers never see the sitemap.** They read `robots.txt` only at the root
   of a host: `https://mobahug.github.io/robots.txt`. That address returns 404,
   because no repository serves the root of `mobahug.github.io`. The
   `Sitemap:` line in this site's own `robots.txt` (at `/The_AI_Timeline/`) is
   therefore never read.
2. **No search engine has been told the site exists.** Google and Bing both
   learn about a new site fastest when its owner adds it to their webmaster
   tools and submits the sitemap.
3. **Changes are not announced.** This one is done: since 19 October 2026 the
   deploy tells the IndexNow engines (Bing, Yandex, Seznam, Naver and others) which
   addresses each push changed (`scripts/indexnow.ts`, the `indexnow` job in
   `.github/workflows/deploy.yml`). Google does not take IndexNow.

Everything below is free. Steps A to C need your own accounts, so they are
yours to do. Each takes about five minutes.

## A. Serve a robots.txt at the root (`mobahug.github.io`)

1. On GitHub, create a **public** repository named exactly `mobahug.github.io`.
2. Add the two files in `docs/user-site/` to the root of that repository:
   - `robots.txt` allows every crawler and names this site's sitemap.
   - `index.html` is a plain page at `https://mobahug.github.io/` linking to the
     board. It replaces the 404 that is there now. Edit it freely, for example
     to list other projects later.
3. In the repository, open **Settings → Pages**, choose **Deploy from a branch**,
   then `main` and `/ (root)`.
4. When the page is up, `https://mobahug.github.io/robots.txt` should show the
   `Sitemap:` line.

## B. Google Search Console

1. Go to https://search.google.com/search-console and add a property of the
   **URL prefix** type: `https://mobahug.github.io/The_AI_Timeline/`.
   (A *Domain* property needs DNS access, which a `github.io` address does not give.)
2. Choose the **HTML file** method of verification and download the file Google
   offers (`google….html`).
3. Put that file in this repository's `public/` folder, unchanged. Commit and
   push. The build copies `public/` to the site's root.
4. Once the deploy has finished, press **Verify** in Search Console.
5. Under **Sitemaps**, submit `sitemap.xml`. Since 19 October 2026 the sitemap
   carries a `lastmod` for every card, lead, question and check.
6. Optionally, use **URL inspection** on the front page and on two or three
   dossiers, and press **Request indexing**.

## C. Bing Webmaster Tools

1. Go to https://www.bing.com/webmasters. Choose **Import from Google Search
   Console**, which carries over the verified site and its sitemap, or add the site
   by hand and verify it with the `BingSiteAuth.xml` file that Bing offers, put
   in `public/` like Google's.
2. There is nothing to do for IndexNow: the deploy already sends it, and the
   key file is `public/80c4d943af7bc06fc7d34b78a5a7fe3f.txt`.

## What to expect

New sites are usually discovered within days and indexed over a few weeks.
Search Console's **Pages** report shows which addresses are indexed, and why any
are not. The name "The AI Timeline" is shared with several other projects, so
the descriptive half of each page title ("an investigation board", a card's own
title) is what a search will mostly match on.
