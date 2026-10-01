# État du dépôt — TinkerBolt

Dernière mise à jour : 1er octobre 2026.

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
  résultat. « Éditer le niveau » (U17) reste disponible pour tous les niveaux ;
  l’URL directe d’un niveau verrouillé affiche « Ce niveau est encore
  verrouillé. » (U5b) ; sous `pnpm dev`, `unlockAllLevels` débloque tout.
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
  `/editor`, `/demo` (machine en chaîne qui se résout seule, testée),
  `/settings` (vide) et `/shared` (niveau éphémère décodé depuis le fragment URL).
  `/` ouvre l’accueil ; le premier niveau reste accessible par son URL directe.
- Mise en page validée aux six formats du plan (D4) ; objectif dans une boîte de
  dialogue à la demande ; bandeau de résultat dans un emplacement réservé.
- Atelier libre `src/content/levels/workshop.json` (scène 16 × 9, inventaire de
  99 par famille, contexte auteur).
- Export U16 : en mode auteur, le bouton « Exporter » de l’en-tête ouvre une
  boîte qui télécharge le document engagé de l’auteur (`<id>.json`, codec L22,
  `application/json`) ou copie le lien `/shared#level=…` (codec L23) avec le
  retour « Lien copié ». Sans presse-papiers, le lien s’affiche dans un champ
  sélectionnable. Un document que le schéma refuse n’est pas exporté : la boîte
  en donne les raisons (`src/app/level-export.ts`, `LevelExportDialog.tsx`).
- Brouillon d’un niveau de campagne U17 : chaque carte de `/levels` porte
  « Éditer le niveau N », qui ouvre `/editor?draft=<id>-brouillon` sur une copie
  titrée « <titre> (brouillon) » (`src/application/drafts/campaign-draft.ts`).
  Un brouillon existant est rouvert tel quel ; sinon la copie est enregistrée.
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
  ouvrir avec « Éditer le niveau », ajuster la physique et exporter les
  documents avant activation de régressions de solution. La fiche U28 facilite
  désormais cette reprise ; le calibrage physique final reste à faire.
- **Parcours « Éditer »** : la position actuelle du bouton sur la liste des
  niveaux est conservée provisoirement. Son éventuel déplacement vers un accès
  auteur plus discret sera réévalué séparément.
- **Progression de campagne** : L19 calcule les paliers, records, indices et
  déblocages ; L20 persiste les records dans une enveloppe locale validée ; L21
  enregistre les victoires depuis le snapshot du lancement et expose le hook
  `useCampaignProgress()` sans ajout visuel. La demande de stockage persistant est
  faite une seule fois après la première victoire. Le codec L23 et la route
  `/shared` L24 sont livrés ; les niveaux partagés restent hors campagne et ne
  créent ni progression ni brouillon. La PWA L28 est livrée selon l’ADR 0012.
  Les esquisses actuelles ne portent aucun défi : les paliers restent réservés
  aux niveaux calibrés qui en définissent explicitement un.
- **Fichiers et partage** : L22 encode et décode les documents avec validation
  et migration ; L23 sérialise les fragments URL avec CRC-32 et décompression
  bornée ; L24 valide location.hash, puis ouvre le document en mode joueur ou
  affiche une erreur avec un lien vers la liste. La page `/import` valide un
  fichier JSON avec L22, l’enregistre comme un nouveau brouillon et l’ouvre dans
  l’éditeur sans remplacer les brouillons existants.
- **Brouillons L26** : `DraftRepository` et son adaptateur `localStorage` stockent
  un document par identifiant sous `tinkerbolt:draft:<id>`, avec l’index
  `tinkerbolt:drafts`. Les enveloppes versionnées sont validées, les documents
  passent par le codec de fichier L22, et les valeurs corrompues sont sauvegardées
  avant remplacement. L’import depuis `/import` choisit un identifiant neuf et
  sauvegarde le document validé comme brouillon séparé. La fonction pure
  `decideDraftAutosave` limite les essais d’enregistrement à une fois par seconde
  pendant l’édition et autorise un enregistrement immédiat au lancement d’un test ;
  elle n’est pas encore reliée à une interface.
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
  placer sont exportables et rouverts avec leur marquage ; le brouillon du
  niveau 1 conserve son inventaire et son catalogue auteur (U26).
- **Brouillons U17** : aucun moyen de repartir du niveau d’origine une fois le
  brouillon créé, ni de lister ou supprimer les brouillons dans l’interface.
- `format:check` ne couvre pas le Markdown.
- Le workflow `.github/workflows/check.yml` exécute la gate sur push et pull
  request avec Node 24, cache pnpm et Chromium Playwright. Son premier passage
  distant reste à vérifier au prochain push ; aucune matrice de téléphones
  physiques n’est définie.
- Un avertissement peer préexistant reste présent : `typescript-eslint@8.42.0`
  déclare TypeScript `<6`, alors que le dépôt utilise TypeScript 6.0.3. Il n’est
  pas lié aux pairs Workbox installés en L28.

## Dernière exécution de la gate

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
