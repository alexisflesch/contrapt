# État du dépôt — Contrapt!

Dernière mise à jour : 2 septembre 2026.

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
- Le protocole candidat-neutre de conformité physique valide les traces, le repos,
  la reproductibilité tolérante et les percentiles de durée. Une première scène
  Planck headless de chute produit une trace déterministe validée par ce protocole.
- Un validateur de catalogue et le script `content:check` valident les fichiers JSON
  embarqués, leurs références et l’unicité des identifiants de niveau.
- Un seul contenu exécutable est présent : le JSON du niveau 1 « Laisser tomber ».
  Il est valide et exposé par le catalogue embarqué.
- La coque DOM mobile possède les quatre cartes de catalogue, une présentation 2D
  plate et le véritable tiroir replié/ouvert avec scrim ; elle s’adapte en panneau
  latéral. Des tests de composants et un parcours Playwright 320 × 568 couvrent les
  états essentiels du tiroir et l’absence de débordement horizontal.

## Dettes et limites explicites

- Le niveau 1 JSON n’est pas encore jouable : il n’existe ni boucle de simulation,
  ni adaptateur physique, ni évaluation réelle du panier.
- T4a est intégré : les cartes du catalogue sont câblées vers
  `ConstructionAttempt`, puis `EditorSession` et son historique undo/redo. Les
  refus de commande et les positions tactiles indisponibles sont annoncés de
  façon accessible. Le placement tactile est annulable, notamment sur
  `pointercancel`, sans créer de commande partielle dans l’historique.
- Planck 1.5.0 est installé pour le harnais de conformité. Il n’existe pas encore
  d’adaptateur physique de production. La porte de validation — scènes 6 et 7
  mesurées sur les deux moteurs — n’est pas franchie ; tant qu’elle ne l’est pas,
  la décision reste réouvrable.
- Canvas 2D est retenu pour le plateau (ADR 0006) mais aucun renderer n’existe.
  Le pipeline de sprites — dimensions de référence, chargement, `devicePixelRatio`
  — reste entièrement à construire.
- Les définitions physiques exécutables des quatre familles, leurs dimensions et
  leurs contrats de simulation n’existent pas encore.
- Seul le niveau 1 existe en JSON. Les niveaux 2 à 8 sont des spécifications
  narratives et n’ont pas encore de solutions de régression exécutables.
- Le plateau reste une coque statique : aucun renderer ne projette encore les
  placements du niveau et les boutons de simulation ne lancent pas de production.
- Le build est statique, mais l’installabilité PWA, le service worker, la politique
  de mise à jour et le fonctionnement hors ligne ne sont pas encore implémentés.
- IndexedDB, dépôts de brouillons/progression, import-export et partage par
  fragment URL sont prévus mais non implémentés.
- Le test joueur des zones utilise provisoirement le centre du placement. Le
  confinement de la forme entière attend les dimensions physiques du catalogue.
- T4b reste ouvert pour le placement, le déplacement et la rotation sur le
  plateau rendu ; T1 scène 7 reste également ouvert. Aucune CI distante ni
  matrice validée sur téléphones physiques n’est encore établie.

## Dernière exécution de la gate

La dernière gate complète `pnpm check` a été exécutée avec succès le 2 septembre
2026 après l’intégration de T4a : typecheck, lint, formatage, Knip, validation du
niveau embarqué, 112 tests Vitest, build de production et 2 parcours Playwright
Chromium tactiles, dont le viewport 320 × 568. Cette mesure décrit l’état présent
du dépôt et devra naturellement être réexécutée après toute reprise.
