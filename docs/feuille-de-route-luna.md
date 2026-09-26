# Remarque mainteneur
A intégrer quelque part dans la feuille de route :

- quand on est sur l'éditeur de niveau, que la balle atteint le panier (après avoir cliqué sur "Tester"), un bouton "Rejouer le niveau" apparaît : il supprime tout ce qu'on a fait. C'est une UX horrible. Et le bouton "retour à la liste des niveaux" n'a aucun sens. Je pense que c'est un artéfact de factorisation entre "jouer un niveau" et "construire un niveau" : il faudra le réparer

- Le levier doit pouvoir être tourné de 90° dans tous les sens (on peut le mettre à la verticale, sur un plafond, etc). Pour l'instant il ne peut pas tourner, c'est à corriger. Ca doit être comme pour le ventilateur ou la barrière ou encore le ressort.

# Feuille de route — reprise de l’implémentation

Destinataire : l’agent d’implémentation qui reprend le dépôt seul, tâche après
tâche, sans orchestrer d’autres agents. Rédigé le 26 septembre 2026 sur la
branche `remise-en-jeu`, gate `pnpm check` verte.

Ce document fixe **quoi faire et dans quel ordre**. Il ne redéfinit aucune règle :
les règles sont dans `AGENTS.md`, les contrats dans les ADR et le code. En cas de
contradiction entre ce document et une source d’autorité (voir
`docs/index.md`), la source d’autorité gagne : arrête-toi et signale-le dans le
journal (§ 8).

## 1. Avant de commencer

1. Lire `AGENTS.md`, puis `docs/index.md`, puis ce fichier en entier, puis
   `docs/etat.md`. Ne pas lire les autres documents sauf ceux que la tâche en
   cours cite nommément.
2. Ne pas lire `docs/plan-remise-en-jeu.md` en entier (1 200 lignes, surtout de
   l’historique). Une tâche qui en a besoin cite la section exacte.
3. Vérifier le point de départ :
   ```bash
   git status --short          # aucun fichier suivi modifié
   pnpm install --frozen-lockfile
   pnpm check                  # doit être vert
   ```
   Des fichiers **non suivis** sous `art/` sont du travail en cours de l’auteur :
   ne jamais les lire pour une tâche, les modifier, les ajouter ni les commiter
   (`git add` fichier par fichier, jamais `git add -A` ni `git add .`).
   Si `pnpm check` échoue avant toute modification, ne rien corriger : écrire le
   constat dans le journal et s’arrêter.
4. Relire le journal (§ 8) : il dit où la session précédente s’est arrêtée.
   Reprendre à la première tâche ni « fait » ni « bloqué ».

## 2. Règles de travail propres à cette reprise

Elles complètent `AGENTS.md` sans le remplacer.

**Sous-agents : `gpt-6-luna` uniquement.** Tu peux déléguer une sous-tâche à un
autre agent (skill `orchestrate`, `codex exec -m gpt-6-luna`), jamais à un autre
modèle (`gpt-5.6-terra`, `gpt-6-sol`, `gpt-6-astra` ou autre), même si la table de
routage du skill l’indique. Une tâche trop difficile se déclare bloquée, elle ne
s’escalade pas. Tu restes responsable du résultat : relire le diff, lancer la
gate, tenir le journal.

**Une tâche à la fois, dans l’ordre du § 5.** Ne pas commencer une tâche tant
que la précédente n’est pas commitée ou déclarée bloquée dans le journal. Une
tâche bloquée n’empêche pas la suivante, sauf dépendance déclarée.

**Cycle d’une tâche :**

1. écrire le ou les tests rouges décrits par la tâche ;
2. lancer le test ciblé et vérifier qu’il échoue **pour la raison attendue**
   (copier la ligne d’erreur utile dans le journal) ;
3. implémenter le minimum ;
4. `pnpm check:fast` pendant le travail ;
5. `pnpm check` en fin de tâche — obligatoire avant commit ;
6. mettre à jour `docs/etat.md` (livré, dettes, dernière gate) et le journal ;
7. un commit par tâche, sur la branche courante, message en français à
   l’impératif, préfixe de couche comme dans l’historique, identifiant de tâche
   entre parenthèses. Exemple :

   ```text
   feat(content): niveau 3 « Incliner » (L9)
   ```

Ne jamais pousser, ni réécrire l’historique (`rebase`, `commit --amend` sur un
commit déjà fait, `reset --hard`), ni supprimer de branche.

**Playwright :** le serveur de test est `vite preview`, il sert `dist/`. Toujours
lancer `pnpm build` avant `pnpm exec playwright test`, sinon tu testes l’ancien
build. `pnpm check` le fait déjà dans le bon ordre.

**Ce que tu ne fais pas, même si ça semble aider :**

- modifier une constante physique (`src/simulation/`, `src/domain/family-geometry.ts`)
  pour faire passer un niveau. Un niveau s’adapte à la physique, jamais
  l’inverse ;
- modifier le schéma `LevelDocument` au-delà de ce qu’une tâche demande
  explicitement (seule L5 le fait) ;
- ajouter une dépendance npm, sauf `vite-plugin-pwa` et ses pairs dans L28 ;
- modifier `src/simulation/`, sauf dans L17b qui le demande explicitement ;
- toucher à l’apparence : `src/ui/styles.css`, mise en page, couleurs, sprites,
  composants visuels nouveaux. Les exceptions sont nommées dans la tâche et se
  limitent à réutiliser des composants existants (`Panel`, `Button`, `Dialog`)
  sans nouveau style ;
- affaiblir, supprimer ou `skip` un test existant. Réécrire un test qui décrit un
  comportement que la tâche remplace explicitement est permis : le nommer dans le
  journal avec la raison ;
- écrire hors du périmètre de la tâche. Si c’est nécessaire, s’arrêter et le
  signaler.

**Quand s’arrêter.** Écrire « bloqué » dans le journal, avec les mesures et la
sortie d’erreur exacte, puis passer à la tâche suivante si elle ne dépend pas de
celle-ci, lorsque :

- deux tentatives distinctes échouent au même endroit ;
- la tâche exige une décision que ce document ne tranche pas ;
- tu constates une contradiction entre deux documents, ou entre un document et
  le code ;
- `pnpm check` échoue pour une raison étrangère à ta tâche.

Ne jamais laisser la branche dans un état où `pnpm check` échoue : une tâche
bloquée est annulée localement (`git restore`, suppression des seuls fichiers
créés par la tâche) avant de passer à la suivante.

## 3. Repères techniques utiles

À vérifier dans le code plutôt que croire sur parole ; le code prime.

- Monde : 1 unité = 1 mètre, `x` vers la droite, **`y` vers le bas**, origine au
  coin supérieur gauche de la scène. Rotations en radians ; une rotation
  positive tourne dans le sens horaire à l’écran : une poutre de rotation
  positive a son extrémité droite plus basse (mesuré).
