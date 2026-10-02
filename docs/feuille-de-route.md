# Feuille de route

Rédigée le 1er octobre 2026. Remplace `feuille-de-route-luna.md`, conservée comme
historique (journal L1 à U29) : on n'y lit que l'entrée de journal qu'une tâche
cite.

Destinataire : l'agent d'implémentation qui reprend le dépôt — Claude Code
(Opus). Il peut déléguer une sous-tâche bien délimitée (un test, un adaptateur,
une passe de captures) à un sous-agent Claude Sonnet ou Opus, mais il reste
responsable du résultat : il relit le diff, lance la gate et tient le journal.

## Point de reprise (fin de session du 1er octobre 2026)

- **Phase 1 terminée ; phase 2 commencée : U12, U1, U13, U7, U8, U10 et U11
  faites (2 octobre 2026), prochaine tâche U2.** Phase 0 et M1 à M15 sont faites (journal § 7 ; M14b le 2 octobre
  2026, qui livre aussi A4 de la phase 3 ; M15, la documentation de la phase, le
  2 octobre 2026). `pnpm check` était vert au dernier commit.
- **Méthode qui a fonctionné** : la session principale orchestre ; chaque tâche
  part dans un sous-agent neuf, une à la fois, avec pour consigne de lire
  `AGENTS.md`, `docs/index.md`, ce fichier (§ 1 à 3, la tâche, le journal),
  `docs/etat.md` et les ADR citées, puis de faire un commit par tâche.
  **Opus pour le gros raisonnement et l'UI/UX, Sonnet pour l'écriture de
  code** (choix de l'auteur, 2 octobre 2026, qui remplace « Sonnet sans
  changement visible, Opus pour l'interface ») ; une tâche qui mêle les deux
  est découpée en étapes successives, un seul commit à la fin. Entre deux tâches, la session principale
  relit le rapport et le diff, regarde au moins une capture, tranche les
  questions simples en les écrivant dans l'ADR ou la tâche concernée, et
  remonte à l'auteur ce qui relève de son goût ou de son contenu.
- **N'attend que l'auteur** : validation visuelle des captures de M8 à M14b,
  de U12, de U1, de U13, de U7, de U8, de U10 et de U11 (`test-results/`, dont `test-results/beam-sprites/`,
  `test-results/placement-ghost/`, `test-results/build-zones/`,
  `test-results/goal-ball/`, `test-results/first-level-hint/`,
  `test-results/pwa-invitation/` et `test-results/settings/`) ; relecture des documents de M15 (entrée du journal) ;
  questions de goût listées dans les entrées M12 à M14b du journal ; feu vert pour intégrer `levels/` à la campagne (§ 6) ; décisions de
  la phase 5.
- **Ne pas faire** : concevoir, calibrer ou retoucher un niveau (§ 6) ; pousser.

Ce document fixe **quoi faire et dans quel ordre**. Il ne redéfinit aucune
règle : les règles sont dans `AGENTS.md`, les contrats dans les ADR et le code.
En cas de contradiction avec une source d'autorité (`docs/index.md`), la source
gagne : s'arrêter et le noter dans le journal (§ 7).

## 1. Avant de commencer

1. Lire `AGENTS.md`, `docs/index.md`, ce fichier en entier, puis `docs/etat.md`.
   Pour une tâche, lire en plus ce qu'elle cite, et rien d'autre sans raison
   écrite dans le journal.
2. Vérifier le point de départ :
   ```bash
   git status --short
   pnpm install --frozen-lockfile
   pnpm check
   ```
   Des fichiers modifiés ou non suivis qu'aucune tâche n'a produits sont du
   travail de l'auteur : ne pas les lire pour une tâche, ne pas les modifier, ne
   pas les commiter (`git add` fichier par fichier, jamais `git add -A`).
3. Relire le journal (§ 7) et reprendre à la première tâche ni « fait » ni
   « bloqué ».

## 2. Règles de travail

**Une tâche à la fois, dans l'ordre du § 4.** Une tâche bloquée n'empêche pas la
suivante, sauf dépendance déclarée (« Après : »).

**Cycle d'une tâche** (Red-Green-Refactor, `AGENTS.md`) :

1. écrire le ou les tests rouges que la tâche décrit ;
2. lancer le test ciblé et vérifier qu'il échoue **pour la raison attendue**
   (copier la ligne d'erreur utile dans le journal) ;
3. implémenter le minimum, puis refactorer ;
4. `pnpm check:fast` pendant le travail ;
5. `pnpm check` en fin de tâche, obligatoire avant commit ;
6. mettre à jour `docs/etat.md` (livré, dettes, dernière gate), le journal, et
   le tableau « Avancement » de `docs/cahier-des-charges.md` (une ligne par
   phase : ce qui est livré, ce qui reste) ;
7. un commit par tâche, message en français à l'impératif, préfixe de couche,
   identifiant entre parenthèses, avec la ligne d'attribution demandée par
   l'environnement. Exemple : `feat(storage): enregistre les niveaux reçus (M3)`.

Ne jamais pousser, réécrire l'historique ni supprimer de branche.

**Playwright** sert le build (`vite preview`) : `pnpm build` avant tout
`pnpm exec playwright test` isolé. `pnpm check` le fait dans le bon ordre.

**Changement visible** (mise en page, style, textes, sprites) : captures en
390 × 844, 844 × 390 et 1440 × 900, inspectées par l'agent et citées dans le
journal. L'auteur valide ensuite ; la validation ne bloque pas la tâche
suivante, mais la tâche reste marquée « validation visuelle attendue » dans
`etat.md`. Réutiliser les composants et jetons existants (`Panel`, `Button`,
`Dialog`, variables de `styles.css`) ; pas de nouvelle direction visuelle.

**Ce que l'agent ne fait pas sans tâche qui le demande :**

- modifier une constante physique (`src/simulation/`,
  `src/domain/family-geometry.ts`) : un niveau s'adapte à la physique ;
- modifier le schéma `LevelDocument` ou une enveloppe de stockage ;
- ajouter une dépendance npm ;
- affaiblir, supprimer ou `skip` un test. Réécrire un test dont la tâche
  remplace explicitement le comportement est permis : le nommer dans le journal
  avec la raison ;
- modifier les niveaux de `src/content/levels/` ou de `levels/` : le contenu
  de la campagne revient à l'auteur (§ 6).

**Quand s'arrêter** et écrire « bloqué » dans le journal (mesures et sortie
d'erreur exactes) :

- deux tentatives distinctes échouent au même endroit ;
- la tâche exige une décision que ni ce document ni une ADR ne tranche ;
- deux sources se contredisent ;
- `pnpm check` échoue pour une raison étrangère à la tâche.

Une tâche bloquée est annulée localement (`git restore`, suppression des seuls
fichiers créés) : la branche n'est jamais laissée avec une gate rouge.

## 3. Repères techniques

À vérifier dans le code, qui prime.

- Monde : 1 unité = 1 mètre, `x` vers la droite, **`y` vers le bas**, origine en
  haut à gauche de la scène ; rotation positive = sens horaire à l'écran.
- Géométrie : `src/domain/family-geometry.ts`. Poutres statiques (elles flottent
  où on les pose) ; la balle s'arrête sur une poutre plate.
- Objectif : centre de la balle cible dans le capteur du panier pendant 30 pas
  fixes. Échec : hors de la scène élargie de 2 unités, ou 20 s simulées. Pas fixe
  1/60 s.
- Commandes joueur : `src/application/construction/construction-attempt.ts` ;
  commandes auteur : `authoring-commands.ts` (même dossier) ; modèle de test :
  `construction-attempt.test.ts`.
- Atelier → puzzle et inverse, vérification d'export :
  `src/application/puzzle/puzzle-workshop.ts` (ADR 0013).
- Nombre d'objets utilisés : `countObjectsUsed`,
  `src/application/progression/index.ts` ; enregistrement d'une victoire de
  campagne au lancement : `src/app/PlayLevelPage.tsx` (`onSimulationLaunched`).
- Stockage : ports dans `src/application/drafts/` et
  `src/application/progression/`, adaptateurs dans `src/infrastructure/storage/`
  (modèle : `local-storage-draft-repository.ts`). Codecs :
  `src/infrastructure/level-file/` et `src/infrastructure/level-share/`.
- Simulation headless : `createSimulationSession(document, { fixedStepSeconds })` ;
  exemple : `src/content/embedded-levels.test.ts`.
- Banc d'essai : un script jetable `pnpm exec tsx tmp/<fichier>.ts` peut importer
  `src/` ; `tmp/` est ignoré par git.

## 4. Tâches, dans l'ordre

Difficulté : ● simple, ●● moyenne, ●●● délicate (lire deux fois).

### Phase 0 — Gate verte

La gate est rouge depuis U28 : rien d'autre ne commence avant G1.

#### G1 — Stabiliser `BenchPage.test.tsx` ●●

`pnpm check` échoue de façon intermittente sur le délai de 5 s d'un test de
`src/app/BenchPage.test.tsx` (729/730), qui passe seul. Trouver la cause (travail
réel trop long sous charge, horloge non injectée, attente sur un timer) et la
corriger dans le test ou dans la page, **sans augmenter le délai** ni sauter le
test. Si la page fait réellement un calcul long, l'injecter ou le réduire dans le
test. Fini quand `pnpm check` passe trois fois de suite.

#### G2 — Flakes E2E L17b et U15 ●●

Deux parcours mobiles échouent par intermittence dans la suite complète et
passent seuls (journal U29 de `feuille-de-route-luna.md`). Les reproduire
(`--repeat-each`), identifier l'attente manquante et synchroniser sur un état
observable (comme la réparation « transition du catalogue »). Pas de `waitForTimeout`.

### Phase 1 — « Mes niveaux » et communauté

Lire pour toute la phase : ADR 0015, ADR 0016, ADR 0011, ADR 0013. Chaque tâche
rappelle en plus ce qui lui est propre.

#### M1 — Auteur et sources dans le format ●●

ADR 0016 § Champs du format. `metadata.author` et `metadata.basedOn` facultatifs
dans `src/domain/level-document.ts`.

Tests rouges (`level-document.test.ts`, codecs) : un document v2 sans les champs
se relit à l'identique ; un document avec les champs se relit à l'identique par le
codec de fichier et le codec URL ; refus d'un pseudo vide après suppression des
espaces, de plus de 40 caractères, avec saut de ligne ou caractère de contrôle ;
refus de plus de 16 sources. `puzzleFromWorkshop` conserve les deux champs
(test dans `puzzle-workshop.test.ts`).

#### M2 — Empreinte d'un niveau ●

ADR 0015 § Empreinte. Fonction asynchrone dans `src/infrastructure/level-file/` :
SHA-256 du texte du codec de fichier, 16 chiffres hexadécimaux.

Tests rouges : deux documents égaux donnent la même empreinte ; un changement
d'un objet la change ; la sortie respecte `^[0-9a-f]{16}$` ; `recu-<empreinte>`
est accepté par le schéma d'identifiant.

#### M3 — Dépôt des niveaux reçus ●●

ADR 0015 § Stockage local. Port `ReceivedLevelRepository` dans
`src/application/received/` (list, load, save, delete), adaptateur
`localStorage` dans `src/infrastructure/storage/`, sur le modèle exact du dépôt
de brouillons (enveloppe validée, document par le codec, sauvegarde avant
écrasement d'une valeur illisible, `quota-exceeded`, `storage-unavailable`).

Tests rouges : aller-retour d'une entrée complète ; valeur corrompue sauvegardée
sous `tinkerbolt:backup:` et liste vide avec avertissement ; quota dépassé en
résultat d'erreur ; `Storage` indisponible.

#### M4 — Enveloppe des créations v2 ●●

ADR 0015 § Stockage local. L'enveloppe des brouillons passe en version 2
(`document`, `source?`, `updatedAt`) ; le port expose la création entière (pas
seulement le document). Horloge injectée. La migration d'une v1 est écrite à la
première lecture, au mieux (M4b).

Tests rouges : une enveloppe v1 existante se lit comme une création sans
`source`, avec `updatedAt` fourni par l'horloge injectée ; une v2 se relit à
l'identique ; une `source` invalide rend l'entrée invalide (sauvegarde puis
avertissement). Les appelants existants (`campaign-draft.ts`, `EditorPage.tsx`,
`import-level-draft.ts`) sont adaptés sans changer leur comportement.

#### M5 — Solution d'une tentative gagnante ●●

ADR 0015 § Victoire sur un niveau reçu ; ADR 0005 (provenance). Fonction pure
`solutionFromAttempt(attempt)` dans `src/application/puzzle/` : poses issues de
l'inventaire (`inventoryId`, `transform`, `placementId`) et fils du joueur, à la
forme `solution` de l'ADR 0013.

Tests rouges : un objet du décor déplacé n'apparaît pas ; un fil du joueur
apparaît avec ses extrémités ; **rejouer** la solution produite sur le document
d'origine par les commandes du joueur (comme `playSolution` de
`puzzle-workshop.ts`) redonne la même tentative et gagne en simulation headless,
sur une fixture locale (pas un niveau de campagne : leur calibrage n'est pas
fait).

#### M6 — Créer une création depuis un niveau ●●●

ADR 0015 § Ouvrir dans l'atelier ; ADR 0016 § Remplissage automatique. Fonction
pure `creationFromLevel(level, { playerSolution?, createId })` dans
`src/application/drafts/` : décor repris, `solution`, `inventory` et `challenge`
retirés, poses et fils du joueur ajoutés `toPlace`, `source` = niveau intact,
titre « (remix) », `author` retiré, `basedOn` prolongé.

Tests rouges : sans solution du joueur, aucun objet `toPlace` et la solution
d'origine n'apparaît nulle part dans le document ; avec, chaque pose devient un
objet `toPlace` et les fils sont remappés ; `basedOn` est prolongé et tronqué à
16 ; titre tronqué ; le document produit est valide et `puzzleFromWorkshop`
redonne un puzzle dont la solution gagne (fixture). Remplacer
`createCampaignDraft` par cette fonction : le test U26 « le brouillon du niveau 1
conserve son inventaire » est réécrit (comportement remplacé par l'ADR 0015) ;
le nommer dans le journal.

#### M7 — Révéler la solution de l'auteur (logique) ●●●

ADR 0015 § Révéler. Commande d'auteur annulable
`revealAuthorSolution({ source })` dans `authoring-commands.ts` : ajoute les poses
et les fils de `source.solution` marqués `toPlace`, sans rien retirer, avec
identifiants dédoublonnés ; renvoie le nombre de fils ignorés. Réutiliser le
remappage de `workshopFromPuzzle` plutôt que le dupliquer (extraire une fonction
commune si besoin).

Tests rouges : sur une création intacte, le résultat égale `workshopFromPuzzle`
de la source au décor près ; après ajout d'objets par le remixeur, ceux-ci
restent ; un objet du décor supprimé fait ignorer le fil qui le touchait, et le
compte vaut 1 ; une seule entrée d'historique, annulable ; refusée en contexte
joueur.

#### M8 — Recevoir un niveau ●●

ADR 0015 § Réception. Cas d'usage `receiveLevel(repository, document, origin,
fingerprint, clock)` dans `src/application/received/`.

Tests rouges : un nouveau document crée `recu-<empreinte>` ; le même document
reçu deux fois ne crée qu'une entrée et ne réinitialise ni `solved`, ni le
record, ni `playerSolution` ; un document portant un objet ou un fil `toPlace`
est refusé avec un code stable ; une erreur de quota est un résultat.

Puis `/shared` : décoder, recevoir, jouer. Test App : après ouverture d'un lien
valide, le dépôt contient le niveau ; avec un dépôt en erreur, le niveau se joue
et un message discret (`role="status"`) dit qu'il n'a pas été gardé ; de même si
l'empreinte ne peut pas être calculée (`crypto.subtle` absent hors contexte
sécurisé, par exemple un build servi en HTTP sur une IP locale) ; un lien
invalide n'enregistre rien.

#### M9 — Page « Mes niveaux » ●●●

ADR 0015 § Page « Mes niveaux » ; ADR 0008 amendée. Route `/my-levels`, entrée
dans le menu partagé et sur l'accueil. Deux sections, cartes, actions Jouer,
Modifier, Partager, Dupliquer (créations), Supprimer (confirmation `Dialog`),
« Nouveau niveau », « Importer un fichier ». L'import réutilise la lecture de
fichier de `LevelImportPage.tsx` puis `receiveLevel` (`origin: 'file'`) ; il
reste sur la page et met le niveau en tête des niveaux reçus. `/import`
redirige vers `/my-levels` ; retirer `LevelImportPage` et
`import-level-draft.ts` une fois remplacés (Knip).

Pour cette tâche, Modifier et Jouer d'une création ouvrent les routes
existantes ; « Modifier » d'un niveau reçu et sa route de jeu arrivent en M10 et
M11 (boutons présents mais menant à ces routes, testés à ces tâches).

Tests rouges (App) : sections vides avec leurs invites ; une création et un
niveau reçu listés dans l'ordre de récence ; suppression après confirmation et
annulation qui ne supprime rien ; import d'un fichier valide, d'un JSON invalide,
d'un fichier trop gros, d'un atelier `toPlace` refusé ; `/import` redirige.
E2E mobile : importer un fichier puis le retrouver dans la liste. Captures aux
trois formats.

#### M10 — Jouer un niveau reçu ●●

ADR 0015 § Victoire sur un niveau reçu. Route `/my-levels/:id/play` ; même
enregistrement de victoire sur `/shared`. À la victoire : `solved`,
`bestObjectCount`, `playerSolution` (M5) depuis l'instantané du lancement, comme
`PlayLevelPage`. Identifiant inconnu : message et lien vers `/my-levels`.
Affichage « par <auteur> » et « d'après … » dans l'en-tête (ADR 0016 § Affichage).

Tests rouges : une victoire met l'entrée à jour ; une seconde victoire avec plus
d'objets garde le record mais remplace `playerSolution` ; un échec ne change
rien ; la campagne n'est pas touchée ; l'auteur et la première source sont
affichés en texte brut.

#### M11 — Modifier et Remixer ●●●

ADR 0015 § Points d'entrée. « Modifier » d'un niveau reçu crée une création via
`creationFromLevel` (avec `playerSolution` s'il est résolu) et ouvre
`/editor?draft=<id>`. « Remixer » dans le résultat de victoire (campagne et
niveaux reçus) fait de même avec la tentative gagnante. « Modifier » d'un niveau
de campagne (carte de `/levels`, libellé « Modifier le niveau N ») ouvre la
création `<id>-brouillon` sans solution, ou la rouvre si elle existe. Sous
`import.meta.env.DEV`, la création de campagne s'ouvre solution révélée, et la
fiche de calibrage U28 n'est affichée qu'en développement. Un niveau de
campagne verrouillé n'est pas modifiable (ADR 0015, paragraphe « Un niveau de
campagne verrouillé ») : bouton désactivé, URL directe refusée, création listée
« Verrouillé » avec Supprimer seulement.

Tests rouges : Modifier un niveau reçu non résolu n'affiche aucun objet « à
placer » ; résolu, la solution du joueur est posée ; Remixer pose la tentative
gagnante ; le niveau reçu est inchangé ; hors développement, un niveau de
campagne déverrouillé s'ouvre sans solution et sans fiche ; un niveau verrouillé
a son bouton « Modifier » désactivé, et son URL directe affiche « Ce niveau est
encore verrouillé. » même quand une création existe déjà, sans la modifier ;
sous `unlockAllLevels`, il s'ouvre. E2E mobile : recevoir,
gagner, remixer, déplacer un objet, exporter. Captures.

#### M12 — Révéler dans l'atelier (interface) ●●

ADR 0015 § Révéler. Dans l'atelier d'une création dont la `source` porte une
solution : entrée « Révéler la solution de l'auteur » dans un menu, boîte de
confirmation, commande M7, message du nombre de fils ignorés s'il y en a.
Annulable par « Annuler ». Absente sans `source` ou sans solution.

Tests rouges : entrée absente sur une création de zéro ; confirmation puis
objets « à placer » visibles ; « Annuler » de la boîte ne change rien ;
annulation par l'historique. Captures.

#### M13 — Atelier libre enregistré ●●

ADR 0015 § Atelier libre. Première modification engagée sur `/editor` sans
paramètre : création `creation-<aléa>` (aléa et horloge injectés), URL
remplacée par `/editor?draft=<id>`. Les modifications suivantes l'enregistrent
comme un brouillon (`decideDraftAutosave` peut enfin être branché si la tâche
le justifie).

Tests rouges : ouvrir `/editor` sans rien faire ne crée rien ; poser un objet
crée une création et change l'URL ; recharger retrouve l'objet ; l'historique
du navigateur n'a pas d'entrée supplémentaire.

#### M14 — Partager : titre, pseudo, licence ●●

ADR 0016 § Licence, § Pseudo. La boîte d'export (U16) propose le titre (commande
`updateLevelTitle`) et le pseudo (nouvelle commande d'auteur, annulable),
l'aide « Un pseudo, pas ton vrai nom » et la mention CC BY 4.0. La saisie retire les espaces de bord avant d'appliquer la
commande (le schéma, lui, ne réécrit rien : M1). Port
`PreferencesRepository` (ADR 0011, clé `tinkerbolt:preferences`) pour retenir le
dernier pseudo ; adaptateur sur le modèle des autres dépôts.

Tests rouges : le pseudo saisi est dans le fichier et le lien exportés ; il
préremplit l'export suivant après rechargement ; un pseudo invalide est refusé
avec un message ; la mention de licence est présente ; une erreur de stockage
des préférences n'empêche pas l'export. Captures.

#### M14b — Description du niveau ●●

Décision de l'auteur du 1er octobre 2026 : la description qu'aucun auteur n'a
écrite est celle de l'atelier libre (`src/content/levels/workshop.json`),
recopiée dans chaque création et exportée. Elle devient un champ de l'auteur.

1. Corriger d'abord `updateLevelDescription` : appelée avec `undefined`, elle
   efface `author` et `basedOn` (dette notée en M14). Test rouge.
2. Retirer la description par défaut de l'atelier libre : une création partie
   de zéro n'en a pas. Une création issue d'un niveau garde la description de
   celui-ci, modifiable.
3. Boîte d'export d'une création : champ « Description (facultatif) », appliqué
   à l'export comme le titre et le pseudo (M14), vidé = retiré, bornes du
   schéma. Remplace la tâche A4 de la phase 3.
4. Cartes des niveaux reçus dans « Mes niveaux » : la description en texte brut,
   comme sur `/levels`.

Tests : ancien document avec description relu à l'identique ; export avec,
sans, et description vidée ; carte d'un niveau reçu. Captures de la boîte et de
la carte.

#### M15 — Documentation de la phase ●

README : licence CC BY 4.0 du contenu de niveau à côté de l'AGPL du code, et
« Mes niveaux » dans la description. `docs/etat.md` réécrit pour la phase.
`docs/mobile-editor-interactions.md` : scénarios d'acceptation « recevoir,
jouer, remixer, partager » et « révéler ». Pas de test (documentaire), gate
complète.

### Phase 2 — Interface en attente

Spécifications dans `feuille-de-route-luna.md` § 6 (citer la puce exacte) et,
pour U1, U2, U3, dans `plan-remise-en-jeu.md` à la section indiquée. Captures et
validation visuelle pour chacune.

1. ~~U12 — Poutres en trois tailles~~ : faite le 2 octobre 2026 (journal U12) ;
   validation visuelle attendue.
2. ~~U1 — Fantôme de placement~~ : faite le 2 octobre 2026 (journal U1) ;
   validation visuelle attendue.
3. ~~U13 — Zones de construction visibles~~ : faite le 2 octobre 2026 (journal
   U13) ; validation visuelle attendue.
4. ~~U7 — Balle suivie~~ : faite le 2 octobre 2026 (journal U7) ; validation
   visuelle attendue.
5. ~~U8 — Aide du niveau 1~~ : faite le 2 octobre 2026 (journal U8) ;
   validation visuelle attendue.
6. ~~U10 — Invitation de mise à jour et d'installation~~ : faite le 2 octobre
   2026 (journal U10) ; validation visuelle attendue.
7. ~~U11 — Paramètres~~ : faite le 2 octobre 2026 (journal U11) ; validation
   visuelle attendue.
8. **U2 — Fond qui suit la caméra** (`plan-remise-en-jeu.md` § 6 « D3 »).
9. **U3 — Ombre portée** (`plan-remise-en-jeu.md` § 5 « C2 »), après U1.
10. **Inspecteur compact** : toucher un autre objet alors que l'inspecteur est
    fermé et un objet sélectionné doit le rouvrir (dette de `etat.md`). Test
    rouge d'abord.

### Phase 3 — Atelier complet

Les commandes existent (L25, `authoring-commands.ts`) ; il manque l'interface
tactile. Lire `mobile-editor-interactions.md` et `architecture.md` § Commandes
et historique. Une tâche par point, captures pour chacune.

1. **A1 — Scène** : redimensionner la scène (`updateScene`), sans laisser
   d'objet hors scène (refus explicite).
2. **A2 — Zones de construction** : ajouter, déplacer, redimensionner, retirer.
3. **A3 — Objectif** : déplacer la balle rouge et le panier (aujourd'hui uniques
   et déjà posés) ; `updateLevelGoal` si le modèle l'exige.
4. ~~A4 — Description du niveau~~ : avancée en M14b, faite (journal M14b).

### Phase 4 — Outillage et mesures

1. **L2 — Markdown dans `format:check`** (bloquée, journal L2 de
   `feuille-de-route-luna.md`) : reprendre le diagnostic ; si le reformatage
   global est le seul obstacle, le faire dans un commit à part, sans autre
   changement.
2. **Durée de la vérification d'export** : mesurer les deux simulations
   synchrones de l'ADR 0013 sur la page `/bench` ou un banc équivalent ; si elles
   dépassent 300 ms sur le profil téléphone lent, noter la dette avec les
   chiffres, sans optimiser sans tâche.

### Phase 5 — À décider par l'auteur avant de commencer

Ne pas commencer : chaque point attend une décision écrite (ADR ou réponse dans
le journal).

- **Minuteur et niveau 15** (« Prenez votre temps », `levels/nouveaux-niveaux.md`) :
  nouvelle famille d'objet (`AGENTS.md`, discipline de changement), sprites dans
  `art/assets/timer/`. Comportement à décider.
- **« Proposer ce niveau »** : bouton qui ouvre le formulaire Grist de la forge
  edu, quand le formulaire existe et que son adresse est connue.
- **Tri des propositions** du 27 septembre (`docs/propositions-*.md`,
  `docs/proposition-evolutions-canary.md`).

## 5. Fin de liste

Quand tout est fait ou bloqué : mettre à jour `etat.md`, écrire un bilan dans le
journal (faites, bloquées avec raison, questions pour l'auteur) et s'arrêter. Ne
pas inventer de tâche suivante.

## 6. En attente de l'auteur — ne pas faire à sa place

- **Niveaux de la campagne** (décision du 1er octobre 2026) : l'auteur les
  conçoit lui-même, un par un, avec l'atelier, et les dépose dans `levels/` à la
  racine. Les 17 esquisses de `src/content/levels/` sont provisoires et ne sont ni
  calibrées ni retouchées par un agent. Les intégrer à la campagne embarquée
  (remplacer `src/content/levels/` et le catalogue, identifiants uniques,
  régression de chaque solution) est une tâche que l'auteur déclenche ; à ce
  jour, `levels/tuto-1.json` porte l'identifiant `free-workshop` et
  `levels/tuto-4-…json` reprend celui de `tuto-3` : à corriger à l'intégration.
- Validation visuelle des tâches livrées avec captures.
- Retest du vieux téléphone Xiaomi après L2c.
- Premier passage distant du workflow CI.

## 7. Journal

Une entrée par tâche, ajoutée en bas, la plus récente en dernier :

```markdown
### <id> — <titre> — fait | partiel | bloqué — <commit ou « non commité »>

- Tests ajoutés : <fichier › nom du test>, …
- Échec initial constaté : <ligne d'erreur utile>
- Tests existants réécrits : <nom> — <raison> (ou « aucun »)
- Fichiers touchés hors périmètre : <liste justifiée> (ou « aucun »)
- Écarts avec la tâche : <ce qui n'a pas été fait et pourquoi>
- Contradictions rencontrées : <citer les deux sources, ne pas arbitrer>
- Non vérifié : <zones d'ombre>
- Pour l'auteur : <captures, questions>
```

<!-- Les entrées commencent ici. -->

### G1 — Stabiliser `BenchPage.test.tsx` — fait — commit de cette entrée

- Cause : le test « mesure chaque pas de physique avec l’horloge injectée… »
  simulait 1 200 pas réels de la scène dense de `/bench`. Mesuré dans la suite
  complète avec la version de `8e9a098` : 2 790 ms puis 3 778 ms (délai 5 s),
  contre 79 ms seul. Travail réel trop long sous charge ; ni timer ni horloge
  en cause (l’horloge était déjà injectée).
- Correction : déjà présente dans `HEAD` (commit de l’auteur `901559d`) —
  `BenchPage` accepte une prop `createSession` et le test injecte une session
  de substitution qui compte les pas (`expect(advanced).toBe(1200)`). La
  physique de la scène dense reste couverte par
  `src/app/bench/dense-bench-document.test.ts`. Aucun changement de code dans
  cette tâche ; délai inchangé, aucun test sauté.
- Tests ajoutés : aucun (assertion `advanced` déjà ajoutée par `901559d`).
- Échec initial constaté : non reproduit en échec franc ; mesure ci-dessus de
  l’ancienne version (2,8–3,8 s sur 5 s dans `pnpm test:run`).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : aucun. Lecture hors liste :
  `docs/feuille-de-route-luna.md` (grep « Bench ») pour retrouver le nom du test
  en échec — il n’y figure pas.
- Gate : `pnpm check` passe trois fois de suite (734 tests Vitest, 45 E2E
  réussis + 1 ignoré ; `BenchPage.test.tsx` en 573, 513 et 348 ms).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : la stabilité sur une machine plus lente ou en CI distante.
- Pour l'auteur : rien à valider à l'écran.

### G2 — Flakes E2E L17b et U15 — fait — commit de cette entrée

- Reproduction (après `pnpm build`) :
  `pnpm exec playwright test e2e/editor-interactions.spec.ts --project=mobile -g "L17b|U15" --repeat-each=50 --workers=12`
  → U15 20/50 en échec, L17b 0/50 ; `-g "L17b" --repeat-each=100 --workers=16`
  → L17b 5/100 en échec. La suite mobile complète `--repeat-each=4` (6 workers
  par défaut) passe 180/180 : les flakes n’apparaissent que sous charge.
- Cause U15 (production) : toucher le levier le sélectionne au `pointerdown`,
  ce qui ouvre le tiroir de propriétés compact pendant le toucher. Sous
  charge, le clic émis par le navigateur à la fin du toucher arrive sur le
  scrim tout juste monté (instrumentation : `click inspector-scrim Fermer`
  après `pointerdown scene-frame`) et referme le tiroir. Correction : le scrim
  (`src/ui/InspectorDrawer.tsx`) ne ferme que pour une pression commencée sur
  lui, ou une activation au clavier (`detail === 0`).
- Cause L17b (test) : depuis la poignée ronde de `8e9a098`, les deux gestes
  partaient de l’empreinte élargie du levier, à 35 px de la poignée : ils le
  déplaçaient au lieu de le tourner (captures `lever-rotation-*` : levier
  droit, déplacé), et le test passait quand même. Les échecs étaient des
  attentes `expect.poll` de 2 s dont une seule capture de canvas en pixels
  physiques (998 × 965) durait 1,5 à 2,5 s sous charge ; l’état attendu était
  pourtant atteint (capture d’échec identique au pixel à l’état initial).
  Correction : les gestes partent de la poignée (position calculée depuis
  `leverFootprint` et `rotation-handle-metrics`) et tournent de ±90° ; les
  comparaisons de canvas se font en pixels CSS ; le second quart de tour est
  synchronisé sur l’historique (`Rétablir` désactivé). Délais inchangés, ni
  `waitForTimeout` ni retry.
- Vérification : même commande, U15 et L17b 0/50 chacun (12 workers) ; L17b
  0/100 (16 workers) ; C3 desktop passe (aides de comparaison partagées).
- Tests ajoutés : `src/ui/InspectorDrawer.test.tsx` › « ignore le clic d’un
  toucher commencé sur le plateau avant l’ouverture du tiroir », « ferme le
  tiroir quand le toucher commence et finit sur le scrim », « ferme le tiroir
  quand le scrim est activé au clavier ».
- Échec initial constaté : `AssertionError: expected "spy" to not be called at
all, but actually been called 1 times`.
- Tests existants réécrits : L17b — le geste visait l’empreinte et non la
  poignée, il ne testait plus la rotation ; il la teste désormais (captures
  `test-results/levels/lever-rotation-{positive,negative}-90deg.png` : levier
  couché à droite, puis à gauche).
- Fichiers touchés hors périmètre : `src/ui/InspectorDrawer.tsx` (cause de
  production de U15).
- Écarts avec la tâche : la tâche visait une attente manquante dans les tests ;
  pour U15 la cause était dans le code, pour L17b dans le geste et le coût des
  captures. Le passage en pixels CSS réduit ce coût, ce n’est pas une
  synchronisation sur un état.
- Contradictions rencontrées : aucune.
- Non vérifié : à 16 workers sur 12 cœurs, U15 échoue encore 8/100 (6 délais
  de test de 30 s pendant les captures pleine page finales, 2 attentes de 1 s
  de `waitForCatalogueToCollapse`) : surcharge, consigné en dette dans
  `etat.md`. Pas de vérification sur un vrai téléphone lent du correctif du
  scrim.
- Pour l'auteur : rien à valider à l’écran (aucun changement visible) ; le
  tiroir ne se referme plus de lui-même juste après un toucher sur un objet.

### M1 — Auteur et sources dans le format — fait — commit de cette entrée

- Tests ajoutés : `src/domain/level-document.test.ts` › « auteur et sources
  d’un niveau (M1, ADR 0016) » (8 tests : relecture sans les champs, relecture
  avec, 40 caractères et espaces de bord acceptés, pseudo vide ou blanc refusé,
  41 caractères refusé, saut de ligne / `\r\n` / U+2028 / tabulation / NUL /
  DEL refusés, règles du titre et du pseudo dans une source et champ inconnu
  refusé, 16 sources acceptées et 17 refusées) ;
  `level-file-codec.test.ts` › « fait un aller-retour identique d’un niveau
  sans auteur ni sources (M1) », « … avec auteur et sources (M1) » ;
  `level-share-codec.test.ts` › « encode et décode un niveau sans auteur ni
  sources, sans les ajouter (M1) », « … avec auteur et sources (M1) » ;
  `puzzle-workshop.test.ts` › « conserve l’auteur et les sources de l’atelier
  (M1, ADR 0016) ».
- Échec initial constaté : `expected [ 'metadata' ] to deeply equal
[ 'metadata.author' ]` et, dans les codecs, `ZodError: "code":
"unrecognized_keys", "keys": ["author", "basedOn"], "path": ["metadata"]` ;
  `puzzleFromWorkshop` renvoyait `{ status: 'refused' }`. Les tests de
  relecture sans les champs passaient déjà (non-régression attendue).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : aucun.
- Choix d’implémentation : le pseudo est vérifié, jamais réécrit (pas de
  `trim()` stocké), pour que le document se relise à l’identique ; la longueur
  compte les unités UTF-16, comme `title`. « Saut de ligne » couvre aussi
  U+2028 et U+2029. Les métadonnées v1 restent figées (`metadataV1Schema`) :
  l’ADR ne place les champs qu’en v2. `puzzleFromWorkshop` conservait déjà
  `metadata` ; seul le schéma bloquait.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : comportement d’une ancienne version de la PWA face à un
  fichier portant ces champs (refus attendu par l’ADR, non testé).
- Pour l'auteur : rien à valider à l’écran. Question : faut-il refuser un
  pseudo entouré d’espaces (il est aujourd’hui accepté et conservé tel quel) ?
  M14 pourra le normaliser à la saisie.

### M2 — Empreinte d’un niveau — fait — commit de cette entrée

- Tests ajoutés : `src/infrastructure/level-file/level-fingerprint.test.ts` ›
  « donne la même empreinte à deux documents égaux », « change quand un objet
  change », « respecte seize chiffres hexadécimaux en minuscules », « est le
  début du SHA-256 des octets UTF-8 du texte du codec de fichier » (comparé à un
  calcul indépendant par `crypto.subtle`), « fournit un identifiant
  `recu-<empreinte>` accepté par le schéma d’identifiant ».
- Échec initial constaté : `Failed to load url ./level-fingerprint … Does the
file exist?` (module absent ; les 5 tests ne se chargent pas).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : aucun (`docs/etat.md` mis à jour).
- Implémentation : `levelFingerprint(document)` dans
  `src/infrastructure/level-file/level-fingerprint.ts` ; encode par
  `encodeLevelFile`, UTF-8 par `TextEncoder`, SHA-256 par `crypto.subtle`, 16
  premiers chiffres hexadécimaux. Knip : la fonction n’a pas d’appelant de
  production avant M8, mais le plugin Vitest de Knip compte les fichiers de test
  comme point d’entrée (précédent : `decideDraftAutosave`) ; `knip.json`
  inchangé, aucune règle désactivée.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : `crypto.subtle` n’existe que dans un contexte sécurisé
  (HTTPS ou localhost) ; le déploiement GitHub Pages est en HTTPS, mais un
  accès par IP en HTTP sur un réseau local l’aurait indisponible. Aucun test
  de ce cas.
- Pour l'auteur : rien à valider à l’écran.

### M3 — Dépôt des niveaux reçus — fait — commit de cette entrée

- Tests ajoutés : `src/infrastructure/storage/local-storage-received-level-repository.test.ts`
  › « dépôt local des niveaux reçus (M3, ADR 0015) » (35 tests) : liste vide
  sans clé ; aller-retour d’une entrée complète (enveloppe, index, document
  relu par le codec de fichier) et d’une entrée non résolue sans champ
  facultatif ; remplacement sans doublon d’index ; index illisible ou invalide
  (JSON cassé, autre `kind`, autre version, doublon, identifiant hors
  `recu-<empreinte>`) sauvegardé sous `tinkerbolt:backup:received` avec liste
  vide et avertissement ; entrée invalide (JSON cassé, autre `kind` ou version,
  document refusé par le codec, identifiant différent de la clé, origine,
  date, solution mal formée, record négatif, record ou solution sur un niveau
  non résolu, champ inconnu) sauvegardée sous
  `tinkerbolt:backup:received:<id>` puis `null` avec avertissement ; refus
  avant toute écriture d’une entrée invalide ; sauvegarde avant écrasement et
  pas d’écrasement si la sauvegarde échoue ; suppression, avec sauvegarde
  d’une entrée illisible et restauration si l’index échoue ; quota dépassé
  (entrée ou index) en résultat, sans entrée orpheline ; `Storage`
  indisponible pour les quatre opérations.
- Échec initial constaté : `Failed to load url
./local-storage-received-level-repository … Does the file exist?` (module
  absent, aucun test chargé). Après implémentation, contrôle par mutation :
  retirer la règle « ni record ni solution sans résolution » ou la comparaison
  identifiant/clé fait échouer 4 tests.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `src/domain/level-document.ts` — export de
  `solutionSchema` et du type `Solution` (sans changement de schéma), à la
  demande de la tâche (réutiliser le schéma plutôt que le dupliquer).
- Choix d’implémentation : `list()` renvoie les identifiants dans l’ordre
  d’insertion, comme le dépôt de brouillons ; le tri par `receivedAt` reste à
  la page (M9). Dans l’enveloppe, `data.document` est la valeur JSON du texte
  du codec de fichier (forme de l’ADR 0015) et se relit par
  `decodeLevelFile(JSON.stringify(…))`, migrations comprises ; les brouillons
  v1 stockent eux une chaîne `levelFile`. L’identifiant est contraint à
  `^recu-[0-9a-f]{16}$` (ADR 0015 § Identifiants), ce qui borne aussi les clés.
  `receivedAt` : `z.iso.datetime({ offset: true })`. `bestObjectCount` : entier
  positif ou nul, comme la progression. Une entrée non résolue ne peut porter
  ni record ni solution du joueur (cohérence calquée sur la progression) ; une
  entrée résolue n’est pas obligée d’en porter. `playerSolution` est validée
  par la forme seule, pas contre l’inventaire du document. Le dépôt n’accepte
  ni ne refuse les documents `toPlace` : c’est la réception (M8).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai `localStorage` de navigateur (faux `Storage` en
  mémoire seulement) ; aucun appelant en production avant M8 (Knip passe : le
  test sert de point d’entrée, comme pour M2).
- Pour l'auteur : rien à valider à l’écran. Question : faut-il exiger un record
  et une solution du joueur sur toute entrée résolue ? Laissé facultatif.

### M4 — Enveloppe des créations v2 — fait — commit de cette entrée

- Tests ajoutés : `src/infrastructure/storage/local-storage-draft-repository.test.ts`
  › « enveloppe des créations v2 (M4, ADR 0015) » (16 tests) : une enveloppe
  v1 existante se lit comme une création sans `source` datée par l’horloge
  injectée, sans écriture ; une v2 se relit à l’identique (source et date
  comprises) ; aller-retour d’une création avec `source` stockée comme valeur
  du codec de fichier ; une v1 réécrite en v2 sans sauvegarde de secours ;
  v2 invalide sauvegardée puis avertissement (source refusée par le codec,
  source non objet, document refusé, document d’un autre identifiant, date
  absente ou invalide, champ inconnu, version 3) ; création à la source
  invalide sauvegardée avant remplacement ; source invalide refusée avant toute
  écriture ; horloge invalide : écriture refusée, et v1 non datable rendue en
  erreur `invalid-draft` sans sauvegarde. `src/app/CampaignDraftEditing.test.tsx`
  › « conserve la source d’une création quand l’auteur l’édite (M4, ADR 0015) ».
- Échec initial constaté : `AssertionError: expected { status: 'ok', document:
{ …(10) } } to deeply equal { status: 'ok', creation: { …(2) } }` (v1) et
  `expected { status: 'ok', document: null, …(1) } to deeply equal { status:
'ok', creation: { …(3) } }` (v2 non reconnue, 24 échecs sur 33). Test de
  l’éditeur : écrit après l’adaptation de `EditorPage`, vérifié rouge en
  retirant la conservation de la source (`expected undefined to deeply equal
{ schemaVersion: 2, …(9) }`), puis rétabli.
- Tests existants réécrits : `local-storage-draft-repository.test.ts` ›
  « sauvegarde chaque document via le codec de fichier… » devient « sauvegarde
  chaque création dans une enveloppe v2… » — la tâche remplace l’écriture v1
  par la v2. Adaptations mécaniques de forme (port `creation` au lieu de
  `document`, `save({ document })`, horloge fixe passée à l’adaptateur) :
  le reste de ce fichier, `campaign-draft.test.ts` et
  `import-level-draft.test.ts` (dépôts en mémoire), `CampaignDraftEditing.test.tsx`,
  `LevelImportPage.test.tsx` (attendu `{ creation: { document, updatedAt } }`),
  `PuzzleWorkshop.test.tsx`, `e2e/puzzle-machine.ts` et
  `e2e/campaign-draft.spec.ts` (lecture brute de l’enveloppe : `data.document`
  au lieu de `JSON.parse(data.levelFile)`). Aucune assertion retirée.
- Fichiers touchés hors périmètre : `src/app/App.tsx` (point de composition :
  `() => new Date()`, précédent `now = () => performance.now()` de
  `BenchPage`), `src/app/PuzzleWorkshop.test.tsx`, `src/app/LevelImportPage.test.tsx`,
  `src/app/CampaignDraftEditing.test.tsx`, `e2e/puzzle-machine.ts`,
  `e2e/campaign-draft.spec.ts` : utilisateurs du port ou de l’enveloppe brute.
- Choix d’implémentation : `save` reçoit `{ document, source? }`
  (`DraftCreationContent`) et l’adaptateur fixe `updatedAt` avec l’horloge
  injectée (`now: () => Date`, obligatoire) ; `load` renvoie la création
  entière (`DraftCreation`). Les noms `DraftRepository`/`draft` sont gardés
  (pas de renommage hors tâche). La lecture d’une v1 ne réécrit rien :
  `updatedAt` change donc à chaque lecture tant que la création n’est pas
  réenregistrée (l’éditeur l’enregistre au premier changement). La `source`
  n’est validée que par le codec ; sa forme puzzle (sans objet `toPlace`)
  n’est pas imposée par le dépôt, comme pour les niveaux reçus en M3.
  `EditorPage` garde la création chargée et renvoie sa `source` à chaque
  enregistrement. `openCampaignDraft` et l’import enregistrent sans `source`,
  comportement inchangé (la source viendra avec M6).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai `localStorage` contenant des brouillons v1 d’une
  version déployée (couvert par des enveloppes v1 fabriquées dans les tests).
- Pour l'auteur : rien à valider à l’écran. Question : faut-il réécrire en v2
  une création v1 dès sa lecture, pour figer son `updatedAt` (utile au tri de
  M9) ? Laissé sans écriture à la lecture.

### M4b — Migration persistée des créations v1 — fait — commit de cette entrée

- Décision du pilote : à la première lecture valide d'une enveloppe v1,
  `load` la réécrit en v2 avec `updatedAt` = instant de cette lecture, une
  seule fois ; les lectures suivantes renvoient la même date (utile au tri de
  M9). Réponse à la question posée à l'auteur dans l'entrée M4.
- Tests ajoutés : `src/infrastructure/storage/local-storage-draft-repository.test.ts`
  › « migration persistée à la première lecture (M4b, ADR 0015) » (3 tests) :
  deux lectures avec une horloge qui avance renvoient la même date et le
  stockage contient une v2 (seule la clé du brouillon est écrite, ni index ni
  sauvegarde) ; écriture en échec (quota) : la création est rendue sans
  erreur, le stockage reste v1, la lecture suivante retente et migre ; une v1
  invalide garde la sauvegarde de secours et l'avertissement, sans migration.
- Échec initial constaté : `expected 1 to be 2` sur la version stockée
  (`"version": 1` au lieu de `2`, 2 échecs sur 36), la lecture n'écrivant rien ;
  le cas d'échec d'écriture échouait à sa relecture (toujours v1, pas de
  retentative), pas à la lecture initiale, qui renvoyait déjà la création.
- Test M4 réécrit : « lit une enveloppe v1 existante comme une création sans
  source datée par l'horloge injectée » ne contient plus
  `expect(storage.writes).toEqual([])` — c'était le comportement « sans rien
  réécrire » remplacé par cette tâche ; l'assertion sur la création lue est
  inchangée et l'écriture est désormais vérifiée dans les tests M4b. Aucun
  autre test modifié.
- Choix d'implémentation : l'écriture réutilise `encodeStoredDraft` (même
  v2 que `save`, sans `source`) et ne touche pas l'index (la v1 y figure
  déjà). Un `updatedAt` non datable (horloge invalide) reste une erreur
  `invalid-draft` sans écriture, comme en M4.
- ADR 0015 § Stockage local et tâche M4 : une phrase ajoutée chacune
  (« la migration est écrite à la première lecture, au mieux »). `docs/etat.md`
  mis à jour (description des créations v2, gate).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai `localStorage` de navigateur ; deux onglets lisant une
  même v1 en même temps (la dernière écriture gagne, chacune est une v2 valide).
- Pour l'auteur : rien à valider à l'écran.

### M5 — Solution d’une tentative gagnante — fait — commit de cette entrée

- Tests ajoutés : `src/application/puzzle/player-solution.test.ts` ›
  « solution d’une tentative gagnante (M5, ADR 0015) » (5 tests) : un objet du
  décor déplacé n’apparaît pas ; les fils du joueur apparaissent avec leurs
  extrémités, et la pose reliée porte son `placementId` (un fil entre deux
  objets du décor n’en ajoute aucun) ; la solution est valide pour
  `solutionSchema` et pour `levelDocumentSchema` posée sur le niveau joué ; un
  objet posé puis retiré n’apparaît pas ; rejouée par `playSolution` sur le
  niveau d’origine, elle redonne la même tentative (document et provenance, aux
  identifiants des objets du joueur près). `src/app/player-solution-replay.test.ts`
  › « rejouée sur le niveau d’origine, redonne la même tentative et gagne en
  simulation » : fixture locale (balle, panier, une poutre à poser) qui perd
  sans le joueur et gagne avec `runLevelOutcome`, avant et après rejeu.
- Échec initial constaté : `Failed to load url ./player-solution … Does the
file exist?` ; puis, avec une fonction vide, `expected { placements: [] } to
deeply equal { placements: [ { …(2) } ] }` et, au rejeu, `expected [ { id:
'beams', quantity: 1, …(3) } ] to deeply equal [ { id: 'beams', quantity: +0,
…(3) } ]` (4 échecs sur 6 ; les tests de validité et de l’objet retiré
  passaient déjà avec une solution vide, non-régression).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `src/application/puzzle/puzzle-workshop.ts`
  — `playSolution` extraite et exportée sous la forme `playSolution(level,
solution)` qui rend la tentative (et non plus le document), demandée par la
  tâche ; `verifyPuzzle` l’appelle avec `puzzle.solution`, comportement
  inchangé (16 tests existants verts). `src/app/player-solution-replay.test.ts` :
  la couche `application` ne peut pas importer `simulation` (règle ESLint des
  frontières, tests compris) ; le test headless vit donc dans `src/app/`, qui
  compose les deux.
- Choix d’implémentation : poses dans l’ordre des objets du plateau, fils dans
  l’ordre des fils ; une pose ne porte `placementId` (l’identifiant de l’objet
  du joueur) que si un fil du joueur la touche, comme l’export de l’ADR 0013 ;
  `wires` absent sans fil du joueur. Seuls les objets et fils présents dans la
  provenance comptent ; l’entrée d’inventaire n’est pas revérifiée (le joueur
  ne peut pas retirer une entrée).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : une victoire obtenue en déplaçant un objet du décor
  (`permissions.move`) n’est pas reproduite par la solution, qui ne retient
  pas ce déplacement (ADR 0015 : « poses issues de l’inventaire et fils du
  joueur ») ; son rejeu peut alors perdre. Aucun appelant en production avant
  M10 (Knip passe : les tests servent de point d’entrée, comme M2 et M3).
- Pour l'auteur : rien à valider à l’écran. Question : faut-il inclure dans la
  solution du joueur les déplacements d’objets du décor, pour que « Révéler »
  et le rejeu restent fidèles quand le niveau autorise à les déplacer ?

### M6 — Créer une création depuis un niveau — fait — commit de cette entrée

- Tests ajoutés : `src/application/drafts/creation-from-level.test.ts` ›
  « créer une création depuis un niveau (M6, ADR 0015, ADR 0016) » (9 tests) :
  sans solution du joueur, décor repris sans objet `toPlace`, sans `solution`,
  `inventory` ni `challenge`, et aucune trace de la pose d’origine dans le
  document ; niveau d’origine intact en `source`, hors du document ; chaque
  pose du joueur devient un objet `toPlace` verrouillé et son fil est remappé
  sur l’objet restauré ; objets et fils égaux à ceux de `workshopFromPuzzle`
  pour la même solution ; document valide pour `levelDocumentSchema`, avec un
  inventaire vide, avec ou sans solution ; titre « (remix) », `author` retiré,
  `basedOn` prolongé ; source sans auteur citée sans auteur ; `basedOn`
  tronqué à 16 (la plus ancienne tombe) ; titre tronqué à 160.
  `src/app/creation-from-level-replay.test.ts` › « redonne par
  `puzzleFromWorkshop` un puzzle dont la solution gagne en simulation »
  (fixture locale, `runLevelOutcome` : le puzzle seul perd, sa solution posée
  par les commandes du joueur gagne ; dans `src/app/` comme M5, règle des
  frontières).
- Échec initial constaté : `Failed to load url ./creation-from-level … Does the
file exist?` ; puis, avec une fonction qui copie le niveau, 8 échecs sur 9
  (`expected { placements: [ { …(2) } ] } to be undefined`, `expected
undefined to deeply equal { schemaVersion: 2, …(10) }`, `expected [] to
deeply equal [ { id: 'beams-2', …(5) }, …(1) ]`…) ; le test de validité
  passait déjà (non-régression). Le test headless, écrit après la fonction, a
  été vérifié rouge par mutation (solution du joueur ignorée : `expected
'refused' to be 'ok'`). Remplacement de `createCampaignDraft` : `Unable to
find an accessible element with the role "region" and name "Objets
disponibles"` (U26, U20) et `… role "button" and name "Annuler"` (U20 balle
  bleue).
- Tests existants réécrits (comportement remplacé par l’ADR 0015/0016) :
  `CampaignDraftEditing.test.tsx` › « affiche le catalogue auteur dans le
  brouillon du niveau 1 (U26) » devient « affiche le catalogue auteur dans la
  création du niveau 1, qui n’a plus d’inventaire (U26, M6) » — c’est le test
  « le brouillon du niveau 1 conserve son inventaire » de la tâche : il vérifie
  désormais l’inventaire vide et garde l’assertion du catalogue auteur ; « ouvre
  depuis la liste un brouillon distinct… » attend le titre « (remix) » et la
  `source` ; « conserve la source d’une création… » enregistre la création par
  `creationFromLevel`. `campaign-draft.test.ts` : « rouvre dans l’atelier un
  niveau à solution, ses objets à placer remis en place (U22) » devient
  « ouvre un niveau à solution sans la poser, le niveau gardé intact comme
  source (M6) » (solution cachée, ADR 0015) ; « copie le niveau sous un
  identifiant et un titre distincts… » et « enregistre la copie la première
  fois » sont fusionnés en « enregistre la création sous un identifiant
  distinct et un titre « (remix) »… » (mêmes assertions d’identifiant et
  d’original intact, titre ADR 0016) ; les autres n’ont changé que la
  fabrique (`creationFromLevel`) et le dépôt en mémoire, qui retient la
  création entière. « rouvre un brouillon existant sans écraser… » inchangé
  dans ses assertions (`openCampaignDraft` rouvre toujours tel quel).
- Fichiers touchés hors périmètre : `src/app/BoardShell.tsx` et
  `src/ui/SimulationControls.tsx` — le tiroir du catalogue et
  « Annuler »/« Rétablir » n’étaient affichés que si le document avait un
  inventaire (règle B1 du niveau 1 joueur) ; une création n’en a plus, ce qui
  privait l’atelier de son catalogue. Ils s’affichent désormais toujours en
  mode création ; en mode joueur, rien ne change. Aspect identique pour les
  brouillons de campagne (ils avaient un inventaire) : pas de capture.
  `src/domain/level-document.ts` : export de `MAX_TITLE_LENGTH` et
  `MAX_BASED_ON_ENTRIES` (schéma inchangé). `src/application/puzzle/puzzle-workshop.ts` :
  `restoreSolution(solution, inventory, usedIds)` extraite de
  `workshopFromPuzzle` (même comportement, 16 tests verts) pour M6 et M7.
- Choix d’implémentation : `creationFromLevel` rend un `DraftCreationContent`
  (`document`, `source`), sans valider (le dépôt valide à l’enregistrement et
  rend une erreur, pas une exception) ; `createId: () => string`. Les
  identifiants d’inventaire du niveau sont réservés comme dans
  `workshopFromPuzzle` (objets restaurés `beams-2`…), pour que M7 puisse
  comparer à `workshopFromPuzzle`. Les zones de construction sont gardées. Le
  titre est la chaîne « <titre> (remix) » tronquée (lecture littérale de
  l’ADR 0016 : au-delà de 152 caractères d’origine, « (remix) » est coupé).
  `createCampaignDraft` est supprimée ; `openCampaignDraft` enregistre la
  création avec sa `source`. La fiche U28 lit toujours le niveau embarqué
  (`EditorPage`), test « ouvre depuis la liste… » vert.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : les brouillons de campagne enregistrés avant M6 gardent leur
  solution posée et leur inventaire (ADR 0015 : « ils restent ainsi ») ; sous
  `pnpm dev`, la création neuve d’un niveau de campagne n’a plus la solution
  posée tant que M11 ne la révèle pas d’office (la fiche U28 la liste).
- Pour l'auteur : rien de nouveau à valider à l’écran. Question : faut-il
  préserver « (remix) » en tronquant plutôt le titre d’origine quand il dépasse
  152 caractères ?

### M6b — Titre de remix — fait — commit de cette entrée

- Décision du pilote (réponse à la question de M6) : tronquer le titre
  d’origine pour que « <titre tronqué> (remix) » tienne en 160 caractères et
  que le suffixe reste entier. ADR 0016 § Remplissage automatique précisée.
- Tests ajoutés : `src/application/drafts/creation-from-level.test.ts` ›
  « tronque le titre d’origine pour garder « (remix) » entier (M6b) » : titre
  de 160 caractères → 152 caractères d’origine suivis de « (remix) », au plus
  160, `basedOn` garde le titre d’origine entier, document valide.
- Échec initial constaté : `AssertionError: expected 'aaaa…' to be 'aaaa…'`
  (reçu : 160 « a », attendu : 152 « a » puis « (remix) »).
- Tests existants réécrits : « tronque le titre à la longueur maximale d’un
  titre » (attendait « (rem » coupé) — comportement remplacé par la décision ;
  remplacé par le test ci-dessus.
- Fichiers touchés hors périmètre : aucun.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : la troncature compte en unités UTF-16 comme le schéma ; un
  titre coupé au milieu d’une paire de substitution (emoji) garde une moitié
  de caractère, comme avant M6b.
- Pour l'auteur : rien à valider à l’écran.

### M7 — Révéler la solution de l’auteur (logique) — fait — commit de cette entrée

- Tests ajoutés : `src/application/construction/authoring-commands.test.ts` ›
  « révéler la solution de l’auteur (M7, ADR 0015) » (6 tests) : sur une
  création intacte (`creationFromLevel`), objets et fils égaux à ceux de
  `workshopFromPuzzle(source)`, inventaire et métadonnées de la création
  inchangés, 0 fil ignoré ; objets et fils ajoutés par le remixeur gardés en
  tête, identifiants dédoublonnés (objet `beams-2` du remixeur → pose
  `beams-3` ; fil `fil-bouton` du remixeur → fil `fil-bouton-2`), document
  valide ; objet du décor supprimé → le fil qui le touchait est ignoré, compte
  1 ; une seule entrée d’historique, annulée par un seul `undo` ; la source
  n’est ni modifiée ni figée par l’historique ; refus en contexte joueur
  (`authoring-only`) et pour une source sans solution (`solution-not-found`).
- Échec initial constaté : `TypeError: (0 , revealAuthorSolution) is not a
function` (fichier entier rouge). Vérification par mutation après coup :
  sans le filtre des extrémités, « ignore le fil… » échoue (`reveal rejected:
invalid-level-document`) ; sans le dédoublonnage des fils, « ajoute sans
  rien retirer… » échoue de même. Le test « ne fige ni ne modifie le niveau
  source » est une non-régression : il passe aussi sans copie, car
  `acceptAuthoringCandidate` repasse le candidat par Zod, qui le recopie ; la
  copie défensive a donc été retirée.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `src/application/puzzle/restore-solution.ts`
  (nouveau) — `restoreSolution` et `uniqueIdentifier` déplacées hors de
  `puzzle-workshop.ts` : `authoring-commands.ts` ne peut pas importer
  `puzzle-workshop.ts`, qui importe `../construction` (`import-x/no-cycle`).
  `puzzle-workshop.ts` et `creation-from-level.ts` l’importent ; pas de
  duplication. `restoreSolution` dédoublonne désormais aussi l’identifiant de
  chaque fil restauré dans `usedIds` (exigé par l’ADR 0015 : un fil du
  remixeur peut porter l’identifiant d’un fil de la solution) ; pour
  `workshopFromPuzzle` et M6, rien ne change sur un puzzle valide (fils de
  solution distincts des fils du décor), tests existants verts.
  `construction-attempt.ts` : code `solution-not-found` ajouté à
  `ConstructionErrorCode`.
- Choix d’implémentation : la commande prend `{ context, source }` (la
  `source` vit dans l’enveloppe de la création). L’interface `Command` ne rend
  qu’un état (`accepted`/`rejected` avec raison) : la solution la plus simple
  pour rendre le nombre de fils ignorés sans changer `History` est une
  méthode `ignoredWireCount(state)` sur l’objet commande, calculée par la même
  fonction pure que `execute` ; l’interface (M12) l’appelle sur l’état courant
  juste avant d’exécuter la commande. Identifiants réservés : objets,
  inventaire et fils du document, plus l’inventaire de la source (comme
  `workshopFromPuzzle`, d’où l’égalité exacte sur une création intacte).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un fil de la solution dont la cible est déjà commandée par
  un fil du remixeur, ou une pose hors d’une scène que le remixeur a réduite,
  rend le document invalide : la commande entière est alors refusée
  (`invalid-level-document`) au lieu d’ignorer le fil ou d’agrandir la scène ;
  l’ADR 0015 ne prévoit que le cas de l’extrémité disparue.
- Pour l'auteur : rien à valider à l’écran. Question : dans ces deux cas
  (cible déjà commandée, pose hors scène), faut-il ignorer le fil et agrandir
  la scène comme `addAuthoredPlacement`, plutôt que refuser toute la
  révélation ?

### M7b — Révéler ne refuse jamais en bloc — fait — commit de cette entrée

- Décision du pilote (réponse à la question de M7) : un fil de la solution qui
  viserait un appareil déjà commandé est ignoré et compté dans
  `ignoredWireCount`, comme un fil dont une extrémité a disparu ; une pose dont
  le centre tombe hors de la scène courante l’agrandit selon la règle de
  `addAuthoredPlacement` (`withSceneIncluding` du domaine, réutilisée). ADR 0015
  § Révéler précisée en deux phrases.
- Tests ajoutés : `src/application/construction/authoring-commands.test.ts` ›
  « ignore le fil qui viserait un appareil déjà commandé et le compte (M7b) »
  (fil du remixeur levier → ventilateur : `fil-bouton` ignoré, poses gardées,
  compte 1, document valide) ; « agrandit une scène réduite par le remixeur
  comme une pose d’auteur (M7b) » (scène réduite à x ≤ 8, poutre de la
  solution à x = 8,25 : scène égale à celle d’`addAuthoredPlacement` au même
  point, `{0,0}–{10,7}`, zone couvrante agrandie avec elle, document valide).
- Échec initial constaté : `Error: reveal rejected: invalid-level-document`
  pour les deux tests.
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : aucun.
- Choix d’implémentation : les cibles déjà commandées sont celles des fils du
  document, puis de chaque fil de la solution gardé (deux fils de la solution
  vers la même cible : le second est ignoré). La scène grandit pose par pose
  (réduction par `withSceneIncluding`) ; `revealedSolution` rend désormais le
  document candidat entier.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : une pose de la solution hors des limites de taille de scène de
  l’ADR 0007 (scène qui deviendrait trop grande) reste refusée par le schéma,
  comme pour `addAuthoredPlacement`.
- Pour l'auteur : rien à valider à l’écran.

### M8 — Recevoir un niveau — fait — commit de cette entrée

- Tests ajoutés : `src/application/received/receive-level.test.ts` ›
  « recevoir un niveau (M8, ADR 0015 § Réception) » (6 tests) : nouveau
  document enregistré `recu-<empreinte>`, non résolu, `receivedAt` de
  l’horloge ; même document reçu deux fois (par fichier puis par lien) : une
  seule entrée, aucune écriture, `solved`, record et `playerSolution`
  intacts ; objet ou fil `toPlace` refusé (`workshop-document`) sans
  écriture ; quota dépassé en résultat `not-kept` ; lecture du dépôt
  impossible en résultat, sans écriture ; empreinte indisponible : rien
  gardé. `src/app/App.test.tsx` › « joue le niveau d’un lien et dit
  discrètement qu’il n’a pas été gardé quand le stockage échoue (M8) »,
  « joue le niveau d’un lien sans le garder quand l’empreinte ne peut pas être
  calculée (M8) » (`crypto` remplacé par un objet sans `subtle`), « refuse un
  lien qui porte un atelier, sans le jouer ni l’enregistrer (M8) ».
  `e2e/shared.spec.ts` › « joue un lien partagé et dit discrètement qu’il n’a
  pas été gardé quand le stockage est plein (M8) » (`setItem` qui lève
  `QuotaExceededError`, captures aux trois formats, masquage au doigt) ; le
  parcours mobile existant vérifie en plus l’index `tinkerbolt:received`.
- Échec initial constaté : `receive-level.test.ts` : `Failed to load url
./receive-level … Does the file exist?`, puis avec une fonction vide
  `AssertionError: expected { status: 'stub' } to deeply equal { status:
'received', …(2) }` (6 échecs sur 6). App : `expected { status: 'ok', ids:
[] } to deeply equal { status: 'ok', …(1) }` (lien valide),
  `Unable to find an element with the text: Ce niveau n’a pas été gardé sur
cet appareil.` (dépôt en erreur, empreinte indisponible), `Unable to find
role="alert"` (atelier). « affiche une erreur de partage invalide… » passait
  déjà (non-régression, assertion `saves` ajoutée).
- Tests existants réécrits : `App.test.tsx` › « ouvre une esquisse partagée
  comme niveau joueur éphémère » devient « enregistre comme niveau reçu le
  niveau d’un lien valide, hors progression, avant de le jouer (M8) » :
  l’assertion `window.localStorage.length).toBe(0)` décrivait le partage
  éphémère, remplacé par l’amendement « réception » de l’ADR 0011 ; elle
  devient la lecture de l’entrée `recu-<empreinte>` par l’adaptateur réel.
  Titre, mode joueur, plateau et progression non sollicitée restent vérifiés.
- Fichiers touchés hors périmètre : `src/app/BoardShell.tsx` (prop
  `notice`), `src/ui/SimulationControls.tsx` (statut discret à côté du
  toast), `src/ui/styles.css` (`.toolbar-notice`, hors flux comme le toast,
  jetons existants), `e2e/shared.spec.ts` ; lecture de
  `src/infrastructure/storage/local-storage-received-level-repository.ts`
  (nom de la fabrique) et de `BoardShell`/`SimulationControls` (où loger le
  message) : raisons de l’affichage du statut.
- Choix d’implémentation : l’empreinte arrive en
  `LevelFingerprintResult` (`ok` + empreinte ou `unavailable`) ; `/shared`
  la calcule en attrapant toute exception de `levelFingerprint`. Un document
  déjà reçu n’est pas réécrit (ni `origin` ni `receivedAt` changés). L’horloge
  `() => new Date()` est posée dans `SharedLevelPage` (point de composition,
  comme `App` pour les brouillons). L’enregistrement se fait avant le
  montage du plateau ; un échec (`not-kept`) monte quand même le plateau avec
  le statut. Le statut se masque par un bouton « Masquer le message » (44 px)
  pour ne pas couvrir durablement le haut du plateau ; il cède la place à un
  refus éventuel (toast) puis revient. Le refus d’un lien d’atelier (ADR 0015 :
  « refusé à la réception ») n’ouvre pas le plateau : la page affiche le
  message en `role="alert"` à la place de « Lien invalide », adapté au lien
  (« Ce lien est un atelier, pas un niveau à jouer. ») là où l’ADR cite le
  fichier.
- Écarts avec la tâche : aucun. Hors tâche, comme demandé : victoires sur
  `/shared` (M10), page « Mes niveaux » (M9).
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai déploiement en HTTP sur une IP locale (simulé par
  `crypto` sans `subtle`) ; StrictMode en développement double l’effet, le
  premier passage annulé n’écrit pas.
- Pour l'auteur : validation visuelle du statut discret, captures
  `test-results/shared/shared-not-kept-390x844.png`, `-844x390.png`,
  `-1440x900.png` (inspectées : bandeau sombre sous la barre d’actions, sur
  le haut du plateau, croix de fermeture à droite, aucun décalage du
  plateau). Questions : recevoir à nouveau un niveau déjà gardé doit-il le
  remettre en tête (rafraîchir `receivedAt`) pour M9 ? Le libellé « Ce lien
  est un atelier, pas un niveau à jouer. » convient-il ?

### M9 — Page « Mes niveaux » — fait — commit de cette entrée

- Décisions du pilote appliquées : recevoir à nouveau un niveau gardé ne
  change que `receivedAt` (ADR 0015 § Empreinte et doublons précisée d’une
  phrase) ; création d’un niveau de campagne verrouillé listée « Verrouillé »
  avec Supprimer seul ; « Dupliquer » → `creation-<aléa>`, même `source`,
  « (copie) » entier ; « Modifier » d’un niveau reçu absent (M11).
- Tests ajoutés : `src/application/received/receive-level.test.ts` › « remet
  en tête un niveau déjà gardé en ne changeant que `receivedAt` (M9) », « garde
  l’entrée telle quelle quand la remise en tête ne peut pas être écrite
  (M9) » ; `src/application/drafts/duplicate-creation.test.ts` (6 tests :
  copie `creation-<aléa>` « (copie) » avec la même source et original
  intact, sans source inventée, titre tronqué, nouvel aléa si l’identifiant
  est pris, création absente ou dépôt illisible, quota) ;
  `src/app/MyLevelsPage.test.tsx` › « page « Mes niveaux » » (21 tests App :
  menu et accueil, sections vides et invites, `/import` redirige, ordre de
  récence des deux sections, état/auteur/première source en texte brut,
  suppression confirmée et annulée pour une création et un niveau reçu,
  import valide en tête sans quitter la page, réimport remis en tête, JSON
  invalide, fichier trop gros, atelier `toPlace` refusé, Dupliquer, Modifier,
  Jouer puis « Retour à l’atelier », Jouer désactivé sans objet à placer,
  Partager une création = boîte d’export vérifiée, Partager un reçu = lien
  qui redonne le document, Jouer un reçu sur `/my-levels/:id/play`,
  identifiant inconnu, création verrouillée, « Nouveau niveau ») ;
  `src/app/ReceivedLevelShareDialog.test.tsx` (2 tests : fichier tel quel,
  lien `/shared` sous le chemin de base) ; `e2e/my-levels.spec.ts` (mobile :
  menu, import d’un fichier, carte retrouvée, création de campagne listée,
  suppression confirmée au doigt, captures).
- Échec initial constaté : `receiveLevel` : `AssertionError: expected {
status: 'received', …(2) } to deeply equal { status: 'received', …(2) }`
  (2 échecs ; le cas « remise en tête impossible » passait déjà,
  non-régression). `duplicate-creation` : `Failed to load url
./duplicate-creation`, puis avec un bouchon `expected { status: 'error',
…(1) } to deeply equal { status: 'ok', …(1) }` (6 sur 6). Page : 21 sur 21,
  `Unable to find an accessible element with the role "region" and name "Mes
créations"`, `expected '/import' to be '/my-levels'`, `Sélecteur de fichier
introuvable.`. Le test du partage d’un reçu, écrit après le composant, a
  été vérifié rouge par mutation (`JSON.stringify` au lieu du codec).
- Tests existants réécrits ou retirés : `receive-level.test.ts` › « ne crée
  qu’une entrée pour le même document reçu deux fois, sans rien
  réinitialiser » attend désormais `receivedAt` rafraîchi au lieu de
  « aucune écriture » (décision du pilote ; `solved`, record, solution et
  `origin` toujours vérifiés intacts). Retirés avec le code remplacé
  (ADR 0015, `/import` disparaît) : `src/app/LevelImportPage.test.tsx`
  (3 tests), `src/application/drafts/import-level-draft.test.ts`,
  `e2e/import-level.spec.ts` ; leurs cas (JSON invalide, trop gros, fichier
  valide) sont repris par `MyLevelsPage.test.tsx` et `e2e/my-levels.spec.ts`.
- Fichiers touchés hors périmètre : `src/app/LevelExportDialog.tsx` et
  `SharedLevelPage.tsx` (téléchargement/presse-papiers et empreinte déplacés
  dans `browser-share.ts` et `fingerprint-of.ts` pour être partagés, sans
  changement de comportement) ; `creation-from-level.ts` (suffixe par
  `withTitleSuffix`, partagé avec « (copie) ») ; `EditorPage.tsx` (état de
  navigation `playPuzzle`) ; `styles.css` (cartes de « Mes niveaux », grille
  de l’accueil à 2 puis 4 colonnes pour la quatrième destination).
- Choix d’implémentation : « Jouer » d’une création ouvre `/editor?draft=<id>`
  avec l’état de navigation `{ playPuzzle: true }`, lu comme `unknown` et
  restreint à ce littéral : l’atelier s’ouvre directement sur « Jouer le
  puzzle » (U22), « Retour à l’atelier » ramène à l’atelier. Pas de nouvelle
  route : deux boutons menant au même atelier auraient été trompeurs. Le
  bouton est désactivé quand `puzzleFromWorkshop` refuse (aucun objet à
  placer). « Jouer » d’un reçu mène à `/my-levels/:id/play`, page provisoire
  minimale (lecture du dépôt, plateau joueur, aucune victoire enregistrée,
  pas d’attribution dans l’en-tête) que M10 complète. L’import d’un fichier
  non gardé (quota, stockage, empreinte indisponible) affiche une alerte ;
  il n’y a pas de route pour jouer un niveau non gardé. Entrées illisibles :
  écartées de la liste avec une note discrète (le dépôt les a sauvegardées).
  Le tri par date garde l’ordre de l’index à égalité. Un commit unique
  (correctif `receiveLevel` et page), une seule gate.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai téléphone ; le refus `crypto.subtle` sur l’import
  (même chemin que `/shared`, non retesté ici) ; la boîte d’export lance ses
  deux simulations de vérification au clic sur « Partager », comme dans
  l’atelier.
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/my-levels/my-levels-empty-{390x844,844x390,1440x900}.png`
  (titres de section blancs, bouton d’action à droite, invites en texte
  atténué), `my-levels-filled-{…}.png` (cartes crème sans pastille de
  numéro, Modifier/Jouer en pleine largeur, actions secondaires sur deux
  colonnes, cibles ≥ 44 px ; une carte par ligne en 390, grille en 1440),
  `my-levels-delete-390x844.png` (boîte de confirmation, « Annuler » à
  gauche) et `test-results/home/accueil-{390x844,844x390,1440x900}.png`
  (quatre destinations : une colonne, 2 × 2, puis une rangée). Questions :
  le sous-titre d’en-tête « Ta collection » convient-il ? Faut-il afficher
  la date de modification ou de réception sur les cartes ?

### M10 — Jouer un niveau reçu — fait — commit de cette entrée

- Précisions du pilote appliquées : cas d’usage pur dans
  `src/application/received/`, appelé par `/my-levels/:id/play` et
  `/shared` ; une erreur de stockage n’interrompt jamais la partie ; résultat
  ✅ seul (U24), sans « Remixer » (M11) ; correctif « Jouer quand même »
  pour un import non gardé ; auteur et première source dans l’en-tête des
  deux pages.
- Tests ajoutés : `src/application/received/record-received-victory.test.ts`
  › « victoire sur un niveau reçu (M10, …) » (6 tests) : entrée résolue avec
  le nombre d’objets et la solution du lancement ; seconde victoire avec
  plus d’objets : record gardé, solution remplacée ; record abaissé par une
  victoire avec moins d’objets ; document, origine et date intacts ; entrée
  absente sans écriture ; erreurs de lecture et d’écriture en résultats.
  `src/app/ReceivedLevelPlay.test.tsx` › « jouer un niveau reçu (M10, …) »
  (8 tests App) : auteur et première source dans l’en-tête en texte brut
  (`<i>`, `<b>` littéraux) ; victoire sur `/my-levels/:id/play` qui met
  l’entrée à jour, n’affiche que le palier « Résolu » et ne sollicite pas la
  progression ; échec qui ne change rien ; dépôt en erreur à la victoire,
  partie qui continue ; victoire d’un lien `/shared` gardé enregistrée, avec
  l’attribution ; lien non gardé : aucune écriture, victoire comprise ;
  import non gardé (quota) : « Jouer quand même », plateau, statut discret,
  aucune écriture même à la victoire, retour à la liste ; import sans
  `crypto.subtle` : « Jouer quand même » et `localStorage` vide.
  `e2e/received-play.spec.ts` (mobile, 2 parcours) : importer, jouer, gagner,
  « Résolu » sur la carte ; import avec `setItem` qui lève
  `QuotaExceededError` puis « Jouer quand même » ; captures.
- Échec initial constaté : `record-received-victory` : `Failed to load url
./record-received-victory … Does the file exist?`, puis avec un bouchon
  `AssertionError: expected { status: 'stub' } to deeply equal { status:
'recorded', level: { …(7) } }` (6 sur 6). App : `Unable to find an element
with the text: par <i>Lili</i> · d’après <b>La chute</b> (par Max)`,
  `expected { id: 'recu-aaaaaaaaaaaaaaaa', …(4) } to deeply equal { …(6) }`,
  `expected [] to have a length of 1 but got +0`,
  `toHaveAttribute("data-level-tier", "resolved")`, `Unable to find an
accessible element with the role "button" and name "Jouer quand même"`
  (7 sur 8 ; « ne change rien à l’entrée après un échec » passait déjà,
  non-régression).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `src/ui/AppHeader.tsx`,
  `src/ui/AppFrame.tsx` (prop `attribution`, à la place du sous-titre : l’en-tête
  de 56 px n’a pas la place d’une troisième ligne) ; `src/app/BoardShell.tsx`
  (prop `attribution`, `exit.shortLabel` pour que le bouton d’en-tête dise
  « Mes niveaux » et non « Atelier ») ; `src/ui/styles.css`
  (`.level-attribution` sans capitales, pour ne pas déformer le pseudo ; en
  paysage téléphone, sur la ligne du titre, puisque `.level-mode` y est
  masqué ; `.my-levels-play-anyway`) ; `src/app/MyLevelsPage.tsx`
  (`Attribution` passe par `attributionParts`, partagé avec l’en-tête, rendu
  identique) ; `src/app/not-kept-notice.ts` (message partagé par `/shared` et
  l’import).
- Choix d’implémentation : `ReceivedLevelBoard` compose `BoardShell` pour les
  trois usages (entrée gardée, lien, import non gardé) ; il garde la
  tentative du lancement (comme `PlayLevelPage` garde son compte) et appelle
  `recordReceivedVictory` à la victoire si `entryId` n’est pas `null`. Le
  résultat réutilise `CampaignVictory` avec `hasChallenge: false`,
  `hint: null`, `onNextLevel: null`, soit le seul palier « Résolu ».
  « Jouer quand même » : rendu en place dans `MyLevelsPage` (état local), sans
  nouvelle route ni état de navigation. Un document dans `history.state`
  serait relu après un rechargement et devrait être revalidé comme donnée non
  fiable ; il n’apporterait rien à une partie éphémère, que le rechargement
  doit au contraire oublier. Même précédent que « Jouer le puzzle » de
  l’atelier (U22), qui joue en place avec une sortie `exit`. La sortie
  « Retour à Mes niveaux » revient à la liste. Sur `/my-levels/:id/play`,
  la même sortie remplace « Retour aux niveaux » (qui menait à `/levels`)
  dans l’en-tête et le bandeau d’échec. Une erreur à l’écriture d’une
  victoire est ignorée, sans message (aucune décision ne le demande).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune. Le correctif « Jouer quand même »
  aligne l’import sur l’ADR 0015 (« un échec de stockage n’empêche jamais de
  jouer »), que M9 ne respectait pas.
- Non vérifié : un vrai téléphone ; un vrai déploiement HTTP sans
  `crypto.subtle` (simulé) ; le rechargement de la page pendant une partie
  « Jouer quand même » (revient à la liste, le document est perdu, par
  construction).
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/received-play/received-header-{390x844,844x390,1440x900}.png`
  (attribution en gris clair sous le titre, sans capitales ; sur la ligne du
  titre en paysage ; en 390 px tronquée en « par Lili · d’a… »),
  `received-victory-{…}.png` (boîte « Bravo ! » avec le seul palier
  « Résolu », « Résolu sans poser d’objet. », Recommencer, pas de niveau
  suivant), `import-not-kept-{…}.png` (alerte puis bouton vert « Jouer quand
  même » sous elle, aligné à gauche) et `import-not-kept-play-{…}.png`
  (plateau, statut discret, attribution). Questions : en 390 px, faut-il
  retirer le bouton d’en-tête « Mes niveaux » de `/my-levels/:id/play` (le
  menu y mène déjà) pour laisser plus de place au titre et à l’auteur ?
  Faut-il un message discret quand une victoire n’a pas pu être gardée ?

### M11 — Modifier et Remixer — fait — commit de cette entrée

- Précisions du pilote appliquées : « Remixer » pose la tentative gagnante
  (instantané du lancement, celui qui enregistre la victoire) ; révélation
  d’office sous `import.meta.env.DEV` pour une création de campagne **neuve**
  seulement, par la commande M7, drapeau injecté (`App` prop
  `developmentMode`, comme `unlockAllLevels`) ; verrou recalculé depuis la
  progression, URL directe refusée sans ouvrir l’atelier ni écrire ; statut
  discret « Ta victoire n’a pas pu être enregistrée sur cet appareil. »
  (dette M10 retirée d’`etat.md`) ; en-tête tronqué en 390 px laissé tel quel.
- Tests ajoutés : `src/application/drafts/save-creation-from-level.test.ts`
  (4 tests : `creation-<aléa>` avec la solution du joueur posée, sans
  solution aucun objet à placer, nouvel aléa si l’identifiant est pris,
  erreurs du dépôt en résultats) ; `campaign-draft.test.ts` › « pose la
  solution de l’auteur dans une nouvelle création quand elle est révélée
  d’office (M11…) » (objets et fils égaux à `workshopFromPuzzle` du niveau
  2), « rouvre telle quelle une création existante, même révélée d’office
  (M11) » ; `src/ui/CampaignVictoryDialog.test.tsx` › « propose « Remixer »
  quand la victoire peut être remixée (M11) », « n’offre pas « Remixer » sans
  remix possible, et dit pourquoi un remix a échoué (M11) » ;
  `src/app/EditAndRemix.test.tsx` (10 tests App : Modifier un reçu non résolu
  sans objet à placer ; résolu, solution du joueur posée ; Remixer après une
  victoire reçue pose la poutre placée, niveau reçu inchangé ; victoire non
  enregistrée → statut discret ; hors développement, création du niveau 2
  déverrouillé sans solution ni fiche ; en développement, création neuve
  révélée avec la fiche ; création existante rouverte sans révélation ;
  « Modifier le niveau 2 » désactivé quand verrouillé ; URL directe d’une
  création enregistrée d’un niveau verrouillé : « Ce niveau est encore
  verrouillé. », lien `/levels`, pas de plateau, `localStorage` identique ;
  ouverte sous `unlockAllLevels`) ; `src/app/CampaignRemix.test.tsx` (Remixer
  après une victoire de campagne : création `creation-<aléa>` avec la poutre
  posée, victoire comptée — aucune esquisse de campagne ne gagne, vérifié
  headless, le niveau 1 est donc remplacé par `vi.mock` du module de
  contenu) ; `e2e/remix.spec.ts` (mobile : importer, jouer, poser, gagner,
  remixer, glisser la poutre au doigt, exporter un puzzle vérifié dont la
  solution porte la nouvelle position ; liste avec niveau verrouillé et URL
  directe refusée ; captures).
- Échec initial constaté : `Failed to load url ./save-creation-from-level`
  et `AssertionError: expected [ { id: 'ball-red', …(4) }, …(7) ] to deeply
equal [ { id: 'ball-red', …(4) }, …(9) ]` (révélation) ; App : `Unable to
find an accessible element with the role "button" and name "Modifier"`,
  `… name "Remixer"`, `… name "Modifier le niveau 2"`, `Unable to find an
element with the text: Ce niveau est encore verrouillé.`, `… Ta victoire
n’a pas pu être enregistrée sur cet appareil.` (10 sur 10, et 1 sur 1 pour
  la campagne) ; dialogue : `… name "Remixer"`, `Unable to find role="alert"`.
  « rouvre telle quelle une création existante… » passait déjà
  (non-régression). Les fixtures App ont d’abord échoué faute de zone de
  construction (« choisissez une position dans la zone de construction »),
  corrigé dans le test.
- Tests existants réécrits (comportement remplacé par l’ADR 0015) :
  `CampaignDraftEditing.test.tsx` — « Éditer le niveau N » devient
  « Modifier le niveau N » ; le niveau 2 n’est modifiable que niveau 1 résolu,
  d’où une progression injectée ; « ouvre depuis la liste un brouillon
  distinct… » rend l’App avec `developmentMode` pour garder ses assertions
  sur la fiche de calibrage. `MyLevelsPage.test.tsx` › « joue un niveau reçu
  sur `/my-levels/:id/play` » attendait l’absence de « Modifier » (M9) ; il
  attend désormais le bouton. `e2e/campaign-draft.spec.ts` : progression
  semée (niveau 1 résolu), « Modifier le niveau 2 », et la fiche de calibrage,
  absente d’un build de production, est vérifiée absente au lieu d’être
  fermée. `e2e/my-levels.spec.ts` : libellé « Modifier le niveau 1 ».
- Fichiers touchés hors périmètre : `src/application/drafts/duplicate-creation.ts`
  (boucle d’identifiant extraite dans `free-creation-id.ts`, deuxième usage ;
  6 tests inchangés verts) ;
  `src/app/LockedLevelPage.tsx` (écran verrouillé extrait de
  `PlayLevelPage`, deuxième usage) ; `src/app/random-id-part.ts` (aléa
  extrait de `MyLevelsPage`, partagé avec `useRemix`) ; `src/app/App.tsx`,
  `main.tsx`, `development-mode-context.ts` (drapeau) ; `src/app/not-kept-notice.ts` ;
  `e2e/puzzle-machine.ts` (export `machinePuzzle`, la fixture U22 que le
  joueur gagne en posant la poutre). Lecture de `BoardShell.tsx`,
  `local-storage-progress-repository.ts`, `embedded-levels.ts`,
  `ObjectDrawer.tsx`, `styles.css` (victoire), des E2E existants et de
  `puzzle-workshop.ts` : raisons des fixtures, du mock et des captures.
- Choix d’implémentation : `saveCreationFromLevel` (application) sert à
  Modifier un reçu et aux deux Remixer ; chaque clic crée une nouvelle
  création. `PlayLevelPage` délègue le plateau à `CampaignLevelBoard`, qui
  garde la tentative du lancement (et non plus son seul compte d’objets),
  comme `ReceivedLevelBoard`. `openCampaignDraft(…, { revealSolution })`
  applique `revealAuthorSolution` à la création neuve avant de
  l’enregistrer ; la vérification du verrou dans l’éditeur précède toute
  lecture du dépôt (une lecture peut réécrire une enveloppe v1, M4b).
  « Remixer » reste proposé pour un niveau reçu non gardé (lien ou import) :
  la création ne dépend pas de l’entrée reçue.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai téléphone ; la victoire d’un vrai niveau de campagne
  (aucune esquisse ne gagne, le test App remplace le niveau 1) ; sous
  `pnpm dev` en vrai navigateur (le drapeau est testé par injection). La
  première gate a échoué une fois sur l’intermittence D4 de `layout.spec.ts`
  (atelier libre, non touché ; 210/210 en 10 répétitions isolées ; gate
  relancée verte), notée dans `etat.md`.
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/remix/levels-locked-{390x844,844x390,1440x900}.png`
  (« Modifier le niveau 2 » grisé sous « Lancer » grisé, pastille
  « Verrouillé »), `remix-victory-{…}.png` (« Remixer » en bouton neutre sous
  « Recommencer », côte à côte en paysage), `remix-workshop-{…}.png` (atelier
  ouvert, poutre posée « à placer » en pointillés violets, catalogue auteur),
  `locked-draft-{…}.png` (même écran que le niveau verrouillé joué : « Ce
  niveau est encore verrouillé. », « Liste des niveaux »), et
  `test-results/my-levels/my-levels-filled-390x844.png` (carte reçue :
  Jouer, puis Modifier/Partager, puis Supprimer). Questions : une création
  `creation-<aléa>` remixée d’un niveau de campagne doit-elle être
  verrouillée si la progression est réinitialisée (l’ADR ne verrouille que
  `<id>-brouillon`) ? L’icône `Shuffle` convient-elle à « Remixer » ?

### M12 — Révéler dans l’atelier (interface) — fait — commit de cette entrée

- Précisions du pilote appliquées : entrée dans un menu existant, ici le menu
  d’en-tête — l’atelier n’a pas d’autre menu (seuls existent la barre
  d’actions et les boutons d’en-tête, où l’ADR 0015 ne veut pas la commande
  « en évidence ») ; elle y est listée en premier, au-dessus des
  destinations. Ajout par l’historique de l’atelier (une entrée, annulée par
  « Annuler »), création enregistrée par l’autosauvegarde existante ; fils
  ignorés dits par le statut discret existant (`role="status"`, même
  composant que M8) ; entrée absente sans `source`, sans solution et en
  « Essayer en joueur ».
- Tests ajoutés : `src/app/RevealAuthorSolution.test.tsx` (8 tests App) ›
  « n’offre pas l’entrée dans l’atelier libre, créé de zéro », « … pour une
  création sans source », « … quand la source n’a pas de solution », « pose la
  solution « à placer » après confirmation, et l’enregistre » (fils au
  `data-wires` du canevas, poutre et bouton `toPlace` dans la création
  enregistrée, `source` intacte, aucun statut), « « Annuler » dans la boîte de
  confirmation ne change rien » (« Annuler » ciblé à l’ouverture, historique
  vide), « s’annule d’un seul « Annuler » de l’historique », « dit
  discrètement combien de fils ont été ignorés » (ventilateur du décor
  supprimé), « n’offre pas l’entrée en jouant le puzzle » ;
  `e2e/reveal.spec.ts` (mobile, au toucher : menu, cible ≥ 44 px, menu
  contenu dans un écran 844 × 390 et défilant, confirmation, statut « 1 fil
  … », annulation ; captures).
- Échec initial constaté : `Unable to find an accessible element with the
role "button" and name "Révéler la solution de l’auteur"` (5 tests sur 8).
  Les trois tests d’absence passaient d’emblée (garde-fous de non-régression ;
  le jeu en « Essayer en joueur » échouait, lui, faute d’entrée à révéler
  avant). Une attente du test était fausse (`auteur-bouton>decor-fan`) :
  `restoreSolution` nomme la pose d’après l’entrée d’inventaire
  (`buttons-2`), comme `workshopFromPuzzle` ; l’attente a été corrigée, pas
  le code. Mutation : sans le statut, « dit discrètement… » échoue. E2E : sans
  la règle CSS, `Expected: <= 390, Received: 436` (bas du menu en paysage).
- Tests existants réécrits : aucun.
- Fichiers touchés hors périmètre : `src/ui/AppHeader.tsx` et
  `src/ui/AppFrame.tsx` (prop `menuActions` : commandes propres à l’écran,
  qui ferment le menu) ; `src/ui/styles.css` (`.level-menu` borné à la
  hauteur de l’écran et défilant : avec une septième entrée, « Paramètres »
  sortait d’un téléphone en paysage). Lecture d’`e2e/remix.spec.ts`,
  `e2e/puzzle-machine.ts`, `SimulationControls.tsx`, `use-editor-session.ts`,
  `editor-session.ts`, `history.ts`, `BoardView.tsx`, `Button.tsx`,
  `EditAndRemix.test.tsx`, `level-regression.test.ts` et
  `authoring-commands.test.ts` : fixtures, libellés, modèle de capture et
  idiome du champ retiré.
- Choix d’implémentation : `BoardShell` reçoit `authorSource` et n’offre
  l’entrée qu’en mode création, en phase de construction, si la source a une
  solution ; à la confirmation, il annule fil et placement en cours, lit
  `ignoredWireCount` sur l’état courant puis exécute la commande par
  `executeCommand`. Le statut des fils ignorés reste jusqu’à ce qu’on le
  masque (il n’est pas retiré par « Annuler »). Texte de la boîte : « La
  solution de l’auteur sera posée sur le plateau, en objets à placer, à côté
  de ce qui s’y trouve déjà. « Annuler » dans l’atelier la retire. »
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : l’ADR 0015 dit « la boîte de résultat dit
  combien de fils ont été ignorés » ; la précision du pilote demande un
  message discret `role="status"`. Appliqué tel que le pilote le précise (pas
  de seconde boîte) ; l’ADR pourrait dire « un message ».
- Non vérifié : un vrai téléphone ; le défilement du menu au doigt (vérifié
  par la hauteur et `overflow-y: auto`, pas par un geste).
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/reveal/reveal-menu-{390x844,844x390,1440x900}.png` (entrée
  avec l’icône œil en tête du menu ; en paysage, le menu s’arrête au bas de
  l’écran et défile), `reveal-confirm-{…}.png` (boîte « Révéler la solution
  de l’auteur », « Annuler » puis « Révéler la solution » en vert, côte à
  côte en portrait et en grand format, empilés en paysage),
  `reveal-workshop-{…}.png` (poutre et bouton en pointillés violets, fil
  levier → convoyeur posé, statut « 1 fil de la solution de l’auteur n’a pas
  pu être posé. » au-dessus du plateau). Questions : l’entrée doit-elle être
  séparée visuellement des destinations du menu ? Le bouton de confirmation
  en vert (`go`) convient-il, ou le veut-on neutre ?

### M13 — Atelier libre enregistré — fait — commit de cette entrée

- Précisions du pilote appliquées : aléa par le point de composition existant
  `randomIdPart` (comme `useRemix` et `MyLevelsPage`), horloge par celle du
  dépôt de brouillons (déjà injectée) ; URL remplacée (`replace: true`) ;
  l’atelier reste monté sous la nouvelle URL ; échec de la première écriture :
  pas de changement d’URL, nouvel essai à la modification suivante, aucun
  message (dette notée dans `etat.md`) ; `decideDraftAutosave` laissé tel quel.
- Tests ajoutés : `src/application/drafts/save-free-creation.test.ts` (5 tests :
  `creation-<aléa>` sans source, identifiant de l’atelier remplacé ; nouvel
  aléa si pris ; dépôt illisible ; quota ; enregistrements suivants sous le
  même identifiant) ; `src/app/FreeWorkshopSaving.test.tsx` (9 tests App :
  ouvrir sans rien faire ne crée rien ; poser un objet crée la création et
  change l’URL, date de l’horloge injectée ; l’historique du navigateur ne
  gagne pas d’entrée ; recharger retrouve l’objet ; « Annuler » retire
  encore l’objet après le changement d’URL (pas de remontage) ; modifications
  suivantes dans la même création ; « Atelier de construction » depuis une
  création ouvre un atelier neuf sans modifier la création ; échec
  d’enregistrement sans changement d’URL puis reprise ; stockage indisponible) ;
  `e2e/free-workshop.spec.ts` (mobile : `/editor`, rien écrit, pose d’une
  poutre au toucher, URL `?draft=creation-…`, longueur d’historique inchangée,
  « Annuler » actif, rechargement).
- Échec initial constaté : `Failed to load url ./save-free-creation` (5 tests) ;
  App : `Aucune création dans l’URL.` (6 tests sur 9) et `expected '' to be
'placement-1'` au rechargement ; les deux cas « sans rien faire » et
  « stockage indisponible » passaient d’emblée (garde-fous de non-régression).
  Un test de date a échoué ensuite (`expected '2026-10-01T18:25…' to be
'2026-10-01T12:00:00.000Z'`) : le test n’injectait pas le dépôt, corrigé dans
  le test. Mutations vérifiées : `replace: false` fait échouer le test de
  l’historique du navigateur ; une clé de montage suivant l’URL fait échouer
  « Annuler » après le changement d’URL.
- Tests existants réécrits : aucun (les parcours de l’atelier libre existants,
  dont U6, passent inchangés).
- Fichiers touchés hors périmètre : `docs/decisions/0015-mes-niveaux.md`
  (§ Atelier libre : une phrase sur l’échec de la première écriture, décision
  du pilote).
- Choix d’implémentation : `EditorPage` garde une « session libre »
  (`generation`, création adoptée et clé de la localisation de départ du
  routeur). Tant que l’URL est celle de la création adoptée — ou la
  localisation de départ, que `navigate` n’a pas encore atteinte au rendu
  suivant l’adoption —, le même `FreeEditor` reste monté (même type, même
  clé) ; toute autre navigation, y compris `/editor` nu depuis le menu, clôt la
  session et le prochain atelier libre est neuf. Le document de l’atelier
  (`free-workshop`) est enregistré sous l’identifiant de la création, comme
  `duplicateCreation`. `decideDraftAutosave` : non branché, chaque état engagé
  est déjà enregistré, et une limite d’une écriture par seconde sans
  enregistrement final perdrait la dernière modification.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai téléphone ; le comportement du bouton « retour » du
  navigateur dans un vrai navigateur (seule la longueur d’historique est
  vérifiée) ; « Remettre l’atelier à zéro » après adoption enregistre
  l’atelier vide sous la même création (non testé séparément).
- Pour l'auteur : aucune modification visuelle, pas de captures.

### M14 — Partager : titre, pseudo, licence — fait — commit de cette entrée

- Précisions du pilote appliquées : titre et pseudo par commandes d’auteur
  annulables (`updateLevelTitle`, nouvelle `updateLevelAuthor`), passées par
  l’historique de l’atelier et enregistrées dans la création ; espaces de
  bord retirés à la saisie, champ vide = `author` retiré ; pseudo retenu
  préremplissant seulement une création sans `author` ; erreur des
  préférences sans effet sur l’export ; mention de licence au texte exact de
  l’ADR 0016 ; « Partager » d’une création de « Mes niveaux » couvert, celui
  d’un niveau reçu inchangé ; `/settings` non touché.
- Tests ajoutés : `src/infrastructure/storage/local-storage-preferences-repository.test.ts`
  (12 tests : vide sans écriture, aller-retour en enveloppe, pseudo oublié,
  JSON invalide sauvegardé avec avertissement, quatre valeurs invalides
  — enveloppe, version, pseudo, champ inconnu — sauvegardées avant
  remplacement, secours impossible, lecture en erreur, quota, pseudo invalide
  refusé sans écriture) ; `authoring-commands.test.ts` › « renseigne le
  pseudo (M14) » et « retire le pseudo (M14) » (annulables, refusés au
  joueur), « pseudo de l’auteur (M14…) » (3 tests : reste des métadonnées
  intact, pseudo invalide refusé, rien d’enregistré sans changement) ;
  `LevelExportDialog.test.tsx` › « titre, pseudo et licence dans la boîte
  d’export (M14, ADR 0016) » (8 tests : champ, aide et licence ; pseudo
  rogné dans le fichier et le lien ; pseudo invalide refusé avec message ;
  `author` du niveau prioritaire et champ vidé qui le retire ; préremplissage
  et pseudo retenu ; export malgré des préférences en erreur ou qui lèvent ;
  commandes transmises à l’export) ; `src/app/ShareAttribution.test.tsx`
  (4 tests App : atelier → création enregistrée puis deux « Annuler » ;
  préremplissage après rechargement dans une autre création ; « Partager »
  de « Mes niveaux » → fichier, création avec `source` et `basedOn`
  conservés, préférences ; niveau reçu sans champs) ;
  `e2e/share-attribution.spec.ts` (mobile, au toucher : champs, licence,
  clavier simulé, pseudo U+2028 refusé, téléchargement, rechargement,
  enveloppe `tinkerbolt:preferences` ; captures).
- Échec initial constaté : préférences, avec un bouchon : `AssertionError:
expected { status: 'error', …(1) } to deeply equal { status: 'ok',
preferences: {} }` (10 sur 12 ; les deux cas d’erreur de stockage
  passaient sur le bouchon). Commande : `TypeError: (0 , updateLevelAuthor)
is not a function`. Boîte et App : `Unable to find an accessible element
with the role "textbox" and name "Pseudo (facultatif)"` (8 sur 8 et 3 sur
  4 ; le test du niveau reçu passait d’emblée, non-régression). Ensuite,
  avant le câblage : `expected { title: 'Machine' } to deeply equal { title:
'Grand saut', author: 'Lili' }`. E2E : `Expected pattern:
/interactive-widget=resizes-content/u` (méta absente). Un test App
  attendait la date de l’horloge du test alors que l’App utilise la
  sienne : attente corrigée dans le test, pas le code. Mutation : sans
  `onApplyAttribution` dans `BoardShell`, le test de l’atelier échoue.
- Tests existants réécrits : aucun (`renderDialog` de
  `LevelExportDialog.test.tsx` enveloppe désormais la boîte dans
  `PreferencesRepositoryContext`, sans changer les tests U16/U22).
- Fichiers touchés hors périmètre : `index.html` (méta viewport
  `interactive-widget=resizes-content` : sans elle, Chrome Android
  recouvre la boîte avec le clavier au lieu de réduire la fenêtre) ;
  `src/domain/level-document.ts` (`authorSchema` exporté, règle inchangée,
  pour les préférences et le message du pseudo) ; `src/ui/styles.css`
  (`.export-field-error` et bordure `aria-invalid`, jetons existants) ;
  `docs/cahier-des-charges.md` (tableau « Avancement », règle du pilote).
  Lecture de `e2e/export.spec.ts`, `e2e/puzzle-machine.ts`,
  `e2e/reveal.spec.ts`, `MyLevelsPage.test.tsx`,
  `FreeWorkshopSaving.test.tsx`, `editor-session.ts`, `use-editor-session.ts`,
  `history.ts`, `Dialog.tsx`, `browser-share.ts` : fixtures, modèle de
  capture, contrat des commandes et de la boîte.
- Choix d’implémentation : les commandes sont appliquées **à l’export**
  (« Télécharger le fichier » ou « Copier le lien de partage »), pas à
  chaque frappe ni à la sortie du champ : un seul geste au doigt, aucune
  entrée d’historique par lettre, ce qui est enregistré est exactement ce
  qui est parti ; fermer la boîte sans exporter ne change rien. L’export
  lui-même reflète toujours les champs (`nameExportedLevel` reçoit le
  pseudo, sans revérifier le puzzle). L’identifiant de la création ne
  change pas, seul le puzzle exporté prend l’identifiant tiré du nom
  (U16). Deux commandes, donc au plus deux entrées d’historique (titre puis
  pseudo), chacune absente si la valeur ne change pas. La boîte reçoit
  `onApplyAttribution(commandes)` : l’atelier les exécute par
  `executeCommand` ; « Mes niveaux » les applique à une tentative de la
  création puis l’enregistre avec sa `source` (alerte de stockage existante
  en cas d’échec). Préférences : lues une fois à l’ouverture, écrites à
  chaque export (`{}` quand le champ est vide), toute erreur ou exception
  ignorée. `maxLength` 40 sur le champ, comme le titre (160) ; le refus
  reste atteignable par une tabulation, un caractère de contrôle ou
  U+2028 collés. Clavier : la boîte tient en 390 × 508 (844 moins un
  clavier de 336 px) avec champ et boutons visibles, vérifié par l’E2E
  après réduction de la fenêtre, ce que la méta `resizes-content` produit
  sur Android ; iOS ne réduit pas la fenêtre mais fait défiler jusqu’au
  champ.
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune. Constaté : `updateLevelDescription`
  avec `undefined` perd `author` et `basedOn` (dette notée dans `etat.md`,
  non corrigée : hors périmètre, commande non exposée).
- Non vérifié : un vrai téléphone et son clavier (Android et iOS) ; l’effet
  de `resizes-content` sur les autres écrans (seule la boîte d’export a des
  champs de saisie) ; un export pendant une simulation (dette notée).
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/share/share-fields-{390x844,844x390,1440x900}.png` (nom,
  pseudo, aide atténuée, mention de licence, boutons ; en 844 × 390 la boîte
  défile comme avant), `share-invalid-pseudo-{…}.png` (message rouge sous
  l’aide, boutons grisés ; la bordure rouge n’apparaît qu’hors focus, le
  champ focalisé garde l’anneau de focus) et `share-keyboard-390x508.png`
  (boîte entière au-dessus du clavier simulé). Questions : le texte de la
  boîte mélange « vous » (U16) et « tu » (licence, aide) — faut-il
  harmoniser ? Un champ vidé fait oublier le pseudo retenu : est-ce le
  comportement voulu ?

### M14b — Description du niveau — fait — commit de cette entrée

- Déroulé : deux étapes, un commit. Étape A (code, sous-agent Sonnet) :
  correctif de `updateLevelDescription` et atelier libre sans description.
  Étape B (interface et clôture, sous-agent Opus) : champ de la boîte
  d’export, cartes des niveaux reçus, E2E, captures, documents.
- Tests ajoutés (étape A) : `authoring-commands.test.ts` › « description de
  l’auteur (M14b, ADR 0016) » (retrait qui garde titre, `author` et
  `basedOn` ; annulable ; refusée au joueur ; `unchanged` si identique ;
  aucun rognage ; refus au-delà de 2000 caractères) ;
  `level-document.test.ts` › « description d’un niveau (M14b) » ;
  `level-file-codec.test.ts` (aller-retour avec et sans description) ;
  `embedded-levels.test.ts` › « atelier libre embarqué (M14b) » ;
  `save-free-creation.test.ts` ; `FreeWorkshopSaving.test.tsx` › « une
  création partie de zéro n’a pas de description (M14b) » ;
  `duplicate-creation.test.ts`, `campaign-draft.test.ts`,
  `creation-from-level.test.ts` (la description est conservée).
- Tests ajoutés (étape B) : `LevelExportDialog.test.tsx` › « description
  dans la boîte d’export (M14b, ADR 0016) » (7 tests : zone de texte
  préremplie, `maxlength` 2000 ; saisie rognée dans le fichier et le lien ;
  champ vidé = clé `description` absente, titre, pseudo et sources gardés ;
  2000 caractères acceptés ; commande transmise qui pose la description ;
  commande qui la retire quand le champ est vidé ; rien d’inchangé ne
  modifie la création — trois commandes, aucune ne change l’état) ;
  `ShareAttribution.test.tsx` › « enregistre dans la création, depuis
  l’atelier, la description exportée, annulable (M14b) » (un seul
  « Annuler » la retire, puis l’historique est vide), « enregistre la
  description depuis « Partager » d’une création de « Mes niveaux »
  (M14b) » (préremplie avec celle du remix, `source` et `basedOn`
  conservés), et le test du niveau reçu vérifie aussi l’absence du champ ;
  `MyLevelsPage.test.tsx` › « montre la description d’un niveau reçu en
  texte brut, et rien sans description (M14b) » (`<b>x</b>` littéral) ;
  `e2e/share-attribution.spec.ts` › « saisit une description au toucher et
  la retrouve dans le fichier (M14b) » (clavier simulé 390 × 508 :
  description et « Télécharger le fichier » visibles sans défilement) ;
  `e2e/my-levels.spec.ts` (description de la carte du niveau reçu, captures).
- Échec initial constaté : étape A, `expected { title: 'Authoring test' } to
deeply equal { title: 'Authoring test', …(2) }` (`author` et `basedOn`
  perdus) et, pour l’atelier libre, `expected { title: 'Atelier de niveau',
…(1) } to deeply equal { title: 'Atelier de niveau' }` (3 tests) ; les
  autres tests A étaient des gardes de non-régression verts d’emblée.
  Étape B : `Unable to find an accessible element with the role "textbox"
and name "Description (facultatif)"` (6 tests de la boîte, 2 sur 2 App),
  `expected [ …(2) ] to have a length of 3 but got 2` (septième test de la
  boîte, revérifié par mutation sans la troisième commande) et `Unable to find an element with the text: Pousse
<b>x</b> dans le panier.` pour la carte.
- Tests existants réécrits : aucun (étapes A et B).
- Fichiers touchés hors périmètre : aucun. `MyLevelsPage.tsx` : l’alerte
  d’échec d’enregistrement après « Partager » dit désormais « Le titre, la
  description et le pseudo n’ont pas été enregistrés. » (texte non testé,
  comme avant).
- Choix d’implémentation : même modèle que M14. La saisie brute reste dans
  le champ ; `nameExportedLevel` reçoit la description en quatrième
  argument et applique la même règle que le pseudo (rognée, retirée si
  vide) ; `recordAttribution` transmet trois commandes (titre, pseudo,
  description) à chaque export. Une commande dont la valeur ne change pas
  est acceptée sans changer l’état : l’historique ne l’enregistre pas et
  « Mes niveaux » n’écrit rien. « Au plus trois entrées, chacune absente si
  la valeur ne change pas » est donc tenu par l’historique, comme pour M14,
  et non par un filtre de la boîte. `updateLevelDescription` ne rogne pas :
  c’est la boîte qui convertit un champ vide en `undefined`. Champ placé
  entre le nom et le pseudo (titre et description vont ensemble ; l’aide du
  pseudo reste collée à la mention de licence), zone de texte de 3 lignes
  qui réutilise `export-link-field export-name-field` : aucune règle CSS
  ajoutée, pas d’aide sous le champ (le libellé suffit, et la boîte tient
  ainsi au-dessus du clavier). Carte reçue : `<p
className="level-card-description">` après l’état, comme `/levels` (même
  classe, pas de troncature, ni là ni ici) ; le badge « Esquisse non
  calibrée. » de `/levels` n’est pas repris : il signale une esquisse de la
  campagne, pas le texte d’un autre auteur. Cartes de « Mes créations » :
  pas de description (elles n’affichent aujourd’hui ni état ni attribution ;
  l’ajouter n’était pas trivialement cohérent).
- Écarts avec la tâche : aucun.
- Contradictions rencontrées : aucune.
- Non vérifié : un vrai téléphone et son clavier ; le comportement d’une
  description multiligne sur la carte (les sauts de ligne sont rendus comme
  des espaces, comme sur `/levels`) ; l’export pendant une simulation
  (dette étendue à la description dans `etat.md`).
- Pour l'auteur : validation visuelle — captures inspectées
  `test-results/share/share-description-{390x844,844x390,1440x900}.png`
  (champ « Description (facultatif) » de trois lignes entre le nom et le
  pseudo, bordure orange de focus ; le texte saisi par le test commence par
  deux espaces, visibles dans le champ et rognés à l’export ; en 390 × 844
  la boîte entière tient, boutons compris ; en 844 × 390 elle défile, la
  mention de licence est coupée en bas comme avant ; en 1440 × 900 boîte
  centrée, tout visible),
  `share-description-keyboard-390x508.png` (clavier simulé : nom,
  description, pseudo, aide, licence et « Télécharger le fichier » visibles,
  « Copier le lien de partage » à moitié sous le bord, atteignable en
  faisant défiler la boîte), `share-keyboard-390x508.png` (capture M14
  régénérée : même cadrage, la description vide en plus) et
  `test-results/my-levels/my-levels-received-description-{390x844,844x390,1440x900}.png`
  (carte « Démonstration » : état « Pas encore résolu », puis la
  description en gris atténué sur deux lignes, puis les actions ; une carte
  en pleine largeur en 390, une carte de grille en 844 et 1440). Les
  captures `share-fields-*` de M14 montrent désormais le champ de
  description vide. Questions : tutoiement — la boîte mélange toujours
  « vous » (texte U16 « Envoyez le fichier… », statuts « sélectionnez »,
  « téléchargez ») et « tu » (licence, aide du pseudo) ; non tranché ici,
  le nouveau libellé n’emploie ni l’un ni l’autre. Faut-il une aide sous la
  description (par exemple « Ce que le joueur lira avant de jouer ») ?
  Faut-il afficher la description sur les cartes de « Mes créations » ? Note
  de gate : `tmp/check-levels.ts` (fichier d’essai de l’auteur, ignoré par
  git) fait échouer `pnpm lint` (« was not found by the project service ») ;
  il a été déplacé hors du dépôt pendant la gate puis remis à l’identique
  (SHA-256 vérifié avant et après). Les captures de `test-results/` sont
  effacées par toute exécution Playwright isolée (dossier de sortie vidé) :
  `pnpm check` les régénère toutes.

### M15 — Documentation de la phase — fait — commit de cette entrée

- Déroulé : une seule étape documentaire, sous-agent Sonnet (consigne du
  pilote ; pas d'interface, donc pas d'Opus). Aucun code modifié.
- Tests ajoutés : aucun (documentaire).
- Échec initial constaté : sans objet (pas de test).
- Tests existants réécrits : aucun.
- Fichiers touchés : `README.md` (licence CC BY 4.0 du contenu de niveau avec
  renvoi à l'ADR 0016, « Mes niveaux » avec renvoi à l'ADR 0015) ;
  `docs/etat.md` (réécrit pour la fin de phase) ;
  `docs/mobile-editor-interactions.md` (scénarios 21 et 22) ;
  `docs/cahier-des-charges.md` (tableau « Avancement » : la phase 1 passe de
  « en cours » à « faite », la ligne devenait fausse) ; `docs/index.md`
  (colonne « ~lignes » de `etat.md`, `feuille-de-route.md` et
  `mobile-editor-interactions.md`) ; ce fichier (point de reprise, journal).
  Ni `LICENSE`, ni `package.json`, ni le code.
- Ce qui a changé dans `etat.md` : les paragraphes M1 à M14b de « Réellement
  livré » sont regroupés par sujet (domaine, format et attribution ;
  stockage ; réception et « Mes niveaux » ; jouer, remixer et révéler ;
  partager), sans retirer de fait ni de chemin de capture « validation
  visuelle attendue ». Les dettes sont rangées par thème et chacune a été
  revérifiée dans le code : toutes restent vraies (aperçu de placement CSS,
  fond CSS, poutre étirée, `decideDraftAutosave` non branché, atelier libre
  sans message d'échec, partage pendant une simulation, en-tête de 390 px,
  `format:check` hors Markdown, avertissement peer `typescript-eslint`).
  Retirées ou corrigées parce que fausses ou périmées : la phrase « la gate
  complète n'a pas été lancée » de la section Licence (la gate est lancée à
  chaque tâche) ; « les niveaux partagés gardent le bandeau simple » (U4),
  faux depuis M10, qui leur donne la boîte « Bravo ! » à palier « Résolu » ;
  « à gauche de « Tester » » (U6), le bouton s'appelle « Lancer » (décision
  du 1er octobre 2026) ; « Seul l'ajout d'objet est exposé » (L25), le titre,
  la description et le pseudo le sont depuis M14 et M14b ; « aucun appelant
  ne crée encore de `source` » (M4) et « appelée par l'atelier depuis M12 »
  fusionnés dans les paragraphes concernés. Les lignes de gate M1 à M13 sont
  condensées en une ligne de synthèse (nombres de tests conservés) ; M14,
  M14b et les lignes plus anciennes sont inchangées.
- Écarts avec la tâche : « Mes niveaux » est décrit dans le README en trois
  phrases (niveaux reçus, créations, import, partage, remix) ; la phrase
  « La campagne contient actuellement douze niveaux jouables » du README était
  fausse (17 esquisses non calibrées embarquées, `etat.md`) : elle dit
  maintenant « dix-sept esquisses de niveaux, non calibrées ». À relire.
- Contradictions rencontrées (signalées, non arbitrées) :
  1. `mobile-editor-interactions.md` § Sélection et panneau
     contextuel (« Une confirmation modale n'est pas requise pour une action
     immédiatement annulable ») contre l'ADR 0015 § Révéler (« derrière une
     boîte de confirmation ») : « Révéler » est annulable et demande pourtant
     une confirmation. Le scénario 22 suit l'ADR et le code, et le dit.
  2. `mobile-editor-interactions.md` § États de session et scénario 20
     (échec d'autosauvegarde persistant, quitter demande confirmation)
     contre `etat.md` (l'atelier libre et les créations échouent en silence,
     dette M13) : le code ne fait pas ce que le scénario 20 exige. Non touché.
  3. Le même document emploie encore « tester » (scénario 14, phase de
     résultat) alors que le libellé est « Lancer » depuis le 1er octobre
     2026 (le document le dit lui-même § Lancer). Les scénarios 21 et 22
     emploient « Lancer ».
  4. Le même document dit que le tiroir de création « donne accès à la
     configuration de l'inventaire du futur joueur » ; `etat.md` note que
     l'atelier n'a pas d'édition d'inventaire (dette « Mode auteur
     incomplet »). Non touché.
  5. `docs/index.md` : la colonne « ~lignes » était périmée pour presque tous
     les fichiers (par exemple `etat.md` à 133 pour 845). Seules les lignes
     des trois fichiers de cette tâche ont été remises à jour.
- Non vérifié : les scénarios 21 et 22 ne sont pas rejoués ici ; ils suivent
  `e2e/remix.spec.ts`, `e2e/reveal.spec.ts`, `e2e/share-attribution.spec.ts`,
  `e2e/my-levels.spec.ts`, `e2e/received-play.spec.ts` et
  `e2e/shared.spec.ts` (lus en plus de la liste imposée : les libellés de
  « Jouer quand même », du statut « pas gardé » et de la boîte « Bravo ! »
  d'un niveau reçu y sont) et le code de `BoardShell.tsx`,
  `MyLevelsPage.tsx` et `ReceivedLevelShareDialog.tsx` (libellés exacts). Le
  scénario 21 est marqué `APPAREIL` pour le clavier virtuel (jamais vu sur un
  téléphone réel). Le défilement du menu de « Révéler » au doigt n'est
  vérifié que par la hauteur et `overflow-y: auto`.
- Pour l'auteur : relire (1) la section « Licence » et le paragraphe
  « Mes niveaux » du README (ton, et la phrase sur les dix-sept esquisses) ;
  (2) les scénarios d'acceptation 21 et 22 de
  `docs/mobile-editor-interactions.md` ; (3) `docs/etat.md` réorganisé (aucune
  capture nouvelle : aucun changement visible). Questions : faut-il trancher
  la contradiction 1 dans le document d'interactions (exception explicite à la
  règle « pas de confirmation pour une action annulable ») ? Faut-il marquer
  le scénario 22 `APPAREIL` aussi ? Les points 2 à 4 sont des écarts
  préexistants entre le document d'interactions et le code, à traiter ou à
  assumer.
- Gate : `pnpm check` passe du premier coup (typecheck, lint, formatage, Knip,
  contenu, 975 tests Vitest en 77 fichiers, build, 54 tests Playwright
  `mobile` réussis et 1 ignoré). `tmp/check-levels.ts` (ESLint le refuse) a
  été déplacé hors du dépôt pendant la gate, puis remis exactement à sa
  place : SHA-256 `1113625e…a92907` et mode 644 identiques avant et après. Par
  une erreur de substitution de shell (des accents graves dans un `grep`),
  `pnpm check` a été lancé deux fois sans effet utile pendant le travail, sans
  conséquence pour l'arbre ; seule la gate propre ci-dessus compte.

### U12 — Poutres en trois tailles — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Sonnet (consigne du pilote). Lecture
  hors liste : aucune ; `src/presentation/` (`board-renderer.ts`,
  `sprite-loader.ts` et leurs tests), `src/domain/object-family-registry.ts`
  (propriété `size`), `e2e/received-play.spec.ts` (modèle de captures) et
  `src/content/levels/demo.json` (forme d'un fichier) lus pour le travail.
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U12 — Poutres en trois
  tailles** : sources dessinées dans `art/assets/beam/` (26 septembre 2026) ;
  les exporter par `art/build-sprites.py` et câbler les trois sprites, une
  fois le dessin validé par l'auteur. La mascotte de `art/assets/bolt/` n'a
  pas encore d'usage décidé. » La clause « une fois le dessin validé par
  l'auteur » n'a pas de trace d'une validation ; la consigne du pilote
  demandait de faire la tâche : voir « Pour l'auteur ».
- État trouvé : `art/assets/beam/` contient bien trois sources (`beam-short.png`,
  `beam-medium.png`, `beam-big.png`, 2172 × 724, ajoutées en 291d122) ;
  `public/assets/sprites/beam-{short,medium,long}@2x.png` existaient (256, 512
  et 768 × 32, de l'ancienne itération du 3 septembre) mais ne venaient pas de
  ces sources, et `beam@2x.png` était identique (même MD5) à `beam-long@2x.png`.
  Le script n'exportait aucune poutre (« pas de nouvelle source »). Pillow
  12.2.0, numpy 1.26.4 et `/usr/bin/pngquant` étaient présents : rien installé.
  Le renderer faisait `spriteAssetsForFamily('beam')` = `['beam']`, un seul
  calque pour les trois longueurs.
- Tests ajoutés : `src/presentation/board-renderer.test.ts` › « dessine une
  poutre %s avec son propre sprite %s, à l'empreinte de sa longueur » (3 cas :
  short, medium, long ; la propriété `size` est une énumération à trois valeurs
  dans `object-family-registry.ts`, il n'existe donc ni longueur intermédiaire
  ni limite à tester ; l'empreinte 2, 4 et 6 × 0,25 est vérifiée avec le
  sprite). `sprite-loader.test.ts` : l'assertion « un sprite par longueur de
  poutre » ajoutée au test des familles en calques. Le test de fichiers
  existant, `sprite-assets.test.ts` (dimensions exactes de chaque calque
  projeté contre l'empreinte à 128 px par unité, budget de 60 Ko, vignette et
  fichiers de chaque famille), couvre les trois fichiers : son document porte
  désormais une poutre de chaque longueur au lieu d'une seule. E2E :
  `e2e/beam-sprites.spec.ts` (importe un niveau de trois poutres, chacune
  portant une balle posée sur son bord supérieur, plus une poutre inclinée ;
  attend que le canvas ait dessiné ; captures).
- Échec initial constaté : `expected [ 'beam' ] to deeply equal [ 'beam-short'
  ]` (idem `'beam-medium'` et `'beam-long'`), 3 tests rouges sur 38.
- Tests existants réécrits : `sprite-loader.test.ts` › « retries a failed asset
  on the next request… » et « stops after three failed attempts… » : ils
  chargeaient la famille `beam` en supposant un seul fichier (un seul appel du
  décodeur) ; la famille en a trois désormais, ils utilisent la famille `mass`
  (un seul fichier), même comportement vérifié. « exposes failed after a decoder
  rejection » vise `beam-medium` au lieu de `beam`. `board-renderer.test.ts` :
  les listes d'`assetKey` attendues (`'beam'` → `'beam-medium'`, deux fixtures
  de poutre moyenne) et la table de sprites factices. Aucun test affaibli.
- Réalisé : `art/build-sprites.py` exporte les trois poutres (bloc « Poutre » :
  `opaque_box` de chaque source, export à 2, 4 et 6 × 0,25, vignette
  `thumbs/beam.png` = poutre longue, comme avant) ; `sprite-loader.ts`
  (`beam: ['beam-short', 'beam-medium', 'beam-long']`) ; `board-renderer.ts`
  (`layerAssetsFor` choisit le calque par `props.size`, poses et ordre de
  dessin des trois noms) ; `beam@2x.png` supprimé (identique à l'ancien
  `beam-long`, plus référencé nulle part ; `git rm`). ADR 0007 (tableau de
  l'amendement du 25 septembre : ligne « poutre »), `etat.md`, tableau
  « Avancement » du cahier des charges.
- Fichiers touchés hors périmètre : aucun. `art/build-sprites.py` régénère aussi
  `button-cap`, `lever-handle`, `second-ball-{base,highlight,spin}` et les
  vignettes `button`, `lever`, `second-ball` avec des octets différents des PNG
  commités (comparaison avant/après) : ces sorties ont été **restaurées**
  (`git checkout`), pour ne rien changer d'autre que les poutres ; dette
  notée dans `etat.md`.
- Écarts avec la tâche : aucun. Les trois PNG sont différents des anciens (ils
  viennent désormais des sources de l'auteur), donc régénérés.
- Contradictions rencontrées : `feuille-de-route-luna.md` U12 (« une fois le
  dessin validé par l'auteur ») contre la consigne du pilote (faire la tâche) ;
  non arbitré, voir « Pour l'auteur ».
- Captures inspectées (Read sur les PNG) :
  `test-results/beam-sprites/beams-{390x844,844x390,1440x900}.png`. En
  1440 × 900 : trois poutres horizontales de longueurs nettement différentes
  (courte à gauche dans le hublot, moyenne au centre, longue en bas, de rapport
  proche de 2 : 1 : 3 comme 2, 4 et 6 m) et une poutre moyenne inclinée de 15° ;
  bois orange à veines et liseré brun sombre, fond clair ; bords nets, pas
  d'escalier visible ; chaque balle repose sur le bord supérieur de sa poutre,
  sans espace ni recouvrement (zoom ×3 : la balle bleue sur la courte, la rouge
  sur la longue). L'inclinée tourne avec son dessin. En 390 × 844 et 844 × 390 :
  mêmes proportions, plus petites (la courte mesure environ 48 et 56 px de
  large), toujours nettes, balles posées dessus. Défaut visible au zoom : le
  bout gauche de la poutre longue est pincé et sans liseré, le bout droit est
  plus sombre (source coupée par les bords de l'image, voir ci-dessous) ; à
  taille normale cela se lit comme un chanfrein discret.
- Gate : `pnpm check` passe du premier coup (typecheck, lint, formatage, Knip,
  19 documents, 982 tests Vitest en 77 fichiers, build, 56 tests Playwright
  `mobile` : 55 réussis, 1 ignoré). Pas d'intermittence D4 ni U15 observée.
  `tmp/check-levels.ts` (ESLint le refuse) a été déplacé hors du dépôt pendant
  `pnpm check:fast` et `pnpm check`, puis remis exactement à sa place : SHA-256
  `1113625e…a92907` et mode 644 identiques avant et après.
- Non vérifié : un vrai téléphone ; la netteté à 3× de densité (seuls les
  sprites @2x existent, comme pour les autres familles) ; la poutre dans les
  niveaux de campagne ou de l'atelier (seul le parcours de test a été vu).
- Pour l'auteur : validation visuelle des trois captures ci-dessus.
  Questions : (1) les sources n'ont pas le rapport de l'empreinte
  (`etat.md`, « Sources de poutre ») : `beam-short` est écrasée de 12 %,
  `beam-medium` étirée de 21 % et `beam-big` de 50 %, et cette dernière est
  coupée par les bords de son image 2172 px (le bout gauche manque). Les
  redessiner à 8 : 1, 16 : 1 et 24 : 1 de rapport, ou exporter en neuf tranches
  (bouts conservés, milieu étiré) ? Non touché, la physique reste 2, 4 et
  6 × 0,25. (2) La clause « une fois le dessin validé par l'auteur » de U12 :
  si le dessin n'est pas validé, il suffit de restaurer les trois PNG
  précédents (`git revert`). (3) La vignette du catalogue montre la poutre
  longue, comme avant ; préférez-vous la moyenne ? (4) Le script, lancé en
  entier, change `button-cap`, `lever-handle`, `second-ball-*` : ses sources ou
  lui ont été retouchés depuis l'export commité ; à éclaircir avant de
  régénérer le reste.

### U1 — Fantôme de placement — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d'interface). Lecture
  imposée faite ; lus en plus pour le travail : `src/ui/BoardView.tsx`,
  `src/app/use-board-pointers.ts`, `src/app/BoardShell.tsx`,
  `src/presentation/board-renderer.ts` et `sprite-loader.ts` (et leurs
  tests), `src/application/editor-session/editor-session.ts` (forme de la
  manipulation), `src/app/App.test.tsx` et `e2e/smoke.spec.ts` (tests de
  l'ancien aperçu), `e2e/player-wires.spec.ts` et `e2e/beam-sprites.spec.ts`
  (modèles de niveau partagé et de captures), le style `.placement-preview`.
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U1 — Fantôme de
  placement** dessiné par le renderer (spéc. complète :
  `plan-remise-en-jeu.md` § 5 « C1 »). Meilleur candidat pour un premier
  essai. »
- Tests ajoutés : `src/app/placement-ghost.test.ts` › `placementGhost (U1)`
  (6 cas : aucun fantôme hors placement, ni avant la première position, ni
  pour un déplacement ; candidat valide dans la zone, invalide hors zone ;
  disparu après confirmation, historique intact avant) ;
  `src/presentation/board-renderer.test.ts` › « fantôme de placement (U1) »
  (6 cas : `appearance` projetée ; sprite `beam-medium` à l'empreinte 16 × 1
  px, `translate` + `rotate(π/4)`, alpha 0,55, autres objets à 1 ; contour
  plein 2 px bleu après le sprite ; fantôme invalide alpha 0,35, tirets,
  `#e53935` ; zoom ×2 → sprite ×2, contour toujours 2 px ; rien hors
  placement) ; `e2e/placement-ghost.spec.ts` (parcours : catalogue → survol
  dans la zone, `data-placement-ghost="valid"`, la boîte des pixels changés
  coïncide à 3 px près avec l'empreinte 4 × 0,25 à l'échelle de la caméra →
  survol hors zone, `invalid`, l'annonce disparaît → retour, toucher, le
  fantôme disparaît, la poutre posée occupe la même boîte, quantité 0 ; et
  captures des trois formats). `e2e/smoke.spec.ts` › « affiche un aperçu
  valide… » vérifie en plus `data-placement-ghost="valid"` et l'absence de
  `.placement-preview`.
- Échec initial constaté : Vitest, `expected 1 to be 0.55`, `expected 1 to be
  0.35`, `expected undefined to be defined` (contour absent), `expected
  undefined to be 2`, `expected false to be true` (`appearance` absente) —
  5 rouges sur 6 du bloc renderer (le cas « rien hors placement » passait
  déjà) ; `Failed to load url ./placement-ghost` ;
  `App.test.tsx` : `expect(element).not.toBeInTheDocument()` (l'overlay
  `.placement-preview` existait). Playwright, contre un build de l'ancien code
  (`git stash` de `src/`, puis restauré) : `toHaveAttribute` attendu
  `"valid"`, reçu `""`.
- Tests existants réécrits : `App.test.tsx` › « affiche un aperçu de placement
  qui suit la souris puis le geste tactile » devient « dessine le fantôme de
  placement dans le canvas, qui suit la souris puis le geste tactile (U1) » :
  il lisait `data-position` sur l'overlay `role="img"` supprimé ; il lit
  désormais `data-placement-ghost(-position)` du canvas, vérifie l'absence
  d'overlay et ajoute la confirmation au relâcher. `sprite-loader.test.ts` et
  les sprites factices de `board-renderer.test.ts` portent une `source`
  (nettoyage C1 § 4, ci-dessous) : les comparaisons d'identité visent
  `sprite.source`. Aucun test affaibli ni supprimé.
- Réalisé : `projectLevel(document, simulation?, ghost?)` et
  `ProjectedBoardObject.appearance` ; le renderer règle `globalAlpha` par
  apparence et trace le contour du fantôme en dernier, en pixels CSS
  (`drawGhostOutline`, réutilise `drawFootprintOutline`). `placementGhost`
  dans `src/app/` déduit le fantôme de la manipulation `placement` ;
  `BoardView` le passe au renderer et l'expose sur le canvas.
  `invalidPlacementId` ne sert plus qu'aux déplacements et rotations refusés
  (comportement inchangé pour eux). Supprimés : l'overlay et ses 99 lignes de
  CSS, l'état `placementPreview` de `use-board-pointers.ts` (devenu mort :
  `PlacementPreview`, `placementPreviewFromPointer`, `setPlacementIndicator`,
  `clearPlacementPreview`). C1 § 4 : `DecodedSprite.source` est obligatoire et
  le renderer dessine `sprite.source`, sans le repli `sprite.source ?? sprite`.
