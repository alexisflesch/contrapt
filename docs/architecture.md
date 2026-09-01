# Architecture cible

Statut : architecture logique proposée. Le moteur physique et le renderer du
plateau sont désormais tranchés par les ADR 0002 et 0006.

## Objectifs

- partager le domaine entre campagne, résolution et création de niveaux ;
- permettre l'ajout progressif de familles d'objets sans modifier un noyau central
  à chaque fois ;
- isoler le moteur physique, le rendu et le stockage ;
- rendre la majeure partie du comportement testable sans navigateur ;
- garder la version 1 entièrement statique sans fermer la porte à un repository
  distant ultérieur.

## Couches et dépendances

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

Dépendances autorisées :

- `domain` ne dépend d'aucune autre couche du projet ;
- `application` dépend de `domain` et de ports abstraits ;
- `simulation` dépend de `domain` et de l'adaptateur physique abstrait ;
- `presentation` dépend des projections du domaine et de la simulation ;
- `infrastructure` implémente les ports de stockage et de partage ;
- `app` compose les implémentations et gère le cycle de vie navigateur.

Une couche inférieure ne doit jamais importer une couche supérieure.

## Documents et états

Trois états ne doivent pas être confondus :

1. `LevelDocument` est l'intention persistante et sérialisable.
2. `EditorSession` contient sélection, historique, viewport et brouillon courant.
3. `SimulationSession` contient l'état physique éphémère créé depuis un snapshot du
   document.

Arrêter ou réinitialiser une simulation détruit `SimulationSession` puis peut la
recréer. Cela ne restaure jamais un monde physique sérialisé dans le niveau.

## Enveloppe de niveau

Le contrat persistant courant est `LevelDocument v1`. Il porte l'intention de
niveau échangée entre campagne, résolution et création : objets placés,
inventaire, zones de construction et objectif, sans jamais sérialiser un monde
physique ni un détail de rendu.

Le schéma Zod strict `src/domain/level-document.ts` est la source de vérité
exécutable ; le type TypeScript est inféré du schéma afin d'éviter deux
définitions divergentes. La forme exacte du contrat, les permissions par
placement et entrée d'inventaire, les unités et les bornes techniques sont
définies par l'ADR 0004 et ne sont pas répétées ici.

Chaque version persistante possède un décodeur strict et une migration vers la
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

## Modèle d'objet

### Définition compilée

Une famille d'objet est un module TypeScript enregistré au build. Il fournit :

- un identifiant stable et une version de données ;
- les métadonnées de catalogue et d'accessibilité ;
- un schéma Zod de propriétés sérialisables ;
- ses ports de connexion et capacités ;
- la construction de sa représentation physique ;
- son contrôleur de comportement éventuel ;
- sa projection visuelle ;
- ses poignées et propriétés d'édition ;
- ses validateurs et tests contractuels.

Le registre refuse les identifiants dupliqués et valide toutes les définitions au
démarrage de développement et au build.

Une famille visible par le joueur peut être physiquement composée de plusieurs
corps internes sans que cette composition ne devienne des placements de niveau ni
des objets manipulables séparément. Le détail par famille, comme les composants
internes de la bascule, est défini dans `docs/catalogue-initial.md`.

### Placement persistant

`objects` est une union Zod discriminée stricte sur `type` ; l'ADR 0004 fixe les
variantes v1 et les propriétés propres à chaque type. Un placement ne contient que
son identifiant, son type, sa transformée en unités du monde, ses propriétés et
ses permissions. Il ne contient ni version par objet, ni handle de moteur, ni
objet graphique.

### Instance éphémère

Une instance de simulation contient les handles de corps, colliders, joints,
capteurs et ressources graphiques. Elle n'est jamais sérialisée et ne fuit pas dans
le domaine.

### Capacités

Les outils ne testent pas des classes concrètes. Ils utilisent des capacités telles
que `movable`, `rotatable`, `sized`, `connectable` ou `sensor`.
Une capacité n'est ajoutée que lorsqu'un comportement réel en a besoin.

