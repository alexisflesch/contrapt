# État du dépôt — TinkerBolt

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

- Renderer Canvas 2D (ADR 0006) avec DPR, sprites en calques (balle à motif
  tournant, rouge pour celle de l’objectif et bleue pour les autres, panier avant/arrière, bascule pied + planche, levier, convoyeur à
  tapis défilant, bouton à capuchon qui s’enfonce, ventilateur à pales tournantes
  écrasées en perspective et orientable, barrière dont seule la partie sortie du
  poteau est dessinée, tremplin à ressort tassé à l’impact), ordre de dessin déterministe (la balle après le panier).
- Chargeur des sprites : une requête en cours est partagée, un sprite prêt est
  conservé, et un échec est retenté au rendu suivant, jusqu’à trois tentatives par
  asset.
- En-tête de l’atelier (U23) : les titres « Éditeur de niveaux » et « Éditeur ·
  <titre> » ne sont plus rendus sur le plateau ; « Mode éditeur » et les actions
  restent accessibles. Le parcours E2E produit des captures en 390 × 844,
  844 × 390 et 1440 × 900.
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
- **U6 — recommencer et remise à zéro de l’atelier** : pendant la simulation,
  une seule commande « Recommencer » est visible ; dans l’atelier, « Ràz atelier »
  est placé à gauche de « Tester » et ouvre une confirmation qui décrit la perte,
  avec « Annuler » ciblé par défaut. En mode puzzle, le même contrôle devient
  « Recommencer le niveau » et restaure le document initial après confirmation.
  Dans les deux modes, la remise à zéro ferme les tiroirs et sélections ; après
  une victoire d’atelier, le résultat conserve uniquement « Retour à l’édition ».
- **U4 — bandeau de résultat de campagne** : après une victoire sur un niveau de
  la campagne, le bandeau affiche le palier obtenu par la tentative (✅ Résolu,
  ⭐ Élégant, 🏆 Minimal, `data-level-tier`), le nombre d’objets posés compté au
  lancement, puis la révélation progressive de l’ADR 0010 calculée sur le
  meilleur résultat enregistré (« Tu penses pouvoir le faire avec N ? », puis
  « Record à battre : 🏆 avec N objets. », rien après 🏆 ; « Nouveau record »
  sous le minimum connu). « Niveau suivant » ouvre le niveau suivant de la
  campagne s’il existe et est débloqué ; une seule commande « Recommencer ».
  L’atelier, la démonstration et les niveaux partagés gardent le bandeau simple.
- **U5 — liste des niveaux par chapitres** : `/levels` regroupe les niveaux par
  chapitre du catalogue L6 (« Chapitre 1 · Poutres et bascule », « Chapitre 2 ·
  Mécanismes »), numérotation continue. Un niveau verrouillé reste visible avec
  « 🔒 Verrouillé » et un bouton « Lancer » désactivé ; un niveau résolu affiche
  son palier (✅ / ⭐ / 🏆, `data-level-tier`) recalculé depuis le meilleur
  résultat. « Éditer le niveau » (U17) reste disponible pour tous les niveaux ;
  l’URL directe d’un niveau verrouillé affiche « Ce niveau est encore
  verrouillé. » (U5b) ; sous `pnpm dev`, `unlockAllLevels` débloque tout.
- **U4b — modale de victoire** (campagne) : « Bravo ! », paliers allumés ou
  estompés (✅ seul sans défi), « Niveau suivant », « Recommencer », « Voir la
  scène » ; bandeau réduit sous le plateau pour rouvrir le résultat.
