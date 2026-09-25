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

Contrapt! repose sur un **modèle de jeu unique** : placer ou configurer des
éléments, lancer une simulation, observer le résultat, puis corriger la
construction. Il n’existe pas de « mode balle », de « mode souris » ou de règle de
victoire réservée à une famille. La variété des niveaux naît des comportements
combinés des objets et de conditions de victoire génériques, introduits
progressivement pour conserver un système lisible.

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
- Les familles d’objets, leurs comportements et les objectifs enrichissent la même
  boucle de jeu ; ils ne créent pas de modes de jeu parallèles.
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

## Modèle de jeu et objectifs

Chaque famille d’objet apporte un comportement explicite, déterministe et testable
à la simulation. Certains objets sont passifs et soumis uniquement à la physique,
comme une balle que la construction doit conduire vers une cible. D’autres sont des
acteurs actifs : par exemple une souris, un robot ou un véhicule peut avancer à pas
fixe dans la direction de son orientation. Un acteur ne constitue pas un mode de
jeu ; il reste un objet de la même scène, placé, observé et influencé comme les
autres.

Les objets d’environnement peuvent modifier une trajectoire ou un état à la suite
d’un contact ou d’un événement déterministe. Un fromage peut ainsi faire changer de
direction à une souris sans être nécessairement l’objectif du niveau. Ces effets
sont définis par les contrats des familles concernées ; ils ne sont ni des scripts
embarqués dans un niveau, ni des cas spéciaux codés dans l’interface ou le moteur.

Les objectifs décrivent des conditions génériques évaluées à partir des faits de
simulation : amener un objet dans une zone, faire se toucher deux objets, activer
ou désactiver un élément, éviter un contact, maintenir un état pendant une durée,
ou respecter un ordre d’événements. « Détruire » est un cas de changement d’état
quand une famille le prévoit ; il n’implique pas de promettre une destruction
physique générale. Les objectifs peuvent combiner ces conditions lorsque le game
design le justifie, sans donner au renderer la responsabilité de les évaluer.

`LevelDocument v1` reste volontairement limité à l’objectif panier afin de livrer
le premier chapitre. L’ajout de ces conditions génériques au format persistant
exigera une version de document, une migration, des schémas Zod stricts et des
tests de compatibilité ; il ne sera pas introduit comme un champ libre ou du code
exécutable dans un niveau.

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

Le premier vocabulaire visible contenait exactement quatre familles : balle,
panier, poutre et bascule. Il s'étend le 25 septembre 2026 à la masse, au levier
et au convoyeur, reliés par des fils de commande
([ADR 0009](decisions/0009-control-wires.md)). Une taille de poutre n’est pas une famille différente,
la bascule ne demande ni connexion manuelle ni réglage de joint, et en v1 seule
une poutre est rotatable par commande. Les propriétés physiques, dimensions et
rendus sont définis dans le jeu et non dans chaque document de niveau. Les rôles,
les modèles physiques et les contrats de test de chaque famille font autorité
dans [le catalogue initial](catalogue-initial.md).

La gravité fournit seule l’énergie des premiers puzzles. Le convoyeur est le
premier dispositif actif ; il n’y a toujours ni interrupteur, ni ventilateur, ni
moteur, et l’électricité se limite à des liaisons directes levier → convoyeur.
Blocs, dominos, roues libres, ressorts, cordes, poulies, engrenages, circuits
électriques au-delà de ces liaisons, fluides, corps déformables et destruction
sont reportés jusqu’à ce qu’un besoin de gameplay les justifie.

Ce catalogue décrit le premier jalon, non une séparation durable en modes de jeu.
Une future famille active ou réactive — telle qu’une souris, un robot, un véhicule
ou un élément qui transforme une collision en changement d’état — rejoint le même
registre et la même simulation. Elle fournit son schéma, son comportement
déterministe, ses événements observables, sa projection et ses tests contractuels,
conformément aux frontières d’architecture ; elle ne contourne pas le modèle de
niveau ni les objectifs génériques.