Il n'y a ni héritage profond, ni ECS générique dans l'architecture initiale.

Le catalogue initial et ses capacités minimales sont détaillées dans
`docs/catalogue-initial.md`.

## Connexions

`LevelDocument v1` ne contient pas de champ `connections`. La bascule reste un seul
placement, même si sa future instance de simulation crée un pivot interne. Ajouter
des pivots, ressorts, cordes, courroies ou liaisons logiques exigera un besoin de
game design, un nouveau contrat de document et une migration explicite.

## Objectifs

La v1 contient exactement un seul objectif déclaratif : `goal.type === 'basket'`.
Il référence par identifiant une balle et un panier déjà placés. Le capteur et la
durée de maintien qui l'évalue sont des détails globaux du jeu, pas du document.
Les objectifs composés, séquencés ou paramétrés ne seront ajoutés qu'avec un besoin
de game design concret et une migration de format.

## Commandes et historique

Toutes les mutations du document passent par des commandes atomiques et
sérialisables au minimum pendant la session. Une commande connaît son inverse ou
produit un nouveau document permettant undo/redo.

Les gestes continus sont regroupés : déplacer un objet pendant deux secondes crée
une seule entrée d'historique, pas une entrée par événement tactile. Une commande
invalide ne modifie ni le document ni l'historique.

Le domaine de commandes est commun au mode résolution et au mode création. En
résolution, les permissions persistantes du placement ou de l'entrée d'inventaire
déterminent quelles commandes sont autorisées ; le mode création garde ses propres
droits d'auteur.

## Simulation

Le moteur applicatif possède la boucle et utilise un pas fixe. Le rendu interpole si
nécessaire mais ne dicte pas le temps physique.

Un adaptateur physique masque seulement les primitives effectivement utilisées :
monde, corps rigides, colliders, capteurs, forces et joints retenus. Il ne cherche
pas à rendre interchangeables toutes les fonctions de tous les moteurs.

Planck.js est le moteur retenu ; Rapier 2D est écarté. Aucun type, handle, vecteur
ou callback propre à Planck ne traverse le port : c'est cette contrainte qui garde
la décision réversible. Voir `docs/decisions/0002-physics-engine-selection.md`.

## Rendu et interface

Le plateau est rendu en Canvas 2D natif, sans bibliothèque de rendu ; PixiJS est
écarté pour la v1. Les sprites sont des assets de l'application, portés par la
projection visuelle de chaque famille, jamais par un document de niveau. Voir
`docs/decisions/0006-board-renderer.md`. Les menus, tiroirs, formulaires et
dialogues restent dans le DOM pour profiter de la mise en page responsive, du
focus et de l'accessibilité native.

Le rendu lit une projection de l'état. Il ne porte pas la logique de victoire, les
règles d'inventaire ou la sérialisation.

Le jeu et l'éditeur utilisent la même scène. Les overlays et outils disponibles
changent selon le mode et les permissions.

Le langage d'interaction commun, les conflits de gestes et les scénarios
d'acceptation mobile sont décrits dans `docs/mobile-editor-interactions.md`.

## Stockage et partage

Des ports distincts représentent :

- le catalogue de niveaux embarqués ;
- les niveaux et brouillons locaux ;
- la progression ;
- l'import/export de fichier ;
- l'encodage/decode de fragment URL.

IndexedDB implémente le stockage local. Un futur service distant implémentera un
nouveau repository sans entrer dans le domaine ou la simulation.

Le codec URL ajoute version, algorithme, taille attendue et checksum. Il refuse une
charge trop grande avant et après décompression. Les fragments inconnus ou invalides
n'écrasent jamais un brouillon local.

## PWA et mises à jour

Le service worker met en cache l'app shell, les assets locaux et la campagne
embarquée. Une nouvelle version applicative ne doit pas prendre le contrôle au
milieu d'une session d'édition sans prévenir l'utilisateur et sauvegarder le
brouillon.

La politique de cache, la restauration après mise à jour et les migrations
IndexedDB doivent avoir des tests d'intégration dédiés.
