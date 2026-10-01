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
seulement le document). Horloge injectée.

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
et un message discret (`role="status"`) dit qu'il n'a pas été gardé ; un lien
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
l'aide « Un pseudo, pas ton vrai nom » et la mention CC BY 4.0. Port
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
