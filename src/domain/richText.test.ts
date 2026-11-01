import { describe, it, expect } from 'vitest';
import { parseRich, plainText, stripCode } from './richText';

describe('parseRich', () => {
  it('leaves text without backticks as one text segment', () => {
    expect(parseRich('Which command fits?')).toEqual([{ kind: 'text', value: 'Which command fits?' }]);
  });

  it('reads inline code between single backticks', () => {
    expect(parseRich('Run `git status` first.')).toEqual([
      { kind: 'text', value: 'Run ' },
      { kind: 'code', value: 'git status' },
      { kind: 'text', value: ' first.' },
    ]);
  });

  it('reads a fenced block, keeping its lines and indentation and dropping the language tag', () => {
    const text = 'Given this file:\n```yaml\njobs:\n  build:\n    runs-on: linux\n```\nWhat runs first?';
    expect(parseRich(text)).toEqual([
      { kind: 'text', value: 'Given this file:' },
      { kind: 'block', value: 'jobs:\n  build:\n    runs-on: linux' },
      { kind: 'text', value: 'What runs first?' },
    ]);
  });

  it('keeps text written after the closing fence on the same line', () => {
    expect(parseRich('Pick:\n```\nls\n``` (Choose two.)')).toEqual([
      { kind: 'text', value: 'Pick:' },
      { kind: 'block', value: 'ls' },
      { kind: 'text', value: '(Choose two.)' },
    ]);
  });

  it('does not read inline code inside a block, or across lines', () => {
    expect(parseRich('```\necho `date`\n```')).toEqual([{ kind: 'block', value: 'echo `date`' }]);
    expect(parseRich('a `b\nc` d')).toEqual([{ kind: 'text', value: 'a `b\nc` d' }]);
  });

  it('shows an unclosed fence or backtick as plain text', () => {
    expect(parseRich('```\nls -la')).toEqual([{ kind: 'text', value: '```\nls -la' }]);
    expect(parseRich('a ` b')).toEqual([{ kind: 'text', value: 'a ` b' }]);
  });
});

describe('plainText and stripCode', () => {
  const text = 'Run `make` here:\n```\nexport PATH=$HOME/bin\n```\nThen what?';

  it('plainText drops the backticks and keeps the code', () => {
    expect(plainText(text)).toBe('Run make here:\nexport PATH=$HOME/bin\nThen what?');
  });

  it('stripCode drops the code, so its identifiers are not read as acronyms', () => {
    expect(stripCode(text)).toBe('Run  here:\n\nThen what?');
  });
});
