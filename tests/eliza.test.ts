import { describe, it, expect } from 'vitest';
import DOCTOR from '../src/lib/machines/doctor-1965.txt?raw';
import { Eliza, elizaUppercase, hash, lastChunk, match, readScript, reassemble } from '../src/lib/machines/eliza';

/* ELIZA as the board runs it must answer as Anthony Hay's C++ reconstruction
   does (github.com/anthay/ELIZA), given the same script and the same lines.
   The replies below are what that program printed, run with the 1965 DOCTOR
   script, on 19 October 2026. */

const HELLO =
"HOW DO YOU DO. I AM THE DOCTOR. PLEASE SIT DOWN AT THE TYPEWRITER AND TELL ME YOUR PROBLEM.";

const CONVERSATION: [string, string][] = [
  ["Everyone at work ignores me.", "REALLY, EVERYONE"],
  ["My manager never listens to my ideas.", "YOUR MANAGER NEVER LISTENS TO YOUR IDEAS"],
  ["I think my mother would understand.", "YOU SAY YOU THINK YOUR MOTHER WOULD UNDERSTAND"],
  ["My mother always said I was clever.", "CAN YOU THINK OF A SPECIFIC EXAMPLE"],
  ["Perhaps she was wrong.", "YOU DON'T SEEM QUITE CERTAIN"],
  ["I am tired of all this.", "IS IT BECAUSE YOU ARE TIRED OF ALL THIS THAT YOU CAME TO ME"],
  ["You are a very patient listener.", "WHAT MAKES YOU THINK I AM A VERY PATIENT LISTENER"],
  ["Are you a real doctor?", "WHY ARE YOU INTERESTED IN WHETHER I AM A REAL DOCTOR OR NOT"],
  ["I can't stop thinking about the future.", "HOW DO YOU KNOW YOU CAN'T STOP THINKING ABOUT THE FUTURE"],
  ["I don't trust computers.", "DON'T YOU REALLY TRUST COMPUTERS"],
  ["I feel strange talking to a typewriter.", "TELL ME MORE ABOUT SUCH FEELINGS"],
  ["Why can't you just tell me what to do?", "WHY DO YOU ASK"],
  ["Why don't I ever finish anything?", "DOES THAT QUESTION INTEREST YOU"],
  ["Can you keep a secret?", "YOU BELIEVE I CAN KEEP A SECRET DON'T YOU"],
  ["Can I tell you something private?", "WHETHER OR NOT YOU CAN TELL I SOMETHING PRIVATE DEPENDS ON YOU MORE THAN ON ME"],
  ["What would you do in my place?", "WHAT IS IT YOU REALLY WANT TO KNOW"],
  ["How long will this take?", "ARE SUCH QUESTIONS MUCH ON YOUR MIND"],
  ["When did you start doing this?", "WHAT ANSWER WOULD PLEASE YOU MOST"],
  ["If the machine understood, it would answer differently.", "DO YOU THINK ITS LIKELY THAT THE MACHINE UNDERSTOOD"],
  ["Because it is easier than talking to people.", "IS THAT THE REAL REASON"],
  ["Yes, I suppose so.", "YOU SEEM QUITE POSITIVE"],
  ["No, not really!", "ARE YOU SAYING 'NO' JUST TO BE NEGATIVE"],
  ["Maybe it doesn't matter; maybe nothing does.", "WHY THE UNCERTAIN TONE"],
  ["Nobody ever asks how I am.", "CAN YOU THINK OF ANYONE IN PARTICULAR"],
  ["Everybody wants something from me.", "WHO, FOR EXAMPLE"],
  ["The trains were late again.", "I AM NOT SURE I UNDERSTAND YOU FULLY"],
  ["It rained all day, but the garden needed it.", "DOES THAT HAVE ANYTHING TO DO WITH THE FACT THAT YOUR MANAGER NEVER LISTENS TO YOUR IDEAS"],
  ["Hmm.", "PLEASE GO ON"],
  ["My brother and my sister were there too.", "TELL ME MORE ABOUT YOUR FAMILY"],
  ["My children think this is silly.", "WHO ELSE IN YOUR FAMILY THINK THIS IS SILLY"],
  ["I was hoping you would say that.", "PERHAPS IN YOUR FANTASY WE WERE HOPING EACH OTHER"],
  ["Were you programmed to say that?", "WE WERE DISCUSSING YOU - NOT ME"],
  ["You’re only repeating what I say, aren’t you?", "WHAT DO YOU THINK"],
  ["I’m not sure what I expected — something cleverer.", "WHAT COMES TO YOUR MIND WHEN YOU ASK THAT"],
  ["Yesterday I walked by the river.", "CAN YOU ELABORATE ON THAT"],
  ["My wife says I worry too much.", "YOUR WIFE"],
  ["Remember what I told you about my manager?", "HAVE YOU ASKED SUCH QUESTIONS BEFORE"],
  ["That was a long time ago.", "WHAT DOES THAT SUGGEST TO YOU"],
  ["I wonder if anyone else talks to you like this.", "DO YOU WISH THAT ANYONE ELSE TALKS TO I LIKE THIS"],
  ["Goodbye, doctor.", "DO YOU FEEL STRONGLY ABOUT DISCUSSING SUCH THINGS"]
];

