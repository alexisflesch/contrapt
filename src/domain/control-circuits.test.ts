import { describe, expect, it } from 'vitest';

import { controlCircuits } from './control-circuits';

const wire = (id: string, sourceId: string, targetId: string) => ({ id, sourceId, targetId });

describe('circuits de commande', () => {
  it('donne une lettre par levier, dans l’ordre de leur premier fil', () => {
    const circuits = controlCircuits([
      wire('wire-1', 'lever-b', 'conveyor-1'),
      wire('wire-2', 'lever-a', 'conveyor-2'),
      wire('wire-3', 'lever-b', 'conveyor-3'),
    ]);

    expect(circuits).toEqual([
      { sourceId: 'lever-b', label: 'A', index: 0, wireIds: ['wire-1', 'wire-3'] },
      { sourceId: 'lever-a', label: 'B', index: 1, wireIds: ['wire-2'] },
    ]);
  });

  it('continue au-delà de Z sans collision', () => {
    const circuits = controlCircuits(
      Array.from({ length: 28 }, (_, index) =>
        wire(`wire-${String(index)}`, `lever-${String(index)}`, `conveyor-${String(index)}`),
      ),
    );

    expect(circuits.map(({ label }) => label).slice(24)).toEqual(['Y', 'Z', 'A2', 'B2']);
  });
});