- Fichiers touchés hors périmètre : `src/presentation/sprite-loader.ts` (type
  `DecodedSprite`, demandé par C1 § 4) ; `src/app/BoardShell.tsx` (retrait de
  la prop et de l'appel morts).
- Écarts avec la tâche / la spec :
  1. C1 écrit `projectLevel(document, { ghostPlacementId, isGhostValid })` ;
     le code avait depuis un second paramètre `simulation` : l'option est le
     troisième paramètre, mêmes noms de champs.
  2. C1 demande `setGlobalAlpha` sur le port : le port exposait déjà
     `globalAlpha` (propriété, utilisée pour les fils) et `setLineDash` ;
     rien d'ajouté (« n'exposer que ce qui est réellement utilisé »).
  3. Couleur du contour valide : C1 ne la fixe pas ; repris le bleu de la
     sélection et de la poignée (`#1e88e5`). Invalide : le rouge déjà utilisé
     pour une position refusée (`#e53935`), tirets 6/4 comme le contour
     « à placer ».
  4. C1 décrit « en survolant le plateau » : au tactile il n'y a pas de
     survol ; le fantôme suit le doigt pendant l'appui, et la souris au
     survol (comportement existant de `use-board-pointers`). L'E2E utilise
     le survol souris pour figer l'état à capturer.
