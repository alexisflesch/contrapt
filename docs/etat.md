# État du dépôt — TinkerBolt

Dernière mise à jour : 2 octobre 2026.

Ce fichier décrit l’état réel du dépôt : ce qui est livré, les dettes connues et
la dernière exécution de la gate globale. Il est réécrit à chaque fin de tâche
et ne contient ni décision ni spécification ; celles-ci restent dans
[le cahier des charges](cahier-des-charges.md) et les ADR du dossier
`decisions/`. Le travail restant et son ordre sont dans
[la feuille de route](feuille-de-route.md).

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

## Licence

Le code de TinkerBolt est sous GNU AGPL version 3 ou ultérieure
(`AGPL-3.0-or-later`). Le texte intégral est dans [`LICENSE`](../LICENSE) ; le
README et `package.json` déclarent aussi cette licence. Les dépendances et
ressources tierces gardent leurs licences respectives. `pnpm format:check` passe
le 28 septembre 2026 ; la gate complète n’a pas été lancée.

## Réellement livré et couvert par des tests

### Domaine et application

- `LevelDocument v2` (schéma Zod strict dans `src/domain/level-document.ts`) :
  rectangle de scène obligatoire, onze familles (balle, panier, poutre, bascule,
  masse, levier, convoyeur, bouton, ventilateur, barrière, tremplin), inventaire, zones de construction, objectif panier
  unique, fils de commande `wires` facultatifs (ADR 0009). Migration v1 → v2
  (`migrateLevelDocumentV1ToV2`) testée.
- Attribution M1 (ADR 0016) : `metadata.author` (pseudo de 1 à 40 caractères
  espaces de bord exclus, sans saut de ligne ni caractère de contrôle) et
  `metadata.basedOn` (au plus 16 sources `{ title, author? }`), facultatifs en
  v2, absents de v1. Un document sans ces champs se relit à l’identique ; avec,
  il fait l’aller-retour par le codec de fichier et le codec URL, et
  `puzzleFromWorkshop` les conserve. Affichés en texte brut sur les cartes de
  « Mes niveaux » (M9) et dans l’en-tête de jeu d’un niveau reçu (M10) ;
  le titre et le pseudo se renseignent dans la boîte d’export depuis M14,
  la description depuis M14b, `basedOn` n’est jamais édité.
- Empreinte M2 (ADR 0015) : `levelFingerprint(document)`
  (`src/infrastructure/level-file/level-fingerprint.ts`, asynchrone) renvoie les
  16 premiers chiffres hexadécimaux du SHA-256 (`crypto.subtle`) du texte du
  codec de fichier ; deux documents égaux ont la même empreinte et
  `recu-<empreinte>` respecte le schéma d’identifiant. Appelée par `/shared`
  depuis M8.
- Dépôt des niveaux reçus M3 (ADR 0015 § Stockage local) : port
  `ReceivedLevelRepository` (`src/application/received/`, list, load, save,
  delete) et adaptateur `localStorage`
  (`src/infrastructure/storage/local-storage-received-level-repository.ts`), sur
  le modèle des brouillons : index `tinkerbolt:received`, une enveloppe
  `{ kind: "received-level", version: 1, data }` par
  `tinkerbolt:received:<id>`, identifiant `recu-<16 chiffres hexadécimaux>`,
  document relu par le codec de fichier, `receivedAt` ISO 8601 fourni par
  l’appelant, `playerSolution` validée par le schéma `solution` du domaine
  (désormais exporté), ni record ni solution du joueur sur une entrée non
  résolue. Valeur illisible sauvegardée sous `tinkerbolt:backup:` avant
  écrasement, quota et stockage indisponible en résultats d’erreur. Fourni à
  l’app par `ReceivedLevelRepositoryContext` depuis M8.
- Enveloppe des créations v2 M4 (ADR 0015 § Stockage local) : le port
  `DraftRepository` lit et écrit une création entière (`DraftCreation` :
  `document`, `source?`, `updatedAt`) ; `save` reçoit `document` et `source?`
  et l’adaptateur la date avec son horloge injectée
  (`createLocalStorageDraftRepository(storage, now)`, `() => new Date()` passé
  par `App`). Toute écriture produit `{ kind: "draft", version: 2, data }` où
  `document` et `source` sont la valeur JSON du texte du codec de fichier,
  relue par le codec (migrations comprises), comme pour les niveaux reçus. Une
  enveloppe v1 (`levelFile` en chaîne) reste lisible : création sans `source`,
  `updatedAt` donné par l’horloge à la première lecture, qui la réécrit en v2
  (au mieux : un échec d’écriture rend quand même la création, la lecture
  suivante retente, M4b) ; les lectures suivantes renvoient la même date. Une `source` invalide rend l’entrée invalide
  (sauvegarde `tinkerbolt:backup:draft:<id>` puis avertissement). L’éditeur
  conserve la `source` chargée à chaque enregistrement ; aucun appelant n’en
  crée encore (M6).
- Solution d’une tentative gagnante M5 (ADR 0015 § Victoire sur un niveau
  reçu) : `solutionFromAttempt(attempt)` (`src/application/puzzle/player-solution.ts`,
  pure) dérive de la provenance (ADR 0005) les poses issues de l’inventaire
  (`inventoryId`, `transform`, `placementId` quand un fil du joueur touche la
  pose) et les fils du joueur, à la forme `solution` de l’ADR 0013 ; un objet
  du décor déplacé n’y figure pas. `playSolution(level, solution)` est extraite
  et exportée de `puzzle-workshop.ts` (rend la tentative, `verifyPuzzle`
  inchangé). Rejouer la solution sur le niveau d’origine redonne la même
  tentative et gagne en simulation headless (fixture locale). Appelée par la
  victoire sur un niveau reçu depuis M10.
- Création depuis un niveau M6 (ADR 0015 § Ouvrir dans l’atelier, ADR 0016 §
  Remplissage automatique) :
  `creationFromLevel(level, { playerSolution?, createId })`
  (`src/application/drafts/creation-from-level.ts`, pure) rend une
  création `{ document, source }` : décor repris (objets, fils, zones, scène,
  objectif), `solution`, `inventory` et `challenge` retirés, poses et fils de la
  solution du joueur ajoutés `toPlace` par `restoreSolution` (extraite de
  `workshopFromPuzzle`, mêmes identifiants et même remappage), `source` = copie
  intacte du niveau ; titre « <titre> (remix) » de 160 caractères au plus, le
  titre d’origine tronqué pour garder « (remix) » entier (M6b), `author`
  retiré, `basedOn` prolongé par le niveau d’origine et tronqué à 16.
  Réexportée par `puzzleFromWorkshop`, la création d’une victoire redonne un
  puzzle dont la solution gagne (fixture, simulation headless).
