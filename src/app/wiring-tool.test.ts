import { describe, expect, it } from 'vitest';

import { wiringGuide, wiringStepAfterWire, wiringTap, type WiringStep } from './use-wiring-tool';

const objects = [
  { id: 'lever-1', type: 'lever' },
  { id: 'button-1', type: 'button' },
  { id: 'conveyor-1', type: 'conveyor' },
  { id: 'fan-1', type: 'fan' },
  { id: 'ball-1', type: 'ball' },
] as const;

const sourceStep: WiringStep = { kind: 'source' };
const targetOf = (sourceId: string): WiringStep => ({ kind: 'target', sourceId, linkedCount: 0 });

describe('outil fil : source puis cible (U15)', () => {
  it('guide chaque étape et nomme la commande qui sort du geste', () => {
    expect(wiringGuide(sourceStep)).toEqual({
      prompt: 'Touchez un levier ou un bouton',
      exitLabel: 'Annuler le fil',
    });
    expect(wiringGuide(targetOf('lever-1'))).toEqual({
      prompt: 'Touchez l’appareil à commander',
      exitLabel: 'Annuler le fil',
    });
    expect(wiringGuide({ kind: 'target', sourceId: 'lever-1', linkedCount: 1 })).toEqual({
      prompt: 'Fil posé. Touchez un autre appareil à commander',
      exitLabel: 'Terminer les fils',
    });
  });

  it('prend un levier ou un bouton comme source', () => {
    expect(wiringTap(sourceStep, objects, 'lever-1')).toEqual({
      kind: 'next',
      step: targetOf('lever-1'),
    });
    expect(wiringTap(sourceStep, objects, 'button-1')).toEqual({
      kind: 'next',
      step: targetOf('button-1'),
    });
  });

  it('refuse une source qui ne commande rien, avec la règle du domaine', () => {
    for (const placementId of ['conveyor-1', 'ball-1', 'absent']) {
      expect(wiringTap(sourceStep, objects, placementId)).toEqual({
        kind: 'refused',
        message: 'Un fil doit partir d’un levier ou d’un bouton placé.',
      });
    }
  });

  it('relie la source à un appareil qu’elle peut commander', () => {
    expect(wiringTap(targetOf('lever-1'), objects, 'conveyor-1')).toEqual({
      kind: 'connect',
      sourceId: 'lever-1',
      targetId: 'conveyor-1',
    });
    expect(wiringTap(targetOf('button-1'), objects, 'fan-1')).toEqual({
      kind: 'connect',
      sourceId: 'button-1',
      targetId: 'fan-1',
    });
  });

  it('refuse une cible qui n’obéit pas, et un convoyeur pour un bouton', () => {
    expect(wiringTap(targetOf('lever-1'), objects, 'ball-1')).toEqual({
      kind: 'refused',
      message: 'Un fil doit arriver sur un convoyeur, un ventilateur ou une barrière placés.',
    });
    expect(wiringTap(targetOf('lever-1'), objects, 'lever-1')).toEqual({
      kind: 'refused',
      message: 'Un fil doit arriver sur un convoyeur, un ventilateur ou une barrière placés.',
    });
    expect(wiringTap(targetOf('button-1'), objects, 'conveyor-1')).toEqual({
      kind: 'refused',
      message: 'Un bouton ne commande pas de convoyeur : seul un levier en donne le sens.',
    });
  });

  it('revient au choix de la source si la sienne a disparu', () => {
    expect(wiringTap(targetOf('absent'), objects, 'fan-1')).toEqual({
      kind: 'next',
      step: sourceStep,
    });
  });
});

describe('outil fil du joueur : un fil de l’inventaire par liaison (U21)', () => {
  const onLever: WiringStep = { kind: 'target', sourceId: 'lever-1', linkedCount: 0 };

  it('reste sur la source tant qu’il reste des fils, ou sans compte pour l’auteur', () => {
    expect(wiringStepAfterWire(onLever, null)).toEqual({ ...onLever, linkedCount: 1 });
    expect(wiringStepAfterWire(onLever, 2)).toEqual({ ...onLever, linkedCount: 1 });
  });

  it('quitte le geste quand l’inventaire n’a plus de fil', () => {
    expect(wiringStepAfterWire(onLever, 0)).toBeNull();
  });
});
