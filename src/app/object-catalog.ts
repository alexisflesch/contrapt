/** The four placeable families (catalogue-initial.md), and their inventory wiring. */
export type ObjectKind = 'Balle' | 'Panier' | 'Poutre' | 'Bascule';

interface ObjectCatalogEntry {
  readonly kind: ObjectKind;
  readonly description: string;
}

export const objectKinds: readonly ObjectCatalogEntry[] = [
  { kind: 'Balle', description: 'Un corps libre entraîné par la gravité' },
  { kind: 'Panier', description: 'La cible finale de la scène' },
  { kind: 'Poutre', description: 'Trois longueurs pour guider la balle' },
  { kind: 'Bascule', description: 'Une bascule préassemblée' },
];

export const inventoryByObjectKind: Readonly<Record<ObjectKind, string>> = {
  Balle: 'inventory-ball',
  Panier: 'inventory-basket',
  Poutre: 'inventory-beam',
  Bascule: 'inventory-seesaw',
};