- Révéler la solution de l’auteur M7, logique seule (ADR 0015 § Révéler) :
  commande d’auteur `revealAuthorSolution({ context, source })`
  (`authoring-commands.ts`) qui ajoute au document courant, marqués `toPlace`,
  les poses et les fils de `source.solution` par `restoreSolution` (déplacée
  dans `src/application/puzzle/restore-solution.ts`, qui dédoublonne désormais
  aussi les identifiants de fils), sans rien retirer ; une seule entrée
  d’historique ; un fil dont une extrémité n’est plus sur le plateau, ou qui
  viserait un appareil déjà commandé, est ignoré et compté ; une pose hors de
  la scène l’agrandit par `withSceneIncluding`, comme `addAuthoredPlacement`
  (M7b : la révélation n’est jamais refusée en bloc). La commande expose `ignoredWireCount(state)` (nombre de fils ignorés
  pour l’état donné) ; refus `authoring-only` en contexte joueur,
  `solution-not-found` pour une source sans solution. Sur une création
  intacte, le résultat égale `workshopFromPuzzle` de la source. Appelée par
  l’atelier depuis M12.
- Réception d’un niveau M8 (ADR 0015 § Réception) : cas d’usage pur
  `receiveLevel(repository, document, origin, fingerprint, clock)`
  (`src/application/received/receive-level.ts`) ; l’empreinte (ou
  `unavailable`) et l’horloge sont fournies par l’appelant. Un nouveau
  document est enregistré `recu-<empreinte>`, non résolu, daté par l’horloge ;
  un document déjà reçu garde `origin`, `solved`, record et solution du
  joueur, et seul son `receivedAt` est rafraîchi pour le remettre en tête
  (M9, au mieux : un échec d’écriture le laisse tel quel) ; un objet ou un
  fil `toPlace` est refusé (`workshop-document`) ; empreinte indisponible ou
  erreur du dépôt sont un résultat `not-kept`. `/shared` décode, calcule
  l’empreinte (`crypto.subtle` absent → non gardé), reçoit, puis joue ; un
  niveau non gardé affiche au-dessus du plateau un statut discret
  (`role="status"`, « Ce niveau n’a pas été gardé sur cet appareil. »), à
  masquer d’un toucher ; un lien d’atelier affiche « Ce lien est un atelier, pas
  un niveau à jouer. » sans plateau ; un lien invalide n’enregistre rien. Le
  dépôt est fourni par `ReceivedLevelRepositoryContext`
  (`src/app/received-level-repository-context.ts`), branché dans `App`
  (`localStorage` par défaut, prop `receivedLevelRepository` pour les tests).
  Les victoires sur `/shared` sont enregistrées depuis M10. Validation visuelle attendue (statut
  discret, captures `test-results/shared/shared-not-kept-*.png`).
- Page « Mes niveaux » M9 (ADR 0015 § Page « Mes niveaux », ADR 0008
  amendée) : `/my-levels` (`MyLevelsPage.tsx`), dans le menu partagé et en
  quatrième destination de l’accueil (grille de deux colonnes dès 700 px,
  quatre dès 1 100 px). Section « Mes créations » triée par `updatedAt`
  décroissant (`listCreations`) : Modifier (`/editor?draft=<id>`), Jouer
  (même route, état de navigation `{ playPuzzle: true }` qui ouvre
  directement « Jouer le puzzle » U22 ; désactivé sans objet à placer),
  Partager (boîte d’export U16, vérification ADR 0013 comprise), Dupliquer
  (`duplicateCreation` : `creation-<aléa>`, même `source`, titre « (copie) »
  gardé entier par `withTitleSuffix`, partagé avec « (remix) »), Supprimer ;
  la création `<id>-brouillon` d’un niveau de campagne verrouillé est marquée
  « Verrouillé » avec Supprimer seulement. Section « Niveaux reçus » triée par
  `receivedAt` décroissant (`listReceivedLevels`) : « par <auteur> » et
  « d’après <titre> (par <auteur>) » en texte brut, Résolu et record ou « Pas
  encore résolu », Jouer (`/my-levels/:id/play`), Partager (fichier ou lien du
  document tel quel, `ReceivedLevelShareDialog`, sans vérification),
  Supprimer. Toute suppression passe par une confirmation `Dialog`
  (« Annuler » ciblé). « Nouveau niveau » ouvre `/editor` ; « Importer un
  fichier » lit le fichier (taille puis codec L22, `read-level-file.ts`) et le
  reçoit (`origin: 'file'`) sans quitter la page ; un atelier est refusé
  (« Ce fichier est un atelier, pas un niveau à jouer. »). `/import`
  redirige vers `/my-levels` ; `LevelImportPage` et `import-level-draft.ts`
  sont retirés. `/my-levels/:id/play` joue le niveau reçu (M10) ; un
  identifiant inconnu affiche une erreur et un lien vers « Mes niveaux ».
  « Modifier » un niveau reçu ouvre une nouvelle création (M11). Validation visuelle attendue
  (captures `test-results/my-levels/my-levels-{empty,filled}-{390x844,844x390,1440x900}.png`,
  `my-levels-delete-390x844.png`, `test-results/home/accueil-*.png`).
- Jouer un niveau reçu M10 (ADR 0015 § Victoire sur un niveau reçu, ADR 0016
  § Affichage) : cas d’usage pur
  `recordReceivedVictory(repository, id, attempt)`
  (`src/application/received/record-received-victory.ts`) : à partir de
  l’instantané de la tentative pris au lancement, l’entrée devient résolue,
  `bestObjectCount` garde le minimum (`countObjectsUsed`, ADR 0010) et
  `playerSolution` est remplacée par `solutionFromAttempt` ; entrée absente
  (`not-found`) ou erreur du dépôt (`not-kept`) sont des résultats, sans
  exception. `ReceivedLevelBoard` (`src/app/`) joue un niveau reçu pour
  `/my-levels/:id/play` et `/shared` : il l’appelle à la victoire quand le
  niveau est gardé (rien sinon), ignore une erreur de stockage, n’affiche que
  ✅ (palier « Résolu » seul, sans niveau suivant) et ne touche jamais la
  progression de campagne. L’en-tête montre « par <auteur> · d’après <titre>
  (par <auteur>) » (première source) en texte brut, à la place de « Mode
  joueur » (`AppHeader`, prop `attribution`, helper `level-attribution.ts`
  partagé avec les cartes) ; en paysage téléphone, sur la ligne du titre.
  `/my-levels/:id/play` a un bouton d’en-tête « Mes niveaux » (sortie `exit`,
  libellé court `shortLabel`), qui sert aussi au bandeau d’échec. Un fichier
  importé non gardé (quota, stockage, `crypto.subtle` absent) affiche sous
  l’alerte « Jouer quand même » : le niveau se joue sur place dans
  `/my-levels`, sans rien enregistrer (victoire comprise), avec le statut
  discret « Ce niveau n’a pas été gardé sur cet appareil. » et « Mes niveaux »
  pour revenir à la liste. Validation visuelle attendue (captures
  `test-results/received-play/{received-header,received-victory,import-not-kept,import-not-kept-play}-{390x844,844x390,1440x900}.png`).
