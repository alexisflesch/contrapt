// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  Preferences,
  PreferencesRepository,
} from '../application/preferences/preferences-repository';
import type { ProgressRepository } from '../application/progression/progress-repository';
import { campaignChapters } from '../content/embedded-levels';
import { App } from './App';

const progressKey = 'tinkerbolt:progress';
const preferencesKey = 'tinkerbolt:preferences';

const [firstLevelId = '', secondLevelId = ''] = campaignChapters.flatMap(({ levels }) =>
  levels.map(({ id }) => id),
);

const progressEnvelope = JSON.stringify({
  kind: 'progress',
  version: 1,
  data: {
    [firstLevelId]: { resolved: true, bestObjectCount: 2 },
    [secondLevelId]: { resolved: true, bestObjectCount: 3 },
  },
});

const preferencesEnvelope = (data: Preferences): string =>
  JSON.stringify({ kind: 'preferences', version: 1, data });

const storedPreferences = (): unknown => JSON.parse(localStorage.getItem(preferencesKey) ?? 'null');

/** Everything a reset must leave alone: creations, received levels, preferences, backups. */
const untouchedEntries = {
  'tinkerbolt:drafts': `["${secondLevelId}-brouillon","creation-abc"]`,
  [`tinkerbolt:draft:${secondLevelId}-brouillon`]: 'création du niveau 2',
  'tinkerbolt:draft:creation-abc': 'création libre',
  'tinkerbolt:received': '["recu-0123456789abcdef"]',
  'tinkerbolt:received:recu-0123456789abcdef': 'niveau reçu',
  'tinkerbolt:backup:progress': 'ancienne sauvegarde',
  [preferencesKey]: preferencesEnvelope({
    author: 'Lili',
    firstLevelHintDone: true,
    installInvitationDeclined: true,
  }),
} as const;

const seed = (entries: Readonly<Record<string, string>>): void => {
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
};

const renderSettings = (props: Parameters<typeof App>[0] = {}): void => {
  window.history.replaceState(null, '', '/settings');
  render(<App {...props} />);
};

const pseudoField = (): HTMLInputElement => screen.getByRole('textbox', { name: 'Pseudo retenu' });

