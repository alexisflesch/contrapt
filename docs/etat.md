# État du dépôt — Contrapt!

Dernière mise à jour : 26 septembre 2026.

Ce fichier décrit l’état réel du dépôt : ce qui est livré, les dettes connues et
la dernière exécution de la gate globale. Il est réécrit à chaque fin de tâche
et ne contient ni décision ni spécification ; celles-ci restent dans
[le cahier des charges](cahier-des-charges.md) et les ADR du dossier
`decisions/`. Le travail restant et son ordre sont dans
[la feuille de route](feuille-de-route-luna.md).

## Stack en place

Node 24, pnpm 11.13.1, TypeScript 6 strict, Vite 8, React 19, React Router 7
(ADR 0008), Zod 4 et Planck 1.5.0. Vitest et Testing Library couvrent les tests
unitaires et DOM ; Playwright couvre le navigateur ; ESLint type-aware, Prettier
et Knip assurent les garde-fous statiques. Les versions exactes et scripts
exécutables sont dans [`package.json`](../package.json).

La gate `pnpm check` orchestre typecheck, lint sans warning, vérification du
formatage, code mort, validation du contenu, tests Vitest, build statique et E2E
du projet Playwright `mobile`. `pnpm check:fast` (typecheck, lint, Vitest) sert
pendant le travail.

## Réellement livré et couvert par des tests

### Domaine et application

- `LevelDocument v2` (schéma Zod strict dans `src/domain/level-document.ts`) :
  rectangle de scène obligatoire, sept familles (balle, panier, poutre, bascule,
  masse, levier, convoyeur), inventaire, zones de construction, objectif panier
  unique, fils de commande `wires` facultatifs (ADR 0009). Migration v1 → v2
  (`migrateLevelDocumentV1ToV2`) testée.
- Géométrie des familles centralisée dans `src/domain/family-geometry.ts`,
  partagée par la physique et le rendu.
- `History` générique (commande atomique, undo/redo, no-op sans entrée,
  regroupement des prévisualisations).
- `ConstructionAttempt` : placement depuis l’inventaire, déplacement, rotation,
  propriétés, retrait, relier/délier un fil, pour les contextes joueur et auteur,
  avec permissions, zone de construction (centre seulement, voir dettes),
  protection de l’objectif et provenance éphémère (ADR 0005).
- `EditorSession` : tentative, historique, sélection, manipulation groupée,
  phases construction/simulation/pause/résultat, reset exact.
- Évaluateurs purs : objectif panier (durée de maintien injectée) et échec de
  tentative (hors scène élargie de 2 unités, temps écoulé à 20 s simulées).

### Simulation

- `SimulationSession` Planck à pas fixe, accumulateur à durée injectée, rattrapage
  plafonné à 5 pas par frame, y vers le bas, capteur de panier, sortie de scène,
  temps écoulé, reset exact, snapshot défensif, destruction idempotente.
- Sept familles simulées ; levier à trois crans, convoyeur à vitesse de surface
  commandé par levier ou par sa propriété `direction`.
- Résistance au roulement de la balle (absente de Planck) : elle s’arrête sur une
  poutre plate.
- Suite de conformité (`test/conformance/`) : protocole commun, scènes 6 et 7,
  comparaison Planck/Rapier. La validation sur téléphone réel n’est pas faite.

### Présentation et interface

- Renderer Canvas 2D (ADR 0006) avec DPR, sprites en calques (balle à motif
  tournant, panier avant/arrière, bascule pied + planche, levier, convoyeur à
  tapis défilant), ordre de dessin déterministe (la balle après le panier).
- Caméra pure `src/presentation/board-camera.ts` (ADR 0007) : ajustement
  `contain` à la scène, bornes de zoom, panoramique, pincement, boutons de
  cadrage, recadrage sur vrai redimensionnement seulement.
- Hit-test pur `src/presentation/board-hit-test.ts` (cible ≥ 44 px CSS). Sur le
  plateau : sélection au toucher/clic, désélection sur le vide, déplacement direct
  en une seule entrée d’historique, poignée de rotation des poutres, annulation
  atomique sur `pointercancel` ou second doigt.
