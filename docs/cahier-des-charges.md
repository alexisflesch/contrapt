# Cahier des charges — Contrapt!

Statut : cadrage consolidé, version 0.2.

Ce document est le point d’entrée produit et technique du projet. Il rassemble les
décisions nécessaires pour reprendre le travail sans dépendre de l’historique d’une
conversation, mais ne duplique pas les spécifications détaillées. Le code, les
schémas exécutables, les tests et les ADR acceptées restent prioritaires en cas de
divergence.

## Vision

**Contrapt!** est un jeu original de puzzles mécaniques 2D, moderne et
mobile-first. Le joueur place un petit nombre d’objets dans une scène, lance la
simulation et observe si sa construction atteint un objectif clairement exprimé.

Le jeu réinterprète le plaisir de construire une réaction en chaîne sans reproduire
le catalogue, les niveaux, les graphismes ou les mécanismes d’un jeu existant. Il
doit commencer simplement et accepter de nouvelles familles d’objets sans remise à
plat du format de niveau, du domaine ou de l’éditeur.

La direction visuelle de travail est une 2D plate, chaude et légèrement cartoon.
Elle exclut les effets décoratifs de faux relief et de perspective. L’identité
finale, l’apparence des objets et l’animation seront définies ensemble par
itérations ; elles ne doivent pas contaminer les identifiants ou règles de
gameplay.

## Principes produit

- Une règle nouvelle est introduite seule ou avec très peu d’autres nouveautés.
- Les premiers niveaux se comprennent en quelques secondes.
- La complexité vient progressivement des combinaisons, pas d’interfaces cachées.
- Jouer, modifier une solution et créer un niveau emploient le même plateau et le
  même langage d’interaction.
- Une erreur doit pouvoir être annulée rapidement ; l’expérimentation est au cœur
  de la boucle de jeu.
- Le jeu fonctionne hors ligne après sa première installation.
- La version 1 ne requiert ni compte, ni backend, ni connexion permanente.
- La modularité s’appuie sur des contrats étroits et des cas réels, pas sur un
  système de plugins ou une architecture générique anticipée.

## Public et plateformes

La cible principale est le navigateur d’un téléphone récent, en portrait comme en
paysage. Tablettes et ordinateurs sont également pris en charge. Le clavier et la
souris améliorent le confort mais ne sont jamais requis pour une fonction
essentielle.

La matrice exacte des navigateurs et appareils sera fixée avant le premier jalon
de production. Les tests Playwright tactiles ne remplacent pas les essais sur de
vrais téléphones.

## Boucle principale

1. Comprendre l’objectif et observer les éléments déjà placés.
2. Ouvrir le tiroir des objets disponibles si le niveau fournit un inventaire.
3. Placer, déplacer, pivoter ou retirer les objets autorisés.
4. Lancer la simulation.
5. Observer, mettre en pause ou réinitialiser.
6. Ajuster la construction jusqu’à la réussite.
7. Passer au niveau suivant ou continuer à expérimenter.

Le passage entre construction et simulation doit être immédiat. La simulation est
créée depuis un snapshot et ne modifie jamais le document édité. Le reset restitue
exactement l’état précédant le lancement, inventaire et historique compris.

## Modes

### Campagne

La PWA doit embarquer une campagne jouable hors ligne. Un manifeste versionné
définira l’ordre des chapitres, les prérequis et les objets introduits. La
progression sera conservée localement.

### Résolution d’un niveau

Le joueur ne manipule que ce que le niveau autorise : inventaire limité, zones de
construction et permissions explicites `move`, `rotate` et `remove`. « Verrouillé
par ce niveau » n’est qu’un libellé d’interface pour un placement dont les trois
permissions valent `false`, pas une propriété persistante supplémentaire.

### Création de niveau

L’auteur utilise le même plateau et les mêmes gestes avec des capacités
supplémentaires : catalogue autorisé, objets, inventaire, zones de construction,
objectif, métadonnées, permissions du futur joueur, validation et partage. Les
paramètres physiques globaux ne deviennent pas pour autant des propriétés du
niveau v1.

L’éditeur doit être entièrement utilisable sur téléphone dès le premier jalon
fonctionnel. Une interface plus dense peut exploiter un grand écran, mais aucune
fonction indispensable d’auteur ne devient exclusivement desktop.

## Interaction mobile