- Dimensions (`src/domain/family-geometry.ts`) : balle rayon 0,3 ; panier
  1,5 × 1,1 ouvert vers le haut ; poutre épaisseur 0,25, longueurs 2 / 4 / 6
  (`size: short | medium | long`) ; bascule planche 3 × 0,24, pied jusqu’à 0,7
  sous le pivot ; masse 0,8 × 0,772 ; convoyeur 3 × 0,58.
- Les poutres sont des **corps statiques** : une poutre posée flotte là où on la
  pose, elle ne tombe pas.
- La balle a une résistance au roulement : **elle s’arrête sur une poutre
  plate** (décélération ≈ 0,7 m/s²). Sur 15°, elle accélère d’environ 1 m/s².
- Objectif : le centre de la balle cible entre dans le capteur du panier et y
  reste 30 pas fixes. Échec : centre de la balle hors de la scène élargie de
  2 unités, ou 20 s simulées écoulées. Pas fixe 1/60 s ; 20 s = 1 200 pas.
- Seules les poutres tournent. Le joueur ne change **aucune propriété** (taille,
  sens d’un convoyeur, cran d’un levier : `updatePlacementProperties` refuse le
  contexte `player`) et ne relie aucun fil (ADR 0009).
- Rotation en résolution : pas de 15° (`π/12`, `src/app/use-board-pointers.ts`).
- Commandes : `src/application/construction/construction-attempt.ts`. Pour les
  appliquer dans un test, reprendre le motif de `construction-attempt.test.ts`.
- Simulation headless : `createSimulationSession(document, { fixedStepSeconds })`,
  puis `advanceFixedSteps`, `readGoalEvaluation`, `readFailureEvaluation`,
  `readState` (dont `devices` pour leviers et convoyeurs), `reset`. Exemple
  complet : `src/content/embedded-levels.test.ts`.
- Niveaux embarqués : `src/content/levels/*.json`, déclarés dans
  `src/content/embedded-levels.ts`.
- Un script jetable exécuté par `pnpm exec tsx <fichier>.ts` peut importer
  `src/` directement : c’est le **banc d’essai** qui a servi à mesurer les
  niveaux. Les scripts jetables vont dans un dossier ignoré par git (par exemple
  `tmp/`, à ajouter à `.gitignore` dans la tâche qui le crée), jamais dans `src/`.

## 4. Ce que « le jeu est fini » veut dire

Pour situer chaque tâche. Le jeu est fini quand :

1. les 14 niveaux de la campagne (`docs/levels/initial-progression.md`) sont
   jouables au tactile, chacun avec sa régression ;
2. la progression est enregistrée localement, les niveaux s’ouvrent dans l’ordre
   et les paliers ✅ / ⭐ / 🏆 s’affichent (ADR 0010) ;
3. le mode auteur permet de créer un niveau complet (scène, décor, zones,
   inventaire, objectif, défi), de le tester, de l’enregistrer en brouillon, de
   l’exporter en fichier, de l’importer et de le partager par lien (ADR 0011) ;
4. l’application s’installe et se joue hors ligne (ADR 0012) ;
5. la gate tourne en CI ;
6. l’auteur a validé l’interface et la direction artistique. (Planck est validé
   sur téléphone depuis le 26 septembre 2026, ADR 0002.)

Tu portes la logique de 1 à 5. L’interface visible (§ 6) et le point 6
reviennent à l’auteur ou à un autre agent.

## 5. Tâches, dans l’ordre

Légende de difficulté : ● simple, ●● moyenne, ●●● délicate (lire deux fois).

### Phase A — Fondations

#### L1 — Réparer le parcours Playwright desktop C3 ●

**Constat.** `pnpm exec playwright test --project=desktop` : 29 réussis,
1 échec, `e2e/editor-interactions.spec.ts` « C3 — place, déplace, modifie et
supprime une poutre dans Chromium desktop », à la dernière
`waitForCanvasToMatch(canvas, afterResize)` (ligne ~143).

**Hypothèse à vérifier d’abord.** `afterResize` est capturé alors que la poutre
est **sélectionnée** (contour et poignée dessinés). Après « Supprimer » puis
« Annuler », la sélection est vide (le commentaire du test le dit) : le canvas
restauré n’a pas de contour, donc il ne peut pas être identique à `afterResize`.
Pour confirmer, ouvrir `test-results/…/test-failed-1.png`.

**Si l’hypothèse est confirmée**, corriger le test sans l’affaiblir : il doit
toujours prouver, au pixel près, que l’annulation restaure la poutre longue à sa
place. Par exemple : après l’annulation, cliquer au point `target` du drag (le
centre de la poutre), vérifier que « Propriétés de Poutre » réapparaît, puis
comparer à `afterResize`. Garder la comparaison exacte.

**Si l’hypothèse est fausse**, s’arrêter et décrire ce qui diffère.

Périmètre : `e2e/editor-interactions.spec.ts`.
Sortie : `pnpm build && pnpm exec playwright test --project=desktop` vert, et
`pnpm check` vert.

#### L2 — Couvrir le Markdown par `format:check` ●

`package.json` : les globs de `format` et `format:check` omettent `md`. Les
ajouter, lancer `pnpm format`, relire le diff : il ne doit contenir que de la mise
en forme. Si Prettier modifie un bloc de code ou casse un lien, s’arrêter.

Périmètre : `package.json`, fichiers `*.md` (reformatage seul).
Sortie : `pnpm format:check` couvre les `.md` ; `pnpm check` vert. À partir de
cette tâche, tout Markdown que tu écris doit passer `pnpm format:check`.

#### L2b — Retirer Rapier ●●

La porte de l’ADR 0002 est franchie (§ Résultat de la porte) : Rapier doit
quitter le dépôt. Retirer `@dimforge/rapier2d-compat` de `package.json` (et du
lockfile par `pnpm remove`), puis, dans `test/conformance/scene-6-lifecycle.ts`,
`scene-7-density.ts` et leurs tests, supprimer les chemins Rapier en gardant
**toutes** les assertions qui portent sur Planck. Les comparaisons
Planck/Rapier disparaissent avec Rapier ; les nommer dans le journal. Mettre à
jour `etat.md` (dette retirée).

Périmètre : `package.json`, `pnpm-lock.yaml`, `test/conformance/`,
`docs/etat.md`. Sortie : `grep -ri rapier src test package.json` ne renvoie
rien ; `pnpm check` vert.

#### L2c — Réessayer un sprite dont le chargement a échoué ●●

**Constat.** Sur un vieux téléphone, `/bench/play` a dû être rechargée pour
s’afficher (ADR 0002 § Résultat de la porte). Cause probable, lue dans le code :
dans `src/presentation/sprite-loader.ts`, un asset dont le chargement échoue
passe à l’état `failed` **définitivement** — toute demande suivante renvoie la
même erreur sans réessayer — et `src/ui/BoardView.tsx` avale l’erreur de rendu
(`.catch(() => undefined)`). Un seul échec réseau laisse donc le plateau vide
jusqu’au rechargement.

