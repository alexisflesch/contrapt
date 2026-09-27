import { describe, expect, it } from 'vitest';

import { embeddedDemoDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { runLevelOutcome } from './level-outcome';

describe('issue d’une simulation sans action du joueur (U22)', () => {
  it('rejoue à l’identique : le pas est fixe et rien ne dépend de l’horloge', () => {
    const document: LevelDocument = embeddedDemoDocument;

    expect(runLevelOutcome(document)).toBe(runLevelOutcome(document));
  });
});
