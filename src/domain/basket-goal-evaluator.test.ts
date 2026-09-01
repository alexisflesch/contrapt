import { describe, expect, it } from 'vitest';

import {
  advanceBasketGoalEvaluation,
  applyBasketGoalFact,
  applyBasketGoalFacts,
  createBasketGoalEvaluation,
  resetBasketGoalEvaluation,
  type BasketGoalEvaluation,
  type BasketGoalRule,
  type SensorContactFact,
} from './basket-goal-evaluator';

const rule: BasketGoalRule = {
  ballId: 'goal-ball',
  basketId: 'goal-basket',
  holdDurationInFixedSteps: 3,
};

const contactFact = (overrides: Partial<SensorContactFact> = {}): SensorContactFact => ({
  type: 'object-entered-sensor',
  placementId: 'goal-ball',
  targetId: 'goal-basket',
  fixedStep: 10,
  order: 0,
  ...overrides,
});

describe('évaluateur de l’objectif panier v1', () => {
  it('valide seulement après la durée de maintien injectée', () => {
    const initial: BasketGoalEvaluation = createBasketGoalEvaluation();
    const entered = applyBasketGoalFact(initial, rule, contactFact());

    expect(advanceBasketGoalEvaluation(entered, rule, 12)).toEqual({
      status: 'pending',
      enteredAtFixedStep: 10,
    });
    expect(advanceBasketGoalEvaluation(entered, rule, 13)).toEqual({
      status: 'succeeded',
      enteredAtFixedStep: 10,
    });
  });

  it('utilise la durée injectée plutôt qu’une constante du document', () => {
    const entered = applyBasketGoalFact(
      createBasketGoalEvaluation(),
      { ...rule, holdDurationInFixedSteps: 1 },
      contactFact(),
    );

    expect(
      advanceBasketGoalEvaluation(entered, { ...rule, holdDurationInFixedSteps: 1 }, 11),
    ).toMatchObject({ status: 'succeeded' });
    expect(advanceBasketGoalEvaluation(entered, rule, 11)).toMatchObject({ status: 'pending' });
  });

  it('ignore une autre balle et un autre panier', () => {
    const initial = createBasketGoalEvaluation();
    const afterOtherBall = applyBasketGoalFact(
      initial,
      rule,
      contactFact({ placementId: 'other-ball' }),
    );
    const afterOtherBasket = applyBasketGoalFact(
      afterOtherBall,
      rule,
      contactFact({ targetId: 'other-basket', fixedStep: 11 }),
    );

    expect(afterOtherBall).toBe(initial);
    expect(afterOtherBasket).toBe(initial);
    expect(advanceBasketGoalEvaluation(afterOtherBasket, rule, 20)).toEqual({
      status: 'pending',
      enteredAtFixedStep: null,
    });
  });

  it('ne réinitialise pas la balle cible lorsqu’un autre contact sort du capteur', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());

    expect(
      applyBasketGoalFact(
        entered,
        rule,
        contactFact({
          type: 'object-left-sensor',
          placementId: 'other-ball',
          fixedStep: 11,
        }),
      ),
    ).toBe(entered);
  });

  it('réinitialise le maintien à la sortie puis le recommence à la prochaine entrée', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());
    const left = applyBasketGoalFact(
      advanceBasketGoalEvaluation(entered, rule, 12),
      rule,
      contactFact({ type: 'object-left-sensor', fixedStep: 12 }),
    );
    const reentered = applyBasketGoalFact(left, rule, contactFact({ fixedStep: 14 }));

    expect(left).toEqual({ status: 'pending', enteredAtFixedStep: null });
    expect(advanceBasketGoalEvaluation(reentered, rule, 16)).toMatchObject({
      status: 'pending',
    });
    expect(advanceBasketGoalEvaluation(reentered, rule, 17)).toEqual({
      status: 'succeeded',
      enteredAtFixedStep: 14,
    });
  });

  it('une sortie ciblée réinitialise aussi une évaluation déjà réussie', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());
    const succeeded = advanceBasketGoalEvaluation(entered, rule, 13);

    expect(
      applyBasketGoalFact(
        succeeded,
        rule,
        contactFact({ type: 'object-left-sensor', fixedStep: 14 }),
      ),
    ).toEqual({ status: 'pending', enteredAtFixedStep: null });
  });

  it('conserve la première entrée lorsque le moteur répète un fait d’entrée', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());

    expect(applyBasketGoalFact(entered, rule, contactFact({ fixedStep: 11, order: 0 }))).toBe(
      entered,
    );
  });

  it('respecte l’ordre stable des faits produits au même pas fixe', () => {
    const initial = createBasketGoalEvaluation();
    const enteredThenLeft = applyBasketGoalFacts(initial, rule, [
      contactFact({ type: 'object-left-sensor', fixedStep: 10, order: 1 }),
      contactFact({ fixedStep: 10, order: 0 }),
    ]);
    const leftThenEntered = applyBasketGoalFacts(initial, rule, [
      contactFact({ fixedStep: 10, order: 1 }),
      contactFact({ type: 'object-left-sensor', fixedStep: 10, order: 0 }),
    ]);

    expect(enteredThenLeft.enteredAtFixedStep).toBeNull();
    expect(leftThenEntered.enteredAtFixedStep).toBe(10);
  });

  it('refuse deux faits sans ordre stable distinct au même pas', () => {
    expect(() =>
      applyBasketGoalFacts(createBasketGoalEvaluation(), rule, [
        contactFact({ order: 0 }),
        contactFact({ type: 'object-left-sensor', order: 0 }),
      ]),
    ).toThrow('ordre stable unique');
  });

  it('fournit un reset explicite sans conserver le résultat précédent', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());
    const succeeded = advanceBasketGoalEvaluation(entered, rule, 13);

    expect(succeeded.status).toBe('succeeded');
    expect(resetBasketGoalEvaluation()).toEqual({
      status: 'pending',
      enteredAtFixedStep: null,
    });
  });

  it('accepte une durée nulle et refuse les durées ou pas fixes invalides', () => {
    const entered = applyBasketGoalFact(createBasketGoalEvaluation(), rule, contactFact());

    expect(
      advanceBasketGoalEvaluation(entered, { ...rule, holdDurationInFixedSteps: 0 }, 10),
    ).toMatchObject({ status: 'succeeded' });
    expect(() =>
      advanceBasketGoalEvaluation(entered, { ...rule, holdDurationInFixedSteps: -1 }, 10),
    ).toThrow('durée de maintien');
    expect(() => advanceBasketGoalEvaluation(entered, rule, 9)).toThrow('ne peut pas précéder');
  });

  it('ne modifie ni la règle issue du niveau, ni le fait, ni l’état précédent', () => {
    const initial = createBasketGoalEvaluation();
    const fact = contactFact();
    const ruleSnapshot = structuredClone(rule);
    const factSnapshot = structuredClone(fact);

    const entered = applyBasketGoalFact(initial, rule, fact);
    advanceBasketGoalEvaluation(entered, rule, 13);

    expect(rule).toEqual(ruleSnapshot);
    expect(fact).toEqual(factSnapshot);
    expect(initial).toEqual({ status: 'pending', enteredAtFixedStep: null });
  });
});
