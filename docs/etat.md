# État du dépôt — Contrapt!

Dernière mise à jour : 1er septembre 2026.

Ce fichier décrit l’état réel du dépôt : ce qui est livré, les dettes connues et
la dernière exécution de la gate globale. Il est réécrit à chaque fin de tranche
et ne contient ni décision ni spécification ; celles-ci restent dans
[le cahier des charges](cahier-des-charges.md) et les ADR du dossier
`decisions/`.

## Stack en place

Le dépôt utilise actuellement Node 24, pnpm 11.13.1, TypeScript 6, Vite 8, React
19 et Zod 4. Vitest et Testing Library couvrent les tests unitaires et DOM ;
Playwright couvre le navigateur ; ESLint type-aware, Prettier et Knip assurent les
garde-fous statiques. Les versions exactes et scripts exécutables sont dans
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
- La coque affiche encore un atelier statique. Ses cartes ne pilotent pas
  `ConstructionAttempt`, le plateau ne rend pas les placements du niveau et les
  boutons d’édition ou de simulation ne réalisent pas encore leurs actions.
- Planck.js est retenu (ADR 0002) mais n’est pas encore installé ni intégré. La
  porte de validation — scènes 6 et 7 mesurées sur les deux moteurs — n’est pas
  franchie ; tant qu’elle ne l’est pas, la décision reste réouvrable.
- Canvas 2D est retenu pour le plateau (ADR 0006) mais aucun renderer n’existe.
  Le pipeline de sprites — dimensions de référence, chargement, `devicePixelRatio`
  — reste entièrement à construire.
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

## Dernière exécution de la gate

La gate finale `pnpm check` a été exécutée avec succès le 1er septembre 2026 après
l’intégration de tous les changements : typecheck, lint, formatage, Knip,
validation du niveau embarqué, 51 tests Vitest, build de production et 2 parcours
Playwright Chromium tactiles, dont le viewport 320 × 568. Cette mesure décrit
l’état présent du dépôt et devra naturellement être réexécutée après toute
reprise.