- **U14b — fils en équerre** : horizontal/vertical, un coude au plus.
- **U22 — atelier créateur de puzzles** (ADR 0013) : réglage « Fixe / À
  placer » dans l’inspecteur de l’atelier (annulable, jamais sur la balle ni le
  panier de l’objectif, champ `toPlace` du document) ; contour pointillé violet
  autour des objets à placer pendant la construction ; bouton d’en-tête
  « Jouer » (« Jouer le puzzle ») qui ouvre le puzzle en mode joueur sur une
  copie, avec « Retour à l’atelier » ; l’export (fichier et lien) produit le
  puzzle — décor fixe, inventaire des objets à placer regroupés, `solution` de
  référence, zone = scène si l’atelier n’en a pas, défi ⭐ = 🏆 = nombre
  d’objets à placer — après vérification par simulation à pas fixe (solution
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
  `/` ouvre le niveau 1 en mode joueur.
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
- **Campagne à refaire** (décision auteur du 27 septembre 2026) : les niveaux
  ci-dessous seront remplacés, voir `levels/nouveaux-niveaux.md`.
- **Douze niveaux de campagne**, « Prolonger la pente », « Le pont »,
  « Incliner », « Moins, c’est mieux », « Le détour », « La bascule »,
  « Placer la bascule », « Poutre et bascule », « Le tapis », « Le butoir »,
  « L’interrupteur » et « Le bon ordre ». Les niveaux 13 « Deux tapis » et 14
  « Grand final » sont bloqués après trois esquisses sans fenêtre de robustesse de
  0,3 unité. Aucun bouton « Niveau suivant ».
- **Progression de campagne** : L19 calcule les paliers, records, indices et
  déblocages ; L20 persiste les records dans une enveloppe locale validée ; L21
  enregistre les victoires depuis le snapshot du lancement et expose le hook
  `useCampaignProgress()` sans ajout visuel. La demande de stockage persistant est
  faite une seule fois après la première victoire. Le codec L23 et la route
  `/shared` L24 sont livrés ; les niveaux partagés restent hors campagne et ne
  créent ni progression ni brouillon. La PWA L28 est livrée selon l’ADR 0012. Les
  métadonnées de défi v2 sont
  utilisées par les niveaux 4, 5 et 8 ; la preuve de minimalité du niveau 8 reste
  à compléter avec les coordonnées de sa grille « bascule seule ».
- **Fichiers et partage** : L22 encode et décode les documents avec validation
  et migration ; L23 sérialise les fragments URL avec CRC-32 et décompression
  bornée ; L24 valide `location.hash`, puis ouvre le document en mode joueur ou
  affiche une erreur avec un lien vers la liste.
- **Brouillons L26** : `DraftRepository` et son adaptateur `localStorage` stockent
  un document par identifiant sous `tinkerbolt:draft:<id>`, avec l’index
  `tinkerbolt:drafts`. Les enveloppes versionnées sont validées, les documents
  passent par le codec de fichier L22, et les valeurs corrompues sont sauvegardées
  avant remplacement. La fonction pure `decideDraftAutosave` limite les essais
  d’enregistrement à une fois par seconde pendant l’édition et autorise un
  enregistrement immédiat au lancement d’un test ; elle n’est pas encore reliée
  à une interface.
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
- **E2E instable** : `e2e/levels.spec.ts` « niveau 9 : poser le convoyeur… »
  échoue par intermittence (« Fermer les propriétés » introuvable), y compris
  sur le commit précédent U21.
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
  métadonnées), ni d’importer un fichier. Depuis U22, l’export remplace
  l’inventaire de l’atelier par les objets à placer.
- **Atelier U22** : un objet à placer relié par un fil n’est pas exportable
  (refus avec message) ; revenir de « Jouer le puzzle » remonte l’atelier sur
  son dernier document, l’historique annuler/rétablir repart de là ; le brouillon
  du niveau 1 (inventaire vide) n’affiche pas le catalogue auteur (préexistant,
  `hasInventory` de `BoardShell`).
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

`pnpm check` après le correctif U21 et U23 (27 septembre 2026) : typecheck,
lint, formatage, Knip, contenu, 788 tests Vitest (66 fichiers), build et 56
tests Playwright `mobile` (55 réussis, 1 ignoré).

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
