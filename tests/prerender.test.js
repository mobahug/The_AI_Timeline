import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from '../src/App.jsx';
import { parse } from '../src/lib/url.js';
import { LEADS } from '../src/lib/leads.js';

/* Every page renders on the server — no window, no document — and says what it
   is. This is what the prerenderer relies on, checked without a build. */

const render = (path) => renderToString(React.createElement(App, { initialRoute: parse(path, '', '') }));

describe('server rendering', () => {
  it('renders every kind of page with its heading', () => {
    const cases = [
      ['/', 'Everything that led here'],
      ['/line/', 'How a machine that could not add'],
      ['/line/3/', 'The field is named'],
      ['/case/', 'The case as it stands'],
      ['/horizon/', 'The horizon'],
      ['/board/', 'The board'],
      ['/card/chatgpt/', 'ChatGPT'],
      ['/leads/', 'Follow a lead'],
      ['/lead/' + LEADS[0].id + '/', LEADS[0].title],
      ['/archive/', 'Everything, in the order it happened'],
      ['/archive/plates/', 'Everything, in the order it happened'],
      ['/files/', 'Every name on the board'],
      ['/glossary/', 'The words the board uses'],
      ['/person/alan-turing/', 'Alan Turing'],
      ['/org/openai/', 'OpenAI'],
      ['/term/rlhf/', 'RLHF'],
      ['/about/', 'About the board']
    ];
    cases.forEach(([path, text]) => {
      const html = render(path);
      expect(html.includes('<h1'), path).toBe(true);
      expect(html.includes(text), path + ' should contain ' + text).toBe(true);
    });
  });

  it('lists every card on the static board, as links to dossiers', () => {
    const html = render('/board/');
    expect((html.match(/href="\/card\//g) || []).length).toBeGreaterThan(150);
  });

  it('says so when an address names nothing, without throwing', () => {
    expect(render('/card/no-such-card/')).toContain('No entry has the id');
    expect(render('/lead/no-such-lead/')).toContain('There is no lead');
    expect(render('/person/nobody/')).toContain('Nothing on file');
  });
});
