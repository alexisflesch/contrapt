import type { LevelDocument } from './level-document';

type ControlWire = LevelDocument['wires'][number];

/**
 * A circuit gathers every wire leaving one lever. It is derived, never
 * stored: its letter follows the order in which levers were first wired, so
 * the document only records who commands whom.
 */
interface ControlCircuit {
  readonly sourceId: string;
  /** "A" to "Z", then "A2", "B2"… Shown next to both ends so colour is never the only cue. */
  readonly label: string;
  /** Position of the circuit, which the presentation maps to a colour. */
  readonly index: number;
  readonly wireIds: readonly string[];
}

const ALPHABET_LENGTH = 26;

const circuitLabel = (index: number): string => {
  const letter = String.fromCharCode('A'.charCodeAt(0) + (index % ALPHABET_LENGTH));
  const round = Math.floor(index / ALPHABET_LENGTH);
  return round === 0 ? letter : `${letter}${String(round + 1)}`;
};

export const controlCircuits = (wires: readonly ControlWire[]): readonly ControlCircuit[] => {
  const wireIdsBySource = new Map<string, string[]>();
  for (const wire of wires) {
    const wireIds = wireIdsBySource.get(wire.sourceId);
    if (wireIds === undefined) {
      wireIdsBySource.set(wire.sourceId, [wire.id]);
    } else {
      wireIds.push(wire.id);
    }
  }

  return [...wireIdsBySource].map(([sourceId, wireIds], index) => ({
    sourceId,
    label: circuitLabel(index),
    index,
    wireIds,
  }));
};
