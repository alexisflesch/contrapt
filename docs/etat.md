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
  rectangle de scène obligatoire, onze familles (balle, panier, poutre, bascule,
  masse, levier, convoyeur, bouton, ventilateur, barrière, tremplin), inventaire, zones de construction, objectif panier
  unique, fils de commande `wires` facultatifs (ADR 0009). Migration v1 → v2
  (`migrateLevelDocumentV1ToV2`) testée.
- Géométrie des familles centralisée dans `src/domain/family-geometry.ts`,
  partagée par la physique et le rendu.
- `History` générique (commande atomique, undo/redo, no-op sans entrée,
  regroupement des prévisualisations).
- `ConstructionAttempt` : placement depuis l’inventaire, déplacement, rotation,
  propriétés, retrait, relier/délier un fil, pour les contextes joueur et auteur,
  avec permissions, zone de construction (empreinte entière contenue dans une
  même zone en contexte joueur), protection de l’objectif et provenance éphémère
  (ADR 0005).
- `EditorSession` : tentative, historique, sélection, manipulation groupée,
  phases construction/simulation/pause/résultat, reset exact.
- Évaluateurs purs : objectif panier (durée de maintien injectée) et échec de
  tentative (hors scène élargie de 2 unités, temps écoulé à 20 s simulées).

### Simulation

- `SimulationSession` Planck à pas fixe, accumulateur à durée injectée, rattrapage
  plafonné à 5 pas par frame, y vers le bas, capteur de panier, sortie de scène,
  temps écoulé, reset exact, snapshot défensif, destruction idempotente.
- Onze familles simulées ; levier à trois crans, convoyeur à vitesse de surface
  commandé par levier ou par sa propriété `direction` ; bouton-capteur enfoncé
  tant qu’un corps dynamique pèse dessus ; ventilateur (cône de souffle, poussée
  proportionnelle à la largeur exposée) et barrière coulissante commandés par un
  levier de côté ou un bouton enfoncé ; tremplin à restitution 1. Masse redessinée
  (0,8 × 0,505, collider trapèze + anneau).
- Résistance au roulement de la balle (absente de Planck) : elle s’arrête sur une
  poutre plate.
- Suite de conformité (`test/conformance/`) : protocole commun ; les scènes 6 et
  7 sont conservées comme régressions contre Planck seul après la porte de validation.
  La validation de Planck sur téléphone réel est consignée dans l’ADR 0002.

### Présentation et interface

- Renderer Canvas 2D (ADR 0006) avec DPR, sprites en calques (balle à motif
  tournant, panier avant/arrière, bascule pied + planche, levier, convoyeur à
  tapis défilant, bouton à capuchon qui s’enfonce, ventilateur à pales tournantes
  écrasées en perspective et orientable, barrière dont seule la partie sortie du
  poteau est dessinée, tremplin à ressort tassé à l’impact), ordre de dessin déterministe (la balle après le panier).
- Chargeur des sprites : une requête en cours est partagée, un sprite prêt est
  conservé, et un échec est retenté au rendu suivant, jusqu’à trois tentatives par
  asset.
- Caméra pure `src/presentation/board-camera.ts` (ADR 0007) : ajustement
  `contain` à la scène, bornes de zoom, panoramique, pincement, boutons de
  cadrage, recadrage sur vrai redimensionnement seulement.
- Hit-test pur `src/presentation/board-hit-test.ts` (cible ≥ 44 px CSS). Sur le
  plateau : sélection au toucher/clic, désélection sur le vide, déplacement direct
  en une seule entrée d’historique, poignée de rotation des poutres, annulation
  atomique sur `pointercancel` ou second doigt.
- Panneau « Propriétés » (rail droit en grand format, tiroir compact sur petit
  écran) : longueur de poutre, cran de départ du levier, sens du convoyeur,
  rotation libre des poutres et par quarts de tour du ventilateur, de la
  barrière et du tremplin (boutons et poignée), état de départ du ventilateur
  et de la barrière,
  câblage levier/bouton → appareil au toucher, suppression.
- Fils de commande routés orthogonalement, ponts aux croisements, lettres de
  circuit (`src/presentation/control-wires.ts`, `wire-renderer.ts`).
- Routage côté client (ADR 0008) : `/levels`, `/levels/:levelId/play`,
  `/editor`, `/demo` (machine en chaîne qui se résout seule, testée),
  `/settings` (vide). `/` ouvre le niveau 1 en mode joueur.
- Mise en page validée aux six formats du plan (D4) ; objectif dans une boîte de
  dialogue à la demande ; bandeau de résultat dans un emplacement réservé.
- Atelier libre `src/content/levels/workshop.json` (scène 16 × 9, inventaire de
  99 par famille, contexte auteur).

### Déploiement et mesure

- Déploiement GitHub Pages par `.github/workflows/deploy-pages.yml` (push sur
  `main` ou lancement manuel), sous le sous-chemin `/contrapt/` (ADR 0008,
  amendement). Build vérifié localement sous ce sous-chemin : routes profondes,
  sprites et fonds chargés sans erreur.
