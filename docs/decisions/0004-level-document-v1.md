# ADR 0004 - Contrat persistant LevelDocument v1

Statut : accepté

Date : 2026-09-01

## Contexte

Contrapt! doit pouvoir partager les mêmes niveaux entre campagne, résolution et
création sans sérialiser un monde physique ou des détails de rendu. Les premiers
niveaux ne requièrent que les quatre familles initiales, un inventaire, une zone de
construction et un objectif de panier. Un schéma plus large introduirait des
paramètres encore sans usage réel et rendrait les futurs migrations plus difficiles
à raisonner.

## Décision

Le contrat courant est `LevelDocument v1`, validé à l'exécution par le schéma Zod
strict `src/domain/level-document.ts`. Son type TypeScript est inféré de ce schéma.
Tous les champs sont requis sauf `metadata.description` : les champs inconnus sont
refusés à chaque niveau du document.

```ts
interface LevelDocumentV1 {
  schemaVersion: 1;
  id: string;
  metadata: { title: string; description?: string };
  objects: ObjectPlacement[];
  inventory: InventoryEntry[];
  goal: { type: 'basket'; ballId: string; basketId: string };
  buildZones: Array<{
    min: { x: number; y: number };
    max: { x: number; y: number };
  }>;
}
```

`objects` et `inventory` sont chacun des unions Zod discriminées strictes sur
`type` :

- `ball`, `basket` et `seesaw` ont `props: {}` ;
- `beam` a `props: { size: 'short' | 'medium' | 'long' }`.

Tout placement comprend `id`, `type`, `transform` et
`permissions: { move, rotate, remove }`. Toute entrée d'inventaire comprend aussi
`id`, `type`, `props`, `quantity` et ce même triplet de permissions. Lors du
placement, ces permissions sont copiées vers l'objet créé. Les trois permissions
sont toujours explicites ; aucun champ `locked` ne persiste. L'interface peut
employer « Verrouillé par ce niveau » lorsque les trois valeurs sont `false`.

Les rotations de transformée sont des radians. En v1, seule la poutre peut recevoir
`permissions.rotate: true`; la rotation de la balle, du panier et de la bascule
n'est pas une commande disponible. Une bascule conserve sa transformée unique : son
pivot et sa planche restent internes à la future instance de simulation.

Le document porte exactement un objectif panier. `ballId` doit référencer un
placement de type `ball` et `basketId` un placement de type `basket`. Les deux
références ne peuvent donc pas être satisfaites par un objet de mauvaise famille ou
par un objet seulement présent dans l'inventaire.

Une zone de construction est un rectangle en unités du monde, avec des bornes
strictement croissantes sur chaque axe. Les conventions visuelles d'orientation du
monde restent indépendantes de cette représentation par minima et maxima.

### Limites techniques v1

Ces plafonds bornent les entrées non fiables et l'allocation de l'application. Ils
ne définissent ni la taille d'un puzzle, ni les réglages physiques de son gameplay.
Ils pourront être réexaminées avec des mesures et un changement de schéma si une
campagne réelle les approche.

| Donnée | Limite |
| --- | --- |
| Identifiant | 1 à 128 caractères ASCII minuscules, chiffres et tirets |
| Titre / description | 1 à 160 / 0 à 2 000 caractères |
| Coordonnées du monde | nombre fini compris entre -1 000 000 et 1 000 000 |
| Rotation | nombre fini compris entre -100 000 et 100 000 radians |
| Placements / entrées d'inventaire / zones | 512 / 128 / 64 maximum |
| Quantité d'inventaire | entier de 0 à 999 |

Les identifiants de placements sont uniques au sein de `objects`; ceux des entrées
sont uniques au sein de `inventory`. `id` identifie le niveau dans son repository :
sa non-duplication entre documents est la responsabilité de ce repository. La
validation sémantique traite séparément ces unicités, les références de l'objectif,
la disponibilité de rotation et les rectangles non vides.

La gravité, la durée de maintien dans le panier, les dimensions physiques, la
friction, le rebond et les constantes de bascule sont des règles globales, non des
champs persistants. Aucun champ `world`, `connections`, `goals`, objet de moteur
physique, handle de rendu, URL d'asset ou code exécutable n'est accepté en v1.

## Conséquences

- une simulation est toujours construite depuis une projection du document, jamais
  depuis un monde sérialisé ;
- les commandes de placement doivent propager les permissions de l'inventaire et
  les commandes de résolution doivent les appliquer ;
- le validateur de contenu et les codecs futurs appelleront ce schéma avant de
  laisser entrer des données dans le domaine ;
- les objectifs composés, les connexions, les réglages locaux du monde ou une
  nouvelle famille d'objet exigent une évolution versionnée, une migration et des
  tests de compatibilité ;
- aucune constante physique n'est figée par ce contrat.
