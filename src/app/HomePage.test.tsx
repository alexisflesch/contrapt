// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CampaignProgress } from '../application/progression';
import type { ProgressRepository } from '../application/progression/progress-repository';
import { embeddedLevels } from '../content/embedded-levels';
import { App } from './App';

const createRepository = (progress: CampaignProgress = {}): ProgressRepository => ({
  load: () => ({ status: 'ok', progress }),
  save: vi.fn(() => ({ status: 'ok' as const })),
  clear: () => ({ status: 'ok' }),
});

const HERO_TITLE = 'Amène la balle jusqu’au panier.';

const destinations = (): HTMLElement =>
  screen.getByRole('navigation', { name: 'Explorer TinkerBolt' });

const campaignProgress = (): HTMLElement =>
  screen.getByRole('progressbar', { name: 'Progression de la campagne' });

describe('Accueil TinkerBolt (V7, maquette validée en V4)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it('ouvre l’accueil à la racine avec le titre, le texte et les deux appels de la maquette', () => {
    render(<App progressRepository={createRepository()} />);

    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: HERO_TITLE })).toBeVisible();
    expect(
      screen.getByText(
        'Poutres, tremplins, ventilateurs, leviers : place les pièces, lance la machine et regarde ce qui se passe. Raté ? Ajuste et relance.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Jouer' })).toHaveAttribute('href', '/levels');
    expect(screen.getByRole('link', { name: 'ou créer un niveau' })).toHaveAttribute(
      'href',
      '/editor',
    );
    expect(screen.queryByRole('region', { name: 'Plateau de jeu' })).not.toBeInTheDocument();
  });

  it('montre l’aperçu réel du tutoriel 5, dessiné par le rendu du plateau', () => {
    const { container } = render(<App progressRepository={createRepository()} />);

    const hero = screen.getByRole('img', { name: 'Aperçu du niveau « La chaîne »' });
    expect(hero.querySelector('.level-preview')).not.toBeNull();
    // L'illustration composée et le décor de l'atelier ne sont plus utilisés.
    expect(container.querySelector('.home-invention')).toBeNull();
    expect(container.innerHTML).not.toContain('board-workshop-day-v1.png');
  });

  it('ouvre les trois destinations illustrées par un sprite, puis Paramètres en pied de page', () => {
    render(<App progressRepository={createRepository()} />);

    for (const { name, path, sprite } of [
      { name: 'Campagne', path: '/levels', sprite: 'basket' },
      { name: 'Atelier', path: '/editor', sprite: 'lever' },
      { name: 'Mes niveaux', path: '/my-levels', sprite: 'springboard' },
    ]) {
      const link = within(destinations()).getByRole('link', { name: new RegExp(`^${name}`, 'u') });
      expect(link).toHaveAttribute('href', path);
      expect(within(link).getByRole('heading', { name })).toBeVisible();
      const image = link.querySelector('img');
      expect(image?.getAttribute('src')).toBe(`/assets/sprites/thumbs/${sprite}.png`);
      expect(image).toHaveAttribute('alt', '');
    }
    expect(within(destinations()).getAllByRole('link')).toHaveLength(3);
    expect(screen.getByText('Cinq niveaux pour découvrir chaque pièce.')).toBeVisible();
    expect(
      screen.getByText('Construis ton propre niveau, teste-le, puis envoie-le à qui tu veux.'),
    ).toBeVisible();
    expect(screen.getByText('Tes créations et les niveaux qu’on t’a envoyés.')).toBeVisible();

    const footer = screen
      .getByText('Les niveaux partagés sont sous licence CC BY 4.0.')
      .closest('footer');
    if (footer === null) throw new Error('Pied de page introuvable.');
    expect(within(footer).getByRole('link', { name: 'Paramètres' })).toHaveAttribute(
      'href',
      '/settings',
    );
  });

  it('n’a ni kicker, ni faits, ni carnet de bord, ni statistiques, ni titre au centre de l’en-tête', () => {
    render(<App progressRepository={createRepository()} />);

    expect(screen.queryByRole('region', { name: 'Ton carnet de bord' })).toBeNull();
    expect(screen.queryByText(/Bienvenue dans l’atelier/u)).toBeNull();
    expect(screen.queryByText(/défis à résoudre/u)).toBeNull();
    expect(screen.queryByText(/Niveaux accessibles/u)).toBeNull();
    expect(screen.queryByText(/%/u)).toBeNull();
    const header = screen.getByRole('banner');
    expect(header).not.toHaveTextContent('Accueil');
    expect(header).not.toHaveTextContent('À toi d’inventer');
  });

  it('montre dans la carte Campagne la progression résolus / total, en barre et en texte', () => {
    render(
      <App
        progressRepository={createRepository({
          'tuto-1': { resolved: true, bestObjectCount: 1 },
          'tuto-2': { resolved: true, bestObjectCount: 2 },
          'campagne-retiree': { resolved: true, bestObjectCount: 1 },
        })}
      />,
    );

    const campaign = within(destinations()).getByRole('link', { name: /^Campagne/u });
    expect(within(campaign).getByText('2 / 5')).toBeVisible();
    expect(campaignProgress()).toHaveAttribute('value', '2');
    expect(campaignProgress()).toHaveAttribute('max', '5');
    expect(campaign).toContainElement(campaignProgress());
  });

  it('commence à 0 / 5 et mène toujours à la campagne quand tout est résolu', () => {
    render(<App progressRepository={createRepository()} />);
    expect(campaignProgress()).toHaveAttribute('value', '0');
    expect(within(destinations()).getByText('0 / 5')).toBeVisible();
    cleanup();

    const progress = Object.fromEntries(
      embeddedLevels.map((level) => [level.id, { resolved: true, bestObjectCount: 1 }]),
    );
    render(<App progressRepository={createRepository(progress)} />);

    expect(screen.getByRole('link', { name: 'Jouer' })).toHaveAttribute('href', '/levels');
    expect(campaignProgress()).toHaveAttribute('value', '5');
    expect(within(destinations()).getByText('5 / 5')).toBeVisible();
  });

  it('garde les accès jouables et explique un stockage indisponible', () => {
    render(
      <App
        progressRepository={{
          load: () => ({ status: 'error', code: 'storage-unavailable' }),
          save: () => ({ status: 'error', code: 'storage-unavailable' }),
          clear: () => ({ status: 'error', code: 'storage-unavailable' }),
        }}
      />,
    );
    expect(screen.getByRole('link', { name: 'Jouer' })).toHaveAttribute('href', '/levels');
    expect(screen.getByRole('status')).toHaveTextContent(
      'La progression ne peut pas être enregistrée sur cet appareil.',
    );
  });

  it('signale une progression illisible sauvegardée par le repository', () => {
    render(
      <App
        progressRepository={{
          ...createRepository(),
          load: () => ({ status: 'ok', progress: {}, warning: 'invalid-data-backed-up' }),
        }}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Une ancienne sauvegarde illisible a été mise de côté.',
    );
  });

  it('permet de revenir à l’accueil depuis le menu d’une autre route', () => {
    window.history.replaceState(null, '', '/settings');
    render(<App progressRepository={createRepository()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accueil' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: HERO_TITLE })).toBeVisible();
  });
});