- Contradictions rencontrées : aucune entre sources d'autorité ; seulement le
  décalage de signature ci-dessus (spec antérieure au code).
- Captures inspectées (Read sur les PNG) :
  `test-results/placement-ghost/ghost-{valid,invalid}-{390x844,844x390,1440x900}.png`.
  Valide, aux trois formats : une poutre moyenne horizontale (rotation 0,
  celle d'un nouveau placement), du sprite bois réel et à la longueur de 4 m
  (environ la moitié de la largeur de la zone bleue de 5 m), un peu
  translucide (le fond et la teinte de la zone transparaissent), cernée d'un
  rectangle bleu plein fin ; bien lisible sur le fond beige comme sur la
  teinte de la zone ; l'annonce « Aperçu de placement valide » en bas à
  droite du plateau. Invalide : la même poutre hors de la zone, nettement plus
  pâle, cernée d'un tireté rouge ; pas d'annonce. La distinction ne tient pas
  qu'à la couleur : trait plein contre tirets, et opacité différente. En
  390 × 844 la poutre mesure environ 170 px, en 844 × 390 environ 185 px, en
  1440 × 900 environ 360 px : à l'échelle de la caméra. Le contour garde la
  même épaisseur à tous les formats.
- Gate : `pnpm check` passe à la seconde exécution — typecheck, lint,
  formatage, Knip, contenu (19 documents), 994 tests Vitest en 78 fichiers,
  build, 58 tests Playwright `mobile` (57 réussis, 1 ignoré). La première
  s'était arrêtée à Knip (`BoardAppearance` exporté sans usage hors du module,
  rendu local). Pas d'intermittence D4 ni U15 observée. `tmp/check-levels.ts`
  (ESLint le refuse) a été déplacé hors du dépôt pendant `pnpm check:fast` et
  les deux `pnpm check`, puis remis exactement à sa place : SHA-256
  `1113625e…a92907` et mode 644 identiques avant et après.
