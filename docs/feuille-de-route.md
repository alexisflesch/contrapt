# Feuille de route — v1

Rédigée le 2 octobre 2026 avec l'auteur. Remplace la feuille de route de la
phase « Mes niveaux », archivée dans `feuille-de-route-mes-niveaux.md` (journal
G1 à N2) : on n'y lit que l'entrée qu'une tâche cite.

Destinataire : l'agent d'implémentation (Claude Code, Opus). Il délègue chaque
tâche à un sous-agent neuf — **Opus pour le raisonnement et l'UI/UX, Sonnet pour
l'écriture de code** — et reste responsable du résultat : il relit le diff,
regarde les captures, lance la gate et tient le journal.

## Objectif de la v1

Un jeu **propre** qui fonctionne sur **desktop**, avec les cinq tutoriels de
l'auteur, qui donne envie à des beta-testeurs de jouer, puis de créer et
d'envoyer leurs niveaux. L'interface doit être jolie et évidente : importer,
exporter et remixer un niveau sans se demander quoi faire.

**Hors v1** — ne rien commencer de ce qui suit, même si une ancienne note le
propose :

- l'UI/UX téléphone (portrait/paysage, quoi afficher et quand) : c'est
  l'objet de la v2 ;
- de nouveaux niveaux, objectifs autres que « balle dans le panier », zones de
  construction restreintes, inspecteur compact, A1 à A3, ombres (U3) ;
- les sprites de poutre (U12) et la couleur du capuchon du bouton : l'auteur
  n'y voit pas de problème.

## Décisions prises avec l'auteur (2 octobre 2026)

1. **Desktop d'abord.** La règle mobile-first d'`AGENTS.md` est suspendue pour
   la v1. On ne casse pas sciemment ce qui marche au téléphone, mais on n'y
   passe pas de temps.
2. **Pas de bordure, pas de mur.** Le décor continue au-delà de la scène sans
   démarcation visible. La balle perd en sortant par le bas ou les côtés (marge
   de 2 unités inchangée) ; **sortir par le haut ne fait plus perdre**, la
   gravité la ramène. Aucun mur physique.
3. **Lexique unique** : **Accueil · Campagne · Atelier · Mes niveaux ·
   Paramètres**. « Démonstration », « Liste des niveaux », « Atelier de
   construction » et « Mode éditeur » disparaissent. Tutoiement partout.
4. **La démo est supprimée** (route, page, contenu, tests, entrées de menu).
5. **Cartes de niveau** : un aperçu réel du plateau (même rendu que le jeu),
   grisé si le niveau est verrouillé. Les actions secondaires deviennent des
   icônes avec libellé accessible ; « Modifier » est gardé sur **tous** les
   niveaux, y compris ceux de la campagne, pour inviter au remix.
6. **Maquettes avant code** pour tout ce qui relève du goût (V4) : aucun agent
   n'implémente un écran restylé sans maquette validée par l'auteur.

## 1. Règles de travail

Les règles d'`AGENTS.md` s'appliquent. Compléments propres à la v1 :

- **Une tâche à la fois, dans l'ordre.** Un commit par tâche (code, tests,
  journal, `etat.md`), message en français à l'impératif avec l'identifiant :
  `feat(ui): renvoie le logo vers l'accueil (V3)`. Ne jamais pousser.
- **Gate** : `pnpm check` avant chaque commit. `pnpm check:fast` pendant le
  travail.
- **Captures** d'un changement visible : 1440 × 900 et 1280 × 720, inspectées
  par l'agent, citées dans le journal. L'auteur valide ; la tâche reste
  « validation visuelle attendue » dans `etat.md` jusque-là.
- **Fichier d'essai de l'auteur** : `tmp/check-levels.ts` fait échouer ESLint.
  Ne pas le modifier : le déplacer hors du dépôt le temps de la gate puis le
  remettre identique (SHA-256 `1113625e…`, mode 644).
