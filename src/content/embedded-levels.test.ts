import { describe, expect, it } from 'vitest';

import { embeddedLevels, embeddedWorkshopDocument } from './embedded-levels';
import { createSimulationSession } from '../simulation/simulation-session';

describe('niveaux embarques', () => {
  it('expose la fixture du niveau 1 Laisser tomber comme un document v2 valide', () => {
    expect(embeddedLevels).toHaveLength(1);
    expect(embeddedLevels[0]).toMatchObject({
      schemaVersion: 2,
      id: 'level-1-laisser-tomber',
      metadata: { title: 'Laisser tomber' },
      inventory: [],
      buildZones: [],
      goal: { type: 'basket', ballId: 'ball-1', basketId: 'basket-1' },
      // B3 (plan-remise-en-jeu.md § 4) : la balle est suspendue directement
      // au-dessus du panier, largement ouvert, sans obstacle entre les deux.
      scene: { min: { x: 0, y: 0 }, max: { x: 8, y: 5.5 } },
    });

    const level = embeddedLevels[0];
    expect(level?.objects).toEqual([
      expect.objectContaining({
        id: 'ball-1',
        type: 'ball',
        transform: { position: { x: 4, y: 1 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
      expect.objectContaining({
        id: 'basket-1',
        type: 'basket',
        transform: { position: { x: 4, y: 4.2 }, rotation: 0 },
        permissions: { move: false, rotate: false, remove: false },
      }),
    ]);
  });

  it('réussit par chute verticale dans un temps borné puis restaure exactement son snapshot initial', () => {
    const level = embeddedLevels[0];
    if (level === undefined) throw new Error('La fixture du niveau 1 est absente.');

    const session = createSimulationSession(level, { fixedStepSeconds: 1 / 60 });
    const initialSnapshot = session.readState();
    // B3 (plan-remise-en-jeu.md § 4) : à la géométrie recalée, la balle
    // atteint le capteur en 42 pas fixes et l'objectif est confirmé réussi
    // en 73 (mesuré empiriquement contre le moteur physique réel). 600 pas
    // (10 s simulées) garde une marge large — plus de huit fois le besoin
    // réel — sans être une borne juste-suffisante.
    const maximumFixedSteps = 600;
    let observedTargetEntry = false;

    for (let fixedStep = 0; fixedStep < maximumFixedSteps; fixedStep += 1) {
      if (session.readGoalEvaluation().status === 'succeeded') break;
      session.advanceFixedSteps(1);
      observedTargetEntry ||= session
        .readState()
        .events.some(
          (event) =>
            event.type === 'object-entered-sensor' &&
            event.placementId === 'ball-1' &&
            event.targetId === 'basket-1',
        );
      // B2 (plan-remise-en-jeu.md § 4) : à cette géométrie, la chute vers un
      // panier largement ouvert ne doit jamais expirer par timeout ni sortir
      // de la scène avant d'avoir atteint le panier.
      expect(session.readFailureEvaluation().status).toBe('pending');
    }

    expect(session.readGoalEvaluation().status).toBe('succeeded');
    expect(observedTargetEntry).toBe(true);
    expect(session.readFailureEvaluation().status).toBe('pending');

    session.reset();

    expect(session.readState()).toEqual(initialSnapshot);
    expect(session.readGoalEvaluation().status).toBe('pending');
  });

  it('expose l’atelier libre comme un document v2 valide distinct de la campagne', () => {
    expect(embeddedWorkshopDocument).toMatchObject({
      schemaVersion: 2,
      id: 'free-workshop',
      scene: { min: { x: 0, y: 0 }, max: { x: 16, y: 9 } },
    });

    // ADR 0007 : l'atelier est un document embarqué et validé comme les
    // niveaux de campagne, mais ce n'est pas un niveau de campagne : il ne
    // doit jamais apparaître dans la liste des niveaux jouables.
    expect(embeddedLevels.some((level) => level.id === embeddedWorkshopDocument.id)).toBe(false);
    expect(embeddedLevels.map((level) => level.id)).not.toContain('free-workshop');
  });
});
