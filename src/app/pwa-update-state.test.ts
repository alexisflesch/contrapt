import { describe, expect, it } from 'vitest';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  beginEditorManipulation,
  completeSimulation,
  createEditorSession,
  pauseSimulation,
  startSimulation,
} from '../application/editor-session/editor-session';
import { embeddedLevels } from '../content/embedded-levels';
import { canPromptUpdate } from './pwa-update-state';

const createSession = () => {
  const document = embeddedLevels[0];
  if (document === undefined) throw new Error('Le niveau embarqué de test est indisponible.');
  return createEditorSession('creation', createConstructionAttempt(document));
};

describe('moment de proposition d’une mise à jour PWA', () => {
  it('autorise une proposition pendant la construction sans manipulation', () => {
    expect(canPromptUpdate(createSession())).toBe(true);
  });

  it('attend la fin d’une simulation en cours ou en pause', () => {
    const started = startSimulation(createSession());
    if (started.status !== 'accepted') throw new Error('La simulation de test devrait démarrer.');
    expect(canPromptUpdate(started.session)).toBe(false);

    const paused = pauseSimulation(started.session);
    if (paused.status !== 'accepted')
      throw new Error('La simulation de test devrait se mettre en pause.');
    expect(canPromptUpdate(paused.session)).toBe(false);
  });

  it('autorise de nouveau la proposition après la fin de la simulation', () => {
    const started = startSimulation(createSession());
    if (started.status !== 'accepted') throw new Error('La simulation de test devrait démarrer.');
    const completed = completeSimulation(started.session);
    if (completed.status !== 'accepted')
      throw new Error('La simulation de test devrait se terminer.');

    expect(canPromptUpdate(completed.session)).toBe(true);
  });

  it('attend la fin d’une manipulation en cours', () => {
    const manipulation = beginEditorManipulation(createSession(), {
      kind: 'placement',
      placementId: 'placement-preview',
    });
    if (manipulation.status !== 'accepted')
      throw new Error('La manipulation de test devrait démarrer.');

    expect(canPromptUpdate(manipulation.session)).toBe(false);
  });
});
