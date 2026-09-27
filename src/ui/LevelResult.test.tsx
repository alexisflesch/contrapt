// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LevelResult, type CampaignVictory } from './LevelResult';

const won = { outcome: 'won' } as const;

const renderVictory = (campaign?: CampaignVictory): HTMLElement => {
  render(
    <LevelResult
      outcome={won}
      isCreation={false}
      onReplay={() => undefined}
      onReset={() => undefined}
      onReturnToLevels={() => undefined}
      {...(campaign === undefined ? {} : { campaign })}
    />,
  );
  return screen.getByRole('region', { name: 'Résultat du niveau' });
};

const victory = (overrides: Partial<CampaignVictory> = {}): CampaignVictory => ({
  tier: 'resolved',
  objectsUsed: 1,
  hint: null,
  isNewRecord: false,
  onNextLevel: null,
  ...overrides,
});

describe('LevelResult — bandeau de campagne (U4)', () => {
  afterEach(() => {
    cleanup();
  });

  it('n’affiche ni palier ni compte hors campagne', () => {
    const result = renderVictory();

    expect(result).toHaveTextContent('Victoire');
    expect(result).not.toHaveAttribute('data-level-tier');
    expect(within(result).queryByText(/Résolu/)).not.toBeInTheDocument();
    expect(within(result).queryByRole('button', { name: 'Niveau suivant' })).toBeNull();
  });

  it('annonce le palier résolu et le nombre d’objets, sans objectif chiffré sans défi', () => {
    const result = renderVictory(victory({ objectsUsed: 1 }));

    expect(result).toHaveAttribute('data-level-tier', 'resolved');
    expect(within(result).getByText('✅ Résolu')).toBeVisible();
    expect(within(result).getByText('avec 1 objet.')).toBeVisible();
    expect(within(result).queryByText(/Tu penses/)).not.toBeInTheDocument();
  });

  it('accorde le compte au pluriel et sans objet posé', () => {
    renderVictory(victory({ objectsUsed: 0 }));
    expect(screen.getByText('sans poser d’objet.')).toBeVisible();
    cleanup();

    renderVictory(victory({ objectsUsed: 7 }));
    expect(screen.getByText('avec 7 objets.')).toBeVisible();
  });

  it('propose la cible ⭐ après une réussite non élégante (ADR 0010)', () => {
    const result = renderVictory(
      victory({ objectsUsed: 7, hint: { nextTier: 'elegant', objectCount: 5 } }),
    );

    expect(within(result).getByText('Tu penses pouvoir le faire avec 5 ?')).toBeVisible();
  });

  it('révèle le record 🏆 après une réussite élégante', () => {
    const result = renderVictory(
      victory({
        tier: 'elegant',
        objectsUsed: 3,
        hint: { nextTier: 'minimal', objectCount: 2 },
      }),
    );

    expect(result).toHaveAttribute('data-level-tier', 'elegant');
    expect(within(result).getByText('⭐ Élégant')).toBeVisible();
    expect(within(result).getByText('Record à battre : 🏆 avec 2 objets.')).toBeVisible();
  });

  it('ne demande rien de plus après 🏆, et signale un nouveau record', () => {
    const minimal = renderVictory(victory({ tier: 'minimal', objectsUsed: 2 }));
    expect(within(minimal).getByText('🏆 Minimal')).toBeVisible();
    expect(within(minimal).queryByText(/Tu penses|Record|record/)).not.toBeInTheDocument();
    cleanup();

    const record = renderVictory(victory({ tier: 'minimal', objectsUsed: 1, isNewRecord: true }));
    expect(within(record).getByText('Nouveau record : moins que le minimum connu !')).toBeVisible();
  });

  it('ouvre le niveau suivant quand il existe et garde une seule commande Recommencer', () => {
    const onNextLevel = vi.fn();
    const result = renderVictory(victory({ onNextLevel }));

    fireEvent.click(within(result).getByRole('button', { name: 'Niveau suivant' }));
    expect(onNextLevel).toHaveBeenCalledTimes(1);
    expect(within(result).getAllByRole('button', { name: /Recommencer/ })).toHaveLength(1);
    expect(within(result).getByRole('button', { name: 'Retour aux niveaux' })).toBeVisible();
  });

  it('n’offre pas de niveau suivant quand il n’y en a pas', () => {
    const result = renderVictory(victory({ onNextLevel: null }));

    expect(within(result).queryByRole('button', { name: 'Niveau suivant' })).toBeNull();
  });
});