- Modifier et Remixer M11 (ADR 0015 § Points d’entrée, « Un niveau de
  campagne verrouillé », § Révéler) : cas d’usage
  `saveCreationFromLevel(repository, level, { playerSolution?, createId })`
  (`src/application/drafts/save-creation-from-level.ts`) qui enregistre
  `creationFromLevel` sous un `creation-<aléa>` libre (`freeCreationId`,
  partagé avec `duplicateCreation`). « Modifier » d’un niveau reçu
  (« Mes niveaux ») ouvre une nouvelle création, la `playerSolution` posée
  « à placer » s’il est résolu ; « Remixer », dans la boîte de victoire de la
  campagne et des niveaux reçus (`CampaignVictory.onRemix`, icône `Shuffle`),
  pose la tentative gagnante, celle de l’instantané pris au lancement
  (`useRemix`, `solutionFromAttempt`) ; un échec de stockage s’affiche en
  alerte dans la boîte. Le niveau d’origine n’est jamais modifié. Un niveau
  de campagne verrouillé (`isLevelUnlocked` recalculé depuis la progression,
  ou `unlockAllLevels`) a son « Modifier le niveau N » désactivé, et
  `/editor?draft=<id>-brouillon` affiche « Ce niveau est encore verrouillé. »
  avec un lien vers `/levels` sans lire ni écrire la création
  (`LockedLevelPage`, partagée avec `/levels/:id/play`). Prop d’`App`
  `developmentMode` (`import.meta.env.DEV` passé par `main.tsx`, contexte
  `DevelopmentModeContext`) : une création de campagne **neuve** s’ouvre
  solution révélée par la commande M7 (`openCampaignDraft(…, { revealSolution
})`), une création existante est rouverte telle quelle ; la fiche de
  calibrage U28 n’est affichée qu’en développement. Une victoire sur un niveau
  reçu qui ne peut pas être écrite affiche le statut discret « Ta victoire
  n’a pas pu être enregistrée sur cet appareil. ». Validation visuelle
  attendue (captures `test-results/remix/{levels-locked,remix-victory,remix-workshop,locked-draft}-{390x844,844x390,1440x900}.png`,
  `test-results/my-levels/my-levels-filled-*.png`).
- Révéler dans l’atelier M12 (ADR 0015 § Révéler) : dans l’atelier d’une
  création dont la `source` porte une solution, le menu d’en-tête propose en
  premier « Révéler la solution de l’auteur » (icône `Eye` ; prop
  `menuActions` d’`AppHeader`/`AppFrame`, prop `authorSource` de
  `BoardShell`, passée par `EditorPage` à l’atelier seulement). Une boîte de
  confirmation (`Dialog`, « Annuler » ciblé, « Révéler la solution »)
  exécute la commande M7 dans l’historique de l’atelier : une entrée, annulée
  par « Annuler », création enregistrée comme toute modification engagée. Si
  des fils sont ignorés, un statut discret (`role="status"`, à masquer d’un
  toucher) dit « 1 fil de la solution de l’auteur n’a pas pu être posé. » /
  « N fils … n’ont pas pu être posés. ». Entrée absente de l’atelier libre,
  d’une création sans `source` ou dont la `source` n’a pas de solution, hors
  construction et en « Essayer en joueur ». Le menu d’en-tête défile
  désormais quand il dépasse la hauteur de l’écran (téléphone en paysage).
  Validation visuelle attendue (captures
  `test-results/reveal/{reveal-menu,reveal-confirm,reveal-workshop}-{390x844,844x390,1440x900}.png`).
- Partager M14 (ADR 0016 § Licence, § Pseudo) : la boîte d’export (U16) d’une
  création propose « Nom du niveau » et « Pseudo (facultatif) », avec l’aide
  « Un pseudo, pas ton vrai nom » et la mention exacte de licence CC BY 4.0.
  Les espaces de bord sont retirés à la saisie ; un pseudo vide retire
  `author` ; un pseudo refusé par le schéma (caractère de contrôle, saut de
  ligne, U+2028) est dit sous le champ (`role="alert"`, `aria-invalid`) et
  désactive les deux exports. Le fichier et le lien portent les valeurs
  saisies. À chaque export, la boîte transmet deux commandes d’auteur,
  `updateLevelTitle` et la nouvelle `updateLevelAuthor` (annulables,
  revalidées par le schéma) : dans l’atelier, elles passent par son
  historique (deux entrées au plus, « Annuler » les retire) et la création
  est enregistrée comme toute modification engagée ; depuis « Partager »
  de « Mes niveaux », elles sont appliquées à la création, enregistrée avec
  sa `source`. Le « Partager » d’un niveau reçu est inchangé. Port
  `PreferencesRepository` (`src/application/preferences/`) et adaptateur
  `localStorage` (`local-storage-preferences-repository.ts`) : enveloppe
  `{ kind: "preferences", version: 1, data: { author? } }` sous
  `tinkerbolt:preferences`, pseudo validé par la règle `metadata.author`
  (`authorSchema`, désormais exporté), valeur illisible sauvegardée sous
  `tinkerbolt:backup:preferences`, quota et stockage indisponible en
  résultats d’erreur ; fourni par `PreferencesRepositoryContext`. Le pseudo
  exporté y est retenu (un champ vidé l’oublie) et préremplit l’export d’une
  création sans `author` ; une erreur de lecture ou d’écriture n’empêche
  jamais l’export. `index.html` déclare `interactive-widget=resizes-content`
  pour que le clavier virtuel d’Android réduise la fenêtre au lieu de
  recouvrir la boîte. Validation visuelle attendue (captures
  `test-results/share/{share-fields,share-invalid-pseudo}-{390x844,844x390,1440x900}.png`,
  `share-keyboard-390x508.png`).
- Description M14b (ADR 0016) : `updateLevelDescription` (commande d’auteur
  annulable, refusée au joueur) ne retire plus que `description` et garde
  titre, `author` et `basedOn` ; elle ne rogne rien et refuse plus de
  2000 caractères. L’atelier libre (`workshop.json`) n’a plus de
  description : une création partie de zéro n’en a pas, une création issue
  d’un niveau garde celle du niveau. La boîte d’export d’une création
  propose « Description (facultatif) » (zone de texte de 3 lignes,
  `maxLength` 2000) entre le nom et le pseudo, préremplie avec la description
  du niveau ; les espaces de bord sont retirés à l’export et un champ vidé
  retire `description` (jamais `''`). Le fichier et le lien portent la
  saisie ; une troisième commande, `updateLevelDescription`, rejoint le
  titre et le pseudo (dans l’atelier, une entrée d’historique de plus au
  plus, « Annuler » la retire ; depuis « Mes niveaux », appliquée à la
  création enregistrée avec sa `source`). Le « Partager » d’un niveau reçu
  est inchangé. Les cartes des niveaux reçus de « Mes niveaux » affichent
  la description en texte brut (classe `level-card-description` de
  `/levels`, sans troncature, comme elle), rien sans description ; les
  cartes de « Mes créations » ne l’affichent pas. Validation visuelle
  attendue (captures
  `test-results/share/share-description-{390x844,844x390,1440x900}.png`,
  `share-description-keyboard-390x508.png`,
  `test-results/my-levels/my-levels-received-description-{390x844,844x390,1440x900}.png`).