- Non vérifié : un vrai téléphone (le fantôme sous le doigt peut être masqué
  par le doigt lui-même : rien ne le décale, C1 ne le demande pas) ; les
  familles autres que la poutre en capture (le renderer est générique, testé
  sur la poutre) ; le fantôme en mode création (même code, non capturé).
- Pour l'auteur : validation visuelle des six captures ci-dessus.
  Questions (tranchées de façon conservatrice, à confirmer) : (1) couleur du
  contour valide (bleu de sélection) et opacités 0,55/0,35 de C1 vous
  conviennent-elles ? (2) L'annonce textuelle « Aperçu de placement valide »
  est gardée pour l'accessibilité (le canvas est muet) ; faut-il aussi
  annoncer l'état refusé, ou la retirer ? (3) Constaté, préexistant et non
  touché : pendant l'aperçu, la carte du catalogue affiche déjà « Quantité :
  0 » (la projection applique la commande de placement), visible en
  1440 × 900. (4) Un objet déplacé hors zone garde l'ancien rendu (alpha 0,5,
  contour rouge plein) : l'aligner sur le fantôme invalide relève-t-il de
  U13 ?

### U13 — Zones de construction visibles — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d'interface). Lecture
  imposée faite ; lus en plus pour le travail : `src/app/use-board-pointers.ts`,
  `src/app/placement-ghost.ts`, `src/ui/BoardView.tsx`,
  `src/presentation/board-renderer.ts`, `src/app/use-editor-session.ts`
  (messages de refus), `src/ui/SimulationControls.tsx` (bouton Annuler),
  `src/application/editor-session/editor-session.ts` (manipulation), leurs
  tests, `e2e/placement-ghost.spec.ts` et `e2e/remix.spec.ts` (modèles de
  niveau partagé, de toucher CDP et de captures), et le commit `3bf136e`
  (première livraison U13, voir « État trouvé »).
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U13 — Zones de
  construction** : en mode joueur, mettre visuellement en évidence, sur le
  plateau, la ou les régions où l'empreinte complète de l'objet peut être
  posée, y compris lorsque plusieurs zones existent. […] Décision auteur du
  27 septembre 2026 : la fonctionnalité est **conservée** […]. Outre le dessin
  des zones : pendant un glisser, l'objet **suit le doigt partout**, avec un
  fantôme signalé invalide hors zone, au lieu de rester figé à sa dernière
  position valide puis de sauter (comportement actuel de `previewDirectMove`,
  `use-board-pointers.ts`) ; l'annulation n'a lieu qu'au lâcher ; un seul
  message de refus par geste, pas un par mouvement. » Elle ne cite aucune
  entrée de journal luna.
