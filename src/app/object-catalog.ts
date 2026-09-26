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

export const inventoryByObjectKind: Readonly<Record<ObjectKind, string>> = {
  Balle: 'inventory-ball',
  Panier: 'inventory-basket',
  Poutre: 'inventory-beam',
  Bascule: 'inventory-seesaw',
  Masse: 'inventory-mass',
  Levier: 'inventory-lever',
  Convoyeur: 'inventory-conveyor',
  Bouton: 'inventory-button',
  Ventilateur: 'inventory-fan',
  Barrière: 'inventory-barrier',
  Tremplin: 'inventory-springboard',
};
