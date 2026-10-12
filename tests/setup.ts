import PAPERS from '../data/events.json?papers';
import { primePapers } from '../src/lib/papers';

/* The server holds every card's papers from the start, and so do the tests:
   they read the board as the prerenderer does. tests/papers.test.ts takes them
   away again to read as a browser would. */
primePapers(PAPERS);
