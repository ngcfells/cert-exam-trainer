import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { RichText } from './RichText';

describe('RichText', () => {
  it('renders plain text as is', () => {
    const { container } = render(<p><RichText text="No code here." /></p>);
    expect(container.querySelector('p')!.innerHTML).toBe('No code here.');
  });

  it('renders inline code and a block that keeps its line breaks', () => {
    const { container } = render(<p><RichText text={'Run `ls`:\n```sh\nls -la\n  cd /tmp\n```\nThen?'} /></p>);
    const codes = container.querySelectorAll('code');
    expect(codes).toHaveLength(2);
    expect(codes[0].textContent).toBe('ls');
    expect(codes[0]).not.toHaveClass('code-block');
    expect(codes[1]).toHaveClass('code-block');
    expect(codes[1].textContent).toBe('ls -la\n  cd /tmp');
    // A block is phrasing content, so it is valid inside a legend or a paragraph.
    expect(container.querySelector('pre')).toBeNull();
    expect(container.textContent).toBe('Run ls:ls -la\n  cd /tmpThen?');
  });

  it('lets inline code break after each slash, so a long URL wraps instead of overflowing', () => {
    const { container } = render(<p><RichText text="Call `https://api.example.internal/v1/ping` now." /></p>);
    const code = container.querySelector('code')!;
    expect(code.textContent).toBe('https://api.example.internal/v1/ping');
    expect(code.innerHTML).toBe('https://<wbr>api.example.internal/<wbr>v1/<wbr>ping');
  });

  it('adds no break point to inline code without a slash, or after a final slash', () => {
    const { container } = render(<p><RichText text="`ls` and `/tmp/`" /></p>);
    const codes = container.querySelectorAll('code');
    expect(codes[0].innerHTML).toBe('ls');
    expect(codes[1].innerHTML).toBe('/<wbr>tmp/');
  });
});
