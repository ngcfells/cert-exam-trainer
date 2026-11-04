import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './Table';
import { RichText } from './RichText';

/** jsdom has no layout; fake an element that is wider inside than out. */
function fakeOverflow(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
}

afterEach(() => vi.restoreAllMocks());

describe('Table', () => {
  it('is a plain table with no extra tab stop when it fits', () => {
    fakeOverflow(300, 300);
    const { container } = render(<Table caption="Parts" head={['Part', 'Result']} rows={[['a', 'One', 'Correct']]} />);
    expect(screen.queryByRole('region')).toBeNull();
    expect(container.querySelector('.table-scroll')).not.toHaveAttribute('tabindex');
    expect(screen.getByRole('table', { name: 'Parts' })).toBeInTheDocument();
  });

  it('becomes a focusable region named by its caption when it scrolls sideways (issue #4)', () => {
    fakeOverflow(600, 300);
    render(<Table caption="Parts" head={['Part', 'Result']} rows={[['a', 'One', 'Correct']]} />);
    const region = screen.getByRole('region', { name: 'Parts' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table', { name: 'Parts' }));
  });
});

describe('code block scrolling', () => {
  it('takes keyboard focus only when a long line scrolls', () => {
    fakeOverflow(600, 300);
    const { container } = render(<p><RichText text={'```\nPKG_VER="${RELEASE_VERSION:?RELEASE_VERSION is not set}"\n```'} /></p>);
    expect(container.querySelector('.code-block')).toHaveAttribute('tabindex', '0');
  });

  it('adds no tab stop when the block fits', () => {
    fakeOverflow(300, 300);
    const { container } = render(<p><RichText text={'```\nls\n```'} /></p>);
    expect(container.querySelector('.code-block')).not.toHaveAttribute('tabindex');
  });
});