- Géométrie des familles centralisée dans `src/domain/family-geometry.ts`,
  partagée par la physique et le rendu.
- `History` générique (commande atomique, undo/redo, no-op sans entrée,
  regroupement des prévisualisations).
- `ConstructionAttempt` : placement depuis l’inventaire, déplacement, rotation,
  propriétés, retrait, relier/délier un fil (le joueur avec un fil de son
  inventaire, rendu quand il le délie ; U21), pour les contextes joueur et auteur,
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

- **Accueil `/`** : landing avec les couleurs et assets locaux de l’application,
  scène d’atelier illustrée, accès à la campagne, à l’atelier, à la démonstration
  et aux paramètres. La commande principale lance le premier niveau accessible
  non résolu, ou propose de revisiter la campagne terminée. Le carnet de bord
  affiche les niveaux résolus, accessibles, les chapitres et une jauge de
  progression, calculés sur la campagne actuelle via le contexte existant.
  Les erreurs de stockage et sauvegardes illisibles restent signalées.
  Le menu de chaque écran propose un retour à l’accueil (ADR 0008 amendée).
- Renderer Canvas 2D (ADR 0006) avec DPR, sprites en calques (balle à motif
  tournant, rouge pour celle de l’objectif et bleue pour les autres, panier avant/arrière, bascule pied + planche, levier, convoyeur à
  tapis défilant, bouton à capuchon qui s’enfonce, ventilateur à pales tournantes
  écrasées en perspective et orientable, barrière dont seule la partie sortie du
  poteau est dessinée, tremplin à ressort tassé à l’impact), ordre de dessin déterministe (la balle après le panier).
- Tiroir de propriétés compact (G2) : son scrim ne ferme le tiroir que pour
  une pression commencée sur lui (ou une activation au clavier). Le tiroir
  s’ouvre pendant le toucher qui sélectionne un objet ; le clic que le
  navigateur émet à la fin de ce toucher pouvait tomber sur le scrim tout juste
  monté et refermer aussitôt le tiroir.
- Chargeur des sprites : une requête en cours est partagée, un sprite prêt est
  conservé, et un échec est retenté au rendu suivant, jusqu’à trois tentatives par
  asset.
- En-tête de l’atelier (U23) : les titres « Éditeur de niveaux » et « Éditeur ·
  <titre> » ne sont plus rendus sur le plateau ; « Mode éditeur » et les actions
  restent accessibles. Le parcours E2E produit des captures en 390 × 844,
  844 × 390 et 1440 × 900.
- Export U24 : les puzzles produits par l’atelier ne portent aucun `challenge` ;
  les seuils Élégant/Minimal sont réservés aux niveaux qui les définissent explicitement.
- Export U25 : les fils fixes restent dans le décor ; les fils marqués « À
  placer », ainsi que ceux qui touchent un objet à placer, passent dans
  l’inventaire `wire` et la solution de référence. L’inspecteur auteur permet
  de choisir « Fixe / À placer » pour chaque fil connecté.
- U26 : le brouillon du niveau 1 conserve son inventaire de poutre et affiche le
  catalogue auteur complet ; une non-régression applicative couvre ce parcours.

- Caméra pure `src/presentation/board-camera.ts` (ADR 0007) : ajustement
  `contain` à la scène, bornes de zoom, panoramique, pincement, boutons de
  cadrage, recadrage sur vrai redimensionnement seulement.
- Hit-test pur `src/presentation/board-hit-test.ts` (cible ≥ 44 px CSS). Sur le
  plateau : sélection au toucher/clic, désélection sur le vide, déplacement direct
  en une seule entrée d’historique, poignées de rotation des poutres et des
  leviers en atelier, annulation atomique sur `pointercancel` ou second doigt.
- Tiroir du mode joueur limité aux familles présentes dans l’inventaire du
  niveau ; il affiche la quantité restante et la taille de poutre. Une entrée à
  quantité zéro reste visible et désactivée. En mode auteur (atelier libre et
  brouillon), le catalogue propose toutes les familles sauf la balle rouge et
  le panier de l’objectif, avec « Balle bleue » (U20) : il pose l’objet directement dans le
  niveau (commande `addAuthoredPlacement`), sans exiger ni consommer
  l’inventaire du joueur ; l’objet posé est verrouillé pour le joueur, comme
  tout objet de départ. La balle rouge et le panier de l’objectif sont
  uniques et déjà posés : le catalogue ne les propose pas (décision auteur du
  27 septembre 2026). Le canevas expose `data-red-balls` et `data-blue-balls`.
- PWA L28 : le build génère un manifeste installable et un service worker qui
  précache l’application et ses assets ; les routes de jeu et d’atelier ont un
  repli hors ligne. Le hook `usePwaUpdateStatus(phase)` expose une mise à jour en
  attente seulement pendant une phase sûre, hors simulation et manipulation.
- **U27 — icônes d’interface** : les pictogrammes d’action, de navigation, de cadrage, de catalogue, d’export et de résultat utilisent `lucide-react` (ADR 0014). Les libellés accessibles restent inchangés.
- **U6 — recommencer et remise à zéro de l’atelier** : pendant la simulation,
  une seule commande « Recommencer » est visible ; dans l’atelier, « Ràz atelier »
  est placé à gauche de « Tester » et ouvre une confirmation qui décrit la perte,
  avec « Annuler » ciblé par défaut. En mode puzzle, le même contrôle devient
  « Recommencer le niveau » et restaure le document initial après confirmation.
  Dans les deux modes, la remise à zéro ferme les tiroirs et sélections ; après
  une victoire d’atelier, le résultat conserve uniquement « Retour à l’édition ».
- **U4 — bandeau de résultat de campagne** : après une victoire sur un niveau de
  la campagne, le bandeau affiche le palier obtenu par la tentative (Résolu,
  Élégant, Minimal, `data-level-tier`), le nombre d’objets posés compté au
  lancement, puis la révélation progressive de l’ADR 0010 calculée sur le
  meilleur résultat enregistré (« Tu penses pouvoir le faire avec N ? », puis
  « Record à battre : avec N objets. », rien après le palier Minimal ; « Nouveau record »
  sous le minimum connu). « Niveau suivant » ouvre le niveau suivant de la
  campagne s’il existe et est débloqué ; une seule commande « Recommencer ».
  L’atelier, la démonstration et les niveaux partagés gardent le bandeau simple.
- **U5 — liste des niveaux par chapitres** : `/levels` regroupe les niveaux par
  cinq chapitres : Les billes de service, Commandes à distance, Le vent,
  L'ordre et le temps et Grandes machines. La numérotation est continue ; un
  niveau verrouillé reste visible avec
  « Verrouillé » et un bouton « Lancer » désactivé ; un niveau résolu affiche
  son palier (icône et libellé, `data-level-tier`) recalculé depuis le meilleur
  résultat. « Modifier le niveau N » (U17, M11) est désactivé comme « Lancer »
  tant que le niveau est verrouillé ; l’URL directe d’un niveau verrouillé
  affiche « Ce niveau est encore verrouillé. » (U5b) ; sous `pnpm dev`,
  `unlockAllLevels` débloque tout.
