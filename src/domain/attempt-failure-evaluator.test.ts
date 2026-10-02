import { describe, expect, it } from 'vitest';

import {
  advanceBasketGoalEvaluation,
  applyBasketGoalFact,
  createBasketGoalEvaluation,
} from './basket-goal-evaluator';
import {
  advanceAttemptFailureEvaluation,
  applyAttemptFailureFact,
  applyAttemptFailureFacts,
  createAttemptFailureEvaluation,
  resetAttemptFailureEvaluation,
  resolveAttemptOutcome,
  type AttemptFailureEvaluation,
  type AttemptFailureRule,
  type BallPositionFact,
} from './attempt-failure-evaluator';

const rule: AttemptFailureRule = {
  ballId: 'goal-ball',
  scene: { min: { x: 0, y: 0 }, max: { x: 10, y: 6 } },
  outOfSceneMarginInWorldUnits: 2,
  timeoutInFixedSteps: 1200,
};

const positionFact = (overrides: Partial<BallPositionFact> = {}): BallPositionFact => ({
  placementId: 'goal-ball',
  position: { x: 5, y: 3 },
  fixedStep: 10,
  order: 0,
  ...overrides,
});

const pending: AttemptFailureEvaluation = {
  status: 'pending',
  reason: null,
  failedAtFixedStep: null,
};

describe('évaluateur d’échec d’une tentative', () => {
  it('conclut à la sortie de scène dès que le centre de la balle franchit la marge', () => {
    const evaluation = applyAttemptFailureFacts(createAttemptFailureEvaluation(), rule, [
      positionFact({ position: { x: 5, y: 7 }, fixedStep: 10 }),
      positionFact({ position: { x: 5, y: 8.5 }, fixedStep: 11 }),
    ]);

    expect(evaluation).toEqual({
      status: 'failed',
      reason: 'out-of-scene',
      failedAtFixedStep: 11,
    });
  });

  it('tolère la marge à gauche, à droite et en bas, bord compris, et perd au-delà', () => {
    const stillInside = [
      { x: -2, y: 3 },
      { x: 12, y: 3 },
      { x: 5, y: 8 },
    ];
    const outside = [
      { x: -2.001, y: 3 },
      { x: 12.001, y: 3 },
      { x: 5, y: 8.001 },
    ];

    for (const position of stillInside) {
      expect(
        applyAttemptFailureFact(createAttemptFailureEvaluation(), rule, positionFact({ position })),
      ).toEqual(pending);
    }
    for (const position of outside) {
      expect(
        applyAttemptFailureFact(createAttemptFailureEvaluation(), rule, positionFact({ position })),
      ).toMatchObject({ status: 'failed', reason: 'out-of-scene' });
    }
  });

  it('ne perd jamais par le haut : la balle au-delà de la marge reste en jeu et la gravité la ramène (V2b)', () => {
    // `y` croît vers le bas (ADR 0007) : le haut de la scène est `scene.min.y`.
    const aboveMargin = [
      { x: 5, y: -2.001 },
      { x: 5, y: -50 },
      { x: -1, y: -1000 },
    ];

    for (const position of aboveMargin) {
      expect(
        applyAttemptFailureFact(createAttemptFailureEvaluation(), rule, positionFact({ position })),
      ).toEqual(pending);
    }
  });

  it('perd encore par un côté ou le bas quand la balle est aussi très haut', () => {
    for (const position of [
      { x: -2.001, y: -50 },
      { x: 12.001, y: -50 },
    ]) {
      expect(
        applyAttemptFailureFact(createAttemptFailureEvaluation(), rule, positionFact({ position })),
      ).toMatchObject({ status: 'failed', reason: 'out-of-scene' });
    }
  });

  it('ignore la position d’un autre corps que la balle cible', () => {
    const initial = createAttemptFailureEvaluation();

    expect(
      applyAttemptFailureFact(
        initial,
        rule,
        positionFact({ placementId: 'other-ball', position: { x: 100, y: 100 } }),
      ),
    ).toBe(initial);
  });

  it('conclut au temps écoulé sans qu’aucun fait de position ne soit nécessaire', () => {
    const initial = createAttemptFailureEvaluation();

    expect(advanceAttemptFailureEvaluation(initial, rule, 1199)).toEqual(pending);
    expect(advanceAttemptFailureEvaluation(initial, rule, 1200)).toEqual({
      status: 'failed',
      reason: 'timeout',
      failedAtFixedStep: 1200,
    });
  });

  it('utilise la limite injectée plutôt qu’une constante de la couche domaine', () => {
    const shortRule: AttemptFailureRule = { ...rule, timeoutInFixedSteps: 3 };

    expect(
      advanceAttemptFailureEvaluation(createAttemptFailureEvaluation(), shortRule, 3),
    ).toMatchObject({ status: 'failed', reason: 'timeout' });
    expect(advanceAttemptFailureEvaluation(createAttemptFailureEvaluation(), rule, 3)).toEqual(
      pending,
    );
  });

  it('conserve la première cause d’échec au lieu de la réécrire', () => {
    const outOfScene = applyAttemptFailureFact(
      createAttemptFailureEvaluation(),
      rule,
      positionFact({ position: { x: 100, y: 100 }, fixedStep: 42 }),
    );

    expect(advanceAttemptFailureEvaluation(outOfScene, rule, 2000)).toBe(outOfScene);
    expect(
      applyAttemptFailureFact(outOfScene, rule, positionFact({ position: { x: 5, y: 3 } })),
    ).toBe(outOfScene);
  });

  it('préfère la cause explicative lorsque la sortie de scène tombe sur le pas limite', () => {
    // Les deux causes peuvent coïncider au pas de la limite. « Hors de la
    // scène » dit au joueur ce qui s'est passé ; « temps écoulé » ne dit que
    // l'expiration du budget, donc la cause explicative l'emporte.
    const atLimit = applyAttemptFailureFact(
      createAttemptFailureEvaluation(),
      rule,
      positionFact({ position: { x: 100, y: 100 }, fixedStep: 1200 }),
    );

    expect(advanceAttemptFailureEvaluation(atLimit, rule, 1200)).toEqual({
      status: 'failed',
      reason: 'out-of-scene',
      failedAtFixedStep: 1200,
    });
  });

  it('respecte l’ordre stable des faits produits au même pas fixe', () => {
    expect(() =>
      applyAttemptFailureFacts(createAttemptFailureEvaluation(), rule, [
        positionFact({ order: 0 }),
        positionFact({ order: 0, position: { x: 100, y: 100 } }),
      ]),
    ).toThrow('ordre stable unique');
  });

  it('fournit un reset explicite sans conserver l’échec précédent', () => {
    const failed = advanceAttemptFailureEvaluation(createAttemptFailureEvaluation(), rule, 1200);

    expect(failed.status).toBe('failed');
    expect(resetAttemptFailureEvaluation()).toEqual(pending);
  });

  it('refuse une règle ou un fait invalides plutôt que de deviner', () => {
    expect(() =>
      advanceAttemptFailureEvaluation(pending, { ...rule, timeoutInFixedSteps: 0 }, 0),
    ).toThrow('limite de temps');
    expect(() => advanceAttemptFailureEvaluation(pending, rule, -1)).toThrow('pas fixe');
    expect(() =>
      applyAttemptFailureFact(pending, rule, positionFact({ position: { x: Number.NaN, y: 0 } })),
    ).toThrow('position de la balle');
    expect(() =>
      applyAttemptFailureFact(
        pending,
        { ...rule, outOfSceneMarginInWorldUnits: -1 },
        positionFact(),
      ),
    ).toThrow('marge');
  });

  it('ne modifie ni la règle issue du niveau, ni le fait, ni l’état précédent', () => {
    const initial = createAttemptFailureEvaluation();
    const fact = positionFact({ position: { x: 100, y: 100 } });
    const ruleSnapshot = structuredClone(rule);
    const factSnapshot = structuredClone(fact);

    const failed = applyAttemptFailureFact(initial, rule, fact);
    advanceAttemptFailureEvaluation(failed, rule, 1200);

    expect(rule).toEqual(ruleSnapshot);
    expect(fact).toEqual(factSnapshot);
    expect(initial).toEqual(pending);
  });
});

