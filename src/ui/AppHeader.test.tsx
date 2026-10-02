// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

describe('AppHeader — navigation et lexique (V3)', () => {
  afterEach(cleanup);

  it('fait de la marque « TinkerBolt » un lien vers l’accueil', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/" element={<p>Page d’accueil</p>} />
          <Route
            path="/settings"
            element={<AppHeader title="Paramètres" subtitle="Réglages de l’application" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const brand = screen.getByRole('link', { name: 'TinkerBolt, accueil' });
    expect(brand).toHaveAttribute('href', '/');
    expect(within(brand).getByRole('heading', { name: 'TinkerBolt' })).toBeVisible();

    fireEvent.click(brand);
    expect(screen.getByText('Page d’accueil')).toBeVisible();
  });

  it('liste le menu dans l’ordre du lexique, sans les anciens libellés', () => {
    render(
      <MemoryRouter>
        <AppHeader title="Campagne" subtitle="Sélection du niveau" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));

    const entries = within(screen.getByRole('navigation', { name: 'Menu principal' }))
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(entries).toEqual(['Accueil', 'Campagne', 'Atelier', 'Mes niveaux', 'Paramètres']);
  });
});
