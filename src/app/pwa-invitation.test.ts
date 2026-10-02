import { describe, expect, it } from 'vitest';

import { pwaInvitation } from './pwa-invitation';

const quiet = {
  place: 'home',
  isUpdateOfferable: false,
  isUpdateDismissed: false,
  hasUnsavedConstruction: false,
  isInstallAvailable: false,
  isInstallDeclined: false,
} as const;

describe('pwaInvitation (U10)', () => {
  it('ne montre rien sans mise à jour en attente ni événement d’installation', () => {
    expect(pwaInvitation(quiet)).toBeNull();
    expect(pwaInvitation({ ...quiet, place: 'board' })).toBeNull();
  });

  it('propose la mise à jour à l’accueil et sur un plateau sans construction en cours', () => {
    expect(pwaInvitation({ ...quiet, isUpdateOfferable: true })).toBe('update');
    expect(pwaInvitation({ ...quiet, place: 'board', isUpdateOfferable: true })).toBe('update');
  });

  it('ne la propose pas sur un plateau dont la construction serait perdue au rechargement', () => {
    expect(
      pwaInvitation({
        ...quiet,
        place: 'board',
        isUpdateOfferable: true,
        hasUnsavedConstruction: true,
      }),
    ).toBeNull();
    // À l'accueil, aucune construction n'est ouverte.
    expect(pwaInvitation({ ...quiet, isUpdateOfferable: true, hasUnsavedConstruction: true })).toBe(
      'update',
    );
  });

  it('ne la propose plus, pour cette visite, une fois « Plus tard » touché', () => {
    expect(
      pwaInvitation({ ...quiet, isUpdateOfferable: true, isUpdateDismissed: true }),
    ).toBeNull();
  });

  it('propose l’installation à l’accueil seulement, quand le navigateur l’a permise', () => {
    expect(pwaInvitation({ ...quiet, isInstallAvailable: true })).toBe('install');
    expect(pwaInvitation({ ...quiet, place: 'board', isInstallAvailable: true })).toBeNull();
  });

  it('ne propose plus l’installation une fois refusée', () => {
    expect(
      pwaInvitation({ ...quiet, isInstallAvailable: true, isInstallDeclined: true }),
    ).toBeNull();
  });

  it('fait passer la mise à jour avant l’installation', () => {
    expect(pwaInvitation({ ...quiet, isUpdateOfferable: true, isInstallAvailable: true })).toBe(
      'update',
    );
    expect(
      pwaInvitation({
        ...quiet,
        isUpdateOfferable: true,
        isUpdateDismissed: true,
        isInstallAvailable: true,
      }),
    ).toBe('install');
  });
});