- État trouvé : l'essentiel avait déjà été livré le 27 septembre 2026 (commit
  `3bf136e`, « rend les zones de construction lisibles au glisser (U13) » ; le
  tableau de bord de `feuille-de-route-luna.md` range U13 parmi les faites) :
  zones dessinées en mode joueur, objet qui suit le doigt hors zone, refus
  reporté au lâcher. Restaient : le « fantôme invalide » (l'objet hors zone
  gardait un rendu à part, alpha 0,5 et contour rouge plein, sous un cadre de
  sélection), aucune trace des zones testable dans le navigateur, un refus
  qui restait affiché après un geste accepté, et aucun parcours E2E (celui du
  niveau 3 avait disparu avec la campagne provisoire).
- Tests ajoutés : `src/app/build-zone-highlight.test.ts` ›
  `highlightedBuildZones (U13)` (4 cas : une et plusieurs zones montrées au
  joueur ; rien quand une zone couvre la scène ; rien à l'auteur ; rien en
  simulation) ; `src/app/placement-ghost.test.ts` › « fait d'un déplacement
  hors zone un fantôme invalide, qui suit le doigt (U13) » et « fait d'une
  rotation hors zone un fantôme invalide (U13) » ;
  `src/presentation/board-renderer.test.ts` › « objet déplacé hors zone (U13)
  › se dessine comme le fantôme invalide : pâle, tirets rouges, sans cadre
  bleu, poignée gardée » ; `src/app/App.test.tsx` › « montre la zone, fait
  suivre le doigt hors zone en fantôme invalide et refuse le geste une seule
  fois (U13) » (niveau partagé, `data-build-zones="1"`, fantôme invalide qui
  suit deux positions successives hors zone, aucun message pendant le geste,
  un seul au lâcher, historique vide, puis un glisser dans la zone accepté
  qui efface le refus) ; `e2e/build-zones.spec.ts` (toucher CDP en 390 × 844 :
  alpha du canvas > 0 dans la zone et 0 hors zone, fantôme invalide sous le
  doigt à la position visée, aucun refus pendant, un seul après, pixels du
  canvas identiques à ceux d'avant le geste, Annuler désactivé ; puis
  glisser dans la zone accepté, refus effacé ; et captures aux trois formats).