const openLevelList = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Liste des niveaux' }));
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('Paramètres — pseudo retenu (U11, ADR 0016 § Pseudo)', () => {
  it('affiche le pseudo retenu', () => {
    seed({ [preferencesKey]: preferencesEnvelope({ author: 'Lili' }) });
    renderSettings();

    expect(screen.getByRole('region', { name: 'Pseudo' })).toBeVisible();
    expect(pseudoField()).toHaveValue('Lili');
    expect(screen.getByText('Un pseudo, pas ton vrai nom.', { exact: false })).toBeVisible();
  });

  it('montre un champ vide sans pseudo retenu, et « Effacer » désactivé', () => {
    renderSettings();

    expect(pseudoField()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Effacer le pseudo' })).toBeDisabled();
  });

  it('modifie le pseudo, rogné, sans perdre les autres préférences', () => {
    seed({
      [preferencesKey]: preferencesEnvelope({
        author: 'Lili',
        firstLevelHintDone: true,
        installInvitationDeclined: true,
      }),
    });
    renderSettings();

    fireEvent.change(pseudoField(), { target: { value: '  Noé  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pseudo' }));

    expect(storedPreferences()).toEqual({
      kind: 'preferences',
      version: 1,
      data: { author: 'Noé', firstLevelHintDone: true, installInvitationDeclined: true },
    });
    expect(pseudoField()).toHaveValue('Noé');
    expect(screen.getByRole('status')).toHaveTextContent('Pseudo enregistré.');
  });

  it('efface le pseudo seulement', () => {
    seed({
      [preferencesKey]: preferencesEnvelope({ author: 'Lili', firstLevelHintDone: true }),
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Effacer le pseudo' }));

    expect(storedPreferences()).toEqual({
      kind: 'preferences',
      version: 1,
      data: { firstLevelHintDone: true },
    });
    expect(pseudoField()).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Pseudo effacé.');
    expect(screen.getByRole('button', { name: 'Effacer le pseudo' })).toBeDisabled();
  });

  it('oublie le pseudo quand le champ est vidé puis enregistré, comme à l’export (M14)', () => {
    seed({ [preferencesKey]: preferencesEnvelope({ author: 'Lili' }) });
    renderSettings();

    fireEvent.change(pseudoField(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pseudo' }));

    expect(storedPreferences()).toEqual({ kind: 'preferences', version: 1, data: {} });
    expect(screen.getByRole('status')).toHaveTextContent('Pseudo effacé.');
  });

  it('refuse un pseudo invalide sous le champ, sans rien écrire', () => {
    seed({ [preferencesKey]: preferencesEnvelope({ author: 'Lili' }) });
    renderSettings();
    const before = localStorage.getItem(preferencesKey);

    fireEvent.change(pseudoField(), { target: { value: 'Li li' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le pseudo ne doit contenir ni saut de ligne ni caractère de contrôle.',
    );
    expect(pseudoField()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Enregistrer le pseudo' })).toBeDisabled();
    expect(localStorage.getItem(preferencesKey)).toBe(before);
  });

  it('dit qu’un pseudo n’a pas pu être enregistré, sans exception', () => {
    const repository: PreferencesRepository = {
      load: () => ({ status: 'ok', preferences: { author: 'Lili' } }),
      save: () => ({ status: 'error', code: 'quota-exceeded' }),
    };
    renderSettings({ preferencesRepository: repository });

    fireEvent.change(pseudoField(), { target: { value: 'Noé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pseudo' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'L’espace de stockage de cet appareil est plein. Ton pseudo n’a pas été enregistré.',
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('reste affichée quand les préférences ne peuvent pas être lues', () => {
    const repository: PreferencesRepository = {
      load: () => {
        throw new Error('stockage bloqué');
      },
      save: () => {
        throw new Error('stockage bloqué');
      },
    };
    renderSettings({ preferencesRepository: repository });

    expect(pseudoField()).toHaveValue('');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le stockage local de cet appareil est indisponible. Ton pseudo ne peut pas être lu.',
    );

    fireEvent.change(pseudoField(), { target: { value: 'Noé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le pseudo' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le stockage local de cet appareil est indisponible. Ton pseudo n’a pas été enregistré.',
    );
  });
});

describe('Paramètres — remettre la progression à zéro (U11, ADR 0010, ADR 0011)', () => {
  it('demande confirmation, « Annuler » ciblé, et « Annuler » ne change rien', () => {
    seed({ ...untouchedEntries, [progressKey]: progressEnvelope });
    renderSettings();

    expect(screen.getByText('Niveaux résolus : 2 sur 5.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Remettre la progression à zéro' }));

    const dialog = screen.getByRole('dialog', { name: 'Remettre la progression à zéro ?' });
    expect(within(dialog).getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(dialog).toHaveTextContent(
      'les niveaux résolus de la campagne et leurs records seront effacés',
    );
    expect(dialog).toHaveTextContent('Seul le niveau 1 restera ouvert.');
    expect(dialog).toHaveTextContent(
      'Tes créations, tes niveaux reçus et ton pseudo sont conservés.',
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Annuler' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(progressKey)).toBe(progressEnvelope);
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Niveaux résolus : 2 sur 5.')).toBeVisible();
  });

  it('efface la progression et rien d’autre, le dit, et la campagne est de nouveau verrouillée', () => {
    seed({ ...untouchedEntries, [progressKey]: progressEnvelope });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Remettre la progression à zéro' }));
    const dialog = screen.getByRole('dialog', { name: 'Remettre la progression à zéro ?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remettre à zéro' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Progression remise à zéro : seul le niveau 1 est ouvert.',
    );
    expect(screen.getByText('Niveaux résolus : 0 sur 5.')).toBeVisible();
    expect(localStorage.getItem(progressKey)).toBeNull();
    for (const [key, value] of Object.entries(untouchedEntries)) {
      expect(localStorage.getItem(key)).toBe(value);
    }
    expect(pseudoField()).toHaveValue('Lili');

    openLevelList();
    expect(screen.getByRole('button', { name: 'Lancer le niveau 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Lancer le niveau 2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Lancer le niveau 3' })).toBeDisabled();
  });

  it('dit que rien n’a été effacé quand le stockage refuse, sans exception', () => {
    const repository: ProgressRepository = {
      load: () => ({
        status: 'ok',
        progress: { [firstLevelId]: { resolved: true, bestObjectCount: 2 } },
      }),
      save: () => ({ status: 'ok' }),
      clear: () => ({ status: 'error', code: 'storage-unavailable' }),
    };
    renderSettings({ progressRepository: repository });

    fireEvent.click(screen.getByRole('button', { name: 'Remettre la progression à zéro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remettre à zéro' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le stockage local de cet appareil est indisponible. La progression n’a pas été effacée.',
    );
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('Niveaux résolus : 1 sur 5.')).toBeVisible();

    openLevelList();
    expect(screen.getByRole('button', { name: 'Lancer le niveau 2' })).toBeEnabled();
  });
});
