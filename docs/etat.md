# État du dépôt — Contrapt!

Dernière mise à jour : 25 septembre 2026.

Ce fichier décrit l’état réel du dépôt : ce qui est livré, les dettes connues et
la dernière exécution de la gate globale. Il est réécrit à chaque fin de tranche
et ne contient ni décision ni spécification ; celles-ci restent dans
[le cahier des charges](cahier-des-charges.md) et les ADR du dossier
`decisions/`.

## Stack en place

Le dépôt utilise actuellement Node 24, pnpm 11.13.1, TypeScript 6, Vite 8, React
19, Zod 4 et Planck 1.5.0. Vitest et Testing Library couvrent les tests unitaires
et DOM ; Playwright couvre le navigateur ; ESLint type-aware, Prettier et Knip
assurent les garde-fous statiques. Les versions exactes et scripts exécutables sont dans
[`package.json`](../package.json).

La gate `pnpm check` orchestre typecheck, lint sans warning, vérification du
formatage, code mort, validation du contenu, tests Vitest, build statique et E2E
tactile critique. Les comportements suivent Red-Green-Refactor et une dépendance
structurante nécessite une décision documentée.

## Réellement livré et couvert par des tests

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
- `EditorSession` coordonne la tentative, son historique, la sélection, les
  manipulations groupées et les phases construction/simulation/pause/résultat. Le
  reset restaure exactement la tentative et l’historique au lancement.
- L’objectif panier v1 est évalué de façon pure à partir de faits d’entrée et de
  sortie de capteur ordonnés par pas fixe. La durée de maintien est injectée et ne
  devient pas une propriété du niveau.
- La gravité Planck est alignée sur le repère écran : l’axe y croît vers le bas.
  Un test de non-régression couvre l’accélération et la chute selon cette
  convention.
- Le protocole candidat-neutre de conformité physique valide les traces, le repos,
  la reproductibilité tolérante et les percentiles de durée. Une première scène
  Planck headless de chute produit une trace déterministe validée par ce protocole.
- T1a fournit un harnais comparatif pour la scène 7, avec une fixture provisoire de
  30 corps et 6 joints, des mesures Planck/Rapier, des snapshots déterministes et
  une destruction vérifiée. La validation réelle sur téléphone n’est pas faite : la
  porte mobile et l’ADR 0002 restent réouvrables.
- T2 fournit une session de simulation Planck de production dans `src/simulation/` :
  pas fixe, accumulateur à durée injectée, projection des quatre familles, panier
  avec événements d’entrée et de sortie du capteur, évaluation `basket-goal`, reset,
  snapshot défensif et destruction idempotente.
- T3a/T3b fournissent le sprite loader, l’adaptateur injectable
  fetch/blob/`createImageBitmap`, la projection monde→pixels et le renderer Canvas
  2D avec prise en charge du DPR. T3c affiche un canvas accessible dans l’App,
  redessine le document courant de l’éditeur et conserve les gestes tactiles. Ce
  redessin est réel mais illisible à l’écran : voir la dette d’échelle ci-dessous.
- T4c fournit le parcours de simulation depuis l’éditeur : `Tester` crée réellement
  une `SimulationSession` Planck à partir du snapshot, l’avance via
  `requestAnimationFrame` et des timestamps injectés, projette les positions dans
  une copie de rendu, et propose pause, reprise et reset. La session est détruite
  proprement en sortie de simulation et au démontage.
- T4d allège l’UX du plateau : les statuts et boutons ne recouvrent plus le canvas.
  L’aperçu graphique suit `pointermove` à la souris avant le `pointerdown` et
  reste compatible avec le tactile. L’en-tête identifie explicitement
  « Éditeur de niveaux » et « Mode éditeur ».
- Le fond générique `public/assets/backgrounds/board-generic-v0.png` est intégré au
  plateau : crème, quadrillé et encadré, sans texte ni objets de jeu. Il s’agit
  d’un prototype d’ambiance et non d’une direction artistique définitive.
- Un validateur de catalogue et le script `content:check` valident les fichiers JSON
  embarqués, leurs références et l’unicité des identifiants de niveau.
- Un seul contenu exécutable est présent : le JSON du niveau 1 « Laisser tomber ».
  Il est valide et exposé par le catalogue embarqué.
- Assets du 25 septembre 2026 : les sources de `art/assets/` sont exportées par
  `art/build-sprites.py` à la convention de l’ADR 0007 (amendement : sprites en
  calques). La balle a un motif qui tourne sous un ombrage et un reflet fixes ;
  la bascule a un pied immobile et une planche qui pivote, et son pied devient
  un polygone mesuré. Les empreintes vivent dans `src/domain/family-geometry.ts`,
  partagées par la physique et le rendu ; un test vérifie les PNG contre elles.