- **Playwright** : une exécution isolée vide `test-results/`. Ne pas en lancer
  juste avant de demander une validation visuelle ; `pnpm check` régénère tout.
- **Specs au format téléphone** : beaucoup de parcours E2E fixent encore leur
  viewport à 390 × 844 (ou autre format téléphone) et tournent dans la gate
  `v1`. Si une tâche v1 change l'interface et casse une telle spec, passer la
  spec en 1440 × 900 (même parcours, mêmes assertions) ; ne pas retoucher la
  mise en page téléphone pour la faire passer. Une spec qui n'a de sens qu'au
  téléphone est étiquetée `@mobile`. Noter chaque cas dans le journal.
- **S'arrêter et écrire « bloqué »** si deux tentatives échouent au même
  endroit, si une décision manque ou si deux sources se contredisent. Ne
  jamais laisser `main` avec une gate rouge.
- **Ne pas faire sans tâche** : toucher aux constantes physiques, au schéma
  `LevelDocument`, aux enveloppes de stockage, au contenu des niveaux ; ajouter
  une dépendance ; affaiblir ou supprimer un test. Réécrire un test dont la
  tâche remplace le comportement est permis : le nommer dans le journal.

## 2. Tâches, dans l'ordre

Difficulté : ● simple, ●● moyenne, ●●● délicate.

### V0 — Cadre de la v1 ●● (Sonnet)

- `AGENTS.md` § Mobile-first : la remplacer par « v1 : desktop d'abord ; la
  règle mobile-first revient en v2 » (décision 1), en gardant l'interdiction de
  rendre une action essentielle dépendante du seul survol ou clic droit.
- `docs/index.md` : pointer vers cette feuille de route et
  `feuille-de-route-mes-niveaux.md` (historique) ; retirer de la carte les
  documents de propositions (`propositions-*.md`,
  `proposition-evolutions-canary.md`) en les déplaçant dans
  `docs/archives/` : ce sont des idées, pas des décisions.
- **Gate desktop** : ajouter un projet Playwright `v1` (Desktop Chrome,
  1440 × 900, `hasTouch: true` pour que les specs existantes fondées sur `tap`
  restent valides) et faire pointer `test:e2e:critical` dessus. Le projet
  `mobile` reste, lançable à la main, hors gate. Les specs qui testent
  intrinsèquement un format téléphone (`layout.spec.ts` portrait/paysage…) sont
  étiquetées `@mobile` et exclues du projet `v1` par `grepInvert`, pas
  supprimées. Lister dans le journal chaque spec exclue et pourquoi.
- Échec d'une spec sur `v1` pour une autre raison qu'un format téléphone :
  la corriger si le correctif est dans le test (sélecteur, viewport), sinon la
  noter « bloqué » et s'arrêter.
- Fini quand : `pnpm check` vert sur le projet `v1`.

### V1 — Finir l'intégration des tutoriels (N2) ●● (Sonnet)

Le contenu est déjà dans `src/content/levels/tuto-{1..5}.json` et commité
(`3157419`) ; seule la vérification manque. Journal N2 dans
`feuille-de-route-mes-niveaux.md`.

- Corriger Knip sur `sketchChapters` (`test/fixtures/sketch-campaign.ts`,
  utilisé par des imports dynamiques dans les mocks) sans désactiver la règle.
- `pnpm check` complet vert ; vérifier que les copies embarquées ne diffèrent
  des sources de `levels/` que par l'id, le titre, la description, l'auteur et
  l'état du ventilateur du tutoriel 3 (autorisé).
- Corriger `src/app/level-export.test.ts` (« Niveau 4 embarqué introuvable ») :
  il dépend d'une ancienne esquisse ; le faire porter sur les fixtures
  d'esquisses ou sur un tutoriel, sans affaiblir ce qu'il vérifie.
- Après : V0.

### V2 — Nettoyage ●● (Sonnet)

Trois commits distincts :