- Panneau « Propriétés » (rail droit en grand format, tiroir compact sur petit
  écran) : longueur de poutre, cran de départ du levier, sens du convoyeur,
  câblage levier → convoyeur au toucher, suppression.
- Fils de commande routés orthogonalement, ponts aux croisements, lettres de
  circuit (`src/presentation/control-wires.ts`, `wire-renderer.ts`).
- Routage côté client (ADR 0008) : `/levels`, `/levels/:levelId/play`,
  `/editor`, `/settings` (vide). `/` ouvre le niveau 1 en mode joueur.
- Mise en page validée aux six formats du plan (D4) ; objectif dans une boîte de
  dialogue à la demande ; bandeau de résultat dans un emplacement réservé.
- Atelier libre `src/content/levels/workshop.json` (scène 16 × 9, inventaire de
  99 par famille, contexte auteur).

### Contenu

- Niveau 1 « Laisser tomber » jouable de bout en bout, avec test de régression
  headless dans `src/content/embedded-levels.test.ts` et parcours Playwright
  mobile.
- `pnpm content:check` valide les JSON embarqués.

## Dettes et limites explicites

- **Test de zone au centre seulement.** En contexte joueur, seul le centre du
  placement doit être dans une zone de construction ; l’empreinte entière n’est
  pas vérifiée alors que `family-geometry.ts` fournit désormais les dimensions.
- **Aperçu de placement en CSS.** L’overlay DOM `.placement-preview`
  (`src/ui/BoardView.tsx`) n’a ni la forme, ni la taille, ni la rotation de
  l’objet ; le fantôme dessiné par le renderer (C1) reste à faire.
- **Fond en CSS.** `board-generic-v0.png` est un `background-image` de
  `.scene-frame` : il ne suit ni le zoom ni le panoramique (D3).
- **Poutre étirée.** Le renderer utilise `beam@2x.png` pour les trois longueurs ;
  `beam-short/medium/long@2x.png` existent dans `public/assets/sprites/` mais ne
  sont pas câblés, et `art/` ne contient pas de source dessinée de poutre.
  `art/build-sprites.py` dépend de Pillow, numpy et pngquant, hors gate.
- **Parcours Playwright desktop en échec** hors gate :
  `e2e/editor-interactions.spec.ts` « C3 — place, déplace, modifie et supprime
  une poutre dans Chromium desktop » échoue sur la dernière comparaison de
  canvas après l’annulation d’une suppression.
- **Un seul niveau de campagne**, « Laisser tomber », qui sera remplacé. La
  campagne de 14 niveaux est spécifiée et mesurée dans
  `levels/initial-progression.md` ; aucun bouton « Niveau suivant ».
- **Défi d’objets, progression, stockage local, partage, PWA** : décidés
  (ADR 0010, 0011, 0012), non implémentés.
- **Câblage réservé à l’auteur** : un levier ou un convoyeur pris dans
  l’inventaire en résolution ne peut pas être relié (ADR 0009).
- **Rien n’indique au joueur quelle balle est suivie** par l’objectif quand
  plusieurs balles sont sur le plateau.
- **Deux boutons « Réinitialiser »** actifs simultanément après une simulation
  terminée (barre d’actions et bandeau de résultat).
- **Conformité physique** : la porte de validation sur téléphone réel (scènes 6
  et 7) n’est pas franchie ; la dépendance de développement Rapier reste donc
  présente et l’ADR 0002 réouvrable.
- **Mode auteur incomplet** : l’atelier ne permet ni d’éditer scène, zones,
  inventaire ou objectif, ni d’enregistrer, exporter ou partager un niveau.
- `format:check` ne couvre pas le Markdown.
- Aucune CI distante ni matrice de téléphones physiques.

## Dernière exécution de la gate

`pnpm check` exécutée avec succès le 26 septembre 2026 sur `7ebd85b` :
typecheck, lint, formatage, Knip, contenu, 333 tests Vitest (26 fichiers),
build, 29 parcours Playwright `mobile` (1 ignoré, réservé au desktop).
`playwright test --project=desktop` : 29 réussis, 1 échec (voir dettes).
