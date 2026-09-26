# Propositions de niveaux supplémentaires

Statut : **proposition de contenu, ne fait autorité sur rien**. Document de
travail soumis à l'auteur ; il n'est pas dans la table de routage de
`index.md` et ne doit pas être lu comme une spécification. S'il est accepté, sa
partie retenue sera réécrite dans `levels/initial-progression.md` (ou un
document de campagne frère) et ce fichier sera supprimé.

Rédigé le 26 septembre 2026, sur `main` à `6e7625f`, **pendant que la feuille de
route est en cours** (L1, L2b faits ; L3 en train d'être travaillée). Aucune
géométrie ci-dessous n'a été mesurée sur le moteur : tout ce qui n'est pas
marqué « acquis (code) » est une **hypothèse à vérifier au banc d'essai**, avec
la fenêtre de robustesse exigée par `levels/initial-progression.md`
§ Principes communs.

Sources lues : `index.md`, `feuille-de-route-luna.md` § 3 et § 5 (phases A–B),
`etat.md`, `levels/initial-progression.md`, `catalogue-initial.md`, ADR 0007 et
ADR 0009, `src/domain/family-geometry.ts`, `src/domain/level-document.ts`,
`src/presentation/sprite-loader.ts`, `src/simulation/simulation-session.ts`,
`src/content/levels/*.json`, `public/assets/`, `art/assets/`.

**Reprise du même jour (seconde session).** La rédaction initiale a été coupée en
cours d'écriture : des paragraphes s'étaient retrouvés empilés en fin de fichier
et les sections annoncées en § 4 (niveau F) et § 5 à § 7 manquaient. Elles sont
remises en place et complétées ; le détail des déplacements est consigné en § 8.
Cette seconde session n'a relu **que les documents du dépôt** (aucun fichier de
code) : les valeurs physiques qu'elle cite viennent du § 3 ci-dessous, mesuré par
la première session.

## 1. Ce que les assets permettent vraiment

Une famille est utilisable dans un niveau si son schéma, sa physique **et** son
rendu existent. Verifié dans le code, pas dans les fichiers :

| Famille     | Calques exportés                    | Câblé au rendu | Apparaît dans la campagne |
| ----------- | ----------------------------------- | -------------- | ------------------------- |
| balle       | `ball-base`, `ball-spin`, `ball-highlight` | oui     | niveaux 1–11              |
| panier      | `basket-back`, `basket-front`       | oui            | tous                      |
| poutre      | `beam` (une seule image étirée)     | oui            | 1–8, 12–14                |
| bascule     | `seesaw-fulcrum`, `seesaw-beam`     | oui            | 6–8, 14                   |
| masse       | `mass-10kg`                         | oui            | 10–12                     |
| levier      | `lever-base`, `lever-handle`        | oui            | 11–14                     |
| convoyeur   | `conveyor-belt`, `conveyor-belt-left`, `conveyor-frame` | oui | 9–11, 13–14      |
| bouton      | `button-base`, `button-cap`         | oui            | **aucun niveau**          |
| ventilateur | `fan-blades`, `fan-body`            | oui            | **aucun niveau**          |
| barrière    | `barrier-bar`, `barrier-pillar`     | oui            | **aucun niveau**          |
| tremplin    | `springboard-spring`, `springboard-base`, `springboard-platform` | oui | **aucun niveau** |

Ce que j'appelle des **assets dormants** : ils sont dessinés, exportés, parfois
déjà testés, mais rien ne les montre au joueur.

1. **Quatre familles entières sans niveau** : bouton, ventilateur, barrière,
   tremplin. Elles ont leurs colliders, leur physique (`devices` de
   l'ADR 0009), leurs calques et leur vignette dans le tiroir. C'est le plus gros
   gisement : 4 familles sur 11 ne sont jamais enseignées.
2. **`beam-short@2x`, `beam-medium@2x`, `beam-long@2x`** sont dans
   `public/assets/sprites/` mais `sprite-loader.ts` ne demande que `beam` : le
   renderer étire l'image longue pour les trois tailles (dette consignée, tâche
   U12). Les sources sont dessinées dans `art/assets/beam/`.
