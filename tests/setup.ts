import PAPERS from '../data/events.json?papers';
import { primePapers } from '../src/lib/papers';
import { loadAll } from '../src/components/viewChunks';
import { loadRegister } from '../src/lib/corrections';

/* The server holds every card's papers from the start, and so do the tests:
   they read the board as the prerenderer does. tests/papers.test.ts takes them
   away again to read as a browser would. */
primePapers(PAPERS);
// Every page's chunk too, as the server holds them (components/viewChunks.ts),
// and every page of the corrections register (lib/corrections.ts).
await Promise.all([loadAll(), loadRegister()]);
