# Architecture cible

Statut : architecture logique proposee. Les bibliotheques marquees comme candidates
ne sont pas encore retenues.

## Objectifs

- partager le domaine entre campagne, resolution et creation de niveaux ;
- permettre l'ajout progressif de familles d'objets sans modifier un noyau central
  a chaque fois ;
- isoler le moteur physique, le rendu et le stockage ;
- rendre la majeure partie du comportement testable sans navigateur ;
- garder la version 1 entierement statique sans fermer la porte a un repository
  distant ulterieur.

## Couches et dependances

```text
app / UI DOM
    | utilise
application (commandes, historique, cas d'usage)
    | utilise
domain (documents, schemas, catalogue, objectifs)
    ^                         ^
    | implemente des ports    | projette
infrastructure               simulation et presentation
```

Dependances autorisees :

- `domain` ne depend d'aucune autre couche du projet ;
- `application` depend de `domain` et de ports abstraits ;
- `simulation` depend de `domain` et de l'adaptateur physique abstrait ;
- `presentation` depend des projections du domaine et de la simulation ;
- `infrastructure` implemente les ports de stockage et de partage ;
- `app` compose les implementations et gere le cycle de vie navigateur.

Une couche inferieure ne doit jamais importer une couche superieure.

## Documents et etats

Trois etats ne doivent pas etre confondus :

1. `LevelDocument` est l'intention persistante et serialisable.
2. `EditorSession` contient selection, historique, viewport et brouillon courant.
3. `SimulationSession` contient l'etat physique ephemere cree depuis un snapshot du
   document.

Arreter ou reinitialiser une simulation detruit `SimulationSession` puis peut la
recreer. Cela ne restaure jamais un monde physique serialise dans le niveau.

## Enveloppe de niveau

Le schema conceptuel minimal est :

```ts
interface LevelDocument {
  schemaVersion: number;
  id: string;
  metadata: LevelMetadata;
  world: WorldSettings;
  objects: ObjectPlacement[];
  connections: ConnectionPlacement[];
  inventory: InventoryEntry[];
  goals: GoalDefinition[];
  restrictions?: RestrictionDefinition[];
  hints?: HintDefinition[];
}
```

Le schema Zod est la source de verite executable. Le type TypeScript est infere du
schema lorsque c'est possible, afin d'eviter deux definitions divergentes.

Chaque version persistante possede un decodeur strict et une migration vers la
version courante. La pipeline est :

```text
octets ou texte non fiable
  -> limite de taille
  -> parsing
  -> validation de l'enveloppe
  -> migrations version par version
  -> validation du document courant
  -> LevelDocument utilisable
```

## Modele d'objet

### Definition compilee

Une famille d'objet est un module TypeScript enregistre au build. Il fournit :

- un identifiant stable et une version de donnees ;
- les metadonnees de catalogue et d'accessibilite ;
- un schema Zod de proprietes serialisables ;
- ses ports de connexion et capacites ;
- la construction de sa representation physique ;
- son controleur de comportement eventuel ;
- sa projection visuelle ;
- ses poignees et proprietes d'edition ;
- ses validateurs et tests contractuels.

Le registre refuse les identifiants dupliques et valide toutes les definitions au
demarrage de developpement et au build.

Une famille visible par le joueur peut etre physiquement composee. La bascule, par
exemple, est une seule famille dans le catalogue et peut creer en interne un socle,
une planche dynamique et un joint de rotation. Ces composants internes ne deviennent
ni des placements de niveau, ni des objets manipulables separement.

### Placement persistant

Un placement ne contient que des donnees stables :

```ts
interface ObjectPlacement<Props = unknown> {
  id: string;
  type: string;
  objectVersion: number;
  transform: {
    position: { x: number; y: number };
    rotation: number;
  };
  props: Props;
  locked?: boolean;
}
```

Les unites et conventions d'angle devront etre fixees dans une decision dediee.

### Instance ephemere

Une instance de simulation contient les handles de corps, colliders, joints,
capteurs et ressources graphiques. Elle n'est jamais serialisee et ne fuit pas dans
le domaine.

