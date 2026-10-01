# Feuille de route

Rédigée le 1er octobre 2026. Remplace `feuille-de-route-luna.md`, conservée comme
historique (journal L1 à U29) : on n'y lit que l'entrée de journal qu'une tâche
cite.

Destinataire : l'agent d'implémentation qui reprend le dépôt — Claude Code
(Opus). Il peut déléguer une sous-tâche bien délimitée (un test, un adaptateur,
une passe de captures) à un sous-agent Claude Sonnet ou Opus, mais il reste
responsable du résultat : il relit le diff, lance la gate et tient le journal.

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
6. mettre à jour `docs/etat.md` (livré, dettes, dernière gate) et le journal ;
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
- modifier les niveaux de `src/content/levels/` : leur calibrage revient à
  l'auteur (§ 6).

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

1. **U12 — Poutres en trois tailles** : exporter les sources de
   `art/assets/beam/` par `art/build-sprites.py` et câbler les trois sprites
   (dette « Poutre étirée » de `etat.md`).
2. **U1 — Fantôme de placement** dessiné par le renderer
   (`plan-remise-en-jeu.md` § 5 « C1 ») ; remplace l'overlay CSS.
3. **U13 — Zones de construction visibles** et objet qui suit le doigt hors
   zone avec fantôme invalide, un seul message de refus par geste.
4. **U7 — Balle suivie** : signaler la balle cible de l'objectif.
5. **U8 — Aide du niveau 1** : indication brève et non bloquante vers « Tester »
   puis le tiroir.
6. **U10 — Invitation de mise à jour et d'installation** de la PWA, branchée sur
   `usePwaUpdateStatus` (phase sûre uniquement).
7. **U11 — Paramètres** : `/settings` est une page provisoire ; y mettre
   « Réinitialiser la progression » (confirmation destructive) et le pseudo
   retenu (M14), modifiable et effaçable.
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
4. **A4 — Description du niveau** dans la boîte d'export, à côté du titre
   (`updateLevelDescription`).

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

- **Calibrage des 17 esquisses de campagne** : l'auteur ajuste chaque niveau
  dans l'atelier (`pnpm dev`, solution révélée d'office après M11) et exporte ;
  les régressions de solution et les défis ⭐/🏆 viennent ensuite.
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
