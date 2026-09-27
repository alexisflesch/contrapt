// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { AppHeader } from './AppHeader';

describe('AppHeader — iconographie U27', () => {
  afterEach(cleanup);

  it('rend le bouton de menu avec une icône SVG Lucide, sans glyphe Unicode', () => {
    render(
      <MemoryRouter>
        <AppHeader title="Campagne" subtitle="Sélection du niveau" />
      </MemoryRouter>,
    );

    const menu = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(menu.querySelector('svg.lucide-menu')).toBeInTheDocument();
    expect(menu).not.toHaveTextContent('☰');
  });
});