- Page de mesure `/bench` (porte de l'ADR 0002) : scène dense de 31 corps
  dynamiques et 6 articulations, mesure de la physique seule (médiane, 95e
  centile, pire cas sur 1 200 pas) et `/bench/play` qui joue la scène sur le
  plateau avec un compteur d'images par seconde. Sur le PC de développement :
  95e centile 1,3 ms par pas, 60 images/s. Sur téléphone : voir ADR 0002
  § Résultat de la porte (Planck confirmé).

### Contenu

- Niveau 1 « Prolonger la pente » jouable de bout en bout. Sa régression
  headless vérifie l’échec sans action, la référence et sa fenêtre de robustesse,
  les contre-exemples, le déterminisme, l’immuabilité du document et le reset
  exact (`src/content/levels/level-1-prolonger-la-pente.test.ts`). Parcours tactile
  mobile sur `/levels/level-1-prolonger-la-pente/play`.
- Niveau 2 « Le pont » jouable de bout en bout. Sa régression vérifie l’échec sans
  action, la pose puis le déplacement jusqu’à la référence, les 39 positions
  mesurées, le refus de rotation, le déterminisme et le reset exact
  (`src/content/levels/level-2-le-pont.test.ts`). Le parcours mobile pose la poutre,
  la glisse avant de lancer, puis gagne sur `/levels/level-2-le-pont/play`.
- Niveau 3 « Incliner » jouable de bout en bout. Sa régression vérifie l’échec
  initial, la pose puis la rotation à 15°, les six poses robustes accessibles,
  les mesures physiques hors zone, le refus des rotations/poses qui débordent,
  le déterminisme et le reset exact (`src/content/levels/level-3-incliner.test.ts`).
  Le parcours mobile tourne réellement la poignée et gagne sur
  `/levels/level-3-incliner/play`.
- `pnpm content:check` valide les JSON embarqués.

## Dettes et limites explicites

- **Aperçu de placement en CSS.** L’overlay DOM `.placement-preview`
  (`src/ui/BoardView.tsx`) n’a ni la forme, ni la taille, ni la rotation de
  l’objet ; le fantôme dessiné par le renderer (C1) reste à faire.
- **Fond en CSS.** `board-generic-v0.png` est un `background-image` de
  `.scene-frame` : il ne suit ni le zoom ni le panoramique (D3).
- **Poutre étirée.** Le renderer utilise `beam@2x.png` pour les trois longueurs ;
  `beam-short/medium/long@2x.png` existent dans `public/assets/sprites/` mais ne
  sont pas câblés, et `art/` ne contient pas de source dessinée de poutre.
  `art/build-sprites.py` dépend de Pillow, numpy et pngquant, hors gate.
- Parcours Playwright desktop C3 corrigé : le test resélectionne la poutre
  restaurée après l’annulation de sa suppression, puis vérifie le canvas au pixel
  près. Les 30 tests desktop passent.
- **Trois niveaux de campagne**, « Prolonger la pente », « Le pont » et
  « Incliner » ; les 11 autres niveaux de la campagne de 14 sont spécifiés dans
  `levels/initial-progression.md`. Aucun bouton « Niveau suivant ».
- **Défi d’objets, progression, stockage local, partage, PWA** : décidés
  (ADR 0010, 0011, 0012), non implémentés.
- **Câblage réservé à l’auteur** : un levier ou un convoyeur pris dans
  l’inventaire en résolution ne peut pas être relié (ADR 0009).
- **Rien n’indique au joueur quelle balle est suivie** par l’objectif quand
  plusieurs balles sont sur le plateau.
- **Deux boutons « Réinitialiser »** (libellé à remplacer par « Recommencer », voir
  `mobile-editor-interactions.md`) actifs simultanément après une simulation
  terminée (barre d’actions et bandeau de résultat).
- **Retest du Xiaomi après L2c** : le vieux téléphone avait exigé un rechargement
  de `/bench/play`. Le chargeur retente maintenant un asset en échec lors des
  rendus suivants, au plus trois fois ; le comportement doit encore être vérifié
  sur cet appareil.
- **Mode auteur incomplet** : l’atelier ne permet ni d’éditer scène, zones,
  inventaire ou objectif, ni d’enregistrer, exporter ou partager un niveau.
- `format:check` ne couvre pas le Markdown.
- Aucune CI distante ni matrice de téléphones physiques.

## Dernière exécution de la gate

`pnpm check` exécutée avec succès le 26 septembre 2026 après L9 : typecheck,
lint, formatage, Knip, contenu (5 niveaux embarqués), 445 tests Vitest (35
fichiers), build et 32 tests Playwright `mobile` (31 réussis, C3 ignoré car
spécifique au projet desktop). Les six captures au repos sont conservées sous
`test-results/levels/` pour les niveaux 1 à 3, en portrait et paysage.
`pnpm build && pnpm exec playwright test --project=desktop` passe également :
30 tests réussis, dont C3 (vérifié pendant L1). Les tests lourds de frontière de
couches et de banc dense conservent leur délai explicite de 30 s, sans assertion
affaiblie.