**Critère de sortie du catalogue initial :** aucune nouvelle famille ne rejoint la
campagne tant que balle, panier, poutre et bascule ne permettent pas une expérience
complète et fiable : niveaux jouables, simulation à pas fixe, réussite évaluée,
reset exact, édition tactile, undo/redo, contenu de référence et régressions
physiques. La diversité future viendra d’abord de leurs combinaisons, pas de la
quantité d’objets.

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
tests. Cela inclut le passage futur de l’objectif panier v1 aux conditions de
victoire génériques. La définition complète et les limites sont dans
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
- Les comportements actifs, les réactions à des contacts et les objectifs sont
  déterministes, exécutés à pas fixe et vérifiés par des scénarios de référence.
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

## Décisions acceptées

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
- Planck.js est le moteur physique retenu pour la simulation ; Rapier 2D est
  écarté. Ce choix est accepté par
  [l’ADR 0002](decisions/0002-physics-engine-selection.md).
- Le plateau est rendu en Canvas 2D natif, derrière la projection du domaine ;
  PixiJS est écarté pour la version 1. Les éléments graphiques sont des sprites
  PNG chargés par l’application, jamais référencés par un document de niveau. Ce
  choix est accepté par
  [l’ADR 0006](decisions/0006-board-renderer.md).
- Le repère du monde — 1 unité pour 1 mètre, axe `y` vers le bas, origine au coin
  supérieur gauche de la scène —, le rectangle de scène déclaré par chaque niveau,
  le cadrage « Ajuster à la scène » avec ses bornes de zoom, et la convention de
  sprite — fond transparent, 128 px par unité monde à @2x, boîte alpha égale à
  l’empreinte du collider — sont acceptés par
  [l’ADR 0007](decisions/0007-world-scale-and-camera.md). Le rectangle de scène
  entre dans le format persistant : il impose `schemaVersion: 2` et une migration
  v1 → v2.

## Architecture et invariants à préserver

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

## État du dépôt et prochaines tranches

L’état réellement livré, la stack en place, les dettes et la dernière exécution
de la gate sont décrits dans [`etat.md`](etat.md), réécrit à chaque fin de
tranche. Le découpage exécutable des prochaines tranches est dans
[`backlog.md`](backlog.md).

## Décisions réellement encore ouvertes

- masses, frictions, rebonds et limites de la bascule ;
- volume du panier et durée exacte de maintien validant la réussite ;
- seuils tactiles et dimensions finales du tiroir à mesurer sur appareil, sans
  rouvrir le principe du bottom sheet ;
- identité graphique finale, apparence de la balle et du panier, animations et
  direction audio ;
- matrice de navigateurs et téléphones, budgets de bundle, mémoire et performance ;
- stratégie de service worker, adaptateur IndexedDB et paramètres du codec URL ;
- nombre final de chapitres et de niveaux de la version 1 ;
- objectifs composés et indices, uniquement lorsqu’un besoin de game design les
  rend nécessaires, avec les conditions génériques et migrations de format qui les
  accompagnent ;
- première famille active ou réactive, son comportement déterministe et les faits
  de simulation qu’elle émet, lorsqu’un chapitre de campagne concret le justifie.

React, Zod, `LevelDocument v1`, les permissions explicites, la provenance
éphémère, le catalogue initial et le véritable tiroir mobile ne sont plus des
questions ouvertes.

## Carte des documents de référence

- [Carte de lecture du dépôt](index.md)
- [État du dépôt](etat.md)
- [Découpage des tranches](backlog.md)
- [Fondations produit](decisions/0001-product-foundations.md)
- [Sélection du moteur physique](decisions/0002-physics-engine-selection.md)
- [Bootstrap du projet](decisions/0003-project-bootstrap.md)
- [Contrat `LevelDocument v1`](decisions/0004-level-document-v1.md)
- [Provenance de `ConstructionAttempt`](decisions/0005-construction-attempt.md)
- [Renderer du plateau](decisions/0006-board-renderer.md)
- [Repère du monde, scène, caméra et sprites](decisions/0007-world-scale-and-camera.md)
- [Architecture](architecture.md)
- [Qualité et TDD](qualite.md)
- [Catalogue initial](catalogue-initial.md)
- [Interactions mobiles](mobile-editor-interactions.md)
- [Progression des huit premiers niveaux](levels/initial-progression.md)