- Échec initial constaté : Vitest, `expected null to deeply equal {
  ghostPlacementId: 'beam', …(1) }` (déplacement et rotation) ; `expected [
  [ '', false ], [ '#e53935', true ] ] to deeply equal [ [ '#e53935', true ] ]`
  (cadre de sélection sous le contour) ; `Failed to load url
  ./build-zone-highlight` ; `App.test.tsx` :
  `toHaveAttribute("data-build-zones", "1")`, puis, l'attribut masqué
  provisoirement, `toHaveAttribute("data-placement-ghost", "invalid")`, puis,
  sans le seul effacement du message, `expected [ …(1) ] to have a length of
  +0 but got 1`. Playwright, contre un build de l'ancien code (`git stash` des
  fichiers de production, puis restaurés à l'identique, `cmp`) :
  `toHaveAttribute` attendu `"1"`, reçu `null` pour `data-build-zones`.
- Tests existants réécrits : `board-renderer.test.ts` › « atténue l'objet dont
  la position est refusée, et lui seul » passait `invalidPlacementId` dans la
  projection, propriété supprimée : il désigne désormais l'objet refusé comme
  fantôme invalide (`projectLevel(…, { ghostPlacementId, isGhostValid: false
  })`), même assertion (un seul dessin translucide). Le bloc de
  `placement-ghost.test.ts` s'appelle `placementGhost (U1, U13)` ; « ne fait
  pas d'un déplacement un fantôme de placement » (déplacement valide) est
  inchangé et passe toujours. Aucun test affaibli ni supprimé.