En portrait, le catalogue est un véritable tiroir bas : il est ancré au viewport,
superposé au plateau sans redimensionner celui-ci et possède au minimum deux états,
replié et ouvert. À l’ouverture, un voile d’arrière-plan (`scrim`) sépare le tiroir
du plateau et permet de le fermer. Son contenu défile indépendamment et respecte
les safe areas. En paysage suffisamment large, le même contenu devient un panneau
latéral afin de préserver la hauteur du plateau. Le choix d’un objet replie assez
le tiroir pour rendre le placement possible.

Le tiroir reste utilisable par des contrôles visibles ; un geste de glissement peut
améliorer le confort mais ne doit pas être la seule façon de l’ouvrir ou de le
fermer. L’ouverture, les filtres et le défilement ne modifient ni le document, ni
l’historique, ni la géométrie logique du plateau.

Les autres exigences principales sont :

- toucher pour sélectionner, glisser pour déplacer et poignée explicite pour
  pivoter une poutre ;
- panoramique et zoom sans conflit avec la manipulation d’un objet ;
- contrôles visibles pour annuler, rétablir, tester, pause, reset et cadrage ;
- cibles tactiles d’au moins 44 × 44 pixels CSS ;
- aucune action essentielle dépendante du hover, du clic droit, du clavier, d’un
  appui long ou du multi-touch ;
- retour visible et accessible lorsqu’une commande est interdite ou invalide ;
- annulation atomique d’une manipulation interrompue par `pointercancel`, un
  changement d’orientation ou l’arrivée d’un second doigt.

Les gestes, états, conflits et scénarios d’acceptation complets sont définis dans
[les interactions mobiles](mobile-editor-interactions.md).

## Catalogue initial exact

Le premier vocabulaire visible contient exactement quatre familles :

- **balle** : seul corps libre initial, circulaire et dynamique ;
- **panier** : cible fixe contenant le capteur de réussite ;
- **poutre** : corps statique, avec la propriété discrète `short`, `medium` ou
  `long` ;
- **bascule** : objet préassemblé unique, dont le socle, la planche et le pivot
  restent des détails éphémères de simulation.

Une taille de poutre n’est pas une famille différente. La bascule ne demande ni
connexion manuelle, ni réglage de joint. En v1, seule une poutre peut être rotatable
par commande. Les propriétés physiques, dimensions et rendus sont définis dans le
jeu et non dans chaque document de niveau.

La gravité fournit seule l’énergie des premiers puzzles. Il n’y a initialement ni
interrupteur, ni ventilateur, ni moteur. Blocs, dominos, roues libres, ressorts,
cordes, poulies, engrenages, électricité, fluides, corps déformables et destruction
sont reportés jusqu’à ce qu’un besoin de gameplay les justifie.

Voir [le catalogue initial](catalogue-initial.md) pour les responsabilités et les
contrats attendus de chaque famille.

## Progression pédagogique et contenu

La première progression introduit successivement :

1. observer la gravité, lancer et réinitialiser ;
2. placer une poutre sans la tourner ;
3. incliner une poutre ;
4. choisir entre les trois longueurs ;
5. combiner deux passages sans rebond intentionnel ;
6. observer une bascule préassemblée ;
7. placer une bascule comme un objet unique ;
8. guider une balle avec une poutre puis une bascule.

Les huit niveaux sont spécifiés dans
[la progression initiale](levels/initial-progression.md). Les rebonds de précision
sont volontairement exclus de ce premier chapitre. Chaque niveau livré devra être
valide, compréhensible, résoluble au tactile et accompagné d’un scénario de
régression physique robuste.

La version 1 vise une campagne complète et non une collection de scènes
techniques. Son nombre final de chapitres et de niveaux sera décidé après mesure du
rythme de production et des apprentissages.

## Format de niveau

Le contrat persistant courant est `LevelDocument v1`, validé par un schéma Zod
strict. Il contient seulement :

- `schemaVersion`, un identifiant et des métadonnées ;
- des placements discriminés parmi les quatre familles initiales ;
- un inventaire quantifié ;
- exactement un objectif panier référençant une balle et un panier déjà placés ;
- des zones de construction rectangulaires en unités du monde.

Chaque placement et chaque entrée d’inventaire déclare explicitement les
permissions `move`, `rotate` et `remove`. Les rotations sont exprimées en radians.
Les champs inconnus, nombres non finis, références invalides, identifiants
dupliqués et dépassements des bornes techniques sont refusés.

