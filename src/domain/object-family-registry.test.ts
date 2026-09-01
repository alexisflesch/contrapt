import { describe, expect, it } from 'vitest';

import {
  createObjectFamilyRegistry,
  initialObjectFamilyRegistry,
  type ObjectFamilyDefinition,
} from './object-family-registry';

describe('registre des familles d’objet', () => {
  it('enregistre exactement les quatre familles du catalogue initial', () => {
    expect(initialObjectFamilyRegistry.definitions.map(({ id }) => id)).toEqual([
      'ball',
      'basket',
      'beam',
      'seesaw',
    ]);

    expect(initialObjectFamilyRegistry.get('ball')?.catalogue.label).toBe('Balle');
    expect(initialObjectFamilyRegistry.get('basket')?.catalogue.label).toBe('Panier');
    expect(initialObjectFamilyRegistry.get('beam')?.catalogue.label).toBe('Poutre');
    expect(initialObjectFamilyRegistry.get('seesaw')?.catalogue.label).toBe('Bascule');
    expect(initialObjectFamilyRegistry.get('unknown')).toBeUndefined();
  });

  it('porte les capacités minimales déjà requises par le domaine', () => {
    expect(initialObjectFamilyRegistry.get('ball')?.capabilities).toEqual(['movable']);
    expect(initialObjectFamilyRegistry.get('basket')?.capabilities).toEqual(['movable', 'sensor']);
    expect(initialObjectFamilyRegistry.get('beam')?.capabilities).toEqual([
      'movable',
      'rotatable',
      'sized',
    ]);
    expect(initialObjectFamilyRegistry.get('seesaw')?.capabilities).toEqual(['movable']);
  });

  it('valide les propriétés sérialisables propres à chaque famille', () => {
    const ball = initialObjectFamilyRegistry.get('ball');
    const basket = initialObjectFamilyRegistry.get('basket');
    const beam = initialObjectFamilyRegistry.get('beam');
    const seesaw = initialObjectFamilyRegistry.get('seesaw');

    expect(ball?.propertiesSchema.safeParse({}).success).toBe(true);
    expect(basket?.propertiesSchema.safeParse({}).success).toBe(true);
    expect(seesaw?.propertiesSchema.safeParse({}).success).toBe(true);
    expect(ball?.propertiesSchema.safeParse({ color: 'red' }).success).toBe(false);

    for (const size of ['short', 'medium', 'long']) {
      expect(beam?.propertiesSchema.safeParse({ size }).success).toBe(true);
    }
    expect(beam?.propertiesSchema.safeParse({ size: 'extra-long' }).success).toBe(false);
    expect(beam?.propertiesSchema.safeParse({}).success).toBe(false);
  });

  it('refuse les identifiants de famille dupliqués', () => {
    const ball = initialObjectFamilyRegistry.get('ball');
    expect(ball).toBeDefined();
    if (ball === undefined) return;

    expect(() => createObjectFamilyRegistry([ball, ball])).toThrow(
      'La famille d’objet « ball » est déjà enregistrée.',
    );
  });

  it('valide les définitions compilées lors de la création du registre', () => {
    const ball = initialObjectFamilyRegistry.get('ball');
    expect(ball).toBeDefined();
    if (ball === undefined) return;

    const invalidDefinition: ObjectFamilyDefinition = {
      id: 'invalid-family',
      dataVersion: 0,
      catalogue: { label: '', description: '' },
      capabilities: ['movable', 'movable'],
      propertiesSchema: ball.propertiesSchema,
    };

    expect(() => createObjectFamilyRegistry([invalidDefinition])).toThrow();
  });
});
