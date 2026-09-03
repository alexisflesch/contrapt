# Plan de remise en jeu — du prototype cassé au niveau 1 jouable

Statut : plan d'exécution, écrit après essai réel de l'application dans un
navigateur (desktop 1440 × 900, tablette 820 × 1180 et 1180 × 820, téléphone
390 × 844, 844 × 390 et 320 × 568).

Ce document **ne remplace pas `backlog.md`**, qui reste autorité sur le découpage
des tranches. Il ordonne et détaille l'exécution des tranches T3, T4b et T5 en
partant de ce qui est réellement observable aujourd'hui, et il signale les
contradictions entre la documentation et le code constatées pendant l'essai.

Chaque tâche indique le modèle et l'effort recommandés selon la table de routage
de `.codex/skills/orchestrate/references/routing.md` (`luna`, `terra`, `sol`).

## Suivi

Mis à jour à chaque intégration. `⏳` = agent en cours, `⬜` = pas démarré.

| Tâche                                 | État | Commit                 |
| ------------------------------------- | ---- | ---------------------- |
| A1 — ADR 0007                         | ✅   | `cdab65b`              |
| A2 — `LevelDocument v2` et migration  | ✅   | `09bf926`              |
| A3 — Caméra, panoramique, pincement   | ✅   | `06b6f50`              |
| A4 — Colliders en repère y-bas        | ✅   | `e19bf88`              |
| A5 — Découper `App.tsx`               | ✅   | `2d446db`              |
| B1 — Niveau 1 par défaut              | ⬜   |                        |
| B2 — Bornes du monde et fin de partie | ⬜   |                        |
| B3 — Géométrie du niveau 1            | ⬜   |                        |
| C1 — Fantôme de placement             | ⬜   |                        |
| C2 — Ombre portée                     | ⬜   |                        |
| C3 — Manipulation sur le plateau      | ⬜   |                        |
| D1 — Pipeline de sprites              | ⬜   | assets bruts `c72c8cc` |
| D2 — Régénérer les sprites            | ⬜   | assets bruts `c72c8cc` |
| D3 — Fond suivant la caméra           | ⬜   |                        |
| D4 — Mise en page des trois formats   | ⬜   |                        |
| E1 — Niveau 2                         | ⬜   |                        |
| E2 — Niveaux 3 à 8                    | ⬜   |                        |

### Écarts constatés depuis l'écriture du plan

- **`pnpm check` n'était pas verte au démarrage**, contrairement à ce qu'annonçait
  `etat.md` : Knip échoue sur `worldLengthToPixels` et des types inutilisés de
  `board-renderer.ts`, et `layer-boundaries.test.ts` échoue par timeout ESLint
  quand il tourne en parallèle. Vérifié sur un dépôt propre. À rattacher à la
  tranche qui les rencontre.
- **`format:check` ne couvre pas le Markdown** : le glob de `package.json` omet
  `.md`, et trois fichiers de `docs/` sont déjà mal formatés sans que la gate le
  voie.
- **A2 ne pouvait pas finir verte seule** : le passage en v2 casse des appelants
  qui appartiennent au périmètre de A3. La promesse « chaque tâche finit par
  `pnpm check` verte » est fausse pour une tâche qui modifie un contrat
  partagé ; A2 et A3 forment une paire.

---

## 1. Ce que l'essai a réellement montré

L'application démarre, ne lève aucune erreur console, et la gate `pnpm check`
passe. Et pourtant **rien de ce que le jeu promet n'est visible à l'écran**. Ce
n'est pas une accumulation de petits défauts : c'est une seule cause racine —
l'échelle du monde — qui rend tout le reste invérifiable, plus quatre défauts
indépendants.

### 1.1 Cause racine : deux systèmes de coordonnées incompatibles cohabitent