- **Retouche visuelle de `/levels`** : un bandeau de campagne donne les
  dimensions du parcours, les chapitres sont séparés par des plaques numérotées
  et chaque carte porte son numéro, son état et son titre dans une hiérarchie
  plus nette. Le chrome bleu nuit, les panneaux crème, les accents jaunes et les
  boutons par intention reprennent la direction de l’artwork de référence sans
  dégradé ni faux relief. Les états verrouillés et les paliers restent explicites
  par le texte et l’icône, indépendamment de la couleur.
- **U4b — modale de victoire** (campagne) : « Bravo ! », paliers allumés ou
  estompés (le palier Résolu seul sans défi), « Niveau suivant », « Recommencer », « Voir la
  scène » ; bandeau réduit sous le plateau pour rouvrir le résultat.
- **U14b — fils en équerre** : horizontal/vertical, un coude au plus.
- **U22/U25 — atelier créateur de puzzles** (ADR 0013) : réglage « Fixe / À
  placer » dans l’inspecteur de l’atelier (annulable, jamais sur la balle ni le
  panier de l’objectif, champ `toPlace` du document) ; le même réglage est
  disponible pour chaque fil connecté ; contour pointillé violet autour des
  objets à placer pendant la construction ; bouton d’en-tête « Jouer » (« Jouer
  le puzzle ») qui ouvre le puzzle en mode joueur sur une copie, avec « Retour à
  l’atelier » ; l’export (fichier et lien) produit le puzzle — décor fixe,
  inventaire des objets à placer regroupés, fils à placer en `wire`, `solution`
  de référence, zone = scène si l’atelier n’en a pas — après vérification par
  simulation à pas fixe (solution
  posée par les commandes du joueur : gagne ; décor seul : ne gagne pas ; au
  moins un objet à placer), sinon un message dit pourquoi. Un brouillon de
  campagne d’un niveau à solution se rouvre sous forme d’atelier.
- Panneau « Propriétés » (rail droit en grand format, tiroir compact sur petit
  écran) : longueur de poutre, cran de départ du levier, sens du convoyeur,
  rotation libre des poutres, limitée à ±135° pour les leviers, et par quarts
  de tour du ventilateur, de la barrière et du tremplin (boutons et poignée),
  états de départ du ventilateur et de la barrière, circuits du fil et
  **Délier**, suppression.
- Carte « Fil » du catalogue auteur (U15, atelier et brouillons) ; en mode
  joueur, carte « Fil » par entrée `wire` de l’inventaire, avec sa quantité,
  désactivée une fois épuisée ; le geste s’arrête au dernier fil (U21). Le
  joueur ne voit « Délier » que pour ses propres fils : toucher la carte, puis un levier ou un bouton, puis chaque appareil
  à commander (la source est sélectionnée, l’inspecteur compact reste fermé) ;
  le geste reste sur la source jusqu’à « Terminer les fils »
  (« Annuler le fil » avant le premier). Guidage et refus dans une carte
  au-dessus du plateau ; les refus viennent du domaine
  (`controlWireSourceIssue`, `controlWireTargetIssue`) et de la commande
  (`wire-already-connected`). Chaque fil passe par `connectControlWire`
  (annuler/rétablir). Le canevas expose `data-wires` (`source>cible`).
  L’ancien bouton « Relier à un appareil » du panneau est retiré. Vignette
  provisoire en SVG, en attendant un dessin de l’auteur.
- Fils de commande droits, sous les objets, translucides (presque effacés en
  simulation), lettres de circuit (`src/presentation/control-wires.ts`,
  `wire-renderer.ts`). Le rouge est réservé à la balle de l’objectif (U19) : la
  palette des circuits n’a ni rouge ni teinte voisine, la poignée du levier
  n’est plus rouge, et la balle du tiroir du joueur est bleue.
- Routage côté client (ADR 0008) : `/levels`, `/levels/:levelId/play`,
  `/my-levels`, `/my-levels/:id/play`, `/import` (redirige vers `/my-levels`),
  `/editor`, `/demo` (machine en chaîne qui se résout seule, testée),
  `/settings` (vide) et `/shared` (niveau décodé depuis le fragment URL,
  enregistré comme niveau reçu avant d’être joué depuis M8).
  `/` ouvre l’accueil ; le premier niveau reste accessible par son URL directe.
- Mise en page validée aux six formats du plan (D4) ; objectif dans une boîte de
  dialogue à la demande ; bandeau de résultat dans un emplacement réservé.
- Atelier libre `src/content/levels/workshop.json` (scène 16 × 9, inventaire de
  99 par famille, contexte auteur).
  Depuis M13, il est enregistré à sa première modification engagée : une
  création `creation-<aléa>` (aléa du composition point
  `src/app/random-id-part.ts`, date de l’horloge du dépôt), sans `source`, et
  l’URL `/editor` est remplacée par `/editor?draft=<id>` (`replace`, pas
  d’entrée d’historique en plus). Le même atelier reste monté sous la nouvelle
  URL : historique « Annuler »/« Rétablir » et sélection sont conservés ; les
  modifications suivantes l’enregistrent sous le même identifiant
  (`src/application/drafts/save-free-creation.ts`, `EditorPage.tsx`). Ouvrir
  l’atelier sans rien faire n’écrit rien ; « Atelier de construction » depuis
  une création ouvre un atelier neuf.
- Export U16 : en mode auteur, le bouton « Exporter » de l’en-tête ouvre une
  boîte qui télécharge le document engagé de l’auteur (`<id>.json`, codec L22,
  `application/json`) ou copie le lien `/shared#level=…` (codec L23) avec le
  retour « Lien copié ». Sans presse-papiers, le lien s’affiche dans un champ
  sélectionnable. Un document que le schéma refuse n’est pas exporté : la boîte
  en donne les raisons (`src/app/level-export.ts`, `LevelExportDialog.tsx`).
- Brouillon d’un niveau de campagne U17 : chaque carte de `/levels` porte
  « Modifier le niveau N » (M11), qui ouvre `/editor?draft=<id>-brouillon`. Depuis M6,
  une création neuve est construite par `creationFromLevel` (sans solution
  posée, sans inventaire, titrée « <titre> (remix) », niveau gardé en `source`)
  ; une création existante est rouverte telle quelle
  (`src/application/drafts/campaign-draft.ts`). La fiche de calibrage U28 lit
  toujours le niveau embarqué, et n’est affichée qu’en développement (M11). En mode création, le tiroir du catalogue auteur et
  « Annuler »/« Rétablir » s’affichent même sans inventaire (`BoardShell`,
  `SimulationControls`) ; en mode joueur, la règle B1 est inchangée.
  Chaque état engagé de l’historique est enregistré dans le brouillon. Le
  contexte auteur ignore les permissions joueur : les objets de départ se
  déplacent et tournent. Le niveau embarqué et la progression ne changent pas.

### Déploiement et mesure

