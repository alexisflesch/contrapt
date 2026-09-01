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

Le contrat persistant courant est `LevelDocument v1`, defini par le schema Zod
strict `src/domain/level-document.ts`. Sa forme est volontairement plus petite que
le modele d'evolution envisage :

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

Chaque placement existant, comme chaque entree d'inventaire, porte explicitement
`permissions: { move: boolean; rotate: boolean; remove: boolean }`. Lorsqu'une
entree est placee, ses permissions deviennent celles du nouveau placement. Il n'y
a pas de booleen generique `locked` dans le document.

Le schema Zod est la source de verite executable. Le type TypeScript est infere du
schema afin d'eviter deux definitions divergentes. Il refuse les champs inconnus,
les valeurs non finies et les bornes techniques ; sa validation semantique refuse
notamment les identifiants de placement ou d'inventaire dupliques et les references
de but qui ne designent pas une balle et un panier places.

Les positions et les bornes de `buildZones` sont en unites du monde. Une zone est
un rectangle non vide : `min.x < max.x` et `min.y < max.y`. Les rotations de toutes
les transformees sont persistees en radians.

La gravite et la duree de maintien dans le panier sont des regles globales de
l'application, non des proprietes de niveau v1. Les objets du moteur physique, le
monde de simulation et tout parametre de rendu restent egalement absents du format.
Les choix et plafonds associes sont consignes dans l'ADR 0004.

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

`objects` est une union discriminee stricte sur `type`. Les quatre variantes v1
sont `ball`, `basket`, `beam` et `seesaw`. Seule une poutre a une propriete :
`props: { size: 'short' | 'medium' | 'long' }`; les trois autres ont des
proprietes strictement vides. Un placement ne contient que son identifiant, son
type, sa transformee en unites du monde, ses proprietes et ses permissions. Il ne
contient ni version par objet, ni handle de moteur, ni objet graphique.

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

`LevelDocument v1` ne contient pas de champ `connections`. La bascule reste un seul
placement, meme si sa future instance de simulation cree un pivot interne. Ajouter
des pivots, ressorts, cordes, courroies ou liaisons logiques exigera un besoin de
game design, un nouveau contrat de document et une migration explicite.

## Objectifs

La v1 contient exactement un seul objectif declaratif : `goal.type === 'basket'`.
Il reference par identifiant une balle et un panier deja places. Le capteur et la
duree de maintien qui l'evalue sont des details globaux du jeu, pas du document.
Les objectifs composes, sequences ou parametres ne seront ajoutes qu'avec un besoin
de game design concret et une migration de format.

## Commandes et historique

Toutes les mutations du document passent par des commandes atomiques et
serialisables au minimum pendant la session. Une commande connait son inverse ou
produit un nouveau document permettant undo/redo.

Les gestes continus sont regroupes : deplacer un objet pendant deux secondes cree
une seule entree d'historique, pas une entree par evenement tactile. Une commande
invalide ne modifie ni le document ni l'historique.

Le domaine de commandes est commun au mode resolution et au mode creation. En
resolution, les permissions persistantes du placement ou de l'entree d'inventaire
determinent quelles commandes sont autorisees ; le mode creation garde ses propres
droits d'auteur.

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