Le document ne contient ni monde physique sérialisé, ni gravité locale, ni durée
de victoire, ni connexion, ni handle de rendu, ni URL d’asset distante, ni code
exécutable. Toute évolution incompatible exige une version, une migration et des
tests. La définition complète et les limites sont dans
[l’ADR 0004](decisions/0004-level-document-v1.md).

## Édition, tentative et historique

Toutes les mutations passent par des commandes atomiques. Une commande refusée ne
modifie rien. Une manipulation continue produit une seule entrée d’historique ;
undo et redo restaurent des snapshots complets et immuables.

En résolution, l’état courant est un `ConstructionAttempt` composé du document de
construction et d’une table éphémère `placementId → inventoryEntryId`. Cette
provenance permet à un retrait de restituer exactement la bonne entrée
d’inventaire, sans polluer le `LevelDocument` partagé. Placement, décrément de
quantité et ajout de provenance sont atomiques ; retrait, restitution et
suppression de provenance le sont aussi. L’historique transporte document et
provenance ensemble. Cette décision est détaillée dans
[l’ADR 0005](decisions/0005-construction-attempt.md).

Le joueur est contraint par les permissions et les zones ; l’auteur peut modifier
la scène et configurer les droits du futur joueur. La balle et le panier ciblés par
l’objectif restent protégés du retrait dans les deux contextes.

## Persistance, partage et évolution communautaire

La version 1 doit rester une application entièrement statique et déployable sur un
hébergement de fichiers. IndexedDB conservera au minimum la progression, les
préférences, les brouillons et les niveaux locaux. Import et export utiliseront des
fichiers JSON versionnés.

Un petit niveau pourra être partagé dans le fragment de l’URL par une enveloppe
versionnée, compressée, bornée et protégée par une somme de contrôle. Le fragment
ne sera jamais la copie canonique du niveau et une importation invalide ne devra
jamais écraser le brouillon courant. Les niveaux trop grands passeront par un
fichier.

Une future couche communautaire pourra ajouter publication, recherche, notation ou
modération via un backend optionnel. Elle devra implémenter les mêmes ports de
repository et appliquer les mêmes schémas sans rendre le domaine ou la simulation
dépendants du réseau.

## Qualité et critères transversaux

- Red-Green-Refactor est obligatoire pour tout comportement et toute correction de
  bug.
- TypeScript reste strict ; les données externes entrent comme `unknown` puis sont
  bornées et validées avec Zod.
- La simulation utilise un pas fixe, un ordre stable et aucune horloge ou source
  aléatoire implicite.
- Le domaine ne dépend ni du navigateur, ni de React, ni d’IndexedDB, ni du moteur
  physique ou du renderer concrets.
- Aucun niveau non validé n’atteint la simulation.
- Les tests unitaires restent majoritaires ; les contrats d’objets, la simulation,
  le contenu et les parcours tactiles ont chacun leur niveau de test approprié.
- Chaque niveau jouable dispose d’une solution ou d’un scénario de référence et ne
  repose pas sur un comportement physique accidentel trop sensible.
- La commande globale du dépôt doit être verte avant qu’une tranche soit déclarée
  terminée.

La stratégie complète se trouve dans [la documentation qualité](qualite.md) et les
frontières dans [l’architecture](architecture.md).

## Hors périmètre initial

- multijoueur et collaboration en temps réel ;
- comptes, profils distants et synchronisation cloud ;
- galerie communautaire et backend obligatoire ;
- scripts utilisateur ou plugins chargés à l’exécution ;
- assets distants référencés par un niveau ;
- simulation de fluides, corps souples ou destruction générale ;
- connexions configurables entre objets ;
- compatibilité garantie avec des niveaux créés avant la première version
  publique.

## État de référence pour la reprise — 1er septembre 2026

Cette section distingue explicitement la cible du cahier des charges de l’état
réel du dépôt au moment de la reprise.

### Décisions acceptées

- Le nom, le positionnement original, la PWA statique mobile-first, l’éditeur sur
  téléphone, le catalogue initial et le TDD sont acceptés par
  [l’ADR 0001](decisions/0001-product-foundations.md).
- Le bootstrap à un seul package, Node 24, pnpm 11, Vite 8, React pour la coque DOM,
  TypeScript strict et les gates qualité sont acceptés par
  [l’ADR 0003](decisions/0003-project-bootstrap.md).
- `LevelDocument v1`, ses quatre unions d’objets, son objectif panier, ses zones et
  ses permissions explicites sont acceptés par
  [l’ADR 0004](decisions/0004-level-document-v1.md).
