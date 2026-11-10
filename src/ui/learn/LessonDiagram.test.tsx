import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DIAGRAM_KINDS } from '../../domain/lesson';
import { LessonDiagram } from './LessonDiagram';

describe('LessonDiagram', () => {
  it.each(DIAGRAM_KINDS)('draws %s as one image named by its caption and described in words', (kind) => {
    render(<LessonDiagram diagram={{ kind, caption: `Caption for ${kind}`, description: `Words for ${kind}` }} />);
    const img = screen.getByRole('img', { name: `Caption for ${kind}` });
    expect(img).toHaveAccessibleDescription(`Words for ${kind}`);
    expect(img.querySelectorAll('*').length).toBeGreaterThan(3);
  });

  it('shows the caption as visible text', () => {
    const { container } = render(<LessonDiagram diagram={{ kind: 'bell-rule', caption: 'The 68-95-99.7 rule', description: 'A bell curve.' }} />);
    expect(container.querySelector('figcaption')).toHaveTextContent('The 68-95-99.7 rule');
  });

  it('uses no fixed colours, so dark mode works', () => {
    const { container } = render(<LessonDiagram diagram={{ kind: 'error-matrix', caption: 'c', description: 'd' }} />);
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
  });
});