- Déploiement GitHub Pages par `.github/workflows/deploy-pages.yml` (push sur
  `main` ou lancement manuel), sous le sous-chemin `/tinkerbolt/` (ADR 0008,
  amendement). Build vérifié localement sous ce sous-chemin : routes profondes,
  sprites et fonds chargés sans erreur.
- Page de mesure `/bench` (porte de l'ADR 0002) : scène dense de 31 corps
  dynamiques et 6 articulations, mesure de la physique seule (médiane, 95e
  centile, pire cas sur 1 200 pas) et `/bench/play` qui joue la scène sur le
  plateau avec un compteur d'images par seconde. Sur le PC de développement :
  95e centile 1,3 ms par pas, 60 images/s. Sur téléphone : voir ADR 0002
  § Résultat de la porte (Planck confirmé).

### Contenu

- **N1 — nouvelle campagne en esquisses** : 17 niveaux JSON au format U22 sont
  embarqués sous les identifiants `campaign-01` à `campaign-17`, répartis en
  cinq chapitres et accessibles dans l’ordre. Les scènes, décors, inventaires,
  fils et solutions sont indicatifs ; chaque description commence par
  « Esquisse non calibrée. » et aucun niveau ne porte encore de défi de
  progression.
- Les objets de décor sont verrouillés pour le joueur ; les inventaires et les
  solutions approximatives suivent les familles décrites dans
  `docs/levels/nouveaux-niveaux.md`. Le niveau 15 de ce document (minuteur)
  est volontairement différé : `campaign-15` correspond au niveau 16,
  « Le sonneur », puis `campaign-16` et `campaign-17` ferment la campagne
  actuelle.
- Tant que l’auteur n’a pas ajusté puis exporté les esquisses depuis U17/U22,
  aucune régression headless ne prétend que leur solution gagne. Les tests de
  registre, de schéma, de progression, de brouillon, de partage et les
  parcours Playwright couvrent néanmoins leur chargement et leur navigation.
- `pnpm content:check` valide les 19 documents embarqués : les 17 niveaux de
  campagne, la démonstration et l’atelier.
- **Fiche de calibrage U28** : ouvrir un brouillon de campagne affiche la fiche
  de l’esquisse source avec l’intention/essai décrit par l’auteur, l’inventaire
  exact autorisé et ses quantités, la solution approximative (placements,
  rotations et fils) et le décor fixe à préserver. Elle se referme puis se
  rouvre depuis le catalogue auteur ; l’atelier libre et les brouillons
  personnalisés ne sont pas concernés. Le catalogue auteur reste complet pour
  permettre l’expérimentation, la fiche faisant foi pour l’inventaire joueur.

## Dettes et limites explicites

- **Atelier libre sans message d’échec (M13).** Si l’enregistrement de la
  première modification échoue (quota, stockage indisponible), l’atelier
  continue sans changer d’URL et retente à la modification suivante, sans
  rien dire à l’auteur. Les enregistrements suivants d’une création échouent
  de même en silence (comme ceux de tout brouillon). Un message discret reste à
  décider.
- **Partage pendant une simulation (M14).** La boîte d’export reste ouverte
  pendant qu’une machine tourne ; un export à ce moment produit bien le
  fichier et le lien, mais l’atelier refuse les commandes de titre, de
  pseudo et de description (refus `editing-unavailable-during-simulation`, signalé par le
  retour habituel de l’atelier) : la création garde son ancien titre. Non
  testé, cas jugé rare.
- **Niveau reçu (M10).** En 390 px, l’en-tête de `/my-levels/:id/play`
  (bouton « Mes niveaux », objectif, menu) ne laisse que « par <auteur> ·
  d’a… » de l’attribution, tronquée par une ellipse (accepté par le pilote
  en M11).
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
- **Calibration des esquisses** (décision auteur du 27 septembre 2026) : les
  17 niveaux de campagne sont livrés comme points de départ. L’auteur doit les
  ouvrir sous `pnpm dev` avec « Modifier le niveau » (solution révélée et
  fiche de calibrage, M11), ajuster la physique et exporter les
  documents avant activation de régressions de solution. La fiche U28 facilite
  désormais cette reprise ; le calibrage physique final reste à faire.
- **Parcours « Modifier »** : la position actuelle du bouton sur la liste des
  niveaux est conservée provisoirement. Son éventuel déplacement vers un accès
  auteur plus discret sera réévalué séparément.
- **Progression de campagne** : L19 calcule les paliers, records, indices et
  déblocages ; L20 persiste les records dans une enveloppe locale validée ; L21
  enregistre les victoires depuis le snapshot du lancement et expose le hook
  `useCampaignProgress()` sans ajout visuel. La demande de stockage persistant est
  faite une seule fois après la première victoire. Le codec L23 et la route
  `/shared` L24 sont livrés ; les niveaux partagés restent hors campagne et ne
  créent ni progression ni brouillon ; depuis M8, ils sont gardés comme
  niveaux reçus. La PWA L28 est livrée selon l’ADR 0012.
  Les esquisses actuelles ne portent aucun défi : les paliers restent réservés
  aux niveaux calibrés qui en définissent explicitement un.
- **Fichiers et partage** : L22 encode et décode les documents avec validation
  et migration ; L23 sérialise les fragments URL avec CRC-32 et décompression
  bornée ; L24 valide location.hash, puis ouvre le document en mode joueur ou
  affiche une erreur avec un lien vers la liste. L’import de fichier se fait
  depuis « Mes niveaux » et aboutit à un niveau reçu (M9).
- **Brouillons L26** (créations depuis M4) : `DraftRepository` et son adaptateur `localStorage` stockent
  une création par identifiant sous `tinkerbolt:draft:<id>`, avec l’index
  `tinkerbolt:drafts`. Les enveloppes versionnées sont validées, les documents
  passent par le codec de fichier L22, et les valeurs corrompues sont sauvegardées
  avant remplacement. La fonction pure
  `decideDraftAutosave` limite les essais d’enregistrement à une fois par seconde
  pendant l’édition et autorise un enregistrement immédiat au lancement d’un test ;
  elle n’est toujours pas reliée : chaque état engagé est enregistré, et une
  limitation sans enregistrement final perdrait la dernière modification (M13
  ne l’a pas branchée).
- **PWA L28** : `vite-plugin-pwa` 1.3.0 et Workbox 7.4.1 produisent le manifeste,
  les icônes provisoires, le précache (environ 10 Mio) et le service worker de
  production. Le test E2E confirme l’ouverture du niveau 1 après rechargement hors
  ligne. La proposition visible d’installation et de mise à jour (U10) reste un
  travail d’interface.
- **Fils du joueur (U21)** : le joueur ne relie qu’avec les fils de
  l’inventaire du niveau ; aucun niveau de campagne n’en donne encore, et
  l’atelier ne permet pas d’ajouter une entrée « Fil » à l’inventaire (pas
  d’interface d’édition d’inventaire, voir « Mode auteur incomplet »).
- **Inspecteur compact et sélection** : quand l’inspecteur compact est fermé
  et qu’un objet reste sélectionné, toucher un autre objet ne le rouvre pas
  (il faut « Ouvrir les propriétés ») ; constaté pendant U21, préexistant.
- **E2E du catalogue** : la transition de hauteur du tiroir pouvait encore
  recouvrir le plateau après sa fermeture logique ; les parcours U15 et niveau 9
  attendent désormais sa hauteur repliée avant le toucher suivant.
- **E2E sous surcharge (G2)** : les causes des flakes L17b et U15 sont
  corrigées (voir la dernière gate). Avec 16 workers sur 12 cœurs, U15 échoue
  encore 8 fois sur 100 sans lien avec ces causes : 6 dépassements du délai de
  30 s du test pendant les captures pleine page finales, et 2 dépassements de
  l’attente de 1 s de `waitForCatalogueToCollapse`. Non observé à 12 workers ni
  dans la gate.
- **Retest du Xiaomi après L2c** : le vieux téléphone avait exigé un rechargement
  de `/bench/play`. Le chargeur retente maintenant un asset en échec lors des
  rendus suivants, au plus trois fois ; le comportement doit encore être vérifié
  sur cet appareil.
- **Commandes auteur L25** : `src/application/construction/authoring-commands.ts`
  fournit les commandes annulables pour la scène, les zones, l’inventaire, les
  permissions, l’objectif, les métadonnées, le défi et l’ajout d’un objet hors
  inventaire. Elles sont refusées en contexte joueur et chaque document accepté
  est revalidé par le schéma. Seul l’ajout d’objet est exposé (catalogue, U20).
- **Mode auteur incomplet** : l’atelier ne permet pas encore de créer et gérer
  ces commandes dans l’interface (scène, zones, inventaire, objectif,
  métadonnées). Depuis U22, l’export remplace l’inventaire de l’atelier par les
  objets à placer.
- **Atelier U22/U25** : revenir de « Jouer le puzzle » remonte l’atelier sur son
  dernier document, l’historique annuler/rétablir repart de là ; les fils à
  placer sont exportables et rouverts avec leur marquage ; la création du
  niveau 1 n’a plus d’inventaire (M6) mais garde son catalogue auteur (U26).
  Les brouillons de campagne créés avant M6 gardent leur solution posée et
  leur inventaire (ADR 0015) ; sous `pnpm dev`, une création neuve s’ouvre
  solution révélée (M11) ; la commande « Révéler » est dans le menu de
  l’atelier depuis M12.
- **Brouillons U17** : aucun moyen de repartir du niveau d’origine une fois le
  brouillon créé (le supprimer depuis « Mes niveaux » puis « Modifier le
  niveau » en recrée un). Une création `creation-<aléa>` remixée d’un niveau
  de campagne n’est pas verrouillée si la progression est ensuite
  réinitialisée : seul `<id>-brouillon` l’est (ADR 0015).
- **E2E sous charge (M11)** : la première gate après M11 a échoué une fois
  sur `layout.spec.ts` › « D4 — le scrim des propriétés… » (« Poutre
  moyenne » introuvable : le catalogue de l’atelier libre ne s’était pas
  ouvert au clic) ; 10 répétitions isolées passent (210/210) et la gate
  relancée passe. L’atelier libre n’est pas touché par M11.
- `format:check` ne couvre pas le Markdown.
- Le workflow `.github/workflows/check.yml` exécute la gate sur push et pull
  request avec Node 24, cache pnpm et Chromium Playwright. Son premier passage
  distant reste à vérifier au prochain push ; aucune matrice de téléphones
  physiques n’est définie.
- Un avertissement peer préexistant reste présent : `typescript-eslint@8.42.0`
  déclare TypeScript `<6`, alors que le dépôt utilise TypeScript 6.0.3. Il n’est
  pas lié aux pairs Workbox installés en L28.

## Dernière exécution de la gate

`pnpm check` après M14b (2 octobre 2026) : passe du premier coup —
typecheck, lint, formatage, Knip, contenu (19 documents), 975 tests Vitest
(77 fichiers), build Vite/PWA et 55 tests Playwright `mobile` (54 réussis,
1 ignoré). Le fichier d’essai de l’auteur `tmp/check-levels.ts` a été
écarté du dépôt le temps de la gate (ESLint le refuse), puis remis à
l’identique.

`pnpm check` après M14 (1er octobre 2026) : passe du premier coup —
typecheck, lint, formatage, Knip, contenu (19 documents), 951 tests Vitest
(77 fichiers), build Vite/PWA et 54 tests Playwright `mobile` (53 réussis,
1 ignoré).

`pnpm check` après M13 (1er octobre 2026) : passe du premier coup —
typecheck, lint, formatage, Knip, contenu (19 documents), 921 tests Vitest
(75 fichiers), build Vite/PWA et 53 tests Playwright `mobile` (52 réussis,
1 ignoré).

`pnpm check` après M12 (1er octobre 2026) : passe du premier coup —
typecheck, lint, formatage, Knip, contenu (19 documents), 907 tests Vitest
(73 fichiers), build Vite/PWA et 52 tests Playwright `mobile` (51 réussis,
1 ignoré).

`pnpm check` après M11 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 899 tests Vitest (72 fichiers),
build Vite/PWA et 51 tests Playwright `mobile` (50 réussis, 1 ignoré). Une
première exécution avait échoué sur l’intermittence D4 décrite dans les
dettes.

`pnpm check` après M10 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 880 tests Vitest (69 fichiers),
build Vite/PWA et 49 tests Playwright `mobile` (48 réussis, 1 ignoré).

`pnpm check` après M9 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 866 tests Vitest (67 fichiers),
build Vite/PWA et 47 tests Playwright `mobile` (46 réussis, 1 ignoré).

`pnpm check` après M8 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 842 tests Vitest (66 fichiers),
build Vite/PWA et 47 tests Playwright `mobile` (46 réussis, 1 ignoré).

`pnpm check` après M7b (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 833 tests Vitest (65 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M7 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 831 tests Vitest (65 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M6b (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 825 tests Vitest (65 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M6 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 825 tests Vitest (65 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M5 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 816 tests Vitest (63 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M4b (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 810 tests Vitest (61 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M4 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 807 tests Vitest (61 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M3 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 790 tests Vitest (61 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M2 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 755 tests Vitest (60 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après M1 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 750 tests Vitest (59 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré).

`pnpm check` après G2 (1er octobre 2026) : passe — typecheck, lint,
formatage, Knip, contenu (19 documents), 737 tests Vitest (59 fichiers),
build Vite/PWA et 46 tests Playwright `mobile` (45 réussis, 1 ignoré). Les
deux flakes sont reproduits puis corrigés (`--repeat-each`, workers élevés) :
U15 échouait 20 fois sur 50 (12 workers), L17b 5 fois sur 100 (16 workers) ;
après correction, 0 sur 50 pour chacun à 12 workers et 0 sur 100 pour L17b à
16 workers. U15 : le clic qui suit le toucher de sélection tombait sur le scrim
du tiroir compact, ouvert pendant ce toucher, et le refermait (correction de
production, voir « Présentation et interface »). L17b : le geste partait de
l’empreinte du levier et le déplaçait au lieu de le tourner depuis la
poignée ; ses comparaisons de canvas, en pixels physiques, pouvaient dépasser
à elles seules le budget de 2 s de leur attente. Le test vise désormais la
poignée, compare en pixels CSS et attend que l’historique montre le second
quart de tour.

`pnpm check` après G1 (1er octobre 2026) : passe trois fois de suite —
typecheck, lint, formatage, Knip, contenu (19 documents), 734 tests Vitest
(58 fichiers), build Vite/PWA et 46 tests Playwright `mobile` (45 réussis,
1 ignoré). `src/app/BenchPage.test.tsx` y prend 348 à 573 ms pour ses 3 tests.
La cause du timeout intermittent était le premier test, qui simulait 1 200 pas
réels de la scène dense (2,8 à 3,8 s mesurés dans la suite complète) ; il
utilise désormais une session injectée (`createSession`). Les flakes E2E L17b
et U15 ne se sont pas manifestés sur ces trois exécutions (G2 reste ouverte).

`pnpm check` après l’import JSON (1er octobre 2026) : deux tentatives passent
typecheck, lint, formatage, Knip et validation des 19 niveaux ; chacune échoue
ensuite sur le timeout à 5 s du test préexistant
`src/app/BenchPage.test.tsx` (729 tests sur 730). Ce test passe seul (3/3).
`pnpm build` passe. La suite Playwright mobile séparée donne 43 réussites,
1 scénario ignoré et deux échecs intermittents préexistants (L17b et U15) ; les
deux passent lorsqu’ils sont rejoués seuls. Le nouveau test E2E d’import passe
dans la suite complète et isolément. Captures :
`test-results/import/import-{390x844,844x390,1440x900}.png`.

`pnpm check` après la landing d’accueil (1er octobre 2026) : passe — typecheck,
lint, formatage, Knip, validation des 19 documents, 713 tests Vitest, build
Vite/PWA et 44 tests Playwright mobiles réussis (1 scénario desktop ignoré).
Une première exécution complète a rencontré l’intermittence U15 déjà documentée ;
U15 passe en isolation, puis la gate complète relancée passe sans modification
du câblage. Les trois parcours de l’accueil couvrent les destinations, le retour
navigateur, la reprise de progression et les quatre formats de capture.
Captures inspectées : `test-results/home/accueil-{390x844,844x390,1440x900,320x568}.png`.
La validation visuelle de l’auteur reste attendue.

`pnpm check` après la retouche visuelle de `/levels` (27 septembre 2026) :
typecheck, lint, formatage, Knip et validation des 19 documents passent ; 705
tests Vitest sur 706 passent. Le seul échec est le timeout préexistant de
`src/app/BenchPage.test.tsx` à 5 s sous charge, laissé inchangé à la demande de
l’auteur ; ses 3 tests passent en isolation. Le build Vite/PWA passe séparément,
les 72 tests `App.test.tsx` passent et les 2 parcours Playwright mobiles de
`e2e/levels.spec.ts` passent. Captures de production :
`test-results/levels-page/levels-{390x844,844x390,1440x900}.png`.

`pnpm check` après N1 (27 septembre 2026) : passe — typecheck, lint, formatage, Knip, contenu (19 documents), 706 tests Vitest (55 fichiers), build Vite/PWA et 41 tests Playwright `mobile` réussis (1 test desktop ignoré par ce projet).

`pnpm check` après U26 et la réparation E2E du catalogue (27 septembre 2026) :
typecheck, lint, formatage, Knip, contenu, 797 tests Vitest (66 fichiers), build
et 56 tests Playwright `mobile` (55 réussis, 1 ignoré).

`pnpm check` après U5 (27 septembre 2026) : passe d’une traite — typecheck,
lint, formatage, Knip, contenu, 741 tests Vitest (62 fichiers), build et 55
tests Playwright `mobile` (54 réussis, 1 ignoré).

`pnpm check` après U4 (27 septembre 2026) : passe d’une traite — typecheck,
lint, formatage, Knip, contenu, 740 tests Vitest (62 fichiers), build et 54
tests Playwright `mobile` (53 réussis, 1 ignoré).

`pnpm check` après U21 (27 septembre 2026) : passe d’une traite au second
essai — typecheck, lint, formatage, Knip, contenu, 727 tests Vitest (61
fichiers), build et 51 tests Playwright `mobile` (50 réussis, 1 ignoré). Le
premier essai avait échoué sur l’E2E instable du niveau 9 (voir les dettes).

`pnpm check` après U6 (27 septembre 2026) : passe — 729 tests Vitest, build et
52 tests Playwright `mobile` (51 réussis, 1 ignoré).

Complément U6 : 730 tests Vitest, typecheck, lint, formatage, Knip, contenu et
build passent. La suite E2E mobile standard a rencontré des flakies préexistants
sur des inspecteurs de niveaux ; la relance Playwright en mode CI a terminé avec
53 tests (51 réussis, 1 flaky, 1 ignoré).

Exécution précédente :
`pnpm check` après U15 (27 septembre 2026) : passe d’une traite — typecheck,
lint, formatage, Knip, contenu, 704 tests Vitest (61 fichiers), build et 50
tests Playwright `mobile` (49 réussis, 1 ignoré).

Exécution antérieure :
`pnpm check` après U19, U20 et le délai des recherches du niveau 12
(27 septembre 2026) : passe d’une traite — typecheck, lint, formatage, Knip,
contenu, 693 tests Vitest (60 fichiers), build et 48 tests Playwright `mobile`
(47 réussis, 1 ignoré). Dans la suite complète, le produit croisé du niveau 12
a pris 4,6 s (délai 20 s) et la recherche à un objet 12,0 s (délai 60 s) ;
seuls, 2,1 s et 9,4 s. Les autres régressions de niveau restent sous 1 s.

Exécution précédente, après L28 :
`pnpm check` passe le 27 septembre 2026 après L28 : typecheck, lint,
formatage, Knip, contenu (14 niveaux embarqués), 637 tests Vitest (54 fichiers),
build avec manifeste et service worker PWA, puis 45 tests Playwright `mobile` (44
réussis, 1 ignoré car C3 est spécifique au projet desktop).
Une première exécution a eu un timeout intermittent sur le tiroir de propriétés du niveau 9 ; le test passe seul et la gate complète
relancée passe. Le parcours mobile L17b ouvre maintenant
l’inspecteur compact avant de
vérifier les propriétés du levier sélectionné. Les captures au repos sont
conservées sous `test-results/levels/` pour les niveaux 1 à 12, en portrait et
paysage ; les trois orientations du levier y sont aussi capturées. La première
gate L16 avait expiré sur le parcours tactile préexistant du niveau 5 ; ce parcours
passe isolément et dans la gate complète relancée sans modification.
`pnpm build && pnpm exec playwright test --project=desktop` passe également :
30 tests réussis, dont C3 (vérifié pendant L1). Les tests lourds de frontière de
couches et de banc dense conservent leur délai explicite de 30 s, sans assertion
affaiblie.
