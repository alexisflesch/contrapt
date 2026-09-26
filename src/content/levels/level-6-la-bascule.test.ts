import { describe, expect, it } from 'vitest';

import { embeddedLevels } from '../embedded-levels';
import { runLevel } from '../level-regression';
import type { LevelDocument } from '../../domain/level-document';
import {
  createSimulationSession,
  type SimulationSnapshot,
} from '../../simulation/simulation-session';

const readLevel = (): LevelDocument => {
  const level = embeddedLevels.find(({ id }) => id === 'level-6-la-bascule');
  if (level === undefined) throw new Error('Le niveau « La bascule » est absent.');
  return level;
};

const seesawBoard = (snapshot: SimulationSnapshot) => {
  const board = snapshot.bodies.find(
    ({ placementId, role }) => placementId === 'seesaw-1' && role === 'board',
  );
  if (board === undefined) throw new Error('Le snapshot ne contient pas la planche de la bascule.');
  return board;
};

const levelAt = (ballX: number, basketX: number): LevelDocument => {
  const level = readLevel();
  return {
    ...level,
    objects: level.objects.map((placement) => {
      if (placement.id === 'ball-1') {
        return {
          ...placement,
          transform: {
            ...placement.transform,
            position: { x: ballX, y: placement.transform.position.y },
          },
        };
      }
      if (placement.id === 'basket-1') {
        return {
          ...placement,
          transform: {
            ...placement.transform,
            position: { x: basketX, y: placement.transform.position.y },
          },
        };
      }
      return placement;
    }),
  };
};

describe('niveau 6 — La bascule', () => {
  it('se résout sans action et présente un inventaire vide', () => {
    const level = readLevel();
    const initialDocument = structuredClone(level);

    expect(level.inventory).toEqual([]);
    expect(level.buildZones).toEqual([]);
    expect(level.challenge).toBeUndefined();
    expect(runLevel(level).outcome).toBe('succeeded');
    expect(level).toEqual(initialDocument);
  });

  it('gagne pour les neuf positions mesurées de la balle et du panier', () => {
    const outcomes = [3.9, 4.2, 4.5].flatMap((ballX) =>
      [5.2, 5.6, 6.0].map((basketX) => runLevel(levelAt(ballX, basketX)).outcome),
    );

    expect(outcomes).toHaveLength(9);
    expect(outcomes.every((outcome) => outcome === 'succeeded')).toBe(true);
  });

  it('fait pencher la planche avant la réussite puis restaure exactement la simulation', () => {
    const session = createSimulationSession(readLevel(), { fixedStepSeconds: 1 / 60 });
    const initial = session.readState();
    const initialBoard = seesawBoard(initial);
    let boardTiltedBeforeSuccess = false;

    try {
      expect(initialBoard.rotation).toBe(0);
      for (let step = 0; step < 1_300; step += 1) {
        session.advanceFixedSteps(1);
        const current = session.readState();
        const board = seesawBoard(current);
        if (board.rotation !== initialBoard.rotation) boardTiltedBeforeSuccess = true;
        if (session.readGoalEvaluation().status !== 'pending') break;
      }

      expect(session.readGoalEvaluation().status).toBe('succeeded');
      expect(session.readState().fixedStep).toBe(120);
      expect(boardTiltedBeforeSuccess).toBe(true);
      expect(seesawBoard(session.readState()).rotation).toBeCloseTo(Math.PI / 6, 1);
      session.reset();
      expect(session.readState()).toEqual(initial);
      expect(seesawBoard(session.readState()).angularVelocity).toBe(initialBoard.angularVelocity);
    } finally {
      session.destroy();
    }
  });
});
