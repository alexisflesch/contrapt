import type { LevelDocument } from '../domain/level-document';

/** The placeable families (catalogue-initial.md), and their inventory wiring. */
export type ObjectKind =
  | 'Balle'
  | 'Panier'
  | 'Poutre'
  | 'Bascule'
  | 'Masse'
  | 'Levier'
  | 'Convoyeur'
  | 'Bouton'
  | 'Ventilateur'
  | 'Barrière'
  | 'Tremplin';

interface ObjectCatalogEntry {
  readonly kind: ObjectKind;
  readonly description: string;
}

export const objectKinds: readonly ObjectCatalogEntry[] = [
  { kind: 'Balle', description: 'Un corps libre entraîné par la gravité' },
  { kind: 'Panier', description: 'La cible finale de la scène' },
  { kind: 'Poutre', description: 'Trois longueurs pour guider la balle' },
  { kind: 'Bascule', description: 'Une bascule préassemblée' },
  { kind: 'Masse', description: 'Un poids lourd qui fait basculer' },
  { kind: 'Levier', description: 'Commande un appareil : gauche, arrêt, droite' },
  { kind: 'Convoyeur', description: 'Un tapis qui entraîne ce qu’il porte' },
  { kind: 'Bouton', description: 'Actif tant qu’un objet appuie dessus' },
  { kind: 'Ventilateur', description: 'Souffle sur ce qui passe devant lui' },
  { kind: 'Barrière', description: 'Une barre qui rentre dans son poteau' },
  { kind: 'Tremplin', description: 'Renvoie vers le haut ce qui tombe dessus' },
];

export const inventoryTypeByObjectKind = {
  Balle: 'ball',
  Panier: 'basket',
  Poutre: 'beam',
  Bascule: 'seesaw',
  Masse: 'mass',
  Levier: 'lever',
  Convoyeur: 'conveyor',
  Bouton: 'button',
  Ventilateur: 'fan',
  Barrière: 'barrier',
  Tremplin: 'springboard',
} as const satisfies Readonly<Record<ObjectKind, string>>;

type Placement = LevelDocument['objects'][number];

/**
 * A card of the author's catalogue. It places an object straight into the
 * level, outside the player's inventory, so it works on any level (U20).
 */
export interface AuthorCatalogueEntry {
  readonly key: string;
  readonly kind: ObjectKind;
  readonly name: string;
  /** Spoken name when it says more than the card title. */
  readonly accessibleName: string;
  readonly description: string;
  readonly type: Placement['type'];
  readonly props: Placement['props'];
}

const authorEntry = (
  kind: ObjectKind,
  type: Placement['type'],
  props: Placement['props'] = {},
): AuthorCatalogueEntry => {
  const { description } = objectKinds.find((entry) => entry.kind === kind) ?? { description: '' };
  return {
    key: type,
    kind,
    name: kind,
    accessibleName: kind,
    description,
    type,
    props,
  };
};

/**
 * The goal's red ball and its basket are unique and already on the board
 * (LevelDocument v2 has a single goal): the author only adds blue balls,
 * listed simply as « Balle ».
 */
export const authorCatalogue: readonly AuthorCatalogueEntry[] = [
  {
    ...authorEntry('Balle', 'ball'),
    description: 'Une pièce de la machine',
  },
  { ...authorEntry('Poutre', 'beam', { size: 'medium' }), accessibleName: 'Poutre moyenne' },
  authorEntry('Bascule', 'seesaw'),
  authorEntry('Masse', 'mass', { weight: '10kg' }),
  authorEntry('Levier', 'lever', { position: 'center' }),
  authorEntry('Convoyeur', 'conveyor', { direction: 'stopped' }),
  authorEntry('Bouton', 'button'),
  authorEntry('Ventilateur', 'fan', { state: 'on' }),
  authorEntry('Barrière', 'barrier', { state: 'closed' }),
  authorEntry('Tremplin', 'springboard'),
];