- La provenance d’inventaire reste éphémère dans `ConstructionAttempt`, selon
  [l’ADR 0005](decisions/0005-construction-attempt.md).
- Le catalogue mobile est un bottom sheet ancré et superposé, replié ou ouvert avec
  scrim, puis un panneau latéral en paysage suffisamment large. Ce comportement est
  un contrat d’interface, pas une direction artistique.
- La direction visuelle de travail est plate, chaude et légèrement cartoon, sans
  faux relief ni perspective ; la direction finale reste itérative.

### Architecture et invariants à préserver

- `LevelDocument`, `EditorSession`, `ConstructionAttempt` et `SimulationSession`
  sont des états distincts ; seul le premier décrit l’intention persistante d’un
  niveau.
- Les dépendances descendent de `app` vers `application`, puis `domain` ; stockage,
  rendu et physique restent derrière des frontières dédiées. Une couche basse
  n’importe jamais une couche haute.
- Le plateau du jeu et celui de l’éditeur sont une même vue alimentée par une
  projection du domaine.
- Les positions sont des unités du monde, jamais des pixels d’écran. Les objets et
  handles internes au renderer ou au moteur ne sont jamais sérialisés.
- Une simulation travaille sur un snapshot, avance à pas fixe et ne modifie jamais
  la construction éditée.
- Toute nouvelle famille apporte schéma, définition, sérialisation, outils
  d’édition et tests contractuels ; elle n’exige pas de modifier un moteur central
  par des cas spéciaux.

Voir [l’architecture cible](architecture.md) et les instructions obligatoires à la
racine du dépôt.

### Stack et gates TDD en place

Le dépôt utilise actuellement Node 24, pnpm 11.13.1, TypeScript 6, Vite 8, React
19 et Zod 4. Vitest et Testing Library couvrent les tests unitaires et DOM ;
Playwright couvre le navigateur ; ESLint type-aware, Prettier et Knip assurent les
garde-fous statiques. Les versions exactes et scripts exécutables sont dans
[`package.json`](../package.json).

La gate `pnpm check` orchestre typecheck, lint sans warning, vérification du
formatage, code mort, validation du contenu, tests Vitest, build statique et E2E
tactile critique. Les comportements suivent Red-Green-Refactor et une dépendance
structurante nécessite une décision documentée.

### Réellement livré et couvert par des tests

- Le bootstrap TypeScript/React/Vite et les contrôles de frontières entre couches
  existent.
- Le schéma Zod strict de `LevelDocument v1` est implémenté avec ses validations
  structurelles, sémantiques et ses plafonds techniques.
- L’historique générique immuable gère commande atomique, undo, redo, absence
  d’entrée pour un no-op, regroupement des prévisualisations et divergence
  concurrente.
- `ConstructionAttempt` et les commandes de placement depuis l’inventaire,
  déplacement, rotation et retrait existent pour les contextes joueur et auteur.
  Elles appliquent permissions, centre dans une zone, protection de l’objectif et
  provenance éphémère.
- Un validateur de catalogue et le script `content:check` valident les fichiers JSON
  embarqués, leurs références et l’unicité des identifiants de niveau.
- Un seul contenu exécutable est présent : le JSON du niveau 1 « Laisser tomber ».
  Il est valide et exposé par le catalogue embarqué.
- La coque DOM mobile possède les quatre cartes de catalogue, une présentation 2D
  plate et le véritable tiroir replié/ouvert avec scrim ; elle s’adapte en panneau
  latéral. Des tests de composants et un parcours Playwright 320 × 568 couvrent les
  états essentiels du tiroir et l’absence de débordement horizontal.

La gate finale `pnpm check` a été exécutée avec succès le 1er septembre 2026 après
l’intégration de tous les changements : typecheck, lint, formatage, Knip,
validation du niveau embarqué, 46 tests Vitest, build de production et 2 parcours
Playwright Chromium tactiles, dont le viewport 320 × 568. Cette mesure décrit
l’état présent du dépôt et devra naturellement être réexécutée après toute reprise.

### Dettes et limites explicites

- Le niveau 1 JSON n’est pas encore jouable : il n’existe ni boucle de simulation,
  ni adaptateur physique, ni évaluation réelle du panier.
- La coque affiche encore un atelier statique. Ses cartes ne pilotent pas
  `ConstructionAttempt`, le plateau ne rend pas les placements du niveau et les
  boutons d’édition ou de simulation ne réalisent pas encore leurs actions.
