# État du dépôt — Contrapt!

Dernière mise à jour : 27 septembre 2026.

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
  en une seule entrée d’historique, poignées de rotation des poutres et des
  leviers en atelier, annulation atomique sur `pointercancel` ou second doigt.
- Tiroir du mode joueur limité aux familles présentes dans l’inventaire du
  niveau ; il affiche la quantité restante et la taille de poutre. Une entrée à
  quantité zéro reste visible et désactivée. L’atelier garde les onze familles.
- Panneau « Propriétés » (rail droit en grand format, tiroir compact sur petit
  écran) : longueur de poutre, cran de départ du levier, sens du convoyeur,
  rotation libre des poutres, limitée à ±135° pour les leviers, et par quarts
  de tour du ventilateur, de la barrière et du tremplin (boutons et poignée),
  états de départ du ventilateur et de la barrière, câblage levier/bouton →
  appareil au toucher, suppression.
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
- Niveau 4 « Moins, c’est mieux » jouable de bout en bout. Les deux références
  (une poutre longue ou deux courtes) gagnent ; le défi déclare 2 objets élégants
  et 1 objet minimal. La régression vérifie les fenêtres mesurées, les
  contre-exemples, l’absence de solution à zéro objet, le déterminisme et le
  reset (`src/content/levels/level-4-moins-c-est-mieux.test.ts`). Le parcours
  mobile choisit la poutre longue, la tourne à la poignée et gagne sur
  `/levels/level-4-moins-c-est-mieux/play`.
- Niveau 5 « Le détour » jouable de bout en bout avec deux zones et deux
  entrées de poutre. Sa régression vérifie les 36 combinaisons physiques, les 16
  poses autorisées par les zones, les deux solutions atteignables aux rotations
  tactiles de 15°, l’absence de solution à une poutre sur 1 680 poses, les
  contre-exemples, le déterminisme et le reset
  (`src/content/levels/level-5-le-detour.test.ts`). Le parcours mobile tourne les
  deux poutres et gagne sur `/levels/level-5-le-detour/play`.
- Niveau 6 « La bascule » se résout après le lancement de la simulation, sans
  inventaire ni zone de pose. Sa régression vérifie les neuf positions mesurées,
  le mouvement de la planche avant la victoire, son angle final et le reset exact
  (`src/content/levels/level-6-la-bascule.test.ts`). Le parcours mobile lance
  l’observation sans poser d’objet sur `/levels/level-6-la-bascule/play`.
- Niveau 7 « Placer la bascule » jouable au tactile. Sa régression vérifie
  l’échec sans bascule, les 11 poses robustes, le refus de rotation, le hit-test
  commun à la planche et au pied, le déterminisme et la position refusée à droite
  (`src/content/levels/level-7-placer-la-bascule.test.ts`). Le tiroir ne montre
  que la bascule disponible.
- Niveau 8 « Poutre et bascule » jouable au tactile avec deux zones. Les 15
  combinaisons physiques annoncées gagnent et cinq poses sont acceptées par les
  zones pour la solution à deux objets (`src/content/levels/level-8-poutre-et-bascule.test.ts`).
  La preuve qu’une bascule seule ne gagne pas reste non vérifiée : la source ne
  donne pas les coordonnées des 27 poses annoncées.
- Niveau 9 « Le tapis » jouable au tactile dans le chapitre « Mécanismes ».
  Les 12 positions physiques gagnent ; six sont entièrement dans la zone de pose.
  La régression vérifie les refus de confinement, la rotation interdite et le
  déterminisme (`src/content/levels/level-9-le-tapis.test.ts`).
- Niveau 10 « Le butoir » jouable au tactile dans le chapitre « Mécanismes ».
  Sa régression vérifie l’échec sans masse, la référence, les 12 poses robustes,
  le refus de rotation, l’immuabilité et le déterminisme. Les deux contre-exemples
  latéraux annoncés gagnent aux trois hauteurs mesurées ; cet écart est consigné
  sans ajuster la scène (`src/content/levels/level-10-le-butoir.test.ts`).
- En atelier, un levier peut être orienté de −135° à +135° par boutons ou par
  poignée tactile. La simulation compense le couple gravitationnel dû à cette
  orientation : les trois crans tiennent dans toute la plage mesurée et restent
  sensibles aux chocs. Les parcours E2E ouvrent l’inspecteur compact s’il est
  replié avant d’interagir avec ses propriétés.
- Niveau 11 « L’interrupteur » jouable au tactile dans le chapitre « Mécanismes ».
  La régression lit les états des dispositifs : les quatre poses gagnantes
  mesurées placent le levier à droite et le convoyeur à `1`; les contre-exemples
  le laissent au centre ou le placent à gauche. La référence annoncée à
  (6,2 ; 1,1) expire et deux poses de la fenêtre annoncée n’activent pas le levier ;
  l’écart est documenté sans changer la géométrie
  (`src/content/levels/level-11-l-interrupteur.test.ts`).
- Niveau 12 « Le bon ordre » jouable au tactile dans « Mécanismes » : une masse
  déclenche un levier câblé au convoyeur, puis une poutre tournée guide la balle.
  Les 153 combinaisons des fenêtres mesurées gagnent ; une recherche sur 936
  poses légales ne trouve aucune solution à un objet
  (`src/content/levels/level-12-le-bon-ordre.test.ts`).
- `pnpm content:check` valide les JSON embarqués.

## Dettes et limites explicites

- **Zones de pose peu visibles** : le joueur ne voit pas clairement où
  l’empreinte complète d’un objet peut être posée, surtout quand plusieurs zones
  existent. Leur mise en évidence en mode joueur est différée (U13) à une session
  ultérieure.
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
- **Douze niveaux de campagne**, « Prolonger la pente », « Le pont »,
  « Incliner », « Moins, c’est mieux », « Le détour », « La bascule »,
  « Placer la bascule », « Poutre et bascule », « Le tapis », « Le butoir »,
  « L’interrupteur » et « Le bon ordre ». Les niveaux 13 « Deux tapis » et 14
  « Grand final » sont bloqués après trois esquisses sans fenêtre de robustesse de
  0,3 unité. Aucun bouton « Niveau suivant ».
- **Paliers et progression de campagne, stockage local, partage, PWA** : décidés
  (ADR 0010, 0011, 0012), non implémentés. Les métadonnées de défi existent au
  format v2 et sont utilisées par les niveaux 4, 5 et 8 ; la preuve de minimalité
  à deux objets du niveau 8 reste à compléter avec les coordonnées de sa grille
  « bascule seule ».
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

`pnpm check` passe le 27 septembre 2026 après le constat L18c : typecheck, lint,
formatage, Knip, contenu (14 niveaux embarqués), 520 tests Vitest (44 fichiers), build et
42 tests Playwright `mobile` (41 réussis, 1 ignoré car C3 est spécifique au projet
desktop). Le parcours mobile L17b ouvre maintenant l’inspecteur compact avant de
vérifier les propriétés du levier sélectionné. Les captures au repos sont
conservées sous `test-results/levels/` pour les niveaux 1 à 12, en portrait et
paysage ; les trois orientations du levier y sont aussi capturées. La première
gate L16 avait expiré sur le parcours tactile préexistant du niveau 5 ; ce parcours
passe isolément et dans la gate complète relancée sans modification.
`pnpm build && pnpm exec playwright test --project=desktop` passe également :
30 tests réussis, dont C3 (vérifié pendant L1). Les tests lourds de frontière de
couches et de banc dense conservent leur délai explicite de 30 s, sans assertion
affaiblie.