**Comportement attendu.** Un asset en échec est **retenté** à la demande
suivante, au plus 3 tentatives au total par asset, puis reste en échec. Les
tentatives ne sont pas automatiques en boucle : c’est le rendu suivant (nouvel
appel de `loadForFamilies`) qui les déclenche. Aucun `setTimeout` ni horloge
dans le chargeur.

Tests rouges d’abord (`sprite-loader.test.ts`, avec l’adaptateur `fetch` factice
déjà utilisé) : un échec puis un succès → l’asset devient `ready` au deuxième
appel ; trois échecs → `failed` définitif, pas de quatrième `fetch` ; un asset en
cours de chargement n’est jamais lancé deux fois.

Périmètre : `src/presentation/sprite-loader.ts` et son test. Ne pas toucher à
`BoardView.tsx` sauf si un rendu n’est jamais redemandé après l’échec — dans ce
cas, s’arrêter et le décrire.

#### L3 — La zone de construction contient l’objet entier ●●

**Pourquoi.** En contexte joueur, `ConstructionAttempt` n’exige aujourd’hui que
le **centre** de l’objet dans une zone (`isCentreInsideBuildZone`). L’ADR 0005
prévoit le confinement de la forme complète dès que les dimensions existent ;
elles existent dans `family-geometry.ts`. Les zones de la campagne sont calculées
pour cette règle.

**Règle.** En contexte `player`, un placement, un déplacement ou une rotation est
accepté seulement si l’**empreinte entière** de l’objet, à sa position et à sa
rotation, est contenue dans **une même** zone, bornes incluses. En contexte
`author`, rien ne change. Code de refus inchangé : `outside-build-zone`.

**Empreinte par famille** (rectangle local de `family-geometry.ts`, tourné de
`transform.rotation` autour de `transform.position`) :

| Famille    | Rectangle local                                                |
| ---------- | -------------------------------------------------------------- |
| `ball`     | cercle : centre ± rayon sur chaque axe (exact, sans rotation)  |
| `basket`   | `basketGeometry.footprint`                                     |
| `beam`     | `beamGeometry.footprints[props.size]`                          |
| `seesaw`   | `seesawGeometry.footprint` (union planche + pied, pas centrée) |
| `mass`     | `massGeometry.footprint`                                       |
| `lever`    | `leverFootprint(props.position)`                               |
| `conveyor` | `conveyorGeometry.footprint`                                   |
| `button`     | `buttonGeometry.footprint`                                      |
| `fan`        | `fanGeometry.body.footprint`                                    |
| `barrier`    | `barrierFootprint(props.state)`                                 |
| `springboard` | `springboardGeometry.footprint`                                 |

Le registre et le schéma du dépôt contiennent onze familles ; les quatre dernières
lignes complètent la table initiale à partir de leurs empreintes exécutables.
Une zone est un rectangle aligné sur les axes : un rectangle tourné y est contenu
si et seulement si ses quatre coins y sont.

**Découpage.** 1) Domaine : fonction pure renvoyant les coins monde de
l’empreinte d’un placement (`src/domain/placement-footprint.ts`), testée : poutre
moyenne non tournée, poutre à 90°, balle, bascule (empreinte non centrée), levier
penché ; `toBeCloseTo`. 2) Application : remplacer le test du centre dans
`placeFromInventory`, `movePlacement` et `rotatePlacement`.

**Tests rouges d’abord** (`construction-attempt.test.ts`) : centre dans la zone
mais extrémité d’une poutre dehors → refusé ; même poutre entièrement dedans →
accepté ; rotation qui fait sortir un coin → refusée sans modifier le document ;
contexte auteur hors zone → accepté ; objet à cheval sur deux zones adjacentes
→ refusé.

Tests existants qui peuvent casser : ceux qui posent près d’un bord de zone en
contexte joueur. Les adapter, les nommer dans le journal. Ne pas toucher aux
tests en contexte auteur.

**Documentation.** Ajouter à `docs/decisions/0005-construction-attempt.md` une
section « Amendement du 26 septembre 2026 » qui remplace la règle du centre par
celle-ci. Retirer la dette de `etat.md`.

Périmètre : `src/domain/`, `src/application/construction/`, leurs tests, l’ADR
0005, `docs/etat.md`. Ne pas refactorer `src/presentation/`.

#### L4 — Harnais de régression et recherche de solutions ●●

Fichier : `src/content/level-regression.ts` (module de support de test dans
`src/`, parce que Vitest n’inclut que `src/**/*.test.ts` et `test/conformance/`),
et son test `src/content/level-regression.test.ts`. API suggérée :

```ts
type LevelRunOutcome = 'succeeded' | 'out-of-scene' | 'timed-out';

interface LevelRun {
  readonly outcome: LevelRunOutcome;
  readonly fixedSteps: number;
  readonly ballEnteredTarget: boolean;
  readonly finalState: SimulationSnapshot; // pour lire leviers, bascules…
}

// Avance à pas fixe jusqu’à réussite ou échec ; au-delà de 1 300 pas sans
// issue, lever une erreur explicite (l’évaluateur d’échec doit trancher avant).
runLevel(document: LevelDocument): LevelRun;

type PlayerStep =
  | { kind: 'place'; inventoryEntryId: string; placementId: string; x: number; y: number; rotationDegrees?: number }
  | { kind: 'move'; placementId: string; x: number; y: number }
  | { kind: 'rotate'; placementId: string; rotationDegrees: number };

// Applique les étapes en contexte 'player' via ConstructionAttempt, depuis le
// document du niveau. Lève une erreur nommant l’étape et le code de refus.
applyPlayerSteps(document: LevelDocument, steps: readonly PlayerStep[]): LevelDocument;

// Essaie chaque combinaison de candidats (produit cartésien), applique-la en
// contexte joueur, ignore celles que les zones refusent, et renvoie celles qui
// réussissent. Sert à prouver la minimalité d’un défi (ADR 0010).
searchSolutions(document: LevelDocument, candidateGroups: readonly (readonly PlayerStep[])[]): readonly PlayerStep[][];
```

Tests : le niveau 1 actuel (« Laisser tomber », encore embarqué à ce stade)
donne `succeeded` ; une copie dont le panier est déplacé sur le côté donne
`out-of-scene` ; deux exécutions donnent le même `fixedSteps` ;
`applyPlayerSteps` lève une erreur lisible sur une étape refusée ;
`searchSolutions` retrouve une solution connue et en écarte une fausse.

Les degrés sont une commodité du harnais : convertir en radians avant la
commande.

#### L5 — Champ `challenge` du document de niveau ●●

Lire : ADR 0010 § Format, `src/domain/level-document.ts`.

Ajouter le champ facultatif `challenge: { elegantObjectCount, minimalObjectCount }`
au schéma v2, sans nouvelle version, sur le modèle de l’ajout de `wires`
(ADR 0009). Validation sémantique : entiers, `1 ≤ minimal ≤ elegant ≤ 999`,
`minimal ≤` somme des quantités de l’inventaire, chemins d’erreur exploitables.