- Réalisé : `placementGhost` désigne aussi un déplacement ou une rotation dont
  la manipulation porte un `invalidReason` (un déplacement valide reste plein) ;
  le renderer ne trace plus le cadre de sélection d'un objet fantôme (la
  poignée reste : le doigt peut être en train de tourner) ; `invalidPlacementId`,
  `INVALID_OBJECT_ALPHA` et le contour rouge plein sont supprimés ;
  `highlightedBuildZones(session)` (nouveau, `src/app/`) remplace la
  condition en ligne de `BoardView` et alimente `data-build-zones` ; un
  déplacement accepté efface le message de refus précédent (`setFeedback(null)`,
  comme le placement). Domaine, commandes, constantes physiques et schéma
  inchangés.
- Fichiers touchés hors périmètre : aucun.
- Écarts avec la tâche : aucun. Choix conservateurs : une zone qui couvre la
  scène entière n'est pas dessinée (comportement de `3bf136e`, conservé : la
  pose n'y est pas restreinte) ; les zones ne sont montrées qu'au joueur
  (contexte où elles s'appliquent) ; mêmes jetons visuels qu'avant pour les
  zones (bleu `rgba(30,136,229,…)`, tirets 8/6) et que U1 pour le fantôme.
- Contradictions rencontrées : la puce U13 de la phase 2 (à faire) et le
  tableau de bord de `feuille-de-route-luna.md` (« U13 à U26 » faites) ; pas
  arbitré : l'écart réel était la partie « fantôme invalide », traitée ici.
- Captures inspectées (Read sur les PNG) :
  `test-results/build-zones/{zone,hors-zone,refus}-{390x844,844x390,1440x900}.png`.
  Zone au repos : rectangle gris-bleu très léger à contour bleu en tirets
  fins, à gauche du plateau ; il se lit nettement sur le fond beige sans
  masquer la poutre posée dedans (bois bien visible à travers), et la balle
  et le panier, hors zone, ne sont pas teintés. Hors zone (doigt tenu) : la
  poutre suit le doigt à droite de la zone, nettement pâle, entourée de
  tirets rouges, sans cadre noir ni bleu, la poignée de rotation bleue
  au-dessus ; pas de message. Refus (après le lâcher) : la poutre est revenue
  à sa place dans la zone, sélectionnée (cadre sombre et poignée) ; une seule
  carte « Action refusée : choisissez une position dans la zone de
  construction. » à bord rouge, en haut du plateau. En 844 × 390, cette carte
  recouvre le haut du plateau et cache la moitié de la balle rouge
  (emplacement préexistant de `.toolbar-feedback`, non touché) ; en 390 × 844
  et 1440 × 900 elle ne recouvre que la bordure haute.
- Gate : `pnpm check` passe du premier coup — typecheck, lint, formatage,
  Knip, contenu (19 documents), 1002 tests Vitest en 79 fichiers, build, 60
  tests Playwright `mobile` (59 réussis, 1 ignoré). Pas d'intermittence D4 ni
  U15 observée. Le nouveau test App était instable au premier jet (le niveau
  partagé se charge de façon asynchrone et la caméra n'était pas encore
  ajustée) : il attend désormais le zoom de `fitCameraToScene`, 5 passages
  sur 5 ; le parcours E2E aussi (l'inspecteur compact s'ouvrait après la
  vérification) : il attend l'inspecteur avant de le fermer, 12 passages sur
  12 (`--repeat-each=6`). `tmp/check-levels.ts` (ESLint le refuse) a été
  déplacé hors du dépôt pendant `pnpm check:fast` et `pnpm check`, puis remis
  exactement à sa place : SHA-256 `1113625e…a92907` et mode 644 identiques
  avant et après.
- Non vérifié : un vrai téléphone (le doigt masque l'objet qu'il tire) ; un
  niveau à plusieurs zones dans le navigateur (couvert par le test pur) ; la
  rotation hors zone dans le navigateur (couverte par le test pur et le
  renderer).
- Pour l'auteur : validation visuelle des neuf captures ci-dessus.
  Questions (tranchées de façon conservatrice, à confirmer) : (1) la teinte
  des zones (bleu à 10 %, contour à 65 %) est-elle assez visible, ou trop ?
  (2) une zone qui couvre toute la scène n'est pas dessinée : vous convient-il ?
  (3) Constaté, préexistant et non touché : en 844 × 390 la carte de refus
  cache le haut du plateau (dont la balle) ; et le cadre de sélection d'un
  objet est sombre, pas bleu (`drawFootprintOutline` sans couleur). (4) La
  question (4) du journal U1 est résolue ici : le déplacement hors zone a le
  rendu du fantôme invalide.

### U7 — Balle suivie — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d'interface). Lecture
  imposée faite ; lus en plus pour le travail : `src/presentation/board-renderer.ts`
  et son test, `src/ui/BoardView.tsx`, `src/app/BoardShell.tsx` (boîte
  « Objectif »), `src/ui/SimulationControls.tsx` (libellés Lancer et pause),
  `src/app/App.test.tsx`, `e2e/build-zones.spec.ts` (modèle de niveau partagé et
  de captures), l'entrée U19 du journal luna et le test de palette
  `wire-renderer.test.ts` (rouge de la balle, `#de1111`), pour réutiliser ce
  rouge.
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U7 — Balle suivie** :
  signaler quelle balle est la cible de l'objectif. » Elle ne cite aucune
  entrée de journal luna.
- État trouvé : rien de U7 dans le code ni dans `git log` (seules U18 et U19
  distinguent la balle de l'objectif par la couleur : rouge contre bleu). Le
  tableau de bord de `feuille-de-route-luna.md` range bien U7 parmi les tâches
  à faire (« § 6 dans l'ordre : U12, U1, U7… ») : pas d'écart cette fois.
- Tests ajoutés : `src/presentation/board-renderer.test.ts` › « balle de
  l'objectif signalée (U7) » (5 cas : `signalledGoalBallId` et
  `projectLevel(…).goalBallMarkerId` désignent la balle de l'objectif dès deux
  balles, rien pour une balle seule, même balle en simulation ; anneau plein
  centré sur la balle, rayon = rayon de la balle + 5 px CSS, liseré blanc
  5 px puis trait rouge `#de1111` 2,5 px, dessiné après les sprites des
  balles, aucun anneau autour de la balle bleue ; l'anneau suit la pose
  simulée ; au zoom ×2 le rayon suit la balle, pas l'épaisseur ; aucun arc
  pour une balle seule) ; `src/app/App.test.tsx` › « signale la balle de
  l'objectif sur le plateau et dans l'objectif quand plusieurs balles sont
  posées (U7) » (niveau 1 : `data-goal-ball-marker="ball-red"`, phrase dans
  la boîte « Objectif ») et « ne signale rien quand la balle de l'objectif
  est seule (U7) » (garde, verte dès l'écriture : elle décrit une absence) ;
  `e2e/goal-ball.spec.ts` (390 × 844 : pixel rouge sur l'anneau, rien au même
  endroit près de la balle bleue, attribut ; Lancer, pause, l'anneau est à la
  position simulée et plus à la position de départ ; phrase de l'objectif ;
  et captures aux trois formats, au repos et en pause).
- Échec initial constaté : Vitest, `TypeError: (0 , signalledGoalBallId) is
  not a function`, `expected [] to deeply equal [ 17, 17 ]`, `expected [] to
  have a length of 2 but got +0`, `expected [] to deeply equal [ 29, 29 ]` ;
  `App.test.tsx` : `toHaveAttribute("data-goal-ball-marker", "ball-red")`.
  Playwright, contre un build de l'ancien code (`git stash` des trois fichiers
  de production, puis restaurés) : `expect.poll(… isRingRed(…)).toBe(true)`,
  reçu `false`, pour les deux tests.
- Tests existants réécrits : aucun. L'aide `replay` de
  `board-renderer.test.ts` enregistre désormais aussi les `arc` avec leur
  état (les tests existants filtrent par `kind` et ne changent pas).
- Réalisé : `signalledGoalBallId(document)` (presentation, pur) renvoie
  `goal.ballId` quand le document compte au moins deux balles ;
  `projectLevel` le porte dans `goalBallMarkerId` ; le renderer trace
  `drawGoalBallMarker` après les objets et les étiquettes de fils, avant
  contours et sélection, centré sur `layer.position` (la pose simulée pendant
  le lancer). Le canvas expose `data-goal-ball-marker`. La boîte
  « Objectif » ajoute, dans ce cas seulement, « Seule la balle rouge compte :
  sur le plateau, elle est entourée d’un anneau. » Toutes les phases
  (construction, simulation, pause, résultat). Domaine, simulation, schéma et
  constantes physiques inchangés.
- Fichiers touchés hors périmètre : aucun ; `docs/mobile-editor-interactions.md`
  (§ Organisation de l'écran) décrit l'anneau et la phrase.
- Écarts avec la tâche : aucun. Choix conservateurs : (1) pas d'anneau quand
  la balle est seule (rien à distinguer) ; (2) l'anneau en toutes phases, pas
  seulement en simulation ; (3) rouge de la balle (U19, le rouge appartient à
  l'objectif) sur liseré blanc, trait plein, pour ne pas ressembler aux
  tirets rouges du fantôme refusé ; (4) les messages d'échec (« la balle a
  quitté le plateau ») ne sont pas retouchés.
- Contradictions rencontrées : aucune.
- Captures inspectées (Read sur les PNG) :
  `test-results/goal-ball/{repos,simulation}-{390x844,844x390,1440x900}.png`.
  Au repos : balle rouge à gauche, cerclée d'un anneau rouge fin sur un
  liseré blanc, à quelques pixels du bord de la balle ; balle bleue à droite
  sans rien ; panier en bas à droite ; rien d'autre ne recouvre le plateau.
  En pause après le lancer : les deux balles sont descendues d'un même cran,
  l'anneau est resté autour de la rouge. En 390 × 844 et 844 × 390 l'anneau
  se détache nettement (balle d'environ 24 à 28 px) ; en 1440 × 900 il est
  plus proche d'un contour de la balle (écart fixe de 5 px pour une balle
  d'environ 80 px), toujours lisible. Vue aussi, produite par la gate :
  `test-results/u6/puzzle-390x844.png` (niveau 1) : la balle rouge posée sur
  son poteau porte l'anneau, la bleue non ; le capuchon du bouton, rouge lui
  aussi, n'en porte pas.
- Gate : `pnpm check` passe du premier coup — typecheck, lint, formatage,
  Knip, contenu (19 documents), 1009 tests Vitest en 79 fichiers, build, 62
  tests Playwright `mobile` (61 réussis, 1 ignoré). Pas d'intermittence D4 ni
  U15 observée. `tmp/check-levels.ts` (ESLint le refuse) a été déplacé hors
  du dépôt pendant `pnpm check:fast` et `pnpm check`, puis remis exactement à
  sa place : SHA-256 `1113625e…a92907` et mode 644 identiques avant et après.
- Non vérifié : un vrai téléphone ; un niveau à trois balles dans le
  navigateur (même code ; le test pur couvre « plus d'une ») ; le lecteur
  d'écran (le canvas reste muet, la phrase est dans la boîte « Objectif »).
- Pour l'auteur : validation visuelle des six captures ci-dessus.
  Questions (tranchées de façon conservatrice, à confirmer) : (1) Les 17
  niveaux provisoires ont tous au moins deux balles : l'anneau apparaît donc
  dans chacun ; le garder aussi en construction, ou seulement pendant le
  lancer ? (2) Couleur et écart (rouge de la balle sur liseré blanc, 5 px) :
  à 1440 × 900 l'anneau colle à la balle ; un écart proportionnel vous
  irait-il mieux ? (3) Faut-il dire « la balle rouge » dans les messages
  d'échec ? (4) Constaté, préexistant : le capuchon du bouton est rouge, ce
  qui contredit « le rouge n'appartient qu'à l'objectif » (U19).

### U8 — Aide du niveau 1 — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d'interface). Lecture
  imposée faite ; lus en plus pour le travail : `src/app/PlayLevelPage.tsx`,
  `src/app/BoardShell.tsx`, `src/ui/SimulationControls.tsx`,
  `src/ui/InspectorDrawer.tsx`, `src/ui/Panel.tsx`, `src/ui/LevelResult.tsx`,
  l'en-tête de `src/ui/ObjectDrawer.tsx` (libellés du catalogue), les règles
  `.status-slot`, `.toolbar-notice` et `.wiring-guide` de `styles.css`, le port
  et l'adaptateur des préférences (et leur test), `LevelExportDialog.tsx` (seul
  autre écrivain des préférences), ADR 0011 et ADR 0016 § Pseudo (stockage),
  `src/content/levels/campaign-01-…json` (inventaire, en lecture seule),
  `e2e/goal-ball.spec.ts` et `e2e/smoke.spec.ts` (modèles).
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U8 — Aide du niveau 1** :
  indication brève et non bloquante vers « Tester » puis vers le tiroir. »
  Elle ne cite aucune entrée de journal luna.
- État trouvé : rien de U8 dans le code ni dans `git log`.
- Tests ajoutés : `src/app/first-level-hint.test.ts` ›
  `offersFirstLevelHint (U8)` (4 cas : niveau 1 neuf ; aucun autre niveau ;
  pas une fois résolu ; pas une fois fermée ou suivie) et
  `firstLevelHintStep (U8)` (4 cas : « Lancer » d'abord, tiroir après un
  lancer, silence en simulation, pause et résultat, disparition à la première
  action) ; `local-storage-preferences-repository.test.ts` › « retient que
  l'aide du niveau 1 est terminée, à côté du pseudo (U8) », « relit à
  l'identique des préférences écrites avant U8… » et le cas « aide du niveau 1
  invalide » (`false`) des valeurs sauvegardées avant remplacement ;
  `LevelExportDialog.test.tsx` › « retient le pseudo sans oublier que l'aide
  du niveau 1 est terminée (U8) » ; `App.test.tsx` › « montre sur le niveau 1
  neuf une aide brève vers « Lancer », hors du plateau (U8) », « oriente vers
  le tiroir après un premier lancer, puis disparaît pour toujours à la
  première pose (U8) » (préférences : `{ author: 'Lili', firstLevelHintDone:
  true }`, rien après remontage), « se ferme d'un toucher et ne revient pas
  (U8) », « ne montre l'aide ni sur un autre niveau ni sur le niveau 1 déjà
  résolu (U8) » (garde, verte dès l'écriture : elle décrit une absence) ;
  `e2e/first-level-hint.spec.ts` (390 × 844 au toucher : aide visible, boîte
  disjointe du plateau, de « Lancer » et de « Recommencer le niveau » ;
  « Lancer » la tait, « Recommencer » montre l'étape du catalogue ; « Masquer
  l'aide » la retire, `localStorage` contient `{ kind: 'preferences',
  version: 1, data: { firstLevelHintDone: true } }`, absente au rechargement ;
  second parcours : poser une poutre courte la retire, absente au
  rechargement ; et captures aux trois formats, deux étapes).
- Échec initial constaté : Vitest, `Failed to load url ./first-level-hint` ;
  adaptateur : `expected { status: 'error', …(1) } to deeply equal { status:
  'ok' }` (le schéma strict refusait le champ) ; export : `expected [ {
  author: 'Noé' }, {} ] to deeply equal [ { author: 'Noé', …(1) }, …(1) ]`
  (le pseudo retenu effaçait le reste) ; `App.test.tsx` : `expected null not
  to be null`, `toHaveTextContent()` sur `null`, `Aide du niveau 1 absente.`.
  Playwright, contre un build de l'ancien code (fichiers de production mis de
  côté puis restaurés, `git status` identique) : `toBeVisible()` — `Received:
  <element(s) not found>`, pour les trois tests.
- Tests existants réécrits : aucun. Aucun E2E existant du niveau 1 n'a été
  gêné (l'aide est dans l'emplacement réservé, hors du plateau).
- Réalisé : `offersFirstLevelHint` et `firstLevelHintStep` (`src/app/`,
  purs) ; `FirstLevelHint` (`src/ui/`, carte au liseré jaune de la carte de
  guidage du fil U15, ampoule, texte `aria-live="polite"`, bouton « Masquer
  l'aide » de 44 px) rendu par `BoardShell` en tête de `.status-slot` ;
  `BoardShell` retient le premier lancer de la visite et signale la fin de
  l'aide à la première commande validée (`history.past` non vide) ;
  `useFirstLevelHint` (`PlayLevelPage.tsx`) lit et écrit la préférence.
  Préférences : `firstLevelHintDone?: true` (port, schéma de l'adaptateur,
  lecture) ; `LevelExportDialog` conserve ce champ en retenant le pseudo.
  Domaine, simulation, schéma de niveau, contenu des niveaux et constantes
  physiques inchangés.
- Fichiers touchés hors périmètre : `src/app/LevelExportDialog.tsx` (sans lui,
  retenir un pseudo aurait effacé la préférence : il écrivait `{ author }`
  seul) ; `docs/decisions/0011-local-storage-and-url-sharing.md` (amendement
  qui consigne le nouveau champ).
- Écarts avec la tâche : (1) le libellé est « Lancer » (code et
  `mobile-editor-interactions.md`, décision du 1er octobre 2026), pas
  « Tester » ; (2) la consigne de session disait « ouvrir le tiroir / poser
  puis lancer » et la puce « vers « Tester » puis vers le tiroir » : l'aide
  suit les deux, en deux étapes (« Lancer » pour voir la machine, puis
  catalogue, pose et relance) ; (3) l'aide ne nomme ni la poutre ni le
  tremplin : le niveau 1 est une esquisse provisoire (§ 6) et son inventaire
  changera ; (4) le stockage : enveloppe des préférences gardée en version 1,
  champ facultatif, sans migration — une valeur antérieure est une valeur
  valide (tests ancienne et nouvelle forme) ; une montée en version 2 aurait
  aussi dû réécrire le test existant « version inconnue » (version 2). Choix
  conservateurs : « vue » = fermée ou suivie (première commande validée), pas
  « affichée une fois » ; un simple lancer ne la clôt pas (au rechargement,
  l'étape « Lancer » revient) ; une victoire passe par une pose, et un niveau
  résolu ne la montre plus (état dérivé de la progression).
- Contradictions rencontrées : « Tester » (puce luna et ligne U8 de la phase
  2) contre « Lancer » (code, `mobile-editor-interactions.md`) : le code et le
  document d'interaction suivent la décision la plus récente ; la ligne U8 est
  barrée, la puce luna (historique) n'est pas retouchée.
- Captures inspectées (Read sur les PNG) :
  `test-results/first-level-hint/{lancer,tiroir}-{390x844,844x390,1440x900}.png`.
  390 × 844 : carte crème à liseré jaune sous les boutons de cadrage, juste
  au-dessus de la poignée du catalogue (« Objets disponibles ») ; une ligne
  pour « Touche « Lancer » pour voir la machine tourner. », deux pour l'étape
  du catalogue ; ampoule à gauche, croix à droite ; le plateau entier (balles,
  poutres, panier, fil) et la barre d'actions restent dégagés. 844 × 390 :
  la carte occupe le haut du dock de droite, sous les boutons de cadrage, à
  côté du plateau, qui garde sa taille ; texte lisible sur trois lignes
  (étape « Lancer ») et six lignes étroites (étape du catalogue) ; rien ne
  recouvre le plateau ni le bouton « Lancer ». 1440 × 900 : en tête du rail
  droit, à hauteur de la barre d'actions, à droite de « Lancer » ; deux à
  trois lignes ; plateau et catalogue intacts.
- Gate : `pnpm check` passe du premier coup — typecheck, lint, formatage,
  Knip, contenu (19 documents), 1025 tests Vitest en 80 fichiers, build, 65
  tests Playwright `mobile` (64 réussis, 1 ignoré). Pas d'intermittence D4 ni
  U15 observée. Un `pnpm check:fast` intermédiaire s'était arrêté au lint
  (`no-unsafe-return` sur un `JSON.parse` du nouvel E2E), corrigé avant la
  gate. `tmp/check-levels.ts` (ESLint le refuse) a été déplacé hors du dépôt
  pendant `pnpm check:fast` et `pnpm check`, puis remis exactement à sa
  place : SHA-256 `1113625e…a92907` et mode 644 identiques avant et après.
- Non vérifié : un vrai téléphone ; un lecteur d'écran (le texte est
  `aria-live="polite"`, la carte est une région nommée « Aide du niveau 1 ») ;
  l'aide quand un objet est sélectionné en portrait (le bouton « Ouvrir les
  propriétés » partage alors l'emplacement, qui défile).
- Pour l'auteur : validation visuelle des six captures ci-dessus.
  Questions (tranchées de façon conservatrice, à confirmer) : (1) Les deux
  textes, au tutoiement des autres messages, vous conviennent-ils ? Faut-il
  nommer l'objet attendu une fois le niveau 1 définitif ? (2) « Déjà vue » =
  fermée ou suivie ; préférez-vous qu'un seul affichage suffise ? (3) L'ordre
  « Lancer » puis catalogue suit la puce ; préférez-vous l'inverse (catalogue
  d'abord) ? (4) En 844 × 390, l'étape du catalogue fait six lignes dans le
  dock étroit : acceptable, ou faut-il un texte plus court ? (5) Les niveaux
  de `levels/` (tutoriels) remplaceront la campagne : l'aide vise l'indice 0
  de la campagne embarquée, quel que soit son identifiant.

### U10 — Invitation de mise à jour et d’installation — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d’interface). Lecture
  imposée faite ; lus en plus pour le travail : le code PWA de L28
  (`PwaUpdateProvider.tsx`, `pwa-update-context.ts`, `pwa-update-state.ts`,
  `use-pwa-update-status.ts`, leurs tests, `test/fixtures/pwa-register.ts`,
  `vite.config.ts`, `e2e/pwa.spec.ts`, `playwright.config.ts`), le client
  `registerSW` de `vite-plugin-pwa` (pour savoir quand il recharge), `App.tsx`,
  `HomePage.tsx`, `BoardShell.tsx`, `PlayLevelPage.tsx` (la tentative de
  campagne est-elle enregistrée ? non), `FirstLevelHint.tsx` et les règles
  `.board-hint` / `.status-slot`, le port et l’adaptateur des préférences,
  `LevelExportDialog.tsx`, ADR 0011 (amendement U8), `e2e/first-level-hint.spec.ts`
  (modèle).
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U10 — Invitation de mise à
  jour et installation** de la PWA (L28). » Entrée L28 lue : « Le hook expose
  uniquement l’état disponible et le masque pendant une simulation ou un geste.
  L’invitation visible d’installation ou de mise à jour est U10 et reste
  différée. »
- État trouvé : `usePwaUpdateStatus(phase)` et `canPromptUpdate` existaient
  (L28) mais n’étaient appelés par aucun écran ; aucun `beforeinstallprompt`
  dans le code ; la fonction de mise à jour rendue par `registerSW` était jetée.
  Rien de U10 dans `git log`.
- Tests ajoutés : `src/app/pwa-invitation.test.ts` › `pwaInvitation (U10)` (7
  cas : rien sans mise à jour ni événement ; mise à jour à l’accueil et sur un
  plateau intact ; pas sur un plateau dont la construction serait perdue ;
  « Plus tard » ; installation à l’accueil seulement ; refus retenu ; priorité
  de la mise à jour) ; `PwaUpdateProvider.test.tsx` › « expose la mise à jour
  en attente en phase sûre, et la tait en simulation ou pendant un geste »,
  « n’applique la mise à jour que sur demande », « oublie l’invitation de mise
  à jour le temps de la visite… », et `invitation d’installation PWA (U10)` (4
  cas : rien sans événement ; événement retenu, `preventDefault`, demande
  ouverte une fois ; refus rapporté ; événement sans `prompt` ignoré et
  `appinstalled`) ; `local-storage-preferences-repository.test.ts` › « retient
  le refus de l’invitation d’installation… », « relit à l’identique des
  préférences écrites avant U10… » et le cas « refus d’installation invalide » ;
  `LevelExportDialog.test.tsx` › « retient le pseudo sans oublier le refus de
  l’invitation d’installation (U10) » ; `App.test.tsx` › six tests (U10) :
  mise à jour à l’accueil appliquée seulement au toucher ; sur le plateau, dans
  `.status-slot`, absente pendant la simulation, de retour après
  « Recommencer », « Plus tard » ; absente après une pose ; installation à
  l’accueil seulement après l’événement, « Installer » ouvre la demande ;
  refus retenu après remontage ; refus donné dans la demande du navigateur
  retenu ; `e2e/pwa-invitation.spec.ts` (390 × 844 au toucher, build réel :
  une seconde version du service worker enregistrée sur la même portée
  déclenche `onNeedRefresh`, la carte apparaît à l’accueil puis à côté du
  plateau sans recouvrir plateau ni actions, disparaît pendant la simulation,
  revient, « Plus tard » ; événement `beforeinstallprompt` simulé, « Ne pas
  installer », `localStorage` contient `{ installInvitationDeclined: true }`,
  absente au rechargement ; captures aux trois formats).
- Échec initial constaté : Vitest, `Failed to load url ./pwa-invitation`,
  `Failed to resolve import "./use-pwa"` ; adaptateur : `expected { status:
  'error', …(1) } to deeply equal { status: 'ok' }` ; export : `expected [ {
  firstLevelHintDone: true, …(1) } ] to deeply equal [ { author: 'Noé', …(2) }
  ]` ; `App.test.tsx` : `Unable to find role="region" and name "Mise à jour de
  TinkerBolt"` (×3), `Invitation d’installation absente.` (×3). Playwright,
  contre un build de l’ancien code (`git stash` des fichiers de production,
  restaurés, `diff -r` identique) : `toBeVisible()` — `Received: <element(s)
  not found>`, pour les quatre tests.
- Tests existants réécrits : `PwaUpdateProvider.test.tsx` › « expose false tant
  qu’aucune mise à jour… » est inchangé (seuls les imports du fichier ont
  bougé). Aucun test affaibli ni supprimé.
- Réalisé : `PwaUpdateProvider` reçoit un port injectable
  `registerServiceWorker` (par défaut `registerSW` en production), garde la
  fonction de mise à jour qu’il rend et ne l’appelle que sur demande ; il
  écoute `beforeinstallprompt` (rétréci à l’exécution, sans assertion de type)
  et `appinstalled`. Le contexte expose `PwaState` (`usePwa`) ;
  `usePwaUpdateStatus` garde sa signature. `pwaInvitation` (pur) et
  `usePwaInvitation` (préférences) choisissent la carte ; `PwaInvitation`
  (`src/ui/`) reprend la carte de l’aide U8 avec un `Button` « go ». `BoardShell`
  la place en tête de `.status-slot`, `HomePage` en tête de page. Préférences :
  `installInvitationDeclined?: true`. `App` accepte `registerServiceWorker`
  (tests). Service worker, manifeste, précache, domaine, simulation, schéma de
  niveau et constantes physiques inchangés.
- Fichiers touchés hors périmètre : `src/app/LevelExportDialog.tsx` (retenir un
  pseudo aurait effacé le refus : il ne conservait que `firstLevelHintDone`) ;
  ADR 0011 (amendement pour le champ).
- Écarts avec la tâche : (1) sur un plateau, la mise à jour attend en plus
  qu’aucune commande n’ait été validée : l’ADR 0012 dit « recharger ne perd
  rien », vrai des brouillons, faux de la tentative d’un niveau de campagne,
  reçu ou partagé (en session seulement) ; la consigne interdit toute perte de
  construction ; consigné par amendement de l’ADR 0012. (2) Le rechargement
  après « Mettre à jour » n’est pas parcouru dans le navigateur (le test App
  vérifie que l’action injectée est appelée ; le E2E ne la touche pas). (3) Pas
  d’invitation d’installation sur le plateau ni sur la liste des niveaux.
- Contradictions rencontrées : ADR 0012 « Les brouillons étant enregistrés en
  continu, recharger ne perd rien » contre `PlayLevelPage` (la tentative de
  campagne n’est pas enregistrée) ; résolu côté interface (point 1), sans
  toucher au service worker.
- Captures inspectées (Read sur les PNG) :
  `test-results/pwa-invitation/{mise-a-jour-accueil,mise-a-jour-plateau,installation-accueil}-{390x844,844x390,1440x900}.png`.
  Plateau 390 × 844 : carte crème à liseré jaune sous les boutons de cadrage,
  au-dessus de la poignée du catalogue : icône de rafraîchissement, « Nouvelle
  version disponible. » sur deux lignes, bouton vert « Mettre à jour », croix ;
  plateau et barre d’actions dégagés. Plateau 844 × 390 : dans le dock droit
  sous les boutons de cadrage, texte sur deux lignes, bouton et croix sur une
  seconde rangée ; le plateau garde sa taille. (Au premier jet, le bouton
  recouvrait le texte dans ce dock étroit : corrigé par un retour à la ligne
  qui garde bouton et croix ensemble.) Plateau 1440 × 900 : en tête du rail
  droit, texte sur une ligne, bouton et croix en dessous, à droite. Accueil :
  carte en tête de page, au-dessus de « Bienvenue dans l’atelier », sur une
  ligne en 844 et 1440 (largeur limitée à 640 px), deux lignes en 390.
  Installation à l’accueil : même carte, icône de téléchargement, « Installe
  TinkerBolt pour le retrouver comme une application, même hors ligne. » (trois
  lignes en 390, une en 844 et 1440), bouton « Installer », croix.
- Gate : `pnpm check` passe — typecheck, lint, formatage, Knip, contenu (19
  documents), 1049 tests Vitest en 81 fichiers, build, 69 tests Playwright
  `mobile` (68 réussis, 1 ignoré). Une première exécution s’était arrêtée à
  Knip (`PwaInvitationOffer` exporté sans usage), corrigé. Pas d’intermittence
  D4 ni U15 observée. Le nouvel E2E passe 12 fois sur 12 (`--repeat-each=3`).
  `tmp/check-levels.ts` (ESLint le refuse) a été déplacé hors du dépôt pendant
  `pnpm check:fast` et `pnpm check`, puis remis exactement à sa place : SHA-256
  `1113625e…a92907` et mode 644 identiques avant et après.
- Non vérifié : un vrai téléphone Android (vraie demande d’installation, vraie
  mise à jour publiée) ; le rechargement après « Mettre à jour » ; iOS (rien ne
  doit s’afficher : couvert par l’absence d’événement) ; le lecteur d’écran
  (texte `aria-live="polite"`, régions nommées).
- Pour l’auteur : validation visuelle des neuf captures ci-dessus. Questions
  (tranchées de façon conservatrice, à confirmer) : (1) les textes, au
  tutoiement ; (2) la mise à jour n’est pas proposée sur un plateau où le
  joueur a déjà agi : préférez-vous la proposer quand même, avec un
  avertissement de perte, ou enregistrer la tentative de campagne ? (3)
  « Plus tard » ne vaut que pour la visite ; (4) l’installation n’est proposée
  qu’à l’accueil ; un refus est définitif (pas de nouvel essai après un
  délai) ; aucune aide pour iOS (« Partager › Sur l’écran d’accueil ») ; (5)
  constaté, hors périmètre : la liste de repli hors ligne de `vite.config.ts`
  (`navigateFallbackAllowlist`) ne contient pas `/my-levels`.

### U11 — Paramètres — fait — commit de cette entrée

- Déroulé : une seule étape, sous-agent Opus (tâche d’interface). Lecture
  imposée faite. Lus en plus pour le travail : `SettingsPage.tsx`,
  `CampaignProgressProvider.tsx`, `campaign-progress-context.ts`, `App.tsx`,
  le port et l’adaptateur de la progression et des préférences (et leurs
  tests), `LevelExportDialog.tsx` et `level-export.ts` (`pseudoRefusal`,
  règle du pseudo), `Dialog.tsx`, `Panel.tsx`, `Button.tsx`, la boîte « Ràz
  atelier » de `BoardShell.tsx` et la suppression de `MyLevelsPage.tsx`
  (modèles de confirmation et de message de stockage), les règles
  `.export-*`, `.page-content`, `.level-result-actions` de `styles.css`,
  `e2e/first-level-hint.spec.ts` et `e2e/home.spec.ts` (modèles), ADR 0008
  (route `/settings` décrite « provisoire »).
- Puce citée (`feuille-de-route-luna.md` § 6) : « **U11 — Réglages** :
  réinitialiser la progression, préférences. » Elle ne cite aucune entrée de
  journal luna.
- État trouvé : `SettingsPage` affichait un panneau « Paramètres » avec
  « Réglages à venir. ». Aucune opération d’effacement dans `ProgressRepository`.
  Rien de U11 dans `git log`.
- Tests ajoutés : `local-storage-progress-repository.test.ts` › « remise à
  zéro de la progression (U11) » (5 cas : efface la progression et rien
  d’autre, sauvegarde existante comprise ; rien d’écrit sans progression ;
  valeur illisible sauvegardée avant effacement ; rien d’effacé si la
  sauvegarde de secours échoue (quota) ; stockage indisponible en résultat,
  sans exception) ; `src/application/preferences/remember-author.test.ts`
  (6 cas : modifier sans perdre `firstLevelHintDone` ni
  `installInvitationDeclined` ; effacer `author` seul ; premier pseudo ;
  rien d’écrit si la lecture échoue ; erreur d’écriture rendue ; exception
  convertie) ; `local-storage-preferences-repository.test.ts` › « modifie
  puis efface le pseudo depuis les paramètres sans perdre les autres champs
  (U11) » (enveloppe réelle) et « refuse depuis les paramètres un pseudo
  invalide sans rien écrire (U11) » ; `src/app/SettingsPage.test.tsx` (11
  tests App sur `localStorage` réel : affiche le pseudo ; champ vide et
  « Effacer » désactivé ; modifier, rogné, autres préférences gardées ;
  effacer ; champ vidé = oublié ; pseudo U+2028 refusé sous le champ, rien
  écrit ; erreur d’écriture dite ; lecture qui lève, page affichée ;
  confirmation avec « Annuler » ciblé et texte de la perte, « Annuler » ne
  change rien ; confirmer efface `tinkerbolt:progress` et seulement elle
  (créations, niveaux reçus, préférences, sauvegarde gardés octet pour
  octet), statut, « 0 sur 17 », niveaux 2 et 3 verrouillés dans la liste
  sans rechargement ; échec de stockage dit, progression gardée) ;
  `e2e/settings.spec.ts` (390 × 844 au toucher : cibles ≥ 44 px, pas de
  défilement horizontal, pseudo refusé, modifié, effacé, enveloppe
  `tinkerbolt:preferences` vérifiée, « Annuler » ciblé puis sans effet,
  confirmation, statut, clés gardées, liste verrouillée après le niveau 1 ;
  844 × 390 : la page défile jusqu’à la remise à zéro et la boîte reste
  utilisable ; captures aux trois formats).
- Échec initial constaté : progression, `TypeError: repository.clear is not a
  function` (5 sur 5) ; préférences, `Error: Cannot find module
  './remember-author'` (le fichier d’adaptateur aussi : import absent) ;
  `SettingsPage.test.tsx`, `Unable to find an accessible element with the
  role "region" and name "Pseudo"` / `… "textbox" and name "Pseudo retenu"`
  / `… "button" and name "Remettre la progression à zéro"` (11 sur 11) ;
  Playwright contre un build de l’ancienne page (seul `SettingsPage.tsx`
  remis à la version de HEAD le temps du build, puis rétabli) :
  `toHaveValue` — `Received: <element(s) not found>` pour les trois tests.
  Ensuite, sur la nouvelle page : champ de 35 px de haut (`Expected: >= 44`,
  corrigé par une règle CSS) ; puis deux sélecteurs E2E trop larges
  (« Remettre à zéro » trouvait aussi « Fermer sans remettre à zéro »,
  « Lancer le niveau 1 » trouvait 10 à 17 ; `exact: true` ajouté au test).
  Dans le premier jet du test App, des identifiants de niveau faux
  (`campaign-01`) donnaient « 0 sur 17 » : corrigé dans le test, en lisant
  les identifiants de `campaignChapters`.
- Tests existants réécrits : `App.test.tsx` › « navigue vers une page de
  réglages dédiée depuis le menu (ADR 0008) ». Il attendait la région
  « Paramètres » du panneau provisoire, que U11 remplace. Il attend
  désormais les régions « Pseudo » et « Progression de la campagne » ;
  navigation et absence du plateau inchangées. Les doublures de
  `ProgressRepository` de `App.test.tsx`, `CampaignDraftEditing.test.tsx`,
  `CampaignRemix.test.tsx`, `EditAndRemix.test.tsx`, `HomePage.test.tsx`,
  `ReceivedLevelPlay.test.tsx` et `use-campaign-progress.test.tsx` reçoivent
  `clear` (le port l’exige) ; aucune assertion changée. Aucun test affaibli
  ni supprimé.
- Réalisé : `ProgressRepository.clear()` et son adaptateur `localStorage`
  (retire `tinkerbolt:progress`, sauvegarde d’abord une valeur illisible,
  résultat d’erreur sinon) ; `resetCampaignProgress()` dans
  `CampaignProgressProvider` (progression affichée vidée seulement si le
  stockage a réussi ; exception du port convertie) ; `rememberAuthor`
  (`src/application/preferences/`, relit, remplace ou retire `author`,
  garde tous les autres champs) ; `SettingsPage` réécrite : deux `Panel`
  (« Pseudo », « Progression de la campagne »), `Button`, `Dialog` et
  classes existantes (`export-link`, `export-name-field`,
  `export-field-error`, `panel-note`, `level-result-actions`,
  `dialog-text`). Deux règles CSS ajoutées sous jetons existants :
  `.settings-page` (grille, `--space-4`) et la hauteur minimale du champ
  (`--touch-target`). Domaine, schéma de niveau, niveaux, simulation,
  enveloppes (préférences et progression restent en version 1) inchangés.
  `LevelExportDialog` n’est pas touché (il garde sa propre fusion des
  champs).
- Fichiers touchés hors périmètre : les sept fichiers de test cités plus
  haut (doublures du port) ; `docs/decisions/0008-client-side-routing.md`
  (`/settings` n’est plus provisoire) ; `docs/decisions/0011-…` (amendement
  U11 : `clear`, conservation des champs, conséquence pour
  `<id>-brouillon`).
- Écarts avec la tâche : (1) libellé « Remettre la progression à zéro », pas
  « Réinitialiser la progression » (voir contradictions) ; (2) la page
  ajoute une ligne « Niveaux résolus : N sur 17. ». Ce n’est pas un réglage :
  elle montre ce que la remise à zéro effacera et rend visible l’état neuf.
  (3) Effacer le pseudo vide aussi le champ. Enregistrer un champ vide l’oublie
  aussi, comme le champ vidé de l’export (M14).
- Contradictions rencontrées : la ligne U11 de la phase 2 dit
  « Réinitialiser la progression ». `mobile-editor-interactions.md` § Lancer,
  mettre en pause et recommencer, qui fait autorité sur l’interface, dit :
  « Le mot « Réinitialiser » n’est plus employé dans l’interface. » Le
  document d’interaction gagne, comme pour « Tester »/« Lancer » en U8. Le
  libellé reprend le vocabulaire « Remettre à zéro » de « Ràz atelier ». La
  ligne U11 est barrée. Rien n’est arbitré dans la puce luna (historique).
- Captures inspectées (Read sur les PNG) :
  `test-results/settings/{repos,pseudo-invalide,confirmation,statut}-{390x844,844x390,1440x900}.png`.
  390 × 844 : deux panneaux crème à barre de titre bleu nuit, « PSEUDO »
  puis « PROGRESSION DE LA CAMPAGNE », sur le fond nuit ; champ « Lili » à
  bordure foncée ; aide atténuée sur deux lignes ; « Enregistrer le pseudo »
  (vert, deux lignes) et « Effacer le pseudo » (neutre) côte à côte ;
  « Niveaux résolus : 2 sur 17. » puis le bouton orange « Remettre la
  progression à zéro » sur toute la largeur. Pseudo invalide : bordure
  rouge du champ, message rouge sur deux lignes sous l’aide, bouton vert
  grisé. Confirmation : voile sombre, boîte au milieu de l’écran,
  texte de six lignes, « Annuler » (neutre) et « Remettre à zéro » (orange)
  côte à côte, croix en haut à droite. Statut : « 0 sur 17. » et « Progression
  remise à zéro : seul le niveau 1 est ouvert. » en gris sous le bouton.
  844 × 390 : panneaux de 560 px de large à gauche ; les boutons du pseudo
  s’empilent (règle paysage de `.level-result-actions`) ; la page défile pour
  atteindre le second panneau ; la boîte de confirmation tient dans la
  hauteur, ses boutons sont empilés et entièrement visibles. 1440 × 900 :
  panneaux de 560 px dans la colonne centrée de 960 px, donc décalés à
  gauche (comme l’ancienne page provisoire) ; boutons du pseudo côte à côte ;
  boîte de confirmation centrée, texte sur six lignes. Rien ne déborde.
- Gate : `pnpm check` passe — typecheck, lint, formatage, Knip, contenu (19
  documents), 1073 tests Vitest en 83 fichiers, build, 72 tests Playwright
  `mobile` (71 réussis, 1 ignoré). Une première exécution s’était arrêtée
  au formatage (`e2e/settings.spec.ts` pas encore passé par Prettier),
  corrigé. Pas d’intermittence D4 ni U15 observée. Le nouvel E2E passe 9 fois
  sur 9 (`--repeat-each=3`). `tmp/check-levels.ts` (ESLint le refuse) a été
  déplacé hors du dépôt pendant `pnpm check:fast` et `pnpm check`, puis remis
  exactement à sa place : SHA-256 `1113625e…a92907` et mode 644 identiques
  avant et après.
- Non vérifié : un vrai téléphone et son clavier virtuel (le champ est en
  haut de page, la méta `resizes-content` de M14 s’applique) ; un lecteur
  d’écran ; une progression illisible effacée depuis la page (couvert par
  l’adaptateur seulement).
- Pour l'auteur : validation visuelle des douze captures ci-dessus.
  Questions (tranchées de façon conservatrice, à confirmer) : (1) libellé
  « Remettre la progression à zéro » plutôt que « Réinitialiser… » (règle
  de vocabulaire) ; (2) le texte de confirmation, assez long (six lignes en
  390 px), mentionne le verrouillage des créations « Modifier le niveau » :
  faut-il le garder ? (3) la ligne « Niveaux résolus : N sur 17. » vous
  convient-elle ? (4) en grand format, les panneaux restent alignés à gauche
  de la colonne (comme avant) : faut-il les centrer ? (5) faut-il aussi
  effacer la sauvegarde de secours `tinkerbolt:backup:progress` ? Elle est
  gardée aujourd’hui ; (6) `LevelExportDialog` liste à la main les champs à
  garder, alors que `rememberAuthor` les garde tous : l’unifier serait un
  refactoring à part.
