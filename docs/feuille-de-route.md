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
  Rendu : le fond déborde de la scène pour couvrir tout le viewport (aucune
  `OUTSIDE_SCENE_COLOUR` visible) ; la grille peut rester limitée à la scène.
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