Tests rouges : document sans `challenge` accepté et relu à l’identique (pas de
valeur par défaut injectée) ; défi valide accepté ; `minimal > elegant` refusé ;
`minimal` supérieur à l’inventaire refusé ; valeurs non entières refusées.

Périmètre : `src/domain/level-document.ts` et son test ; si le validateur de
catalogue (`src/infrastructure/content/`) doit connaître le champ, lui aussi.

#### L6 — Catalogue de campagne en chapitres ●

Lire : ADR 0010 § Progression de campagne.

Remplacer la liste plate `embeddedLevels` par une structure de campagne dans
`src/content/` : chapitres ordonnés (`id`, titre) contenant des niveaux ordonnés,
plus une fonction qui donne la liste à plat et le niveau suivant d’un niveau.
Garder `embeddedLevels` si des appelants en dépendent (liste à plat dérivée).
Chapitre 1 « Poutres et bascule », chapitre 2 « Mécanismes ». Pour l’instant, le
chapitre 1 contient le niveau 1 actuel et le chapitre 2 est vide ; les tâches
suivantes les remplissent.

Tests : ordre à plat, niveau suivant, dernier niveau sans suivant, identifiants
uniques sur toute la campagne. `pnpm content:check` doit vérifier la même
unicité.

Ajouter à `pnpm content:check` (et à ses tests) la règle de
`initial-progression.md` § Principes communs : **dans un niveau de campagne, tout
objet placé a ses trois permissions à `false`**. L’atelier n’y est pas soumis.

Pas d’interface : la liste des niveaux continue d’afficher la liste à plat.

### Phase B — Chapitre 1

Spécification unique : `docs/levels/initial-progression.md`, section du niveau et
§ Principes communs (dont la **régression exigée**, règles 1 à 7). Les géométries
y sont déjà mesurées ; ton travail est de les transcrire en JSON, d’écrire la
régression et le parcours tactile, et de **signaler** toute mesure qui ne se
reproduit pas.

Pour chaque niveau :

- `src/content/levels/<id>.json`, ajouté à la campagne (L6) ;
- `src/content/levels/<id>.test.ts` pour la régression (harnais L4) ;
- un test dans `e2e/levels.spec.ts` (projet `mobile`) qui résout le niveau au
  tactile : ouvrir `/levels/<id>/play`, poser ou déplacer depuis le plateau,
  Tester, voir la victoire. Pour convertir une position monde en point écran, le
  canvas expose `data-camera-zoom` ; ajouter à la première tâche qui en a besoin
  `data-camera-origin="x,y"` sur le canvas de `src/ui/BoardView.tsx`, sur le
  modèle de `data-camera-zoom` (attribut de test sans effet visuel, seule
  modification d’interface permise) ;
- deux captures du niveau au repos, 390 × 844 et 844 × 390, sous
  `test-results/levels/<id>-*.png` (non versionné), citées dans le journal pour
  l’auteur.

Si une fenêtre de robustesse mesurée ne tient pas, essayer au plus **deux**
ajustements de géométrie (décor, panier, zone — jamais la physique), consigner
chaque essai, puis s’arrêter si rien ne tient.

#### L7 — Niveau 1 « Prolonger la pente » ●●●

Remplace le niveau 1 actuel « Laisser tomber » (décision de l’auteur du
26 septembre 2026). C’est la tâche la plus délicate de la phase, non pour le
niveau lui-même mais pour les tests qui supposent l’ancien :

- supprimer `level-1-laisser-tomber.json` et son test dans
  `embedded-levels.test.ts` ; `/` doit ouvrir le nouveau niveau 1 ;
- références à l’ancien niveau (10 occurrences au 26 septembre) dans
  `src/app/App.test.tsx`, `e2e/smoke.spec.ts`,
  `src/presentation/sprite-loader.test.ts`,
  `src/infrastructure/content/catalogue-validator.test.ts`,
  `src/content/embedded-levels.test.ts` ;
- les tests qui vérifient « Tester seul fait gagner » (notamment
  `e2e/smoke.spec.ts` « parcours de sortie du plan : Tester seul fait tomber la
  balle visiblement puis gagne » et, dans `App.test.tsx`, les tests de victoire
  sur la fixture embarquée) décrivent un comportement explicitement remplacé.
  Les réécrire pour la même garantie sur le nouveau niveau : **lancer sans rien
  poser échoue et l’annonce l’échec**, puis **poser la poutre de référence et
  lancer gagne**. Garder chaque assertion d’origine qui porte sur autre chose
  (bandeau qui ne recouvre pas le plateau, reset exact, caméra stable…) ;
- un test qui a seulement besoin d’un niveau quelconque peut utiliser le nouveau
  niveau 1 tel quel (il échoue au lancement, ce qui suffit souvent) ;
- nommer chaque test réécrit dans le journal.

Le harnais L4 et ses tests utilisaient l’ancien niveau 1 : les faire pointer sur
une copie locale au test, pas sur la campagne.

#### L8 — Niveau 2 « Le pont » ●●

Le parcours tactile suit la spec : poser trop à gauche, échouer, recommencer,
glisser la poutre posée jusqu’à la référence, gagner. Vérifier qu’aucune poignée
de rotation n’est proposée (`rotate: false`).

#### L9 — Niveau 3 « Incliner » ●●

Parcours tactile : poser la poutre, la tourner **avec la poignée** (drag), Tester.

#### L10 — Niveau 4 « Moins, c’est mieux » ●●

Premier niveau avec `challenge` : tester les deux références (1 et 2 objets), et
la minimalité (règle 7 : aucune solution à 0 objet — trivial ici, mais écrire le
test avec `searchSolutions` pour qu’il serve de modèle).

#### L11 — Niveau 5 « Le détour » ●●

Minimalité à prouver : aucune solution à une seule poutre. Reprendre la grille
documentée (courte ou moyenne, angles de −45° à 90° par 15°, `x` de 0,4 à 4,8 par
0,4, `y` de 1,0 à 4,0) restreinte aux poses que les zones acceptent. Si la
recherche dépasse 20 s dans Vitest, réduire la grille et le consigner.

#### L12 — Niveau 6 « La bascule » ●

Inventaire vide, aucune zone. Régression spécifique : angle de la planche
(`readState().bodies`, rôle `board`) avant la réussite, et reset exact.

#### L13 — Niveau 7 « Placer la bascule » ●●

Inclut le test de hit-test planche/pied (même identifiant).

#### L14 — Niveau 8 « Poutre et bascule » ●●●

Fenêtre de robustesse étroite : lire le § Point d’attention de la spec.

### Phase C — Chapitre 2

Même méthode que la phase B.

#### L15 — Niveau 9 « Le tapis » ●

#### L16 — Niveau 10 « Le butoir » ●●

#### L17 — Niveau 11 « L’interrupteur » ●●

Premier niveau avec un fil : `wires` dans le JSON ; régression sur
`readState().devices`.

#### L17b — Levier orientable ●●●

