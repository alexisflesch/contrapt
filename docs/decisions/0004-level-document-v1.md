# ADR 0004 - Contrat persistant LevelDocument v1

Statut : accepte

Date : 2026-09-01

## Contexte

Contrapt! doit pouvoir partager les memes niveaux entre campagne, resolution et
creation sans serialiser un monde physique ou des details de rendu. Les premiers
niveaux ne requierent que les quatre familles initiales, un inventaire, une zone de
construction et un objectif de panier. Un schema plus large introduirait des
parametres encore sans usage reel et rendrait les futurs migrations plus difficiles
a raisonner.

## Decision

Le contrat courant est `LevelDocument v1`, valide a l'execution par le schema Zod
strict `src/domain/level-document.ts`. Son type TypeScript est infere de ce schema.
Tous les champs sont requis sauf `metadata.description` : les champs inconnus sont
refuses a chaque niveau du document.

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

`objects` et `inventory` sont chacun des unions Zod discriminees strictes sur
`type` :

- `ball`, `basket` et `seesaw` ont `props: {}` ;
- `beam` a `props: { size: 'short' | 'medium' | 'long' }`.

Tout placement comprend `id`, `type`, `transform` et
`permissions: { move, rotate, remove }`. Toute entree d'inventaire comprend aussi
`id`, `type`, `props`, `quantity` et ce meme triplet de permissions. Lors du
placement, ces permissions sont copiees vers l'objet cree. Les trois permissions
sont toujours explicites ; aucun champ `locked` ne persiste. L'interface peut
employer « Verrouille par ce niveau » lorsque les trois valeurs sont `false`.

Les rotations de transformee sont des radians. En v1, seule la poutre peut recevoir
`permissions.rotate: true`; la rotation de la balle, du panier et de la bascule
n'est pas une commande disponible. Une bascule conserve sa transformee unique : son
pivot et sa planche restent internes a la future instance de simulation.

Le document porte exactement un objectif panier. `ballId` doit referencer un
placement de type `ball` et `basketId` un placement de type `basket`. Les deux
references ne peuvent donc pas etre satisfaites par un objet de mauvaise famille ou
par un objet seulement present dans l'inventaire.

Une zone de construction est un rectangle en unites du monde, avec des bornes
strictement croissantes sur chaque axe. Les conventions visuelles d'orientation du
monde restent independantes de cette representation par minima et maxima.

### Limites techniques v1

Ces plafonds bornent les entrees non fiables et l'allocation de l'application. Ils
ne definissent ni la taille d'un puzzle, ni les reglages physiques de son gameplay.
Ils pourront etre reexaminees avec des mesures et un changement de schema si une
campagne reelle les approche.

| Donnee | Limite |
| --- | --- |
| Identifiant | 1 a 128 caracteres ASCII minuscules, chiffres et tirets |
| Titre / description | 1 a 160 / 0 a 2 000 caracteres |
| Coordonnees du monde | nombre fini compris entre -1 000 000 et 1 000 000 |
| Rotation | nombre fini compris entre -100 000 et 100 000 radians |
| Placements / entrees d'inventaire / zones | 512 / 128 / 64 maximum |
| Quantite d'inventaire | entier de 0 a 999 |

Les identifiants de placements sont uniques au sein de `objects`; ceux des entrees
sont uniques au sein de `inventory`. `id` identifie le niveau dans son repository :
sa non-duplication entre documents est la responsabilite de ce repository. La
validation semantique traite separement ces unicites, les references de l'objectif,
la disponibilite de rotation et les rectangles non vides.

La gravite, la duree de maintien dans le panier, les dimensions physiques, la
friction, le rebond et les constantes de bascule sont des regles globales, non des
champs persistants. Aucun champ `world`, `connections`, `goals`, objet de moteur
physique, handle de rendu, URL d'asset ou code executable n'est accepte en v1.

## Consequences

- une simulation est toujours construite depuis une projection du document, jamais
  depuis un monde serialise ;
- les commandes de placement doivent propager les permissions de l'inventaire et
  les commandes de resolution doivent les appliquer ;
- le validateur de contenu et les codecs futurs appelleront ce schema avant de
  laisser entrer des donnees dans le domaine ;
- les objectifs composes, les connexions, les reglages locaux du monde ou une
  nouvelle famille d'objet exigent une evolution versionnee, une migration et des
  tests de compatibilite ;
- aucune constante physique n'est figee par ce contrat.