- Trois familles s’ajoutent : masse (10 kg réels), levier à trois crans et
  convoyeur. Les fils de commande levier → convoyeur (ADR 0009,
  `docs/contrapt_control_wires_v1.md`) sont validés dans le document, créés et
  supprimés par commandes annulables, simulés à chaque pas fixe, routés
  orthogonalement avec ponts et lettres de circuit, et reliés au toucher depuis
  le panneau Propriétés. L’atelier en propose un inventaire.
- La balle subit une résistance au roulement, que Planck ne fournit pas : elle
  s’arrête sur une poutre plate et un convoyeur l’emporte presque à la vitesse
  du tapis, au lieu de la faire tourner sur place.
- La coque DOM mobile possède les cartes de catalogue, une présentation 2D
  plate et le véritable tiroir replié/ouvert avec scrim ; elle s’adapte en panneau
  latéral. Des tests de composants et un parcours Playwright 320 × 568 couvrent les
  états essentiels du tiroir et l’absence de débordement horizontal.

## Dettes et limites explicites

- Le niveau 1 de campagne n’est pas encore relié à ce parcours d’interface : la
  simulation de l’éditeur est livrée, mais le branchement du contenu de campagne,
  la restitution du résultat et le parcours joueur restent à intégrer.
- T4a est intégré : les cartes du catalogue sont câblées vers
  `ConstructionAttempt`, puis `EditorSession` et son historique undo/redo. Les
  refus de commande et les positions tactiles indisponibles sont annoncés de
  façon accessible. Le placement tactile est annulable, notamment sur
  `pointercancel`, sans créer de commande partielle dans l’historique.
- Planck 1.5.0 est utilisé par le harnais de conformité et par la session de
  simulation de production. La validation mobile réelle de la scène 7 reste
  ouverte ; la porte de validation — scènes 6 et 7 mesurées sur les deux moteurs,
  avec validation réelle sur téléphone — n’est pas franchie et la décision reste
  réouvrable.
- Canvas 2D est retenu pour le plateau (ADR 0006) et le renderer ainsi que le
  chargement des sprites sont présents, mais il n’existe aucune caméra :
  `camera.origin` n’est jamais modifié, il n’y a pas de panoramique, le zoom n’a
  pas de bornes et « Ajuster à la scène » réaffecte la constante initiale au lieu
  de calculer un cadrage. L’ADR 0007 fixe le cadrage attendu ; rien n’en est
  encore implémenté.
- Le cycle de simulation de l’éditeur (animation, pause/reprise et reset) est
  livré avec T4c ; le niveau 1 jouable dans le parcours de campagne reste ouvert.
- Seul le niveau 1 existe en JSON. Les niveaux 2 à 8 sont des spécifications
  narratives et n’ont pas encore de solutions de régression exécutables.
- Le renderer projette bien le document courant de l’éditeur dans un canvas, mais
  à `pixelsPerWorldUnit: 0.32` : la balle mesure 0,19 px et le plateau paraît
  vide. Le rendu est donc effectif et inexploitable. La cause racine est le
  document d’atelier de `src/app/App.tsx`, écrit en coordonnées de type pixel,
  qui viole l’invariant « les positions du domaine sont exprimées en unités du
  monde » ; l’ADR 0007 acte sa suppression.
- La poutre n’a pas encore de source dessinée : `beam@2x.png` reste l’ancien
  sprite, étiré pour les trois longueurs. `art/build-sprites.py` dépend de
  Pillow, numpy et pngquant, hors du dépôt ; il n’est pas lancé par la gate.
- Le câblage est réservé à l’auteur : en résolution, un levier ou un convoyeur
  pris dans l’inventaire ne peut pas être relié. Aucun niveau de campagne
  n’utilise encore masse, levier ou convoyeur.
- Le fond `public/assets/backgrounds/board-generic-v0.png` est posé en
  `background-size: cover` CSS : il ne suit ni le zoom ni le panoramique et sa
  grille ne dit rien de l’échelle réelle du monde.
- Le build est statique, mais l’installabilité PWA, le service worker, la politique
  de mise à jour et le fonctionnement hors ligne ne sont pas encore implémentés.
- IndexedDB, dépôts de brouillons/progression, import-export et partage par
  fragment URL sont prévus mais non implémentés.
- Le test joueur des zones utilise provisoirement le centre du placement. Le
  confinement de la forme entière attend les dimensions physiques du catalogue.
- T4b reste ouvert pour le placement, le déplacement et la rotation complets sur le
  plateau rendu ; T1 scène 7 reste également ouvert. La validation composition et
  budget de la scène 7 reste distincte de l’intégration du fond générique. La
  campagne au-delà du niveau 1 reste à produire en contenu exécutable. Aucune CI
  distante ni matrice validée sur téléphones physiques n’est encore établie.

## Dernière exécution de la gate

La dernière gate complète `pnpm check` a été exécutée avec succès le 25 septembre
2026 : typecheck, lint, formatage, Knip (après retrait de cinq exports inutilisés
hérités), validation du contenu embarqué, 333 tests Vitest, build Vite et 29
parcours Playwright du projet mobile. Cette mesure décrit l’état présent du dépôt
et devra naturellement être réexécutée après toute reprise.