**Demande de l’auteur :** pouvoir tourner un levier (par exemple à 90°, poignée à
l’horizontale, pour qu’un objet tombe dessus). Aujourd’hui seules les poutres
tournent.

**Constat mesuré le 26 septembre 2026.** La simulation calcule déjà le cran
relativement au socle, mais un levier tourné **ne tient pas ses crans** : le
couple de cran (0,35) ne compense la gravité que poignée en haut. À 90°, les trois
crans de départ finissent tous à « droite » ; à −90°, à « gauche » ; à 180°, au
centre. Augmenter le couple (0,8 à 3) fait tenir les crans mais casse le test
« bascule le levier sous l’impact d’une balle » : la balle devient trop légère.

**Solution prototypée et validée au banc** (puis retirée) : compenser, à chaque
pas, la **différence** entre le couple de gravité réel de la poignée et celui
qu’elle aurait si le levier était droit. Dans `#pullLeversToNotches`, après
`setMotorSpeed` :

```ts
const pivot = lever.base.getPosition();
const centre = lever.handle.getWorldCenter();
const rx = centre.x - pivot.x;
const ry = centre.y - pivot.y;
const b = lever.base.getAngle();
const uprightX = rx * Math.cos(-b) - ry * Math.sin(-b);
lever.handle.applyTorque(-(rx - uprightX) * lever.handle.getMass() * GRAVITY, true);
```

Avec ce seul ajout : les trois crans tiennent à 0°, 45°, 90° et −90° ; une masse
lâchée sur la poignée d’un levier à 90° le fait changer de cran ; tous les tests
existants de `src/simulation/` passent, dont celui de la balle. **Défaut restant**
: à 180°, le cran « droite » ne tient pas (il part à gauche). À comprendre et
corriger, ou, à défaut, consigner et proposer à l’auteur de limiter la rotation
du levier à ±135°.

**Découpage.**

1. Simulation (`src/simulation/`, exception explicite à la règle du § 2) : tests
   rouges d’abord dans `physics-port.test.ts` — pour chaque rotation multiple de
   15° et chaque cran de départ, le cran lu après 3 s est le cran de départ ; à
   90°, une balle lâchée sur le pommeau fait changer le cran. Puis la
   compensation. `LEVER_NOTCH_TORQUE` et `LEVER_NOTCH_STIFFNESS` ne changent pas ;
   le test existant de la balle ne change pas.
2. Domaine : `level-document.ts` refuse aujourd’hui `permissions.rotate` hors des
   poutres ; l’autoriser aussi pour `lever`. Tests.
3. Application et interaction : `rotatePlacement` accepte un levier ; la poignée
   de rotation du plateau, réservée aux poutres dans `use-board-pointers.ts`
   (`object.family === 'beam'`), vaut aussi pour les leviers. Test App : tourner
   un levier à la poignée en une seule entrée d’historique. Captures pour
   l’auteur (levier à 0°, 90°, −90°) : le dessin tourné est une vérification
   visuelle.
4. Documentation : `catalogue-initial.md` § Levier et § Inventaire (« la rotation
   est disponible pour les poutres et les leviers »).

#### L18 — Niveaux 12 à 14, conçus au banc d’essai ●●●

Contraintes dans `initial-progression.md` § Niveaux 12 à 14. **Un niveau par
tâche** (L18a, L18b, L18c), chacun commité séparément. Méthode :

1. esquisser la scène sur papier (qui déclenche quoi, où tombe la balle) ;
2. écrire un script de banc d’essai jetable (`tmp/`, § 3) qui construit le
   document, applique des poses et affiche l’issue ; mesurer d’abord « rien »,
   puis la référence, puis une grille autour ;
3. chercher les solutions à moins d’objets que visé avec une grille large ; en
   trouver une n’est pas un échec : c’est le nouveau minimum, ou un défaut du
   niveau à corriger ;
4. documenter la géométrie retenue, les fenêtres mesurées et la grille de
   minimalité dans `initial-progression.md`, section du niveau, **avant** d’écrire
   le JSON ;
5. puis JSON, régression, parcours tactile, captures.

Arrêt : après trois esquisses sans fenêtre de robustesse d’au moins 0,3 unité sur
chaque objet posé, consigner et passer au suivant.

### Phase D — Métaprogression (logique seulement)

Lire : ADR 0010 et ADR 0011 § `localStorage`.

#### L19 — Paliers et verrouillage, en fonctions pures ●●

Dans `src/application/progression/` :

- `countObjectsUsed(attempt)` : placements du document dont la provenance est une
  entrée d’inventaire (ADR 0005, `ConstructionAttempt.provenance`) ;
- `evaluateTier(objectsUsed, challenge?)` → `'resolved' | 'elegant' | 'minimal'` ;
- `nextChallengeHint(bestObjectCount, challenge?)` → ce que l’interface peut
  révéler (rien, cible ⭐, record 🏆, ou rien de plus), selon ADR 0010
  § Révélation progressive ;
- un modèle de progression `{ [levelId]: { resolved: boolean; bestObjectCount: number | null } }`,
  `recordSuccess(progress, levelId, objectsUsed)` (garde le meilleur),
  `isLevelUnlocked(campaign, progress, levelId)`.

Tests exhaustifs de chaque fonction, dont : un record inférieur au minimum
connu reste 🏆 ; le premier niveau est toujours ouvert ; un niveau inconnu n’est
pas ouvert.

#### L20 — Dépôt de progression sur `localStorage` ●●

Port `ProgressRepository` dans `src/application/progression/`, adaptateur dans
`src/infrastructure/storage/` prenant un objet `Storage` injecté. Enveloppe
`{ kind: 'progress', version: 1, data }` validée par Zod ; valeur invalide
sauvegardée sous `contrapt:backup:progress` avant toute écriture ; quota dépassé
ou stockage indisponible → résultat d’erreur, jamais d’exception.

Tests avec un faux `Storage` en mémoire écrit dans le test (pas de dépendance) :
aller-retour, valeur absente, JSON invalide, enveloppe inconnue, sauvegarde de
secours, `setItem` qui lève.

#### L21 — Brancher la progression dans l’application, sans visuel ●●

Dans `src/app/` : à chaque victoire en mode campagne, compter les objets utilisés
**au lancement** (pas après), appeler `recordSuccess` et enregistrer. Exposer un
hook `useCampaignProgress()` qui fournit l’état de chaque niveau (ouvert, palier,
indice à révéler) pour la future interface. Aucune modification visible : tester
par Testing Library via le dépôt injecté, et par un attribut `data-level-tier`
sur le bandeau de résultat existant si un test en a besoin.

Un niveau verrouillé reste jouable par son URL tant que l’interface de
verrouillage n’existe pas : ne rien bloquer.

### Phase E — Fichiers et partage

Lire : ADR 0011, `docs/architecture.md` § Enveloppe de niveau et § Stockage et
partage.

#### L22 — Codec de fichier de niveau ●●

`src/infrastructure/level-file/level-file-codec.ts` et son test.

