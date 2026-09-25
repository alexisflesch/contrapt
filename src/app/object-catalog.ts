/** The placeable families (catalogue-initial.md), and their inventory wiring. */
export type ObjectKind =
  | 'Balle'
  | 'Panier'
  | 'Poutre'
  | 'Bascule'
  | 'Masse'
  | 'Levier'
  | 'Convoyeur';

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
  { kind: 'Levier', description: 'Commande un convoyeur : gauche, arrêt, droite' },
  { kind: 'Convoyeur', description: 'Un tapis qui entraîne ce qu’il porte' },
];

export const inventoryByObjectKind: Readonly<Record<ObjectKind, string>> = {
  Balle: 'inventory-ball',
  Panier: 'inventory-basket',
  Poutre: 'inventory-beam',
  Bascule: 'inventory-seesaw',
  Masse: 'inventory-mass',
  Levier: 'inventory-lever',
  Convoyeur: 'inventory-conveyor',
};