### Capacites

Les outils ne testent pas des classes concretes. Ils utilisent des capacites telles
que `movable`, `rotatable`, `sized`, `connectable` ou `sensor`.
Une capacite n'est ajoutee que lorsqu'un comportement reel en a besoin.

Il n'y a ni heritage profond, ni ECS generique dans l'architecture initiale.

Le catalogue initial et ses capacites minimales sont detailles dans
`docs/catalogue-initial.md`.

## Connexions

Une connexion est une entite de document distincte. Ses extremites referencent un
objet et un port nomme. Les schemas verifient la forme ; un validateur semantique
verifie l'existence des objets, des ports et leur compatibilite.

Les connexions permettent plus tard d'ajouter pivots, ressorts, cordes, courroies ou
liaisons logiques sans imbriquer les objets les uns dans les autres. La presence de
ce modele ne force pas l'interface a exposer toutes ces connexions en version 1.

## Objectifs

Les objectifs sont des definitions declaratives choisies dans un registre ferme.
Ils ne contiennent pas de code. Les premiers evaluateurs doivent rester simples :

- un objet ou un type d'objet entre dans une zone ;
- une condition reste vraie pendant une duree ;
- un capteur est active ;
- tous ou au moins un des sous-objectifs est satisfait.

Une sequence ou des expressions plus riches ne seront ajoutees qu'avec un besoin de
game design concret.

## Commandes et historique

Toutes les mutations du document passent par des commandes atomiques et
serialisables au minimum pendant la session. Une commande connait son inverse ou
produit un nouveau document permettant undo/redo.

Les gestes continus sont regroupes : deplacer un objet pendant deux secondes cree
une seule entree d'historique, pas une entree par evenement tactile. Une commande
invalide ne modifie ni le document ni l'historique.

Le domaine de commandes est commun au mode resolution et au mode creation. Les
permissions de la session determinent quelles commandes sont autorisees.

## Simulation

Le moteur applicatif possede la boucle et utilise un pas fixe. Le rendu interpole si
necessaire mais ne dicte pas le temps physique.

Un adaptateur physique masque seulement les primitives effectivement utilisees :
monde, corps rigides, colliders, capteurs, forces et joints retenus. Il ne cherche
pas a rendre interchangeables toutes les fonctions de tous les moteurs.

Planck.js et Rapier 2D restent candidats. La decision suivra la suite de conformite
decrite dans `docs/decisions/0002-physics-engine-selection.md`.

## Rendu et interface

Le plateau utilise un renderer 2D dedie, PixiJS etant le candidat initial. Les
menus, tiroirs, formulaires et dialogues restent dans le DOM pour profiter de la
mise en page responsive, du focus et de l'accessibilite native.

Le rendu lit une projection de l'etat. Il ne porte pas la logique de victoire, les
regles d'inventaire ou la serialisation.

Le jeu et l'editeur utilisent la meme scene. Les overlays et outils disponibles
changent selon le mode et les permissions.

Le langage d'interaction commun, les conflits de gestes et les scenarios
d'acceptation mobile sont decrits dans `docs/mobile-editor-interactions.md`.

## Stockage et partage

Des ports distincts representent :

- le catalogue de niveaux embarques ;
- les niveaux et brouillons locaux ;
- la progression ;
- l'import/export de fichier ;
- l'encodage/decode de fragment URL.

IndexedDB implemente le stockage local. Un futur service distant implementera un
nouveau repository sans entrer dans le domaine ou la simulation.

Le codec URL ajoute version, algorithme, taille attendue et checksum. Il refuse une
charge trop grande avant et apres decompression. Les fragments inconnus ou invalides
n'ecrasent jamais un brouillon local.

## PWA et mises a jour

Le service worker met en cache l'app shell, les assets locaux et la campagne
embarquee. Une nouvelle version applicative ne doit pas prendre le controle au
milieu d'une session d'edition sans prevenir l'utilisateur et sauvegarder le
brouillon.

La politique de cache, la restauration apres mise a jour et les migrations
IndexedDB doivent avoir des tests d'integration dedies.