- `encodeLevelFile(document): string` : JSON indenté de 2 espaces, saut de ligne
  final, clés dans l’ordre du schéma.
- `decodeLevelFile(text): Result` discriminé
  `{ status: 'ok', document } | { status: 'error', code, issues? }`, sans
  exception. Pipeline : taille ≤ 256 Kio **avant** parsing (constante nommée),
  `JSON.parse` protégé, lecture de `schemaVersion` sur `unknown`,
  `levelDocumentV1Schema` + `migrateLevelDocumentV1ToV2` pour la v1,
  `levelDocumentSchema` pour la v2, sinon `unsupported-version`.

Tests rouges : aller-retour d’un niveau embarqué identique ; v1 migré valide ;
texte trop grand refusé ; JSON invalide ; version 3 refusée ; objet hors scène
refusé avec les `issues` Zod ; `challenge` et `wires` conservés.

#### L23 — Codec de partage par URL ●●●

`src/infrastructure/level-share/` : `encodeShareFragment(document): Promise<string>`
et `decodeShareFragment(fragment): Promise<Result>`, format et ordre des
vérifications **exactement** comme l’ADR 0011 § Partage. À écrire soi-même, sans
dépendance : CRC-32 IEEE (table de 256 entrées), base64url sans remplissage,
décompression en flux par `DecompressionStream('deflate-raw')` avec arrêt dès que
le total dépasse la taille annoncée.

Tests rouges : aller-retour ; CRC-32 de `"123456789"` = `cbf43926` (valeur de
référence) ; chaque code d’erreur de l’ADR déclenché par une charge fabriquée
dans le test (trop longue, version 2, taille annoncée trop grande, base64
invalide, taille menteuse, CRC faux, document invalide) ; une « bombe » de
décompression (1 Mo de zéros compressés annoncés comme 1 000 octets) est coupée
sans tout décompresser.

#### L24 — Route `/shared` ●●

Étend l’ADR 0008 (voir ADR 0011). Dans `src/app/` : lire `location.hash`,
décoder, ouvrir le niveau en mode joueur comme niveau éphémère (hors campagne,
sans progression, sans brouillon). Erreur : afficher le message d’erreur dans un
`Panel` existant avec un lien vers la liste des niveaux. **Réutiliser les
composants existants, sans nouveau style** ; captures pour l’auteur.

Tests : App test avec un fragment valide (le niveau s’affiche), invalide
(message, rien d’autre ne change), et un parcours Playwright mobile qui ouvre un
lien fabriqué par `encodeShareFragment`.

### Phase F — Mode auteur (logique seulement)

#### L25 — Commandes d’auteur ●●●

Lire : ADR 0005, `architecture.md` § Commandes et historique,
`mobile-editor-interactions.md` (sections sur le mode création uniquement).

Commandes annulables en contexte `author` uniquement (refusées au joueur avec un
code stable), dans `src/application/construction/` ou un module voisin
`authoring/`, chacune avec ses tests :

- changer le rectangle de scène (refusé s’il exclut un objet ou une zone) ;
- ajouter, déplacer, redimensionner, supprimer une zone de construction ;
- ajouter une entrée d’inventaire, changer sa quantité, ses propriétés, ses
  permissions, la supprimer ;
- changer les permissions d’un objet placé ;
- choisir la balle et le panier de l’objectif ;
- changer titre et description ;
- définir ou retirer le `challenge`.

Chaque document produit est revalidé par le schéma (déjà le cas via
`acceptCandidate`). Pas d’interface.

#### L26 — Brouillons ●●

Port `DraftRepository` et adaptateur `localStorage` (ADR 0011 : index
`contrapt:drafts`, un brouillon par clé, documents passés par le codec L22).
Fonction pure de sauvegarde automatique : enregistrer au plus une fois par
seconde pendant l’édition et immédiatement au lancement d’un test, horloge
injectée. Tests comme L20.

### Phase G — Outillage

#### L27 — CI GitHub Actions ●

`.github/workflows/check.yml` : sur `push` et `pull_request`, Node 24,
`corepack enable`, `pnpm install --frozen-lockfile`,
`pnpm exec playwright install --with-deps chromium`, `pnpm check`. Cache pnpm.
Ne pas pousser : l’auteur vérifiera au premier push.

#### L28 — PWA ●●

Lire : ADR 0012. Installer `vite-plugin-pwa` (version exacte, et ses pairs
`workbox-window`, `workbox-build` si pnpm les demande) après avoir vérifié ses
`peerDependencies`. Configuration `generateSW`, `registerType: 'prompt'`,
précache des assets, repli de navigation, service worker désactivé en `dev`.
Manifeste : icônes provisoires si l’auteur n’en a pas fourni — les signaler dans
le journal. Fonction pure `canPromptUpdate(phase)` (pas pendant une simulation ou
une manipulation) testée. L’invitation visible à mettre à jour relève de l’UI
(§ 6) : exposer seulement l’état « mise à jour disponible » par un hook.

Test E2E : premier chargement, `context.setOffline(true)`, rechargement, le
niveau 1 s’affiche. Mettre à jour ADR 0003 si la politique de dépendances
l’exige.

#### L29 — Page de mesure de performance pour téléphone — **fait** (26 septembre 2026, hors journal)

Livrée avant la reprise : `src/app/BenchPage.tsx`, `src/app/BenchPlayPage.tsx`,
`src/app/bench/`. Ne rien refaire ; la description ci-dessous reste pour
mémoire.

**Pourquoi.** L’ADR 0002 a choisi Planck avant mesure. Sa « porte de validation »
dit : si un téléphone d’entrée de gamme ne tient pas 60 images par seconde dans
la scène la plus chargée qu’un niveau puisse contenir, le choix du moteur est à
revoir. L’auteur doit donc ouvrir une page sur son téléphone et lire un verdict.

Route `/bench`, absente des menus. Elle :

1. construit en mémoire un document dense (grande scène 16 × 9, environ 30 corps
   dynamiques et 6 articulations : balles, masses, bascules, leviers, sur un décor
   de poutres), valide par le schéma ;
2. mesure la physique seule : 1 200 pas fixes de `SimulationSession`, durée de
   chaque pas par `performance.now()` (autorisé dans `src/app/`, jamais dans
   `src/simulation/`), médiane, 95e centile, pire cas ;
3. joue ensuite la même scène sur le plateau normal pendant 20 s et compte les
   images réellement affichées ;
4. affiche un verdict en texte simple : images par seconde, temps physique par
   image au 95e centile, et « OK » si ≥ 55 images/s et physique au 95e centile
   < 8 ms, sinon « À revoir ». Réutiliser `Panel`, sans nouveau style.

Tests : le document dense est valide ; la fonction de statistiques (médiane,
centile) est pure et testée ; un test App vérifie que `/bench` affiche un
verdict avec une horloge injectée. Documenter dans le journal comment l’auteur
ouvre la page sur son téléphone (build servi sur le réseau local, ou déploiement
si l’auteur en a mis un en place).

### Fin de liste

