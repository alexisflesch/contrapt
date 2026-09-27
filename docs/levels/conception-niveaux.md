# Concevoir un niveau

Ce document suffit pour concevoir un niveau de Contrapt! sans lire le reste du
dépôt. Il fait autorité sur l'**intention** de conception. Les valeurs chiffrées
viennent du code (`src/domain/family-geometry.ts`,
`src/simulation/simulation-session.ts`, `src/domain/level-document.ts`) : en
cas d'écart, c'est le code qui a raison, et ce document doit être corrigé.

## 1. Le jeu

Une scène 2D en vue de côté, soumise à la gravité. Le niveau fournit une machine
déjà en place et un **inventaire** d'objets. Le joueur pose ces objets, les
déplace et, pour certains, les tourne, puis appuie sur **Tester**. La simulation
est déterministe (pas fixe de 1/60 s) et le joueur peut recommencer autant de
fois qu'il veut.

- **Victoire** : le centre de la balle rouge (`goal.ballId`) reste dans le
  panier (`goal.basketId`) pendant 30 pas consécutifs (0,5 s). Une balle qui ne
  fait que traverser le panier ne gagne pas.
- **Défaite** : la balle sort de la scène (avec une marge de 2 unités), ou
  20 s s'écoulent sans victoire.
- **Défi** (facultatif) : ✅ victoire ; ⭐ victoire avec au plus
  `elegantObjectCount` objets posés ; 🏆 avec au plus `minimalObjectCount`.
- **Règle de campagne** : tout objet présent au départ est verrouillé (ses trois
  permissions sont à `false`). Le joueur ne modifie aucune propriété. Il
  décide **où** il pose les objets de l'inventaire, **quel angle** il leur
  donne (quand l'objet peut tourner) et, quand l'inventaire contient des fils,
  **quoi relier à quoi** (voir § 5 : le fil d'inventaire n'est pas encore
  implémenté).
- **Zones de construction** (`buildZones`) : l'objet entier doit tenir dans une
  zone. Elles sont dessinées sur le plateau. Elles sont rarement utiles : un
  bon niveau interdit les raccourcis par sa géométrie, pas par une zone.

## 2. Ce qu'on attend d'un niveau

Un niveau qui se résout en posant une poutre puis en cliquant sur Tester est un
échec, même s'il est « pédagogique ». Les niveaux 1 à 14 actuels sont des
prototypes et ne servent pas de modèle.

- **Une machine, pas un trou à combler.** Une chaîne de 5 à 8 étapes est déjà
  en place, et elle est cassée à 3 ou 4 endroits. Le joueur doit la comprendre
  pour la réparer.
- **De vraies réactions en chaîne.** Un objet en déclenche un autre, à distance
  (levier, bouton, fils, barrière), et au moins une étape dépend du
  **moment** (convoyeur utilisé comme horloge, barrière qui s'ouvre,
  bascule qui attend un poids).
- **Des leurres.** L'inventaire contient plus que la solution, ou autre chose :
  il ne doit pas y avoir exactement ce qu'il faut, là où il faut.
- **Une surprise lisible.** Le joueur doit pouvoir prédire à peu près ce qui va
  se passer, puis être surpris par un détail qu'il comprend après coup.
- **Robuste là où ça compte.** Les boutons et les leviers **resynchronisent**
  la chaîne : un état tranché (enfoncé ou non, à gauche ou à droite) efface les
  petites variations des étapes précédentes. Une pose du joueur n'exige jamais
  un réglage au pixel près : prévoir une marge d'au moins 0,3 unité pour
  chaque objet posé, et aucune fenêtre de temps de moins de 0,5 s.
- **Pas de solution triviale.** Chercher des solutions avec moins d'objets que
  prévu. Si on en trouve une, c'est soit le nouveau palier 🏆, soit un défaut à
  corriger en modifiant la géométrie.
- **Balles rouges et bleues.** La balle **rouge** est celle de l'objectif, et
  elle seule va dans le panier. Les balles **bleues** sont des pièces de la
  machine : elles appuient sur des boutons, basculent des leviers, chargent des
  bascules. C'est déjà le cas : toute balle autre que `goal.ballId` est
  dessinée en bleu, avec la même physique ; le format de niveau ne change pas.
  Le rouge est **réservé à l'objectif** : aucun autre élément du plateau (fils,
  poignée de levier, vignette d'une balle de l'inventaire) n'est rouge.