- Le moteur physique n’est pas choisi. Planck.js et Rapier 2D restent candidats et
  aucun des deux ne doit entrer en production avant la suite de conformité.
- Le renderer 2D du plateau n’est pas choisi ; PixiJS n’est qu’un candidat.
- Les définitions physiques exécutables des quatre familles, leurs dimensions et
  leurs contrats de simulation n’existent pas encore.
- Seul le niveau 1 existe en JSON. Les niveaux 2 à 8 sont des spécifications
  narratives et n’ont pas encore de solutions de régression exécutables.
- Le build est statique, mais l’installabilité PWA, le service worker, la politique
  de mise à jour et le fonctionnement hors ligne ne sont pas encore implémentés.
- IndexedDB, dépôts de brouillons/progression, import-export et partage par
  fragment URL sont prévus mais non implémentés.
- Le test joueur des zones utilise provisoirement le centre du placement. Le
  confinement de la forme entière attend les dimensions physiques du catalogue.
- Aucune CI distante ni matrice validée sur téléphones physiques n’est encore
  établie.

### Ordre recommandé des prochaines tranches

1. Construire la suite de conformité physique, mesurer Planck.js et Rapier 2D sur
   les scènes du catalogue initial, accepter l’ADR 0002 et ne conserver qu’un
   moteur.
2. Définir le port physique minimal, les dimensions et constantes centralisées des
   quatre familles, puis implémenter la boucle à pas fixe et le capteur de panier en
   TDD.
3. Choisir le renderer 2D à partir des besoins réels, projeter le niveau 1 sur le
   plateau partagé et rendre « Laisser tomber » jouable, réinitialisable et
   vérifié par une régression de simulation.
4. Relier le bottom sheet, le plateau, `ConstructionAttempt` et l’historique pour
   rendre le placement, déplacement, rotation, retrait, undo et redo réellement
   utilisables au tactile. Le niveau 2 est le premier parcours d’inventaire
   vertical complet.
5. Ajouter les niveaux 2 à 8 un par un avec leur test de contenu, leur solution de
   référence et leurs validations sur téléphone ; ne pas écrire toute la campagne
   avant de stabiliser les constantes physiques.
6. Compléter le mode auteur sur le même plateau, puis les dépôts IndexedDB,
   l’import-export, le partage URL borné et la PWA hors ligne avec une stratégie de
   mise à jour qui protège les brouillons.

Chaque tranche doit rester verticale, commencer par ses tests observables et se
terminer par la gate globale. Cet ordre peut être ajusté par les résultats des
mesures, mais ne doit pas être contourné par une simulation ou un éditeur factice.

### Décisions réellement encore ouvertes

- moteur physique unique, après la suite de conformité de
  [l’ADR 0002](decisions/0002-physics-engine-selection.md) ;
- renderer 2D du plateau ;
- dimensions, masses, frictions, rebonds, limites de la bascule et tailles exactes
  des poutres ;
- volume du panier et durée exacte de maintien validant la réussite ;
- seuils tactiles et dimensions finales du tiroir à mesurer sur appareil, sans
  rouvrir le principe du bottom sheet ;
- identité graphique finale, apparence de la balle et du panier, animations et
  direction audio ;
- matrice de navigateurs et téléphones, budgets de bundle, mémoire et performance ;
- stratégie de service worker, adaptateur IndexedDB et paramètres du codec URL ;
- nombre final de chapitres et de niveaux de la version 1 ;
- objectifs composés et indices, uniquement lorsqu’un besoin de game design les
  rend nécessaires.

React, Zod, `LevelDocument v1`, les permissions explicites, la provenance
éphémère, le catalogue initial et le véritable tiroir mobile ne sont plus des
questions ouvertes.

### Carte des documents de référence

- [Fondations produit](decisions/0001-product-foundations.md)
- [Sélection du moteur physique](decisions/0002-physics-engine-selection.md)
- [Bootstrap du projet](decisions/0003-project-bootstrap.md)
- [Contrat `LevelDocument v1`](decisions/0004-level-document-v1.md)
- [Provenance de `ConstructionAttempt`](decisions/0005-construction-attempt.md)
- [Architecture](architecture.md)
- [Qualité et TDD](qualite.md)
- [Catalogue initial](catalogue-initial.md)
- [Interactions mobiles](mobile-editor-interactions.md)
- [Progression des huit premiers niveaux](levels/initial-progression.md)