3. **Trois fonds inutilisés** : `board-workshop-day-v1.png`,
   `board-workshop-evening-v1.png`, `board-workshop-stone-v1.png` (1536 × 1024).
   Seul `board-generic-v0.png` est servi, en `background-image` CSS — donc sans
   suivre la caméra (dette D3). Un fond *par chapitre* suppose que cette dette
   soit réparée.
4. **`art/assets/boxes/`** (`wooden-box.png`, `metallic-box.png`) : aucune
   famille, aucun schéma, aucun export. Ce n'est pas un niveau à écrire, c'est
   une famille à créer (§ 6).
5. **`art/assets/second-ball/`** : le trio de calques d'une seconde balle. La
   campagne écarte explicitement les multi-balles, et une dette signale qu'aucun
   indice ne dit au joueur quelle balle est suivie. Un niveau à deux balles
   attend la tâche U7.
6. **`art/assets/bolt/`** : dix poses de la mascotte, « pas encore d'usage
   décidé » (feuille de route § 7). Idée non nivelée en § 6.

## 2. La lacune que ces propositions visent

La campagne apprend trois verbes : **allonger** (poutre), **basculer**
(bascule), **transporter et déclencher** (convoyeur, levier, masse). Les quatre
familles restantes en apprennent quatre autres, que **aucun niveau ne peut
montrer** tant qu'elles restent inutilisées :

| Verbe absent             | Objet qui le porte      | Ce qu'il ajoute à la tête du joueur |
| ------------------------ | ----------------------- | ----------------------------------- |
| maintenir sans toucher   | ventilateur             | une force à distance, qui s'use avec la distance |
| supprimer le sol         | barrière                | un plancher télécommandé, et donc un délai |
| rendre toute l'énergie   | tremplin                | rien ne se perd au choc, la hauteur revient |
| tenir un état, pas un ordre | bouton               | une commande qui dépend d'un poids, pas d'une position |

Un verbe n'est pas un objet de plus : c'est une case à remplir dans la tête du
joueur. C'est le critère que j'applique à tout ce qui suit, y compris aux objets
nouveaux de la § 6 — une famille qui n'ouvre pas une case ne mérite ni son schéma,
ni son sprite, ni son test.
---

## 3. Les contraintes physiques qui décident si une idée est concevable

Valeurs lues dans `src/simulation/simulation-session.ts` et
`src/domain/family-geometry.ts` : elles font foi, contrairement aux exemples
narratifs. `g = 9,81`, pas fixe 1/60 s, échec à 20 s (1 200 pas), réussite =
centre de la balle dans le capteur du panier pendant 30 pas.

| Fait | Valeur | Conséquence pour un niveau |
| ---- | ------ | -------------------------- |
| Balle | densité 1, rayon 0,3 → masse ≈ 0,283 kg, poids ≈ 2,8 N | l'unité de poids du jeu |
| Masse 10 kg | poids ≈ 98 N | 35 fois la balle : elle ne se pousse pas du doigt |
| Souffle | `FAN_PRESSURE = 9` × largeur exposée × (1 − d/3), cône de ±15°, portée 3 | à la bouche ≈ 5,4 N sur une balle : **1,9 fois son poids** ; ≈ 7,2 N sur la masse, soit 0,7 m/s² |
| Souffle et poutres | seules les corps **dynamiques** sont poussés, aucune occlusion | **une poutre ne fait pas écran au vent** ; seule une collision arrête la balle |
| Lévitation | 5,4 (1 − d/3) = 2,8 → d ≈ 1,46 | une balle soufflée vers le haut se pose **≈ 1,5 unité au-dessus de la bouche** (calcul, à confirmer au banc) |
| Barrière | barre 1,2536 × 0,28, glisse à 2,5 u/s, course ≈ 0,97 | **≈ 0,39 s pour s'ouvrir, 0,39 s pour se refermer** ; ouverte, il ne reste aucun collider |
| Ventilateur qui démarre | pale à 8π rad/s, accélération 20π | ≈ 0,4 s pour atteindre la pleine poussée : la portance **monte progressivement** |
| Tremplin | restitution 1, ignorée sous 1 m/s | rend **toute** la vitesse d'arrivée : la balle remonte à sa hauteur de chute, **jamais plus haut** |
| Convoyeur | vitesse de surface 1,5 u/s | une bande de 3 unités = **2,00 s de voyage** : c'est une horloge |
| Balle sur plat | résistance au roulement, décélération ≈ 0,7 m/s² | freine et arrête ; sur 15°, accélère d'environ 1 m/s² |
| Bouton | momentané, capteur 0,05 au-dessus du capuchon ; ne commande **jamais** un convoyeur | tant qu'un corps dynamique pèse ; tombe dès qu'il ne pèse plus |
| Fils (ADR 0009) | sources levier et bouton ; cibles convoyeur, ventilateur, barrière ; **un seul contrôleur par dispositif** | levier → convoyeur reste le seul câblé par la campagne ; bouton → barrière et levier → ventilateur sont inédits |
| Rotation | poutre libre ; ventilateur, barrière, tremplin **par quarts de tour** ; masse, levier, convoyeur, bouton jamais | un souffle ne s'oriente que de 90° en 90° ; vers le haut = `rotation: -π/2` |
| Règle de campagne | tout objet placé au départ a ses trois permissions à `false` ; le joueur ne change **aucune** propriété et ne relie **aucun** fil | le niveau doit livrer le dispositif en place, le joueur ne livre qu'un **endroit** (et un angle pour une poutre) |