## 3. Repères

- Unités du monde, jamais de pixels. `y` est orienté **vers le bas**. Une
  rotation positive tourne dans le sens horaire à l'écran. Les angles sont en
  radians dans le document.
- La scène fait habituellement 8 × 5,5 unités (entre 4 et 64 de côté).
  L'origine de chaque objet est le centre de son empreinte, sauf pour la
  bascule, dont l'origine est le pivot.
- Pour poser un objet sur une poutre horizontale placée à `y_p` :
  `y = y_p − 0,125 − ½ hauteur de l'objet`.

## 4. Les objets existants

| Type          | Dimensions (unités)                                    | Physique                                                                                                                                                                        | Propriétés                            | Rotation           |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------ |
| `ball`        | rayon 0,3                                              | dynamique ; masse ≈ 0,28 kg ; frottement 0,35 ; rebond 0,25 ; résistance au roulement (décélère d'environ 0,7 m/s² sur le plat, accélère d'environ 1 m/s² sur une pente de 15°) | —                                     | non                |
| `basket`      | 1,5 × 1,1                                              | statique : deux parois et un fond, plus un capteur                                                                                                                              | —                                     | non                |
| `beam`        | 2 / 4 / 6 × 0,25                                       | statique ; frottement 0,4                                                                                                                                                       | `size`: `short` `medium` `long`       | libre (pas de 15°) |
| `seesaw`      | planche de 3, pivot situé 0,7 au-dessus du bas du pied | planche dynamique autour du pivot, butées à ±30°                                                                                                                                | —                                     | non                |
| `mass`        | ≈ 0,8 × 0,5                                            | dynamique ; 10 kg, soit 35 balles ; frottement 0,6                                                                                                                              | `weight`: `10kg`                      | non                |
| `lever`       | socle 0,8 × 0,41, manche de ≈ 1                        | trois crans `left` `center` `right` ; le cran tient à peine, une balle suffit à le basculer                                                                                     | `position`                            | libre (max ±135°)  |
| `conveyor`    | 3 × 0,58                                               | statique ; surface à 1,5 u/s, donc **2 s pour traverser une bande de 3**                                                                                                        | `direction`: `left` `stopped` `right` | non                |
| `button`      | 0,8 × 0,48                                             | **momentané** : enfoncé tant qu'un corps dynamique pèse sur le capuchon                                                                                                         | —                                     | non                |
| `fan`         | 1,2 × 0,94                                             | souffle en cône de ±15°, portée 3 ; force = 9 × largeur exposée × (1 − d/3), **proportionnelle à la surface, pas à la masse** ; ≈ 0,4 s pour atteindre sa pleine puissance      | `state`: `on` `off`                   | quarts de tour     |
| `barrier`     | pilier 0,8 × 0,85, barre de 1,25 × 0,28                | la barre coulisse à 2,5 u/s (≈ 0,4 s pour s'ouvrir) ; ouverte, elle n'a plus de collision : c'est une **trappe**                                                                | `state`: `closed` `open`              | quarts de tour     |
| `springboard` | 1 × 0,93                                               | plateau à rebond 1 (ignoré sous 1 m/s) : rend **toute** la vitesse, donc remonte à la hauteur de chute, **jamais plus haut**                                                    | —                                     | quarts de tour     |

**Fils** (`wires: [{ id, sourceId, targetId }]`) :

- Une source est un levier ou un bouton ; une cible est un convoyeur, un
  ventilateur ou une barrière.
- Une source peut commander **plusieurs** cibles, mais une cible n'a qu'un seul
  contrôleur.
- Un bouton ne commande jamais un convoyeur.
- Levier → convoyeur : le sens de la bande suit le cran (`center` = arrêt).
- Levier → ventilateur ou barrière : actif quand le levier est à gauche **ou**
  à droite.
- Bouton → ventilateur ou barrière : actif tant que le bouton est enfoncé.

**Conséquences utiles pour concevoir :**

- Le ventilateur est le seul objet qui peut faire monter la balle plus haut que
  son point de départ. Dans un souffle vertical, une balle lévite à environ
  1,5 unité au-dessus de la bouche.
- Le vent est arrêté par les solides : un objet n'est poussé que si rien de
  solide (poutre, masse, autre balle…) ne coupe le segment qui va de la bouche
  du ventilateur à son centre. Un solide placé devant abrite ce qui est
  derrière ; les capteurs (panier, bouton) ne font pas écran.
- La masse de 10 kg écrase tout ce qu'elle touche. Elle sert à faire basculer
  ou à maintenir un bouton enfoncé, pas à pousser délicatement.
- Le convoyeur est une horloge : il fixe un délai sans que le joueur le règle.
- Un bouton rend une information continue (une position) binaire. C'est ce qui
  rend une longue chaîne robuste.

## 5. Évolutions décidées, pas encore implémentées

Ne pas les utiliser dans un niveau avant qu'elles existent dans le code.

- **Fil dans l'inventaire du joueur** (décision auteur du 27 septembre 2026,
  tâche U21) : un fil est un objet d'inventaire comme les autres. Le joueur
  relie une source à une cible en consommant un fil, peut retirer les fils
  qu'il a posés, jamais ceux du niveau ; un fil compte pour le défi.