describe('ELIZA, run on the 1965 DOCTOR script', () => {
  it('reads the script: its greeting, its keywords and its memory', () => {
    const script = readScript(DOCTOR);
    expect(script.hello.join(' ')).toBe(HELLO);
    expect(script.memory.keyword).toBe('MY');
    expect(script.memory.transforms).toHaveLength(4);
    expect(script.tags.get('FAMILY')).toEqual(['MOTHER', 'FATHER', 'SISTER', 'BROTHER', 'WIFE', 'CHILDREN']);
    // 35 keywords besides NONE, as Hay counts them; 23 of them, NONE among
    // them, can answer, and the rest only swap a word or carry a tag.
    expect(script.rules.size - 1).toBe(35);
    expect([...script.rules.values()].filter((r) => r.transforms.length || r.link).length).toBe(23);
  });

  it('answers a conversation word for word as the reconstruction it is ported from', () => {
    const eliza = new Eliza(readScript(DOCTOR));
    expect(eliza.hello()).toBe(HELLO);
    CONVERSATION.forEach(([said, answer], i) => expect(eliza.reply(said).text, (i + 1) + ': ' + said).toBe(answer));
  });

  it('brings up a memory only when the counter reads four', () => {
    const eliza = new Eliza(readScript(DOCTOR));
    const lines = CONVERSATION.map(([said]) => said);
    const replies = lines.map((said) => eliza.reply(said));
    const recalled = replies.filter((r) => r.workings.from === 'memory');
    expect(recalled.length).toBeGreaterThan(0);
    recalled.forEach((r) => expect(r.workings.limit).toBe(4));
  });

  it('shows its workings: the keyword, the pattern, the parts and the rule', () => {
    const eliza = new Eliza(readScript(DOCTOR));
    const r = eliza.reply('My brother and my sister were there too.');
    expect(r.workings.keystack).toEqual(['MY', 'MY']);
    expect(r.workings.steps[0]).toMatchObject({ keyword: 'MY', outcome: 'reply' });
    expect(r.workings.steps[0].pattern).toEqual(['0', 'YOUR', '0', '(/FAMILY)', '0']);
    expect(r.workings.remembered).toBeTruthy();
  });
});

describe('the parts ELIZA is built from', () => {
  it('reads a modern keyboard as the typewriter', () => {
    expect(elizaUppercase('Hello! How are you?')).toBe('HELLO. HOW ARE YOU.');
    expect(elizaUppercase('I’m “fine” — really')).toBe("I'M  FINE  , REALLY");
  });

  it('takes a sentence apart the way SLIP did', () => {
    const tags = new Map([['FAMILY', ['MOTHER', 'FATHER']]]);
    expect(match(tags, ['0', 'YOU', '(*WANT NEED)', '0'], ['YOU', 'NEED', 'NICE', 'FOOD'])).toEqual(['', 'YOU', 'NEED', 'NICE FOOD']);
    expect(match(tags, ['0', 'YOUR', '0', '(/FAMILY)', '0'], ['WELL', 'YOUR', 'OLD', 'MOTHER', 'SAID', 'SO'])).toEqual(['WELL', 'YOUR', 'OLD', 'MOTHER', 'SAID SO']);
    expect(match(tags, ['0', 'YOUR', '0', '(/FAMILY)', '0'], ['YOUR', 'DOG'])).toBeNull();
    expect(match(tags, ['1', 'WORLD'], ['HELLO', 'WORLD'])).toEqual(['HELLO', 'WORLD']);
    expect(reassemble(['DID', '1', 'HAVE', 'A', '3'], ['MARY', 'HAD A', 'LITTLE LAMB'])).toEqual(['DID', 'MARY', 'HAVE', 'A', 'LITTLE', 'LAMB']);
    expect(reassemble(['1', '7'], ['MARY'])).toEqual(['MARY', 'HMMM']);
  });

  it('hashes as SLIP did: ALWAYS gives 14, the figure in the 1966 paper', () => {
    expect(hash(lastChunk('ALWAYS'), 7)).toBe(14);
    expect(hash(lastChunk('PURPOSE'), 2)).toBe(1);
    expect(hash(lastChunk('DEVONSHIRE'), 2)).toBe(0);
    expect(hash(lastChunk('PREDICAMENT'), 2)).toBe(3);
    expect(hash(lastChunk('EXECUTIONERS'), 2)).toBe(3);
    expect(hash(lastChunk('GLOUCESTERSHIRE'), 2)).toBe(2);
    expect(hash(0o777777777777n, 15)).toBe(0x7f00);
    expect(hash(0n, 7)).toBe(0);
  });
});
