import PAPERS from '../data/events.json?papers';
import FORETOLD_FILE from '../data/predictions.json';
import { primePapers } from '../src/lib/papers';
import { primePredictions } from '../src/lib/predictions';
import type { Prediction } from '../src/lib/types';

/* The server holds every card's papers from the start, and so do the tests:
   they read the board as the prerenderer does. tests/papers.test.ts takes them
   away again to read as a browser would. */
primePapers(PAPERS);
primePredictions(FORETOLD_FILE.predictions as Prediction[]);
