import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { runLevelOutcome } from './level-outcome';

const level = (id: string): LevelDocument => {
  const found = embeddedLevels.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`Le niveau « ${id} » est absent.`);
  return found;
};

describe('issue d’une simulation sans action du joueur (U22)', () => {
  it('dit « perdu » pour le niveau 1 sans poutre et « gagné » pour le niveau 6 qui gagne seul', () => {
    expect(runLevelOutcome(level('level-1-prolonger-la-pente'))).toBe('lost');
    expect(runLevelOutcome(level('level-6-la-bascule'))).toBe('won');
  });

  it('rejoue à l’identique : le pas est fixe et rien ne dépend de l’horloge', () => {
    const document = level('level-6-la-bascule');

    expect(runLevelOutcome(document)).toBe(runLevelOutcome(document));
  });
});