- **Plusieurs objectifs.** Plusieurs balles rouges pour plusieurs paniers,
  puis, plus tard, d'autres types d'objectifs. Cela exige une version 3 du
  format de niveau, avec migration.
- **Objets à créer**, choisis pour les réactions en chaîne :
  - retardateur (un petit réveil) : reçoit un fil et émet à son tour après une
    durée fixée par le niveau, ou démarre seul au lancement ;
  - dominos ;
  - piston : cible d'un fil, il pousse d'un coup ce qui se trouve devant lui ;
  - goulotte courbe : redirige une trajectoire de façon fiable ;
  - boîte en bois ou en métal (déjà dessinée dans `art/assets/boxes/`) ;
  - masse de 1 kg.

## 6. Méthode

1. **Esquisser** la chaîne sur papier : qui déclenche quoi, dans quel ordre, et
   où elle est cassée.
2. **Écrire le document** JSON dans `src/content/levels/<id>.json`, en prenant
   `level-12-le-bon-ordre.json` comme exemple de format. `id` est en kebab-case ;
   `schemaVersion: 2` ; les objets de départ ont leurs permissions à `false` ;
   l'inventaire donne `{ move: true, rotate: <selon le type>, remove: true }`.
3. **Mesurer au banc**, dans un test Vitest à côté du niveau
   (`<id>.test.ts`) : `applyPlayerSteps` et `runLevel` de
   `src/content/level-regression.ts` jouent une solution et renvoient
   `succeeded` / `out-of-scene` / `timed-out`. Tester dans cet ordre : sans
   aucune pose (le niveau doit perdre), la solution de référence (elle doit
   gagner), une grille autour de chaque pose (fenêtre ≥ 0,3), puis
   `searchSolutions` avec moins d'objets (aucune victoire attendue, sauf le
   palier 🏆).
4. **Ne jamais modifier une constante physique** pour faire passer un niveau :
   on modifie le niveau.
5. **Enregistrer** le niveau dans `src/content/embedded-levels.ts`, puis lancer
   `pnpm content:check` et `pnpm check:fast`.
6. **Faire jouer l'auteur.** Un niveau n'est accepté qu'après avoir été joué et
   jugé amusant. Commencer par un seul niveau prototype avant d'en produire
   d'autres.
