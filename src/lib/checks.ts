import raw from '../../data/checks.json?heads';
import type { CheckHead, Verdict } from './types';

/* Headline checks: one widely reported line about AI set beside what the
   primary account behind it — the lab's report, the filing, the law — actually
   says, quoted on both sides, with the board's cards it touches. A check adds
   no source the board does not keep: its primary accounts are on its cards.

   Every page may list a check from its head: the headline, the verdict, the
   reading in short and the cards it touches. The report, the primary accounts
   and the lines checked are its own pages' (bodies/checks.ts). */

export const CHECKS: CheckHead[] = raw.checks;
export const checkById: Record<string, CheckHead> = Object.fromEntries(CHECKS.map((c) => [c.id, c]));

/** The verdicts, best first. `rating` is the ClaimReview scale (4 best, 1 worst). */
export const VERDICTS: Record<Verdict, { label: string; rating: number; means: string }> = {
  stands: { label: 'Stands', rating: 4, means: 'The primary account says it.' },
  overtaken: { label: 'Overtaken', rating: 3, means: 'The primary account said it at the time, and has since revised it.' },
  misleading: { label: 'Misleading', rating: 2, means: 'Its facts are in the primary account; what it makes of them is not.' },
  contradicted: { label: 'Contradicted', rating: 1, means: 'The primary account says otherwise.' }
};
export const VERDICT_ORDER = Object.keys(VERDICTS) as Verdict[];

/** Every check that touches a card, with the note the check gives it. */
export const checksOf = (id: string): { check: CheckHead; note: string }[] =>
  CHECKS.flatMap((c) => c.record.filter((r) => r.event === id).map((r) => ({ check: c, note: r.note })));
