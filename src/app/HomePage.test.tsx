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

describe('Accueil TinkerBolt', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
  });
  afterEach(cleanup);

  it('ouvre la landing à la racine avec les destinations et le premier défi', () => {
    render(<App progressRepository={createRepository()} />);

    expect(window.location.pathname).toBe('/');
    expect(
      screen.getByRole('heading', { name: 'Les bonnes idées font leur chemin.' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Commencer à jouer' })).toHaveAttribute(
      'href',
      '/levels/campaign-01-la-bille-de-service/play',
    );
    const destinations = screen.getByRole('navigation', { name: 'Explorer TinkerBolt' });
    for (const { name, path } of [
      { name: 'La campagne', path: '/levels' },
      { name: 'L’atelier', path: '/editor' },
      { name: 'La démonstration', path: '/demo' },
      { name: 'Paramètres', path: '/settings' },
    ]) {
      expect(within(destinations).getByRole('link', { name: new RegExp(name) })).toHaveAttribute(
        'href',
        path,
      );
    }
    expect(screen.queryByRole('region', { name: 'Plateau de jeu' })).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progression de la campagne' })).toHaveAttribute(
      'value',
      '0',
    );
  });

  it('résume la vraie progression et reprend le premier défi accessible non résolu', () => {
    render(
      <App
        progressRepository={createRepository({
          'campaign-01-la-bille-de-service': { resolved: true, bestObjectCount: 1 },
          'campagne-retiree': { resolved: true, bestObjectCount: 1 },
        })}
      />,
    );

    expect(screen.getByRole('link', { name: 'Continuer à jouer' })).toHaveAttribute(
      'href',
      '/levels/campaign-02-par-dessus-le-mur/play',
    );
    const stats = screen.getByRole('region', { name: 'Ton carnet de bord' });
    expect(within(stats).getByText('1 / 17')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progression de la campagne' })).toHaveAttribute(
      'value',
      '1',
    );
    expect(stats).toHaveTextContent('6 %');
  });

  it('permet de revisiter la campagne quand tous les niveaux sont résolus', () => {
    const progress = Object.fromEntries(
      embeddedLevels.map((level) => [level.id, { resolved: true, bestObjectCount: 1 }]),
    );
    render(<App progressRepository={createRepository(progress)} />);

    expect(screen.getByRole('link', { name: 'Revisiter la campagne' })).toHaveAttribute(
      'href',
      '/levels',
    );
    expect(
      screen.getByText('Tous les défis sont résolus. Place à de nouvelles inventions !'),
    ).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progression de la campagne' })).toHaveAttribute(
      'value',
      '17',
    );
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
    expect(screen.getByRole('link', { name: 'Commencer à jouer' })).toHaveAttribute(
      'href',
      '/levels/campaign-01-la-bille-de-service/play',
    );
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
    expect(
      screen.getByRole('heading', { name: 'Les bonnes idées font leur chemin.' }),
    ).toBeVisible();
  });
});