Le document « atelier » chargé au démarrage est écrit en coordonnées de type
pixel — [App.tsx:80-132](../src/app/App.tsx#L80-L132) place la balle en
`(40, 40)`, le panier en `(600, 400)` et déclare une zone de construction
`0..640 × 0..480`.

Or tout le reste du dépôt travaille en mètres :
`BALL_RADIUS = 0.3`, `BEAM_LENGTHS.medium = 4`, `BASKET_HALF_WIDTH = 0.75`
([simulation-session.ts:112-124](../src/simulation/simulation-session.ts#L112-L124)),
repris à l'identique par `familyVisuals` et `beamVisuals`
([board-renderer.ts:71-92](../src/presentation/board-renderer.ts#L71-L92)).

La caméra vaut `pixelsPerWorldUnit: 0.32`
([App.tsx:149](../src/app/App.tsx#L149)). Conséquence mesurée en session :

| Objet          | Taille monde | Taille écran au démarrage |
| -------------- | ------------ | ------------------------- |
| Balle          | 0,6 u        | **0,19 px**               |
| Panier         | 1,5 u        | 0,48 px                   |
| Poutre moyenne | 4 u          | 1,28 px                   |

C'est pour cela que le plateau paraît vide : les objets **sont dessinés**, à une
taille sub-pixel, dans le coin supérieur gauche. Un clic au centre du plateau
produit la position monde `1290, 735` (mesuré), soit 300 fois hors de toute
scène plausible.

Cela viole directement l'invariant d'`AGENTS.md` : « Les positions du domaine
sont exprimées en unités du monde, jamais en pixels d'écran. »

### 1.2 Il n'y a pas de caméra

`camera.origin` est déclaré ([App.tsx:145](../src/app/App.tsx#L145)) mais **n'est
jamais modifié** : aucun panoramique n'existe. Le bouton « Ajuster à la scène »
ne calcule rien, il réaffecte la constante `initialCamera`
([App.tsx:1120](../src/app/App.tsx#L1120)). Le zoom est un facteur × 1,25 sans
bornes. `mobile-editor-interactions.md` § Navigation du plateau exige panoramique,
pincement, bornes de zoom et un « Ajuster à la scène » qui « restaure toujours un
cadrage utilisable » : aucun des quatre n'existe.

### 1.3 L'aperçu de placement n'est pas l'objet

C'est le point explicitement signalé. L'aperçu est une **forme CSS fixe** en
overlay DOM ([App.tsx:1077-1095](../src/app/App.tsx#L1077-L1095), styles
[styles.css:258-326](../src/ui/styles.css#L258-L326)) : un cercle pointillé de
36 px contenant, pour la poutre, une barre **verte de 52 × 9 px inclinée à
−24°** — alors que l'objet réellement placé est une poutre horizontale de 4 × 0,25
unités monde dessinée avec le sprite `beam@2x.png`.

L'aperçu ne partage donc avec l'objet ni la forme, ni la taille, ni la rotation,
ni la couleur, ni l'échelle de caméra. Il ne bouge pas non plus quand on zoome.

### 1.4 Le repère du panier est à l'envers

`#createBasket` ([simulation-session.ts:357-390](../src/simulation/simulation-session.ts#L357-L390))
pose le fond du panier à l'offset `(0, -0.5)`. Dans un monde où `y` croît vers le
bas — convention retenue et testée, cf. `etat.md` § « La gravité Planck est
alignée sur le repère écran » — cet offset place le fond **au-dessus** du centre.
La géométrie a été écrite en repère y-haut.

Le niveau 1 compense par une `rotation: 3.141592653589793`
([level-1-laisser-tomber.json](../src/content/levels/level-1-laisser-tomber.json)).
Ce contournement retourne aussi le sprite : le panier sera dessiné à l'envers dès
qu'il sera visible. La bascule a un défaut voisin, son socle étant centré sur le
pivot au lieu d'être posé dessous.

### 1.5 Les sprites ne sont pas des sprites

Les quatre PNG sont des illustrations de présentation, pas des éléments de jeu :

| Fichier         | Dimensions  | Poids   | Problème                                             |
| --------------- | ----------- | ------- | ---------------------------------------------------- |
| `ball@2x.png`   | 1254 × 1254 | 396 Ko  | 2090 px par unité monde                              |
| `basket@2x.png` | 1230 × 1278 | 1301 Ko | perspective 3/4, ratio 0,96 pour une boîte 1,5 × 1,1 |
| `beam@2x.png`   | 1536 × 1024 | 953 Ko  | **fond noir opaque + halo**, marge morte de 65 %     |
| `seesaw@2x.png` | 1536 × 1024 | 1172 Ko | même marge morte                                     |

Environ 3,8 Mo pour quatre objets, plus 1,7 Mo de fond, dans une PWA qui doit
fonctionner hors ligne sur téléphone. La perspective du panier contredit la
direction artistique « 2D plate, sans faux relief ni perspective » actée par
`cahier-des-charges.md` et l'ADR 0006. Le fond opaque de la poutre la rend
inutilisable telle quelle. Aucune convention ne lie la boîte alpha du PNG à
l'empreinte du collider, donc `drawImage` étire arbitrairement.

### 1.6 Défauts secondaires relevés, tous réels

- **Pas de bornes de monde ni de fin de partie.** Rien n'arrête une simulation
  ratée : la balle tombe indéfiniment. Seule la victoire est détectée.
- **Pas de plafond de rattrapage.** `advanceElapsedSeconds` reçoit l'écart brut
  entre deux `requestAnimationFrame` ([App.tsx:433-436](../src/app/App.tsx#L433-L436)).
  Après un retour d'onglet, la boucle tente des milliers de pas d'un coup et gèle
  la page.
- **Durée de maintien trop courte.** `BASKET_GOAL_HOLD_DURATION_IN_FIXED_STEPS = 3`
  ([simulation-session.ts:128](../src/simulation/simulation-session.ts#L128)),
  soit 50 ms : une balle qui traverse le capteur gagne.
- **Sélection et manipulation hors plateau.** Les objets ne se sélectionnent pas
  au doigt sur le canvas. Il faut passer par une bande de pastilles textuelles
  sous le plateau ([App.tsx:1141-1167](../src/app/App.tsx#L1141-L1167)), puis
  glisser un **bouton** « Déplacer la balle » pour la déplacer, et cliquer
  « Tourner à droite » par pas de π/12 pour la faire pivoter. C'est l'inverse de
  ce qu'exige `mobile-editor-interactions.md` §§ Sélection, Déplacement, Rotation.
- **Décalage de 2 px au placement.** Le point écran est converti à partir du
  rectangle de `.scene-frame`, qui porte une bordure de 2 px
  ([styles.css:231-247](../src/ui/styles.css#L231-L247)), alors que le canvas est
  en `inset: 0` à l'intérieur.
- **Le fond ne suit pas la caméra.** C'est un `background-size: cover` CSS. Sa
  grille ment sur l'échelle du monde et ne bouge ni au zoom ni au panoramique.
- **Le niveau 1 n'est pas le parcours par défaut.** Il faut ouvrir ☰ → « Liste
  des niveaux » → « Lancer le niveau 1 ». Le niveau se termine alors par une
  victoire annoncée **sans que rien n'ait été visible**.
- **`App.tsx` fait 1323 lignes** et concentre état applicatif, caméra, boucle de
  simulation, gestes pointeur, rendu et la totalité du JSX. C'est la raison
  mécanique pour laquelle une modification y casse autre chose.
- **Mise en page non tenue sur petit écran.** Mesures relevées : plateau de
  484 × 128 px en téléphone paysage (844 × 390) ; plateau portrait 358 × 450 pour
  une scène qui est un panorama ; panneau latéral de 303 px sur une tablette
  portrait de 820, laissant un plateau étroit et un panneau vide aux trois quarts.

### 1.7 Ce qui est sain et doit être préservé

Le socle non visuel est bon et il ne faut pas le refaire :

- le schéma Zod de `LevelDocument`, ses validations sémantiques et ses plafonds ;
- `History`, `ConstructionAttempt` et sa provenance éphémère, `EditorSession` ;
- l'évaluateur d'objectif panier, pur et testé ;
- la boucle à pas fixe avec accumulateur et durée injectée ;
- le protocole de conformité physique et les scènes 6 et 7 ;
- le test de frontières entre couches.

Le problème est concentré dans `src/app/`, `src/ui/`, `src/presentation/` et dans
les constantes de `src/simulation/`.

---

## 2. Conventions à figer avant toute écriture de code

Ces valeurs sont le contrat commun de toutes les tâches ci-dessous. Elles sont à
acter dans une ADR (tâche A1) puis à ne plus discuter.

### 2.1 Repère du monde

- 1 unité monde = 1 mètre. Les constantes physiques existantes sont déjà dans
  cette échelle et ne changent pas.
- L'axe `x` croît vers la droite, l'axe `y` **vers le bas**. C'est la convention
  déjà testée. Toute géométrie de collider écrite en y-haut est un bug.
- L'origine d'un niveau est le coin supérieur gauche de sa scène.

### 2.2 Scène d'un niveau

Un niveau déclare explicitement son rectangle de scène en unités monde. Il sert à
trois choses : le cadrage initial, la détection de sortie de monde, et le calage
du fond.

- Un niveau du premier chapitre tient dans **8 × 5,5 unités**. Ce n'est pas une
  contrainte du format, c'est une règle de contenu : à 320 px de large, 8 unités
  donnent 40 px/unité, donc une balle de 24 px, lisible au doigt.
- La scène de référence pour un niveau large est 16 × 9.

### 2.3 Caméra

- « Ajuster à la scène » calcule un `contain` du rectangle de scène dans le
  canvas, avec 4 % de marge, et recentre l'origine. C'est le cadrage au
  chargement d'un niveau, et le cadrage restauré par le bouton.
- Bornes de zoom : `[0,6 × ajusté, 4 × ajusté]`, plus un plancher absolu de
  24 px/unité pour que rien ne devienne sub-pixel.
- L'origine est bornée pour que le rectangle de scène ne puisse jamais sortir
  entièrement du canvas.
- Panoramique à un doigt depuis une zone vide, pincement à deux doigts, plus les
  trois boutons — conformément à `mobile-editor-interactions.md` § Navigation.

### 2.4 Convention de sprite

- Un sprite est un PNG à **fond transparent**, sans halo, sans ombre portée
  incrustée, sans perspective.
- Résolution de référence : **128 px par unité monde à @2x** (donc 64 à @1x).
- **La boîte englobante alpha du PNG est exactement l'empreinte du collider.**
  C'est ce qui rend `drawImage` correct sans facteur de fudge.
- L'ancre de dessin est le centre de cette boîte, et coïncide avec l'origine du
  corps physique.
- Budget : ≤ 60 Ko par sprite après compression.

Tailles cibles qui découlent de la convention, à @2x :

| Sprite        | Empreinte monde | PNG @2x   |
| ------------- | --------------- | --------- |
| `ball`        | 0,6 × 0,6       | 77 × 77   |
| `basket`      | 1,5 × 1,1       | 192 × 141 |
| `beam-short`  | 2 × 0,25        | 256 × 32  |
| `beam-medium` | 4 × 0,25        | 512 × 32  |
| `beam-long`   | 6 × 0,25        | 768 × 32  |
| `seesaw`      | 3 × 0,94        | 384 × 120 |

### 2.5 Note sur les tests existants

`src/app/App.test.tsx` (835 lignes) et `e2e/smoke.spec.ts` encodent une partie du
comportement cassé — notamment « sélectionne une poutre hors canvas » et l'aperçu
CSS. `AGENTS.md` interdit d'affaiblir un test pour faire passer une
implémentation ; il n'interdit pas de **réécrire un test qui décrit un
comportement retiré**. La règle de ce plan :

> Un test qui décrit un comportement explicitement supprimé par une tâche est
> réécrit dans la même tâche, en énonçant le comportement de remplacement. Un
> test qui décrit un invariant conservé n'est jamais touché. Le rapport de tâche
> liste nommément chaque test réécrit et pourquoi.

---

## 3. Phase A — Fondations

Rien d'autre n'est vérifiable tant que A1 à A4 ne sont pas intégrées. À faire en
séquence, pas en parallèle.

### A1 — ADR 0007 « Repère du monde, scène, caméra et échelle des sprites »

État : ✅ **Fait** — commit `cdab65b`.

**Modèle : `sol` / effort `max`.** (Table de routage : « Rédaction ou révision
d'ADR, déplacement de frontière ».)

Écrit dans `docs/decisions/0007-world-scale-and-camera.md`, plus les lignes
correspondantes dans `docs/index.md`.

Contenu : la totalité de la section 2 ci-dessus, transformée en décision motivée.
L'ADR doit aussi :

- constater explicitement que `App.tsx:80-132` viole l'invariant d'unités monde,
  et acter sa suppression ;
- acter que le rectangle de scène entre dans le format persistant, ce qui impose
  `schemaVersion: 2` et une migration (tâche A2) ;
- acter que les sprites livrés sont des prototypes non conformes et qu'ils sont
  remplacés (tâche D2), en corrigeant la formulation optimiste d'`etat.md` §
  « Les quatre PNG 2× locaux sont présents ».

**Sortie vérifiable :** l'ADR existe, son statut est `accepté`, `docs/index.md`
la référence, et `etat.md` ne contient plus d'affirmation contredite par la
section 1 de ce plan.

**Ne pas faire :** aucun code dans cette tâche.

---

### A2 — `LevelDocument v2` : rectangle de scène et migration

État : ✅ **Fait** — commit `09bf926`.

**Modèle : `terra` / effort `high`.** (« Schéma Zod, validation sémantique,
migration ».)

Écrit dans `src/domain/level-document.ts`, `src/content/levels/*.json`,
`src/infrastructure/content/catalogue-validator.ts`.

Ajouter au document un champ obligatoire :

```
scene: { min: { x, y }, max: { x, y } }
```

Règles à valider dans le schéma :

- `max.x > min.x` et `max.y > min.y`, tous finis ;
- largeur et hauteur comprises entre 4 et 64 unités ;
- **tout objet placé et toute zone de construction sont contenus dans la scène**
  — c'est une validation sémantique, au même titre que les références de
  l'objectif.

Migration `v1 → v2` : si `scene` est absent, la dériver de la boîte englobante
des objets et des zones, élargie de 2 unités dans chaque direction, puis bornée
au minimum de 4 unités. Tester la migration sur un fixture v1 et vérifier que le
document v2 produit est valide.

**Tests rouges d'abord :** un document sans `scene` en `schemaVersion: 2` est
refusé ; un objet hors scène est refusé avec un chemin d'erreur exploitable ; un
document v1 migré produit une scène contenant tous ses objets ; un document v2
valide reste accepté.

**Sortie vérifiable :** `pnpm content:check` passe, le niveau 1 déclare sa scène,
et un test couvre chacune des deux versions.

---

### A3 — Une vraie caméra, et la mort du document en pixels

État : ✅ **Fait** — commit `06b6f50`.

**Modèle : `terra` / effort `high`.**

Écrit dans `src/presentation/`, `src/app/`, `src/ui/styles.css`.

1. **Supprimer `workshopDocument`** ([App.tsx:80-132](../src/app/App.tsx#L80-L132)).
   Le mode création part désormais d'un document d'atelier en unités monde :
   scène 16 × 9, une poutre longue statique posée en `y = 8` en guise de sol,
   panier en `(12, 7)`, balle en `(3, 1)`, inventaire de 99 par famille, zone de
   construction couvrant toute la scène. Le placer dans
   `src/content/levels/workshop.json` et le valider comme les autres contenus,
   plutôt que de le construire en TypeScript dans le composant.

2. **Créer un module caméra pur** `src/presentation/board-camera.ts`, sans DOM :

   ```
   fitCameraToScene(scene, canvasSizeInCss, marginRatio) -> Camera
   zoomCameraAt(camera, factor, anchorInCss, scene, canvasSize) -> Camera
   panCamera(camera, deltaInCss, scene, canvasSize) -> Camera
   clampCamera(camera, scene, canvasSize) -> Camera
   ```

   `Camera = { origin: WorldPoint, pixelsPerWorldUnit: number }`. Toutes les
   bornes de § 2.3 vivent ici, en constantes nommées et exportées. Ce module est
   testable sans navigateur : c'est là que doivent aller les tests.

3. **Câbler** : cadrage initial au chargement d'un niveau et au redimensionnement ;
   « Ajuster à la scène » appelle `fitCameraToScene` ; les boutons ± appellent
   `zoomCameraAt` ancré au centre du canvas ; un glissement à un doigt sur une
   zone vide appelle `panCamera` ; un pincement à deux doigts appelle
   `zoomCameraAt` ancré au milieu des deux doigts et annule toute manipulation
   d'objet en cours sans créer de commande.

4. **Corriger le décalage de 2 px** : convertir écran → monde à partir du
   rectangle du **canvas**, pas de `.scene-frame`.

**Tests rouges d'abord :** un `fitCameraToScene` sur une scène 8 × 5,5 dans un
canvas 320 × 240 donne un zoom ≥ 24 px/unité et centre la scène ; le zoom est
borné aux deux extrémités ; `panCamera` ne peut pas faire sortir la scène du
canvas ; un point écran au centre du canvas se reconvertit au centre de la scène.

**Sortie vérifiable :** au chargement, la balle du niveau 1 mesure au moins
20 px à l'écran sur un viewport 320 × 568, et l'attribut
`data-camera-zoom` du canvas est cohérent avec la scène.

---

### A4 — Remettre les colliders dans le repère y-bas

État : ✅ **Fait** — commit `e19bf88`. A retrouvé et corrigé au passage
`familyVisuals.seesaw` dans `board-renderer.ts` (empreinte réelle 3 × 0,82,
non centrée sur le pivot), un travail né de cette tâche mais qu'A3, déjà
intégrée, ne pouvait plus absorber.

**Modèle : `sol` / effort `high`.** (« Adaptateur physique, boucle à pas fixe,
déterminisme ».)

Écrit dans `src/simulation/simulation-session.ts`, `test/conformance/`,
`src/content/levels/`.

1. **Panier**, dans le repère y-bas :
   - fond : `Box(BASKET_HALF_WIDTH, BASKET_WALL_HALF_THICKNESS, Vec2(0, +BASKET_WALL_HALF_HEIGHT))` ;
   - parois : `Box(BASKET_WALL_HALF_THICKNESS, BASKET_WALL_HALF_HEIGHT, Vec2(±BASKET_HALF_WIDTH, 0))` ;
   - capteur : `Box(BASKET_HALF_WIDTH, BASKET_SENSOR_HALF_HEIGHT)` centré.

   Vérifier que l'empreinte totale vaut bien `1,5 × 1,1`, c'est-à-dire
   exactement `familyVisuals.basket`. Puis **retirer la `rotation: π` du niveau 1**,
   qui n'était qu'un contournement.

2. **Bascule** : le socle est posé **sous** le pivot, offset
   `Vec2(0, +SEESAW_BASE_HALF_HEIGHT)`, et le tablier reste centré sur le pivot.
   Recalculer l'empreinte visuelle et corriger `familyVisuals.seesaw` en
   conséquence, au lieu de laisser deux valeurs se contredire.

3. **Tunneling** : marquer la balle comme corps rapide (`bullet`). Une poutre fait
   0,25 unité d'épaisseur ; à 20 m/s un pas de 1/60 s parcourt 0,33 unité.

4. **Repos** : autoriser l'endormissement des corps, pour qu'une balle immobile
   cesse de vibrer et pour que la scène se stabilise.

5. **Durée de maintien** : porter
   `BASKET_GOAL_HOLD_DURATION_IN_FIXED_STEPS` de 3 à **30** pas, soit 0,5 s. Une
   balle qui traverse le capteur ne doit pas gagner. La durée reste injectée et
   ne devient pas une propriété du niveau.

**Tests rouges d'abord :** une balle lâchée au-dessus d'un panier non tourné
finit à l'intérieur, `y` final au-dessus du fond, à ±0,02 près ; une balle lancée
à 25 m/s vers une poutre ne la traverse pas ; une balle qui traverse le capteur
sans s'arrêter n'émet pas de succès ; le socle de bascule est bien sous le pivot.

**Sortie vérifiable :** la suite de conformité reste verte, les nouveaux tests
passent, et le JSON du niveau 1 n'a plus de rotation de compensation.

---

### A5 — Découper `App.tsx`

État : ✅ **Fait** — commit `2d446db`. `App.tsx` : 158 lignes. Phase A
terminée.

**Modèle : `terra` / effort `high`.**

Écrit dans `src/app/`, `src/ui/`.

Refactoring **sans changement de comportement**, à faire maintenant parce que les
phases B et C touchent toutes les deux ce fichier et qu'un agent ne peut pas
travailler proprement dans 1323 lignes.

Découpage cible :

| Module                             | Responsabilité                                                       |
| ---------------------------------- | -------------------------------------------------------------------- |
| `src/app/App.tsx`                  | composition uniquement, ≤ 150 lignes                                 |
| `src/app/use-editor-session.ts`    | `EditorSession`, commandes, historique, retours de refus             |
| `src/app/use-simulation-runner.ts` | boucle RAF, pas fixe, pause, reset, destruction                      |
| `src/app/use-board-camera.ts`      | état caméra, cadrage, redimensionnement                              |
| `src/app/use-board-pointers.ts`    | gestes : placement, sélection, déplacement, rotation, pan, pincement |
| `src/ui/BoardView.tsx`             | canvas, sa taille, son rendu                                         |
| `src/ui/ObjectDrawer.tsx`          | tiroir                                                               |
| `src/ui/ContextPanel.tsx`          | panneau contextuel                                                   |
| `src/ui/SimulationControls.tsx`    | barre tester / pause / reset                                         |

Ajouter dans la même tâche le **plafond de rattrapage** de la boucle RAF : au
plus 5 pas fixes par frame, le reste est abandonné. C'est le seul changement de
comportement autorisé ici, et il est couvert par son propre test.

**Sortie vérifiable :** `pnpm check` reste verte sans réécrire un seul test
existant, hors le nouveau test de plafond. Si un test doit être réécrit, c'est le
signe que le refactoring a changé le comportement : il faut revenir en arrière.

---

## 4. Phase B — Le niveau 1 réellement jouable

### B1 — Le niveau 1 est le parcours par défaut

État : ⬜ À faire.

**Modèle : `terra` / effort `medium`.** (« Composant React, câblage d'UI,
style ».)

Écrit dans `src/app/`, `src/ui/`, `e2e/`.

Au chargement, l'application ouvre **le niveau 1 en mode joueur**, pas un atelier
vide. L'éditeur reste accessible par le menu ☰.

Conformément à `levels/initial-progression.md` § Niveau 1 :

- l'objectif est affiché en permanence, court, non bloquant, sans dialogue ;
- l'inventaire est vide, donc **le tiroir n'est pas affiché du tout** — il ne doit
  pas suggérer qu'une construction est nécessaire ;
- les actions disponibles sont exactement : Tester, Pause, Reprendre,
  Réinitialiser, et les trois contrôles de cadrage ;
- après la réussite, un bandeau non modal annonce la victoire et propose
  « Rejouer » et « Menu ». Il ne recouvre pas le plateau.

**Supprimer la bande de pastilles `.scene-objects`**
([App.tsx:1141-1167](../src/app/App.tsx#L1141-L1167)). C'est un affichage de
débogage. Les tests qui s'appuient dessus pour sélectionner un objet sont
réécrits par la tâche C3, qui fournit la sélection sur le plateau ; d'ici là ils
peuvent cibler le canvas via ses attributs `data-*`.

**Sortie vérifiable :** un parcours Playwright sur 320 × 568 ouvre l'application,
appuie sur Tester sans rien d'autre, et observe la victoire annoncée — avec un
assert que la balle a bien parcouru une distance visible à l'écran, pas seulement
que le statut a changé.

---

### B2 — Bornes du monde et fin de partie

État : ⬜ À faire.

**Modèle : `sol` / effort `high`.**

Écrit dans `src/simulation/`, `src/domain/`, `src/app/`.

Aujourd'hui une tentative ratée ne se termine jamais. Ajouter deux issues, toutes
deux dérivées de faits de simulation et évaluées à pas fixe :

- **hors scène** : le centre de la balle cible sort du rectangle de scène élargi
  de 2 unités ;
- **temps écoulé** : la simulation dépasse une durée bornée injectée, 20 secondes
  simulées par défaut.

Ne **pas** ajouter de murs implicites au monde : un niveau qui veut un sol ou une
paroi les pose avec une poutre statique. Cela garde les quatre familles
suffisantes et évite qu'une balle se repose éternellement au bord de l'écran.

L'interface annonce l'échec de façon non bloquante et propose « Réinitialiser ».
Le reset doit continuer à restituer exactement le document d'avant lancement.

**Tests rouges d'abord :** une balle sans panier atteignable produit l'issue
« hors scène » avant la limite de temps ; une balle immobile dans la scène
produit l'issue « temps écoulé » ; aucune des deux ne modifie le document édité.

---

### B3 — Recaler la géométrie du niveau 1

État : ⬜ À faire.

**Modèle : `luna` / effort `high`.** (« Écrire un JSON de niveau depuis une spec
écrite ».)

Écrit dans `src/content/levels/level-1-laisser-tomber.json`, `test/`.

Géométrie proposée, scène `min (0,0)` → `max (8, 5.5)`, y vers le bas :

| Objet      | Position   | Rotation | Permissions    |
| ---------- | ---------- | -------- | -------------- |
| `ball-1`   | `(4, 1.0)` | 0        | toutes `false` |
| `basket-1` | `(4, 4.2)` | 0        | toutes `false` |

Chute utile ≈ 2,65 unités, soit ≈ 0,73 s à 9,81 m/s², vitesse d'impact ≈ 7,2 m/s.
C'est assez lent pour être lisible et assez rapide pour ne pas paraître mou.
`inventory: []`, `buildZones: []`, objectif panier inchangé.

**Scénario de régression**, conforme à `levels/initial-progression.md` :
depuis l'état initial, avancer à pas fixe dans une durée bornée ; `ball-entered-target`
est émis ; après reset, la transformée de la balle est **exactement** celle du
départ et le capteur est inactif ; le `LevelDocument` n'a pas été modifié.

**Sortie vérifiable :** le test de régression du niveau 1 passe et sert de fixture
de référence aux niveaux suivants.

---

## 5. Phase C — Le placement et la manipulation, la demande explicite

### C1 — Le fantôme de placement est le vrai objet

État : ⬜ À faire.

**Modèle : `terra` / effort `high`.**

Écrit dans `src/presentation/board-renderer.ts`, `src/app/`, `src/ui/styles.css`.

C'est le point qui a motivé ce plan. La bonne nouvelle : le travail est déjà à
moitié fait sans que ce soit exploité. `previewEditorManipulation` insère **déjà**
le placement prévisualisé dans le document courant. Le renderer le dessine donc
déjà, avec le bon sprite, la bonne taille et la bonne rotation. Il suffit de le
lui faire dessiner **en fantôme** au lieu de superposer une forme CSS sans
rapport.

1. **Supprimer** l'overlay DOM `.placement-preview`
   ([App.tsx:1077-1095](../src/app/App.tsx#L1077-L1095)) et les 70 lignes de CSS
   associées ([styles.css:258-326](../src/ui/styles.css#L258-L326)).

2. **Étendre la projection**. `ProjectedBoardObject` reçoit un champ
   `appearance: 'solid' | 'ghost-valid' | 'ghost-invalid'`, et `projectLevel`
   prend une option :

   ```
   projectLevel(document, { ghostPlacementId, isGhostValid })
   ```

   Le domaine n'est pas touché : c'est une décision de présentation.

3. **Étendre le port canvas**. `BoardCanvasContext` reçoit `setGlobalAlpha` et
   les primitives de tracé nécessaires au contour. Garder la règle du port :
   n'exposer que ce qui est réellement utilisé. Le renderer dessine :
   - `ghost-valid` : sprite à `globalAlpha = 0.55`, plus le contour de
     l'empreinte en trait plein de 2 px CSS ;
   - `ghost-invalid` : sprite à `globalAlpha = 0.35`, plus le contour de
     l'empreinte en tirets, en couleur d'avertissement.

   Le contour est **exprimé en pixels CSS et ne change pas avec le zoom** :
   `mobile-editor-interactions.md` § Zoom l'exige pour les poignées et contrôles.

4. **Nettoyer** au passage
   [board-renderer.ts:185](../src/presentation/board-renderer.ts#L185), où
   `sprite.source !== undefined ? sprite.source : sprite` masque un trou de
   typage.

**Tests rouges d'abord**, au niveau du renderer, qui est déjà testable avec un
contexte factice : un placement fantôme valide produit un `drawImage` du sprite
de **sa famille** aux dimensions de son empreinte, avec un alpha < 1 ; un
fantôme invalide utilise le tracé en tirets ; les objets non fantômes gardent un
alpha de 1 ; changer le zoom change la taille du sprite mais pas l'épaisseur du
contour.

**Sortie vérifiable :** en sélectionnant « Poutre » puis en survolant le plateau,
on voit **une poutre de 4 unités, orientée comme elle sera posée, à l'échelle de
la caméra**, translucide. Un test Playwright compare la boîte du fantôme à la
boîte de l'objet après relâchement : elles coïncident.

---

### C2 — Ombre portée au sol

État : ⬜ À faire.

**Modèle : `terra` / effort `medium`.**

Écrit dans `src/presentation/board-renderer.ts`.

À ne pas confondre avec C1. Il s'agit ici de l'ombre de lisibilité visible sur le
visuel de référence : une ellipse sombre et floue, dessinée **avant** le sprite,
décalée de 0,08 unité vers le bas, d'une largeur égale à 0,9 fois l'empreinte,
opacité 0,18. Pour un objet en chute libre, l'ombre reste attachée à l'objet ;
il n'y a pas de projection verticale au sol dans ce périmètre.

Faire cette tâche **après** C1, et pas avant : sans C1 il n'y a rien à ombrer.

**Sortie vérifiable :** un test de renderer vérifie l'ordre de dessin — ombre
puis sprite — et l'absence d'ombre sous un fantôme invalide.

---

### C3 — Sélection, déplacement et rotation directement sur le plateau

État : ⬜ À faire.

**Modèle : `terra` / effort `high`.**

Écrit dans `src/presentation/`, `src/app/`, `src/ui/`, `e2e/`.

Remplace les pastilles et les boutons-poignées par ce qu'exige
`mobile-editor-interactions.md` §§ Sélection, Déplacement, Rotation.

1. **Hit-test**, dans un module pur `src/presentation/board-hit-test.ts` :
   ordre déterministe du dernier placé au premier, empreinte du collider
   **élargie à au moins 44 px CSS** dans chaque direction. Les composants d'une
   bascule ne sont jamais des cibles distinctes : la bascule est une seule cible.

2. **Sélection** : toucher un objet le sélectionne, toucher le vide désélectionne.
   La sélection est signalée par au moins deux moyens — contour du collider **et**
   panneau contextuel — jamais par la couleur seule.

3. **Déplacement** : contact sur l'objet, seuil de glissement en px CSS, puis
   projection temporaire suivant le doigt via `previewEditorManipulation`, puis
   une seule commande au relâchement. `pointercancel`, changement d'orientation
   et arrivée d'un second doigt annulent atomiquement, sans entrée d'historique.

4. **Rotation** : une poignée explicite, dessinée dans le canvas à distance fixe
   en px CSS au-dessus du centre de l'objet sélectionné, séparée de la zone de
   déplacement. Plus deux boutons accessibles − et + dans le panneau contextuel,
   appliquant le pas de snapping courant. En résolution, snapping à 15° ; en
   création, snapping ou angle libre, l'état courant étant visible dans le
   panneau.

5. **Supprimer** les boutons « Déplacer la … » et « Tourner à droite » du panneau
   contextuel, ainsi que la bande `.scene-objects`.

**Tests réécrits :** « sélectionne une poutre hors canvas et regroupe son
déplacement tactile en une commande » et « fait pivoter puis supprime la poutre »
décrivent le comportement supprimé. Les réécrire pour la même garantie —
**un geste continu produit exactement une entrée d'historique** — mais sur le
plateau.

**Sortie vérifiable :** un parcours Playwright tactile sur 320 × 568 pose une
poutre, la glisse, la fait pivoter à la poignée, annule deux fois et rétablit
deux fois, en n'utilisant que le plateau et le panneau contextuel.

---

## 6. Phase D — Habillage

### D1 — Pipeline de sprites

État : ⬜ À faire. Note : des PNG aux dimensions cibles existent déjà dans
`public/assets/` (commit `c72c8cc`, produits hors de ce plan par un agent
externe ayant lu l'ADR 0007) — fond transparent, dimensions correctes à l'œil,
mais **non mesurés** par un script. Ne pas les régénérer sans avoir d'abord
écrit `validate-sprites.ts` et vérifié ce qu'ils valent réellement.

**Modèle : `terra` / effort `high`.**

Écrit dans `src/presentation/sprite-loader.ts`, `scripts/`, `docs/`.

- Introduire les trois tailles de poutre comme trois clés de sprite distinctes,
  `beam-short`, `beam-medium`, `beam-long` : une poutre longue étirée depuis le
  sprite moyen donne des vis ovales.
- Écrire un script `scripts/validate-sprites.ts`, ajouté à `pnpm check`, qui
  vérifie pour chaque PNG : dimensions attendues de § 2.4 à ±2 px, poids ≤ 60 Ko,
  présence d'un canal alpha, et boîte alpha touchant les quatre bords — c'est ce
  dernier point qui garantit que l'empreinte correspond au collider.
- Documenter la convention dans `docs/assets/convention-sprites.md`.

**Sortie vérifiable :** le script échoue sur les quatre PNG actuels, en nommant
la raison pour chacun. C'est le résultat attendu à ce stade : il devient vert
avec D2.

---

### D2 — Régénérer les quatre familles

État : ⬜ À faire. Note : voir D1 — possiblement déjà couvert par `c72c8cc`,
à confirmer une fois le script de D1 écrit plutôt qu'à l'œil. Les fichiers déjà
présents ne sont pas encore câblés dans `sprite-loader.ts` ni
`object-family-registry.ts` : `beam@2x.png` et `seesaw@2x.png` historiques
restent ceux réellement utilisés par le renderer.

**Modèle : `luna` / effort `xhigh`, capacité de génération d'image.**

Écrit dans `public/assets/sprites/`.

Contraintes communes, à répéter dans chaque prompt : **fond entièrement
transparent**, 2D plate vue strictement de côté, aucune perspective, aucun faux
relief, aucune ombre portée incrustée, aucun halo ni lueur, contour sombre
régulier, palette chaude cohérente avec le visuel de référence
`ee99b245-f82e-4090-992b-15305004f8a3.png`, l'objet **touchant les quatre bords
du cadre** sans marge.

| Sprite               | PNG @2x   | Sujet                                                                                                   |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------- |
| `ball@2x.png`        | 77 × 77   | bille rouge mate, un seul reflet net en haut à gauche, contour brun                                     |
| `basket@2x.png`      | 192 × 141 | panier d'osier ouvert vu de côté, tressage lisible, ouverture vers le haut, **pas** de cercle de basket |
| `beam-short@2x.png`  | 256 × 32  | planche de bois clair, veinage discret, extrémités arrondies                                            |
| `beam-medium@2x.png` | 512 × 32  | même planche, même veinage, allongée                                                                    |
| `beam-long@2x.png`   | 768 × 32  | idem                                                                                                    |
| `seesaw@2x.png`      | 384 × 120 | tablier de bois horizontal sur un socle triangulaire métallique, socle **sous** le pivot                |

Les trois poutres doivent être visiblement la même planche à trois longueurs,
pas trois objets différents. Après génération : détourer, recadrer sur la boîte
alpha, redimensionner exactement, compresser, puis faire passer
`scripts/validate-sprites.ts`.

Si un sprite ne peut pas satisfaire le budget de 60 Ko en restant lisible, le
signaler plutôt que de contourner la vérification.

---

### D3 — Le fond suit la caméra

État : ⬜ À faire.

**Modèle : `terra` / effort `medium`.**

Écrit dans `src/presentation/board-renderer.ts`, `src/ui/styles.css`.

Retirer le `background-image` CSS de `.scene-frame`. Le fond devient la première
passe du renderer : il est dessiné dans le rectangle de scène projeté, donc il
zoome et se déplace avec le monde. Hors scène, peindre une couleur neutre unie —
c'est ce qui donne au joueur la limite du monde, qui est aussi celle utilisée par
B2.

Ajouter par-dessus une grille d'une unité monde, tracée en pixels CSS, atténuée à
faible zoom. C'est elle qui rend l'échelle lisible et qui aide au placement.

**Sortie vérifiable :** un test de renderer vérifie que le rectangle de fond
projeté suit le zoom, et un test visuel Playwright compare deux niveaux de zoom.

---

### D4 — Mise en page des trois formats

État : ⬜ À faire.

**Modèle : `terra` / effort `medium`.**

Écrit dans `src/ui/styles.css`, `src/ui/`, `e2e/`.

Mesures actuelles à corriger, relevées en session :

| Format                       | Constat                                                    | Cible                                                          |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| Téléphone portrait 390 × 844 | plateau 358 × 450, en-tête et barres surdimensionnées      | plateau ≥ 55 % de la hauteur                                   |
| Téléphone paysage 844 × 390  | **plateau 484 × 128**, contenu sous la ligne de flottaison | plateau ≥ 60 % de la hauteur, en-tête réduit à une ligne       |
| Tablette portrait 820 × 1180 | panneau latéral de 303 px vide aux 3/4, plateau étroit     | tiroir bas comme en téléphone portrait, plateau pleine largeur |
| Tablette paysage 1180 × 820  | acceptable                                                 | panneau latéral conservé                                       |

Règles à appliquer :

- le plateau garde le ratio de la scène du niveau et se centre, plutôt que de
  remplir un rectangle arbitraire ;
- le seuil de bascule tiroir-bas / panneau-latéral dépend de la **largeur
  disponible**, pas d'un `innerWidth >= 680` global
  ([App.tsx:241-249](../src/app/App.tsx#L241-L249)) qui envoie une tablette
  portrait sur la mise en page latérale ;
- en paysage téléphone, l'en-tête tient sur une ligne et les contrôles de cadrage
  rejoignent la barre d'action ;
- `env(safe-area-inset-*)` sur les quatre barres ;
- toute cible tactile ≥ 44 × 44 px CSS, ce qui est déjà testé et doit le rester.

**Sortie vérifiable :** un parcours Playwright par format vérifie l'absence de
débordement horizontal, la visibilité des actions essentielles, et la surface
minimale du plateau.

---

## 7. Phase E — Suite de campagne

### E1 — Niveau 2 « Construire un pont »

État : ⬜ À faire.

**Modèle : `luna` / effort `high`** pour le JSON et la fixture, **`terra` /
`medium`** pour le parcours tactile.

Écrit dans `src/content/levels/`, `test/`, `e2e/`.

Premier niveau à inventaire réel, donc premier vrai test du parcours de placement
livré en C1 et C3. Spécification dans `levels/initial-progression.md` § Niveau 2.
Ne pas le démarrer avant que C3 soit intégrée : sans manipulation sur le plateau,
il n'est pas jouable.

Le scénario de régression doit vérifier les **trois** faits demandés par la
spécification : la scène sans poutre échoue dans la durée bornée ; la scène avec
la poutre de référence réussit ; une commande de rotation est refusée sans
modifier le document.

### E2 — Niveaux 3 à 8

État : ⬜ À faire.

Un niveau par tranche, `luna` / `high`, **après** que les constantes physiques
soient figées par A4 et B2. Ne pas écrire toute la campagne d'avance : c'est ce
que dit déjà `backlog.md` § T5, et l'expérience de ce plan lui donne raison.

---

## 8. Ordre d'exécution et parallélisme

```
A1 ──> A2 ──> A3 ──┐
       A4 ─────────┼──> A5 ──> B1 ──> B3 ──> C1 ──> C2
       B2 ─────────┘                   │      C3 ──> E1 ──> E2
                                       └────> D1 ──> D2
                                              D3
                                              D4
```

- **A1 seule d'abord.** C'est le contrat commun ; tout ce qui suit s'y réfère.
- **A2 et A4 sont parallélisables** : schéma de domaine d'un côté, colliders de
  l'autre, aucun fichier commun.
- **A3 dépend de A2** (elle a besoin du champ `scene`).
- **A5 après A3 et A4**, jamais avant : refactorer du code faux le fige.
- **C2, C3, D1, D3, D4 sont parallélisables** une fois C1 intégrée, dans des
  worktrees distincts : leurs zones d'écriture ne se croisent pas.
- **D2 dépend de D1** (le script de validation est le critère d'acceptation des
  images).

## 9. Le point d'arrêt qui compte

À la fin de **B3**, avant même l'habillage, la question à poser à l'application
est celle-ci, et elle doit se vérifier à l'œil sur un téléphone :

> J'ouvre l'application. Je vois une balle et un panier, tous deux nettement
> visibles. J'appuie sur Tester. La balle tombe, je la vois tomber, elle entre
> dans le panier et y reste. Le jeu me dit que j'ai gagné. J'appuie sur
> Réinitialiser et la balle est exactement revenue à sa place.

Tant que cette phrase est fausse, aucune tâche de la phase D ne doit être lancée.
C'est précisément l'erreur qu'il faut éviter de refaire : le dépôt a aujourd'hui
un fond d'atelier, quatre sprites illustrés, un tiroir animé et 147 tests verts
autour d'un jeu que personne n'a jamais vu fonctionner.

## 10. Règles de délégation

- Une tâche = un périmètre d'écriture = un rapport. Les colonnes « Écrit dans »
  ci-dessus sont exhaustives : écrire ailleurs est un motif de rejet.
- Chaque tâche commence par ses tests rouges et se termine par `pnpm check`.
- Une tâche n'est pas déclarée terminée par l'agent qui l'a écrite —
  `backlog.md` § Convention.
- Un agent qui rencontre une contradiction entre ce plan et une source
  d'autorité s'arrête et la signale. Il n'invente pas de compromis, conformément
  à `AGENTS.md` § Sources de vérité.
- **Escalade** : choisir la ligne de routage, descendre d'un cran d'effort,
  lancer, et n'escalader que sur échec en joignant la sortie d'erreur exacte.