describe('arbitrage entre réussite et échec', () => {
  const succeededGoal = advanceBasketGoalEvaluation(
    applyBasketGoalFact(
      createBasketGoalEvaluation(),
      { ballId: 'goal-ball', basketId: 'goal-basket', holdDurationInFixedSteps: 30 },
      {
        type: 'object-entered-sensor',
        placementId: 'goal-ball',
        targetId: 'goal-basket',
        fixedStep: 1170,
        order: 0,
      },
    ),
    { ballId: 'goal-ball', basketId: 'goal-basket', holdDurationInFixedSteps: 30 },
    1200,
  );
  const pendingGoal = createBasketGoalEvaluation();
  const failed = advanceAttemptFailureEvaluation(createAttemptFailureEvaluation(), rule, 1200);

  it('ne conclut rien tant qu’aucune des deux issues n’est atteinte', () => {
    expect(resolveAttemptOutcome(pendingGoal, createAttemptFailureEvaluation())).toBeNull();
  });

  it('annonce la victoire quand seul l’objectif est atteint', () => {
    expect(resolveAttemptOutcome(succeededGoal, createAttemptFailureEvaluation())).toEqual({
      outcome: 'won',
    });
  });

  it('annonce l’échec et sa cause quand seule une cause d’échec est atteinte', () => {
    expect(resolveAttemptOutcome(pendingGoal, failed)).toEqual({
      outcome: 'lost',
      reason: 'timeout',
    });
  });

  it('donne la victoire lorsque les deux surviennent au même pas fixe', () => {
    expect(succeededGoal.status).toBe('succeeded');
    expect(failed.failedAtFixedStep).toBe(1200);
    expect(resolveAttemptOutcome(succeededGoal, failed)).toEqual({ outcome: 'won' });
  });
});