- **V2a Supprimer la démo** : route `/demo` (elle retombe sur le repli
  `/levels`), `DemoPage.tsx`, `demo.json`, carte de l'accueil, entrée de
  menu, motif `demo` du repli PWA, tests associés. Garder `/bench` (outil
  interne, hors menu).
- **V2b Pas de bordure, pas de perte par le haut** (décision 2). Test rouge
  dans `attempt-failure-evaluator.test.ts` : une balle au-dessus de la scène
  au-delà de la marge reste en jeu ; les trois autres côtés perdent toujours.
  Rendu (option A, choisie par l'auteur) : la bordure est peinte dans l'image
  `board-generic-v0.png` (cadre en bois, et image 3:2 étirée en 16:9). Ne plus
  dessiner d'image de fond : couleur parchemin unie (≈ `#f6ead3`) et grille du
  monde sur **tout** le viewport, sans aucune démarcation de la scène. Le
  chargement de l'image devient inutile (le retirer avec ses tests, ou le
  laisser inactif si d'autres usages existent : le dire). L'aperçu des niveaux
  (V5) utilisera le même rendu.
  Mettre à jour ADR 0007 (§ Scène) et le repère « Échec » d'`etat.md`.
  Captures : un niveau dézoomé, balle sortant par un côté.
- **V2c Repli hors ligne de `/my-levels`** : test rouge sur le motif
  `navigateFallbackAllowlist` de `vite.config.ts` (`/my-levels` et
  `/my-levels/<id>/play` servis hors ligne), puis correction.

### V3 — Navigation et vocabulaire ●● (Sonnet)

- Le bloc « TinkerBolt » de l'en-tête (`AppHeader`) est un lien vers `/`.
- Le bouton principal de l'accueil mène à `/levels` (plus au prochain niveau).
- Lexique (décision 3) appliqué au menu, à l'accueil, aux titres de page et à
  l'éditeur : le bandeau de l'éditeur affiche le titre du niveau et
  « Atelier », sans encadré. Mettre à jour les tests qui cherchent « Mode
  éditeur » ou « Liste des niveaux » (réécriture motivée, pas suppression).
- Ordre du menu : Accueil, Campagne, Atelier, Mes niveaux, Paramètres.
- Pas de restylage dans cette tâche : seulement liens et mots.

### V4 — Maquettes ●●● (Opus, session principale)

Maquettes HTML statiques dans `docs/maquettes/v1/`, avec les vrais sprites et
fonds de `public/assets/` et les captures de plateau existantes, aux deux
formats desktop. Montrées à l'auteur ; **aucune implémentation avant son
accord**. Direction : chaleureuse, artisanale, cohérente avec le décor de
l'atelier ; pas de flèches décoratives, pas de badges, pas d'accroches
creuses ; textes courts et concrets.

- Accueil : réécrire les textes ; une action principale (jouer → Campagne),
  puis Atelier et Mes niveaux ; progression discrète.
- Carte de niveau commune (campagne, mes créations, niveaux reçus) : aperçu,
  titre, auteur, état (verrouillé grisé, résolu avec palier), action
  principale « Jouer », actions secondaires en icônes (modifier, partager,
  dupliquer, supprimer selon la liste).
- Pages Campagne et Mes niveaux avec ces cartes ; bouton « Importer » dans le
  bandeau du haut de Mes niveaux.
- Bandeau de l'éditeur sans encadré « Mode éditeur ».
- Scrollbar : un style fin aux couleurs de l'atelier, pour toutes les zones
  qui défilent (catalogue, inspecteur, listes).
- Fini quand : l'auteur a validé ; les choix sont consignés dans le journal
  (et en ADR s'ils fixent une règle durable).

### V5 — Aperçu des niveaux ●●● (Sonnet, après V4)

- Fonction qui dessine un `LevelDocument` en image réduite avec le
  `BoardRenderer` existant (même fond, mêmes sprites, cadrage sur la scène,
  pas de simulation), mise en cache par empreinte du document. Tests : même
  document → même clé de cache ; documents différents → clés différentes ;
  rendu appelé hors de toute session d'édition.
- Dessin paresseux (cartes visibles seulement) pour ne pas bloquer la liste.

### V6 — Carte de niveau commune ●●● (Sonnet puis Opus, après V5)

- Composant unique `LevelCard` conforme à la maquette, utilisé par
  `LevelsPage` et `MyLevelsPage` ; extraire ce qui est dupliqué entre les deux
  pages (pas de refactoring sans rapport). Les tests existants des deux pages
  passent, réécrits seulement là où un libellé devient une icône (le nom
  accessible reste identique ou plus précis).
- Bouton « Importer » dans le bandeau de Mes niveaux.
- Étape A (Sonnet) : composant, factorisation, tests. Étape B (Opus) :
  ajustements visuels d'après la maquette, captures. Un seul commit.

### V7 — Accueil, éditeur, scrollbar ●● (Opus, après V4)

Implémenter les maquettes validées de l'accueil, du bandeau de l'éditeur et
de la scrollbar. Captures aux deux formats.

### V8 — Parcours beta-testeur ●●● (Opus)

Scénario E2E desktop de bout en bout : arriver sur l'accueil, jouer un
tutoriel, le modifier dans l'Atelier, l'exporter (fichier et lien), le
recevoir dans un autre contexte de navigateur, le jouer, le remixer. Chaque
hésitation constatée en le déroulant (bouton introuvable, mot ambigu, étape
inutile) est notée ; les corrections simples sont faites, les autres
remontées à l'auteur avant d'agir.

### V9 — Recette v1 ● (session principale)

Gate verte, captures de tous les écrans aux deux formats, relecture de tous
les textes visibles avec l'auteur, `etat.md` et README à jour. La v1 est
livrée quand l'auteur l'a validée.

## 3. En attente de l'auteur

- Validation des maquettes (V4), puis des captures de V2b, V6, V7.
- Captures non validées des phases précédentes : on ne les revalide pas une
  à une ; V9 couvre l'état final.

## 4. Journal

Une entrée par tâche, au format :

```
### <id> — <titre> — fait | partiel | bloqué — <commit>
- Tests rouges (ligne d'erreur utile), ce qui a été fait, captures, gate.
- Pour l'auteur : questions de goût ou décisions à prendre.
```

### V0 — Cadre de la v1 — fait — commitée avec la gate verte de V1 (2 octobre 2026)

- Fait : `AGENTS.md` § Mobile-first remplacée (v1 desktop d'abord, v2 mobile-first,
  interdiction du seul survol / clic droit conservée) ; `docs/index.md`
  (introduction, ligne `feuille-de-route-mes-niveaux.md`, notes « v2 » sur les
  lignes d'interface tactile et de parcours E2E) ; `mobile-editor-interactions.md`
  annoté « référence de la v2 » ; les trois documents de propositions déplacés
  avec `git mv` dans `docs/archives/` (liens relatifs de
  `propositions-gamification-astra.md` corrigés, chemins cités dans
  `feuille-de-route-luna.md` et `feuille-de-route-mes-niveaux.md` mis à jour) ;
  amendements datés du 2 octobre 2026 dans `docs/qualite.md` et l'ADR 0003.
- Gate : projet Playwright `v1` (Desktop Chrome, `channel: 'chromium'`, 1440 × 900,
  `hasTouch`, `grepInvert: /@mobile/`) ; `test:e2e:critical` pointe dessus. Le
  projet `mobile` reste, hors gate.
- Premier passage sur `v1` : 38 réussis, 3 échecs, **45 ignorés**. Les 45
  ignorés venaient de `test.skip(testInfo.project.name !== 'mobile', …)` (et de
  variantes `'desktop'`) : avec `v1` seul dans la gate, ces parcours (export, remix,
  Mes niveaux, partage, tutoriels, atelier…) auraient disparu en silence. Les
  conditions sont élargies à `v1` dans 21 fichiers de `e2e/` (aucun test supprimé
  ni ignoré en plus) ; ces specs fixent leur propre viewport (390 × 844…) et
  passent sur `v1` avec le même contenu d'assertions.
- Specs étiquetées `@mobile` : **aucune**. Toutes les specs de format téléphone
  (`layout.spec.ts` portrait/paysage, tiroirs, 320 × 568…) fixent leur propre
  viewport et passent sur `v1`; les exclure aurait réduit la couverture sans
  raison. `grepInvert` est en place pour les étiqueter en v2 ou plus tard.
- Tests corrigés (test seul, sans affaiblir ce qui est vérifié) :
  - `smoke.spec.ts` « lance depuis l'accueil le niveau 1 » (ex « …sur un écran
    mobile ») : cherchait « Ouvrir le catalogue », absent à 1440 × 900 où le
    catalogue est ancré ; le tiroir n'est ouvert que s'il existe.
  - `goal-ball.spec.ts` (deux tests R1) : comparaisons de pixels calibrées sur un
    écran dense (Pixel 5, ratio 2,75) ; à ratio 1 le bord doux du sprite écarte le
    coin échantillonné de 4 niveaux (seuil 3). `test.use({ deviceScaleFactor:
2.75 })` en tête du fichier, seuil inchangé.
- Aucun bug de production révélé sur desktop. Aucune intermittence de
  `layout.spec.ts` (D4, U15) observée sur 3 exécutions complètes de `v1`.
- Résultat : `pnpm exec playwright test --project=v1` (via
  `test:e2e:critical`) : 86 réussis, 0 ignoré (le projet `mobile` : 85 réussis,
  1 ignoré). Vitest : 1088 tests réussis, mais 1 fichier échoue
  (`src/app/level-export.test.ts`, « Niveau 4 embarqué introuvable », hérité de
  N2). Knip échoue sur `sketchChapters` (hérité de N2, tâche V1). Les autres
  étapes (typecheck, lint, formatage des fichiers suivis, contenu : 7 niveaux
  valides, build) passent. **Gate globale non verte pour des raisons étrangères à
  V0 : tâche non commitée**, à reprendre après V1 (voir `etat.md`).
- Pour l'auteur : la gate `v1` exécute encore les parcours en 390 × 844 ;
  c'est volontaire pour ne rien perdre, à reconsidérer en v2.

### V1 — Finir l'intégration des tutoriels (N2) — fait — commit V1 (2 octobre 2026)

- Tests rouges de départ : Knip `Unused exports (1) — sketchChapters
test/fixtures/sketch-campaign.ts:23:14` ; Vitest `src/app/level-export.test.ts`
  « Niveau 4 embarqué introuvable ».
- Knip : la configuration n'est pas en cause. Les mocks `vi.mock` de
  `App`, `CampaignDraftEditing`, `EditAndRemix` et `PuzzleWorkshop` utilisaient
  `const fixtures = await import(…)` puis `fixtures.sketchChapters` ; Knip suit
  les imports dynamiques déstructurés mais pas l'accès par membre sur un espace
  de noms. Correctif : `const { sketchChapters, sketchLevels } = await import(…)`
  (même comportement, aucune règle ni entrée Knip modifiée). Knip vert.
- `level-export.test.ts` : importe désormais `sketchLevels` depuis
  `test/fixtures/sketch-campaign` (comme `LevelExportDialog.test.tsx`), ce qui
  rétablit les niveaux 1 et 4 d'esquisse ; `embeddedWorkshopDocument` reste
  importé du contenu publié. Assertions inchangées. Suite Vitest complète :
  83 fichiers, 1096 tests, aucun autre reste de N2.
- Copies des tutoriels : comparées champ à champ aux sources de `levels/`
  (script jetable hors dépôt). Seules différences : id (tuto-1 : `free-workshop`
  → `tuto-1`), `metadata.title`, `metadata.description`, `metadata.author`
  (`Bolt`) et, pour le tutoriel 3, l'état du ventilateur de l'inventaire
  (`on` → `off`, autorisé). Aucune autre différence, `basedOn` identique.
- Gate `pnpm check` verte : 1096 tests Vitest, 7 documents de contenu, 86 tests
  Playwright `v1`, sans intermittence de `layout.spec.ts`. Code de production
  inchangé. `tmp/check-levels.ts` remis identique (sha256 `1113625e…`).
- Commits : V0 puis V1 séparés ; `docs/feuille-de-route.md` et `docs/etat.md`
  portent les deux tâches et sont dans le commit V1.

### V4 — Maquettes — fait, validé par l'auteur le 2 octobre 2026 — commit V4

- Maquettes statiques dans `docs/maquettes/v1/` (`accueil.html`, `campagne.html`,
  `mes-niveaux.html`, `atelier.html`, feuille `maquettes.css`), captures en
  1440 × 900 et 1280 × 720 dans `captures/`. Elles se servent en HTTP (la
  police ne se charge pas en `file://`) : `python3 -m http.server` à la racine.
  Les vignettes `img/tuto-*.png` sont de vraies captures du jeu, fond option A.
- **L'auteur a validé toute l'UI.** Ces maquettes font référence pour V5 à V7 ;
  les écarts d'implémentation se justifient dans le journal. Choix fixés :
  - **Police** : Nunito (OFL, variable), embarquée localement dans l'app
    (fichier de police dans `public/`, pas de dépendance npm, pas de police
    distante : PWA hors ligne). Licence OFL à citer dans le README.
  - **En-tête** : « TinkerBolt » lien vers `/` ; titre de page en texte simple
    centré, sans pastille ni sous-titre en capitales ; dans l'Atelier
    « <titre du niveau> · Atelier ».
  - **Accueil** : titre « Amène la balle jusqu'au panier. », texte « Poutres,
    tremplins, ventilateurs, leviers : place les pièces, lance la machine et
    regarde ce qui se passe. Raté ? Ajuste et relance. », bouton « Jouer » →
    `/levels`, lien « ou créer un niveau » → Atelier ; image : aperçu réel d'un
    tutoriel ; trois cartes Campagne (progression `n / 5` en barre),
    Atelier, Mes niveaux, illustrées par un sprite ; pied de page : licence
    CC BY 4.0 et « Paramètres ». Aucune flèche décorative, pastille,
    « carnet de bord » ni statistique.
  - **Carte de niveau** : aperçu 16:9 en haut avec numéro (campagne) et palier
    (Résolu / Élégant / Minimal, ou « Résolu · n objets » pour un niveau reçu) ;
    titre, ligne auteur/source (Mes niveaux), description sur deux lignes ;
    action principale verte + actions secondaires en icônes avec nom
    accessible et infobulle. Campagne : Jouer + Modifier. Créations :
    Modifier + Jouer, Partager, Dupliquer, Supprimer. Reçus : Jouer +
    Modifier, Partager, Supprimer. Verrouillé : aperçu grisé, badge
    « Verrouillé », actions désactivées. Pas de bandeau « Le carnet de
    l'atelier » ni de compteurs ; en-tête de chapitre « Chapitre 1 · Premiers
    pas » avec « n / 5 résolus ».
  - **Mes niveaux** : « Importer » et « Nouveau niveau » dans le bandeau du
    haut ; sections « Mes créations » et « Niveaux reçus » avec les mêmes
    cartes.
  - **Scrollbar** : fine, sable (`#d4c19c`, survol `#b99c69`), sans flèches,
    piste transparente, pour toutes les zones qui défilent.
- La maquette de l'Atelier ne couvre que le bandeau, le catalogue et la
  scrollbar : le reste de l'agencement de jeu et d'édition est reporté en v2.
