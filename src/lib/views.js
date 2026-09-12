/* Every page the site has, in one list. The router, the header, the page titles
   and the sitemap all read from here, so a view is added or retired in one place.

   tab     — one of the three doors in the header
   parent  — the tab that stays lit while this page is open
   title / description — what the document carries for that route
   sitemap — listed for crawlers */

export const VIEWS = [
  { id: 'landing', label: 'The AI Timeline', sitemap: false },
  { id: 'line', label: 'The line', tab: true, sitemap: true,
    title: 'The line',
    description: 'How a machine that could not add became something governments argue about — the order it happened in, and where the trail goes cold.' },
  { id: 'finding', parent: 'line', sitemap: false },
  { id: 'case', parent: 'line', sitemap: true,
    title: 'The case as it stands',
    description: 'Where the board stands, the road here, and what the case does not do — derived from the data.' },
  { id: 'horizon', parent: 'line', sitemap: true,
    title: 'The horizon',
    description: 'The forward half of the board as three horizons: scenarios, not forecasts.' },
  { id: 'board', label: 'Board', tab: true, sitemap: true,
    title: 'The board',
    description: 'Photo cards, string connections, and a walkthrough that follows each causal chain clue by clue.' },
  { id: 'card', parent: 'board', sitemap: false },
  { id: 'archive', label: 'Archive', tab: true, sitemap: true,
    title: 'The archive',
    description: 'Every entry on the board in date order — dense, filterable, searchable.' },
  { id: 'plates', parent: 'archive', sitemap: true,
    title: 'The archive · plates',
    description: 'The archive as image-led plates, in date order.' },
  { id: 'mosaic', parent: 'archive', sitemap: true,
    title: 'The archive · mosaic',
    description: 'Every photograph on the board.' },
  { id: 'about', label: 'About', sitemap: true,
    title: 'About',
    description: 'How this board works, what a string means, and what it does not claim.' }
];

/** Retired view names keep working: every link ever shared still lands somewhere sensible. */
export const RETIRED = { index: 'archive' };

export const viewById = Object.fromEntries(VIEWS.map((v) => [v.id, v]));
export const VIEW_IDS = new Set(VIEWS.map((v) => v.id));
export const TABS = VIEWS.filter((v) => v.tab);
export const SITEMAP_VIEWS = VIEWS.filter((v) => v.sitemap).map((v) => v.id);

/** The header tab that belongs to a view — itself, or the tab it files under. */
export const tabOf = (id) => (viewById[id] && viewById[id].parent) || id;