Quand tout est fait ou bloqué : mettre à jour `etat.md`, écrire un bilan dans le
journal (faites, bloquées avec raison, questions pour l’auteur) et s’arrêter. Ne
pas inventer de tâche suivante.

## 6. Interface visible — pas pour toi, sauf demande de l’auteur

L’auteur peut te confier une de ces tâches **à l’essai**, avec vérification
visuelle de sa part. Chacune se termine par des captures (390 × 844, 844 × 390,
1440 × 900) citées dans le journal et une pause pour validation. Ne pas les
commencer de ta propre initiative.

- **U1 — Fantôme de placement** dessiné par le renderer (spéc. complète :
  `plan-remise-en-jeu.md` § 5 « C1 »). Meilleur candidat pour un premier essai.
- **U2 — Fond qui suit la caméra** (`plan-remise-en-jeu.md` § 6 « D3 »).
- **U3 — Ombre portée** (`plan-remise-en-jeu.md` § 5 « C2 »), après U1.
- **U4 — Bandeau de résultat** : palier, nombre d’objets, révélation progressive
  (ADR 0010), bouton « Niveau suivant ».
- **U5 — Liste des niveaux** : chapitres, niveaux verrouillés, palier obtenu.
- **U6 — « Recommencer » et « Remettre à zéro »** : appliquer le vocabulaire de
  `mobile-editor-interactions.md` § Tester, mettre en pause et recommencer. Le
  libellé « Réinitialiser » disparaît ; une seule commande « Recommencer » visible
  à la fois (aujourd’hui en double dans `SimulationControls.tsx` et
  `LevelResult.tsx`) ; dans l’éditeur, « Remettre l’atelier à zéro » derrière une
  boîte de confirmation (`Dialog`) qui dit ce qui sera perdu. Après une victoire
  pendant « Tester » dans l’éditeur, ne pas afficher « Rejouer le niveau » si cette
  action efface la construction, ni « Retour à la liste des niveaux » : la reprise
  de l’édition doit conserver l’atelier et sa construction.
- **U7 — Balle suivie** : signaler quelle balle est la cible de l’objectif.
- **U8 — Aide du niveau 1** : indication brève et non bloquante vers « Tester »
  puis vers le tiroir.
- **U9 — Interface du mode auteur** : zones, inventaire, objectif, scène, défi,
  brouillons, import/export, partage (s’appuie sur L22 à L26).
- **U10 — Invitation de mise à jour et installation** de la PWA (L28).
- **U11 — Réglages** : réinitialiser la progression, préférences.
- **U12 — Poutres en trois tailles** : sources dessinées dans `art/assets/beam/`
  (26 septembre 2026) ; les exporter par `art/build-sprites.py` et câbler les
  trois sprites, une fois le dessin validé par l’auteur. La mascotte de
  `art/assets/bolt/` n’a pas encore d’usage décidé.

## 7. En attente de l’auteur — ne pas commencer

- Icônes de la PWA : l’auteur les dépose dans `art/` (L28 les exporte alors vers
  `public/`) ; validation du dessin des poutres.
- Tout ce que les tâches ci-dessus marquent « bloqué ».

## 8. Journal

Une entrée par tâche, ajoutée en bas, la plus récente en dernier. Format :

```markdown
### L<n> — <titre> — fait | partiel | bloqué — <commit ou « non commité »>

- Tests ajoutés : <fichier › nom du test>, …
- Échec initial constaté : <ligne d’erreur utile>
- Tests existants réécrits : <nom> — <raison> (ou « aucun »)
- Fichiers touchés hors périmètre : <liste justifiée> (ou « aucun »)
- Écarts avec la tâche : <ce qui n’a pas été fait et pourquoi>
- Mesures qui ne se reproduisent pas : <niveau, attendu, obtenu> (ou « aucune »)
- Contradictions rencontrées : <citer les deux sources, ne pas arbitrer>
- Non vérifié : <zones d’ombre>
- Pour l’auteur : <captures, questions>
```

<!-- Les entrées commencent ici. -->

### L1 — Réparer le parcours Playwright desktop C3 — fait — `test(e2e): resélectionne la poutre restaurée (L1)`

- Tests ajoutés : aucun ; `e2e/editor-interactions.spec.ts` C3 vérifie maintenant
  aussi que l’inspecteur réapparaît après sélection de la poutre restaurée.
- Échec initial constaté : `waitForCanvasToMatch` ligne 143 — `Expected: true`,
  `Received: false` après l’annulation de la suppression.
- Tests existants réécrits : C3 — la sélection, effacée par la suppression, est
  rétablie avant de comparer les captures pixel à pixel.
- Fichiers touchés hors périmètre : `docs/etat.md` (état et gate),
  `docs/feuille-de-route-luna.md` (intégration de la remarque mainteneur sur le
  résultat d’un test dans l’éditeur).
- Écarts avec la tâche : aucun.
- Mesures qui ne se reproduisent pas : aucune.
- Contradictions rencontrées : aucune.
- Non vérifié : aucune zone liée à L1.
- Pour l’auteur : aucune capture demandée pour cette correction de test.

### L2 — Couvrir le Markdown par `format:check` — bloqué — `docs(roadmap): consigne le blocage du format Markdown (L2)`

- Tests ajoutés : aucun (tâche d’outillage documentaire).
- Échec initial constaté : `pnpm format` a ajouté des lignes vides à l’intérieur
  du bloc fenced `markdown` de `.codex/skills/orchestrate/references/protocol.md`,
  par exemple après `## Objectif` et `## Résultat` ; L2 exige l’arrêt dans ce cas.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : aucun ; les changements automatiques de
  formatage ont tous été restaurés.
- Écarts avec la tâche : les globs Prettier restent inchangés ; L2 n’est pas
  terminée.
- Mesures qui ne se reproduisent pas : aucune.
- Vérification finale : `pnpm check` passe (393 tests Vitest ; 29 tests mobiles,
  avec C3 ignoré car propre au projet desktop).
- Contradictions rencontrées : aucune.
- Non vérifié : aucun lien n’a changé dans le diff inspecté ; `format:check` et la
  gate globale ne couvrent toujours pas Markdown.
- Pour l’auteur : L2 est bloquée par sa condition d’arrêt explicite.

### L2b — Retirer Rapier — fait — `chore(simulation): retire Rapier après validation Planck (L2b)`

- Tests ajoutés : aucun ; les deux tests de conformité vérifient désormais
  Planck seul.
- Échec initial constaté : les nouveaux contrats ont échoué comme prévu — scène 6,
  `runScene6Lifecycle is not a function` ; scène 7,
  `Cannot read properties of undefined (reading 'observations')`.
- Tests existants réécrits : comparaisons Planck/Rapier des scènes 6 et 7 retirées ;
  toutes les assertions Planck sur les mesures mémoire, destructions, comptes,
  répétitions et snapshots conservées.
- Fichiers touchés hors périmètre : `docs/feuille-de-route-luna.md` (journal
  obligatoire de la reprise).
