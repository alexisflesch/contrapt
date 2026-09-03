import type { LevelDocument } from '../domain/level-document';

/** The French display name for a placed object, shared by `BoardView` and `ContextPanel`. */
export const placementName = (object: LevelDocument['objects'][number]): string =>
  object.type === 'ball'
    ? 'Balle'
    : object.type === 'basket'
      ? 'Panier'
      : object.type === 'beam'
        ? 'Poutre'
        : 'Bascule';
