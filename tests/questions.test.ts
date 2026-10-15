import { describe, it, expect } from 'vitest';
import { QUESTIONS, questionById } from '../src/lib/questions';
import { leadById } from '../src/lib/leads';
import { buildGraph, NOW } from '../src/lib/data';
import { hrefFor, parse } from '../src/lib/url';
import { metaFor } from '../src/lib/meta';
import { tabOf } from '../src/lib/views';

const graph = buildGraph();

describe('plain questions are answered from the board', () => {
  it('has unique, stable ids', () => {
    expect(QUESTIONS.length).toBeGreaterThan(0);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    QUESTIONS.forEach((q) => expect(q.id, q.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });

  it('asks a question and answers it in short and in full', () => {
    QUESTIONS.forEach((q) => {
      expect(q.question.endsWith('?'), q.id).toBe(true);
      expect(q.short.length, q.id).toBeGreaterThan(40);
      expect(q.short.length, q.id).toBeLessThanOrEqual(260);
      expect(q.answer.length, q.id).toBeGreaterThan(0);
      q.answer.forEach((p) => expect(p.trim().length, q.id).toBeGreaterThan(0));
      expect(q.open.trim().length, q.id).toBeGreaterThan(0);
    });
  });

  it('rests every answer on cards that exist, once each, with a note', () => {
    QUESTIONS.forEach((q) => {
      expect(q.record.length, q.id).toBeGreaterThanOrEqual(3);
      expect(new Set(q.record.map((r) => r.event)).size, q.id).toBe(q.record.length);
      q.record.forEach((r) => {
        expect(graph.index[r.event], q.id + ' → ' + r.event).toBeTruthy();
        expect(r.note.trim().length, r.event).toBeGreaterThan(0);
      });
    });
  });

  it('rests mostly on the record, not on scenarios', () => {
    QUESTIONS.forEach((q) => {
      const record = q.record.filter((r) => graph.index[r.event].year <= NOW).length;
      expect(record, q.id).toBeGreaterThan(q.record.length / 2);
    });
  });

  it('points only to leads that exist', () => {
    QUESTIONS.forEach((q) => q.leads.forEach((l) => expect(leadById[l], q.id + ' → ' + l).toBeTruthy()));
  });

  it('has an address of its own, filed under the leads', () => {
    const q = QUESTIONS[0];
    expect(hrefFor({ view: 'questions' })).toBe('/questions/');
    expect(hrefFor({ view: 'question', id: q.id })).toBe('/question/' + q.id + '/');
    expect(parse('/question/' + q.id + '/')).toMatchObject({ view: 'question', id: q.id });
    expect(tabOf('question')).toBe('leads');
    expect(metaFor({ ...parse('/question/' + q.id + '/') }).title.startsWith(questionById[q.id].question)).toBe(true);
  });
});