- Écarts avec la tâche : aucun. `pnpm remove` a d’abord rencontré
  `ERR_PNPM_UNEXPECTED_STORE` ; il a réussi avec le store d’origine passé à la
  commande, sans modifier la configuration globale.
- Mesures qui ne se reproduisent pas : aucune nouvelle mesure sur téléphone ; les
  résultats qui ont fermé la porte restent consignés dans l’ADR 0002.
- Contradictions rencontrées : aucune.
- Vérification finale : `rg -n -i rapier src test package.json pnpm-lock.yaml` ne
  trouve aucune référence ; `pnpm check` passe (392 tests Vitest, 29 parcours
  Playwright mobile réussis et un test desktop ignoré dans ce projet).
- Non vérifié : aucune vérification demandée par L2b ne reste à faire.
- Pour l’auteur : aucune question.

### L2c — Réessayer un sprite dont le chargement a échoué — fait — `fix(presentation): retente le chargement des sprites en échec (L2c)`

- Tests ajoutés : `sprite-loader.test.ts` — réussite après échec au second appel ;
  trois échecs maximum sans quatrième requête. Le test existant de déduplication
  concurrente reste en place.
- Échec initial constaté : 9 tests passent, 2 échouent : deuxième appel encore
  rejeté par « Réseau indisponible » ; attendu « Échec 2 », reçu « Échec 1 ».
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `docs/etat.md` (état livré et gate) et
  `docs/feuille-de-route-luna.md` (journal obligatoire).
- Écarts avec la tâche : aucun ; `BoardView.tsx` n’a pas été modifié.
- Mesures qui ne se reproduisent pas : aucune mesure physique répétée sur le vieux
  Xiaomi ; le retest après correctif est consigné dans `etat.md`.
- Contradictions rencontrées : aucune.
- Vérification finale : `pnpm check:fast` et `pnpm check` passent ; 394 tests
  Vitest, 29 tests Playwright mobiles réussis et un test desktop ignoré dans le
  projet mobile.
- Non vérifié : aucune vérification demandée par L2c ne reste à faire.
- Pour l’auteur : retester `/bench/play` sur le vieux Xiaomi pour confirmer qu’un
  rechargement manuel n’est plus nécessaire.

### L3 — La zone de construction contient l’objet entier — fait — `fix(construction): confine les objets aux zones (L3)`

- Tests ajoutés : `construction-attempt.test.ts` — refus de pose, déplacement et
  rotation quand un coin sort, acceptation sur une limite inclusive y compris après
  rotation, refus d’un objet réparti entre deux zones ; `placement-footprint.test.ts`
  — coins tournés et empreintes des onze familles.
- Échec initial constaté : les quatre tests comportementaux rouges acceptaient la
  pose, le déplacement, la rotation ou le chevauchement des zones avec le seul
  centre dans une zone.
- Tests existants réécrits : titre du test qui vérifie le rejet d’une pose hors
  zone, car il ne vérifiait plus le centre seul ; aucun test auteur modifié.
- Fichiers touchés hors périmètre : `docs/feuille-de-route-luna.md` pour le journal
  obligatoire et l’extension de la table des empreintes ; `docs/architecture.md`
  pour corriger le compte périmé de sept familles.
- Écarts avec la tâche : aucun. La table L3 nommait sept familles alors que le
  registre, le schéma et `family-geometry.ts` en définissent onze ; les quatre
  empreintes exécutables manquantes ont été ajoutées avant l’implémentation.
- Mesures qui ne se reproduisent pas : aucune.
- Contradictions rencontrées : table L3 (sept familles) contre registre et schéma
  (onze familles). Décision documentée dans la table : suivre les géométries déjà
  définies dans le code pour les onze types.
- Vérification finale : `pnpm check` passe — 406 tests Vitest, build et 29 tests
  Playwright mobiles réussis ; C3 est ignoré dans le projet mobile car réservé au
  projet desktop.
- Non vérifié : aucune vérification demandée par L3 ne reste à faire.
- Pour l’auteur : aucune capture ni question.

### L4 — Harnais de régression et recherche de solutions — fait — `test(content): ajoute le harnais de recherche de niveaux (L4)`

- Tests ajoutés : `level-regression.test.ts` — le niveau 1 réussit, le panier
  déplacé conduit à une sortie de scène, un niveau bloqué atteint le timeout,
  les pas sont déterministes, une étape refusée nomme son numéro et son code,
  les degrés sont convertis en radians, et la recherche choisit un déplacement
  gagnant parmi une solution et une fausse candidate tout en ignorant une pose
  refusée par la zone.
- Échec initial constaté : la suite rouge ne pouvait pas importer
  `./level-regression` avant la création du harnais. Un premier contrôle d’erreur
  attendait aussi une majuscule absente de la phrase réellement produite ; le
  motif du test a été aligné sur le message français.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `docs/feuille-de-route-luna.md` (journal de
  reprise) et `docs/etat.md` (état livré et résultat de la gate).
- Écarts avec la tâche : aucun. La garde du harnais lève une erreur après 1 300
  pas si les évaluateurs ne concluent pas ; le timeout normal du niveau reste
  produit par l’évaluateur de simulation.
- Mesures qui ne se reproduisent pas : aucune.
- Contradictions rencontrées : aucune.
- Vérification finale : `pnpm check` passe — typecheck, lint, formatage, Knip,
  validation du contenu, 414 tests Vitest, build et 29 tests Playwright mobiles
  réussis ; C3 est ignoré dans le projet mobile car réservé au projet desktop.
- Non vérifié : aucune vérification demandée par L4 ne reste à faire.
- Pour l’auteur : aucune question.

### L5 — Champ `challenge` du document de niveau — fait — `feat(domain): ajoute les seuils challenge au niveau (L5)`

- Tests ajoutés : `level-document.test.ts` — absence relue sans valeur par défaut,
  défi valide, ordre minimal/élégant, somme des quantités de plusieurs entrées,
  inventaire insuffisant, entiers et bornes 1–999 avec chemins d’erreur précis.
- Échec initial constaté : quatre nouveaux cas échouaient car `challenge` était
  encore un champ inconnu du schéma strict ; le cas sans champ passait déjà.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `docs/feuille-de-route-luna.md` (journal
  obligatoire) et `docs/etat.md` (état livré et résultat de la gate).
- Écarts avec la tâche : aucun. Le validateur de catalogue appelle déjà le schéma
  v2 et récupère ainsi les mêmes erreurs détaillées ; il n’a pas nécessité de
  modification séparée. Aucune version ni migration ajoutée.
- Mesures qui ne se reproduisent pas : aucune.
- Contradictions rencontrées : aucune.
- Vérification finale : `pnpm check` passe — typecheck, lint, formatage, Knip,
  validation du contenu, 420 tests Vitest, build et 29 tests Playwright mobiles
  réussis ; C3 est ignoré dans le projet mobile car réservé au projet desktop.
- Non vérifié : aucune vérification demandée par L5 ne reste à faire.
- Pour l’auteur : aucune question.