Trois bornes de conception que j'en déduis, et que je propose d'inscrire :

- **Pas de fenêtre de réussite plus courte que 0,5 s.** La barrière met 0,39 s à
  s'ouvrir : un niveau dont la solution est « passer pendant l'ouverture » se
  règle au pixel et contredit « une solution ne repose jamais sur un réglage au
  pixel près ». J'utilise la barrière comme **trappe**, pas comme **porte**.
- **Le tremplin ne franchit pas de dénivelé.** Il rend la hauteur de chute : il
  sert à *traverser* (en le tournant de 90°) ou à *revenir*, jamais à monter
  plus haut.
- **Le seul objet qui puisse monter la balle plus haut que son point de départ
  est le ventilateur** (avec le convoyeur, qui l'apporte ailleurs). Un niveau
  « panier plus haut que la balle » est donc un niveau de souffle, ou ne se joue
  pas.

---

## 4. Chapitre 3 proposé — « Souffle, verrous et ressorts »

Six niveaux, scènes de 8 × 5,5, un verbe nouveau chacun, tous **au-dessus des
niveaux 12 à 14** (non chiffrés ici pour ne pas empiéter sur la tâche L18).
Chacun ne demande au joueur qu'**une ou deux poses**, comme la campagne. Les
repères : `y` vers le bas, rotation positive horaire à l'écran ; pose d'un objet
sur une poutre plate = `y_poutre − (0,125 + ½ hauteur de l'objet)`.

### A — « Le portique » (barrière : supprimer le sol)

**Verbe.** Un plancher peut être télécommandé. Une barrière fermée **porte** la
balle ; ouverte, il ne reste plus rien entre la balle et le vide.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `ball` | ball | (4,6 ; 2,523) | 0 | posée sur la barre fermée |
| `gate` | barrier | (4,0 ; 3,0) | 0 | `state: "closed"` |
| `basket` | basket | (4,6 ; 4,9) | 0 | sous la trappe |
| `shelf` | beam | (1,6 ; 2,4) | 0 | `size: "short"` |
| `plunger` | button | (1,6 ; 2,285) | 0 | posé sur l'étagère |

Fil : `{ id: "wire-1", sourceId: "plunger", targetId: "gate" }` — **premier fil
partant d'un bouton de la campagne** (levier → convoyeur était le seul).
Inventaire : `mass` `10kg` ×1, `{ move: true, rotate: false, remove: true }`.
Zone : `x 0,7 → 2,5`, `y 1,0 → 2,05`. Pas de `challenge`.

**Référence.** Masse lâchée en (1,6 ; 1,5) : elle tombe sur le capuchon, le
bouton reste enfoncé (la masse ne bouge plus), la barre rentre, la balle tombe
d'un demi-unité dans le panier.

**Pourquoi c'est nouveau.** Jusqu'ici le joueur ajoutait des choses ; ici il en
**enlève une** à distance, sans jamais toucher la balle.

**Contre-exemples.** Sans masse : la balle est encore sur la barre à 20 s
(échec sur le temps). Masse posée sur la barre à côté de la balle : les deux
tombent ensemble — la masse passe devant le panier et éjecte la balle ;
**à mesurer**, et c'est le meilleur contre-exemple du niveau s'il se confirme.

**À mesurer.** La pose exacte de la balle sur la barre (le dessus de la barre
est à `y_barrière − 0,1768`) ; la hauteur de pose de la masse sur le capuchon
(`y_bouton − 0,2402 − 0,2526`) ; la fenêtre en `x` de la zone, cible ≥ 0,6.

### B — « Le couloir » (ventilateur horizontal : le vent ne connaît pas les murs)

**Verbe.** Une force à distance, qui s'use avec la distance. Et une règle contre-
intuitive, vraie dans le code : **souffler à travers une poutre ne change rien**
(`#blowFans` ne pousse que les corps dynamiques, sans occlusion). Le joueur qui
construit un mur « pour couper le vent » voit la balle poussée quand même de
l'autre côté.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `fan` | fan | (0,7 ; 1,2) | 0 (souffle vers la droite) | `state: "on"` |
| `ball` | ball | (1,7 ; 1,5) | 0 | en vol libre, dans le cône |
| `basket` | basket | (6,2 ; 4,9) | 0 | en bas, loin à droite |

Bouche du souffle calculée : (1,25 ; 1,12) ; cône de ±15°, portée 3 → le vent
s'arrête vers `x = 4,25`. Lancée telle quelle, la balle est poussée vers la
droite en **retombant** : sa trajectoire est un arc bonifié qui passe
nettement à gauche et au-dessus du panier… et manque.

Inventaire : `beam` `short` ×2, `{ move: true, rotate: true, remove: true }`.
Zone : `x 2,0 → 5,6`, `y 1,4 → 3,4`. Pas de `challenge`.

**Référence.** Un toboggan : une poutre courte inclinée (≈ 20°) sous la trajectoire,
entre `x 3,0` et `x 4,6`, qui reçoit la balle encore poussée par l'air et la
conduit jusqu'au bord ; l'autre poutre, en **rebut**, devant le panier, pour que
la balle y tombe au lieu de le survoler. Solution à 1 objet probablement
possible : `challenge` à décider après mesure (`elegantObjectCount: 2`,
`minimalObjectCount: 1`).

**Pourquoi c'est nouveau.** Le cône est une **zone**, pas un objet : poser une
poutre ailleurs ne change pas la force, mais pose la balle *dans* le cône ou
*dehors*. Le joueur apprend à lire une zone invisible — c'est la première fois
que le niveau se résout en regardant autre chose que des solides. (C'est aussi la
seule famille dont il faudrait indiquer le souffle à l'écran : voir § 7.)

**Contre-exemples.** Poutre posée verticalement devant la bouche pour « couper le
vent » : la balle est quand même poussée dès qu'elle passe au-dessus ; aucune
poutre : hors scène en 20 s.

**À mesurer.** La portée réelle de l'arc (la poussée tombe à zéro à 3 unités,
mais s'use dès la bouche) ; la fenêtre en `x` du toboggan, cible ≥ 0,4 ; le cas
où la balle reste **coincée** sur le rebord du panier sans y entrer (le capteur
réclame 30 pas : un survol ne gagne pas).

### C — « La rampe ascendante » (ventilateur vers le haut : faire monter la balle)

**Verbe.** Le souffle est le **seul** objet du jeu qui puisse mettre la balle
plus haut que son point de départ (le tremplin rend la hauteur de chute, le
convoyeur déplace sans monter). Le niveau pose donc une question que la
campagne n'a jamais posée : *le panier est plus haut que la balle*.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `fan` | fan | (3,0 ; 4,6) | −π/2 (souffle vers le haut) | `state: "on"` |
| `floor` | beam | (2,4 ; 4,4) | 0 | `size: "short"` |
| `ball` | ball | (2,9 ; 4,075) | 0 | posée sur le sol, dans le cône |
| `basket` | basket | (5,4 ; 3,0) | 0 | **au-dessus** du départ de la balle |
| `shelf` | beam | (6,0 ; 3,55) | 0 | `size: "short"`, porte le panier |

Bouche calculée : (2,92 ; 4,05). Une balle soufflée vers le haut s'arrête vers
`y ≈ 2,6` (là où `5,4 × (1 − d/3)` égale son poids), **oscille** autour de cette
hauteur, et ne la dépasse que de son élan.

Inventaire : `beam` `short` ×1, `{ move: true, rotate: true, remove: true }`.
Zone : `x 2,6 → 5,2`, `y 1,8 → 3,2`. Pas de `challenge`.

**Référence.** La poutre devient un **plafond incliné** (≈ −20° : son extrémité
droite plus haute) posé au-dessus de la balle qui lévite : l'air plaque la balle
contre le plafond, et la composante du souffle **le long de la pente** la fait
glisser vers le haut. La balle remonte sous la pente, sort du cône quand son
décalage latéral dépasse `0,27 + 0,27 × d`, bascule au bord de la poutre et
retombe dans le panier.

**Pourquoi c'est le cœur de ces propositions.** Ce niveau n'existe que parce que
le souffle est **proportionnel à la surface exposée** et non au poids — une
constante choisie « pour la lisibilité ». Aucun niveau écrit à ce jour ne
l'exploite : la rampe ascendante est le seul mouvement du jeu où la balle monte
*en glissant sous un objet que le joueur a posé*, sans jamais rouler.

**Contre-exemples.** Poutre trop raide (≥ 40°) : la balle sort du cône et
retombe ; poutre trop haute : la balle lévite sans la toucher ; aucune poutre :
la balle oscille jusqu'à 20 s.

**À mesurer en priorité** (risque le plus élevé des six) : l'angle de pente qui
tient (hypothèse 10° → 25°), la hauteur maximale réellement atteignable, la
place du panier. Si aucune pente ne donne une fenêtre d'au moins 0,3 unité en `x`
et en `y` de la poutre, **abandonner la rampe** et garder le souffle pour la
synthèse F, conformément à la règle d'arrêt de la tâche L18.

### D — « Le rebour » (tremplin : toute l'énergie revient)

**Verbe.** Le seul objet qui **rend** quelque chose au lieu d'en prendre.
Restitution 1, ignorée sous 1 m/s : la balle repart avec la vitesse qu'elle a
rapportée. Combien de hauteur cela fait-il vraiment, une fois les amortissements
du moteur comptés ? **À mesurer**, et c'est tout l'intérêt du niveau.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `ledge` | beam | (1,4 ; 2,0) | 0 | `size: "short"` ; immobile, non tournable |
| `ball` | ball | (0,7 ; 1,575) | 0 | posée sur le rebord, lâchée au lancement |
| `kicker` | springboard | (3,4 ; 4,9) | +0,35 (≈ 20°) | `state: "idle"` ; **tourné par l'auteur** |
| `basket` | basket | (1,0 ; 2,6) | 0 | **au-dessus** du point de chute |

La bouche est à `(3,4 ; 4,541)`, donc presque sous le point de chute de la balle :
elle tombe à plomb sur le plateau et repart vers la gauche.

Inventaire : `beam` `short` ×1, `{ move: true, rotate: true, remove: true }`.
Zone : `x 0,7 → 2,6`, `y 2,6 → 4,4` — **au-dessus** du tremplin. Pas de
`challenge` avant la mesure du rendement.

**Référence.** La poutre devient une **rampe d'élan** : posée en pente douce
(≈ 20°) du rebord jusqu'au sol, elle convertit la chute verticale en vitesse
horizontale. La balle arrive plus vite et plus à plat sur le plateau incliné, qui
la renvoie en diagonale vers la gauche et **plus haut** qu'une chute verticale.
Le panier est placé dans cette zone de retombée.

**Pourquoi ça reste légal.** Le tremplin est tourné **dans le document de
départ**, comme le ventilateur du niveau 4 (`rotation: -π/2`) ; le joueur, lui,
ne tourne qu'une poutre. Ces niveaux ne demandent donc aucune permission de
rotation nouvelle — voir § 8, décision 3.

**Contre-exemples.** Aucune rampe : la balle tombe à plomb, repart à la
verticale, retombe sur le plateau et y meurt ; rampe à l'envers : la balle part
trop loin et sort de la scène ; aucune pose : échec par le temps.

**À mesurer.** Le rendement **effectif** aux vitesses du jeu (une chute de 2,5
unités donne ≈ 7 m/s ; combien de hauteur cela rend-il après amortissement ?) ;
le gain de la rampe par rapport à la chute seule, cible ≥ 1,0 unité ; la fenêtre
de la rampe, cible ≥ 0,4.

### E — « Le passage » (barrière et bouton : le sol manque pendant un instant)

**Verbe.** Deux idées en une seule : **supprimer le sol**, et **le délai**. Une
barrière fermée **porte** la balle ; une barrière qui vient de recevoir un
courant met ≈ 0,39 s à s'effacer, et autant à revenir. Le joueur livre un
**endroit** et un **instant**.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `ledge` | beam | (0,8 ; 1,8) | 0 | `size: "short"` ; immobile, non tournable |
| `ball` | ball | (1,55 ; 1,575) | 0 | posée sur le rebord, au bord droit |
| `gate` | barrier | (2,9 ; 2,5) | 0 | `state: "closed"` ; sous le chemin de la balle |
| `basket` | basket | (4,9 ; 4,9) | 0 | sous la barre et à droite |
| `plunger` | button | (4,4 ; 4,9) | 0 | sur le sol, à droite |
| `arm` | lever | (3,4 ; 2,1) | 0 | `state: "left"` ; immobile ; sur le chemin |

Fil : `{ id: "wire-1", sourceId: "arm", targetId: "gate" }`. Inventaire :
`beam` `short` ×1 et `mass` `10kg` ×1, respectivement
`{ move: true, rotate: true, remove: true }` et
`{ move: true, rotate: false, remove: true }`. Zone : `x 1,4 → 4,0`,
`y 0,9 → 2,4` — **au-dessus** de la barre et du levier. `challenge`:
`{ "elegantObjectCount": 2, "minimalObjectCount": 1 }`.

**Référence (2 objets).** Une poutre en **toboggan** depuis le rebord jusqu'à la
poignée du levier, la **masse** posée sur le point haut : la balle roule, bute
contre la poignée, le levier change de cran, la barre rentre pendant que la balle
poursuit sa course, et la masse, restée sur le capuchon du bouton à l'arrêt, le
garde enfoncé. En pratique le levier suffit à ouvrir ; la seconde pose est là
pour rendre la solution lisible plutôt qu'au pixel près.

**Solution à 1 objet (le palier 🏆).** La masse seule, posée sur la barre devant
la balle : les deux glissent et tombent ensemble, la masse atterrit sur le bouton
et maintient la trappe ouverte le temps que la balle y tombe. Le moteur sait faire
(bouton momentané tenu tant qu'un corps dynamique pèse), mais le niveau se joue
alors à quelques centièmes : **si elle gagne, la consigner comme solution connue
et l'écarter en décalant le bouton de 0,4 unité**, plutôt que de relever le
`challenge`.

**Contre-exemples.** Aucune pose : la balle s'arrête sur la barre (résistance au
roulement) ou y reste jusqu'à 20 s ; poutre seule, sans masse : le levier reste à
« gauche » et le chrono est perdu.

**À mesurer.** La pose exacte de la balle sur la barre (le dessus est à
`y_barrière − 0,1768`) ; la pente que prend une barrière fermée posée en pleine
scène (hypothèse : glissante, **pas** butoir) ; si la barre seule laisse déjà
passer la balle, **avancer la barre de 0,2 unité** ou relever le rebord — ne pas
affaiblir le test.

### F — « Le réveil » (synthèse : le convoyeur est une horloge)

**Verbe.** Aucun nouveau : c'est le niveau qui **assemble**. Trois verbes déjà
appris, et une idée neuve seulement dans leur ordre — comme le niveau 8 de la
campagne assemble poutre et bascule.

| Objet | Type | Position | Rotation | Propriétés |
| ----- | ---- | -------- | -------- | ---------- |
| `ball` | ball | (1,2 ; 1,575) | 0 | posée sur `start` |
| `start` | beam | (1,4 ; 1,8) | 0 | `size: "short"` ; immobile, non tournable |
| `belt` | conveyor | (3,4 ; 2,2) | 0 | `state: "running"`, vers la droite |
| `rider` | mass | (2,5 ; 1,874) | 0 | posée sur la bande |
| `gate` | barrier | (5,2 ; 3,4) | 0 | `state: "closed"` ; barre la descente |
| `plunger` | button | (4,9 ; 3,05) | 0 | sous le bord droit de la bande |
| `basket` | basket | (6,0 ; 4,9) | 0 | au pied de la barre |

Fil : `{ id: "wire-1", sourceId: "plunger", targetId: "gate" }`. Inventaire :
`beam` `short` ×2, `{ move: true, rotate: true, remove: true }`. Zone :
`x 1,0 → 5,8`, `y 2,4 → 4,4` — **sous** le convoyeur et la barre.
`challenge`: `{ "elegantObjectCount": 2, "minimalObjectCount": 2 }`.

**Le temps comme matière première.** Une bande de 3 unités à 1,5 u/s, c'est
**2,00 s** de voyage (mesuré au niveau 11). La masse quitte la bande 2 s après le
lancement, tombe sur le bouton, la barre rentre 0,39 s plus tard. La balle, elle,
roule sur la poutre posée par le joueur et arrive au pied de la barre **juste
après**. Le joueur ne règle pas un pixel : il règle un **délai**, et ce délai est
écrit dans le niveau.

**Référence (2 objets).** Un **entonnoir** : une poutre en pente douce qui prend
la balle au sortir du convoyeur et la fait descendre vers la droite, une seconde
en **rebut** devant le panier pour que la balle y tombe au lieu de le survoler.
Les deux poses sont lentes et lisibles ; aucune ne se joue à 15° près.

**Contre-exemples.** Aucune pose : la masse tombe dans le vide (aucun bouton sous
le bord de bande) ou la balle bute sur la barre fermée ; poutre unique trop
raide : la balle arrive avant l'ouverture et meurt devant la barre —
contre-exemple qui **montre le délai**, à décrire dans l'aide du niveau.

**À mesurer.** Le moment réel où la masse quitte la bande (hypothèse 2,0 s après
le lancement, démarrage de bande et friction comprises) ; la fenêtre en `x` des
deux poutres, cible ≥ 0,4 chacune ; vérifier qu'une solution à 1 objet n'existe
pas (sinon `minimalObjectCount: 1`).

---

## 5. Ce que ces six niveaux changent à la courbe

| Niveau | Verbe nouveau | Ce que le joueur ne peut plus ignorer |
| ------ | ------------- | ------------------------------------ |
| A — Le portique | supprimer le sol | un objet peut être une **interdiction** qu'on lève |
| B — Le couloir | pousser à distance | une **zone** invisible pousse, un mur n'arrête rien |
| C — La rampe ascendante | faire monter | la balle peut finir **plus haut** qu'elle ne part |
| D — Le rebour | rendre l'énergie | un choc peut **restituer** toute la hauteur |
| E — Le passage | retarder | ouvrir ne suffit pas : il faut ouvrir **à temps** |
| F — Le réveil | assembler | un objet peut être une **horloge** |

Ordre proposé : **A → B → E → D → C → F**. A et E forment un diptyque (la
barrière comme trappe, puis la barrière avec son délai) ; B puis C reprennent le
souffle horizontal puis vertical ; D vient après E pour ne pas mêler « rendre »
et « supprimer » dans la même tête ; F clôture.

Une objection que j'assume : **six niveaux, ce peut être trop**. Si l'auteur ne
retient qu'un chapiteau, je propose **A, B, C, F** : ce sont les quatre où
l'objet nouveau est la **seule** façon de gagner, et C le seul où le joueur doit
découvrir une loi du moteur qu'aucun texte ne lui énonce. D et E sont les plus
proches des niveaux 12 à 14 (rendement, délai) : ce sont les plus faciles à
sacrifier ou à fondre dans un niveau existant.

---

