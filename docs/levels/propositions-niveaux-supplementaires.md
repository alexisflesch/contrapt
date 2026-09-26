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

### Cinq niveaux de combinaison qui ne coûtent **aucune** ligne de code

Avant d'ajouter des objets : il reste des niveaux exploitables avec les onze
familles d'aujourd'hui. Aucun ne touche au schéma, au port physique ou aux
sprites — un JSON, une régression, et le banc d'essai. Ce sont les contenus les
moins chers du dépôt, et ils peuvent s'écrire pendant qu'une famille est en
discussion.

| Idée | Scène | Ce qu'elle apprend |
| ---- | ----- | ------------------ |
| **G — « Le mur d'air »** | ventilateur tourné vers le bas sur un ressaut ; la balle doit passer **à côté** du souffle sans s'y faire retenir | le souffle peut **retenir** et pas seulement pousser ; une zone invisible est un obstacle |
| **H — « Le contrepoids »** | bascule surchargée d'un côté, balle de l'autre ; inventaire = la masse de 10 kg | la masse n'est pas un outil de franchissement : 35 fois la balle, ça ne se pose pas à côté d'elle |
| **I — « La chaîne »** | le pied d'une bascule enfonce un bouton en s'abaissant ; le bouton commande une barrière que la balle franchit | une **séquence** complète sans que le joueur touche au dispositif : il n'ajoute que le maillon qui manque |
| **J — « Deux cibles, un levier »** | un levier relié à une barrière **et** à un ventilateur ; le joueur ne choisit pas le câble, il choisit l'**instant** | un ordre peut avoir deux effets ; le niveau se joue sur le moment, pas sur le chemin |
| **K — « Le retour »** | un convoyeur qui ramène la balle à son point de départ ; il faut l'en sortir avant le tour suivant | le convoyeur est aussi une **punition** : ce qu'il transporte, il peut le ramener |

**J demande une vérification dans le code.** ADR 0009 fixe « un seul contrôleur
par dispositif » mais ne dit pas si une **source** peut alimenter deux cibles. Si
le schéma l'interdit, J est impossible et il vaut mieux le savoir avant d'y passer
du temps ; s'il l'autorise, c'est une mécanique de premier ordre et gratuite — et
le succédané le moins coûteux du verbe de la poulie (§ 6.6).


---

## 6. Objets nouveaux que je propose

Le filtre, dans l'ordre : (1) ouvre-t-il une case dans la tête du joueur (§ 2) ;
(2) le document peut-il le décrire **sans casser** `LevelDocument v2` ; (3) le
port physique sait-il déjà le faire ; (4) l'art existe-t-il ; (5) combien de
niveaux l'exploitent. Une famille qui ne passe pas ces cinq questions reste un
dessin dans `art/`.

Chaque famille nouvelle devra fournir, comme l'exigent `AGENTS.md` et
`architecture.md` : son schéma Zod, sa définition enregistrée, ses capacités, sa
projection visuelle et son sprite exporté par `art/build-sprites.py`, ses poignées
et permissions, ses validateurs, ses tests contractuels **et** ses tests de
comportement, sa carte dans le tiroir, ses règles de sérialisation. Ce qui suit
ne détaille que le design : rien n'est implémenté, et les coûts sont des ordres de
grandeur, pas des devis.

| Proposition | Verbe ouvert | Document | Coût | Art | Niveaux | Verdict |
| ----------- | ------------ | -------- | ---- | --- | ------- | ------- |
| Masse de 1 kg (variante de propriété) | doser un poids | inchangé | très faible | à dessin | 2+ | **oui, en premier** |
| Boîte `box` (bois / métal) | boucher, empiler, lester | compatible | moyen | **dessiné** | 3+ | **oui** |
| Pendule | ce qui revient | compatible | moyen | à dessiner | 2 | oui, après la boîte |
| Clapet à sens unique | ne passer que dans un sens | compatible | moyen | à dessiner | 2 | oui |
| Rails + chariot | transporter le long d'une pente | compatible | moyen-élevé | à dessiner | 1-2 | peut-être |
| Poulie à contrepoids | deux endroits qui dépendent l'un de l'autre | **incompatible (v3)** | élevé | à dessiner | 2 | **différée** |

### 6.1 Masse de 1 kg — une variante, pas une famille

**Verbe.** *Doser un poids.* Le joueur n'a aujourd'hui qu'un seul poids : 10 kg,
35 fois la balle. Il ne peut jamais peser le pour et le contre au sens propre, et
aucune balance ne peut exister : une bascule balle contre masse est gagnée
d'avance.

**Le moins cher du dépôt :** une valeur de plus dans une propriété existante
(`size: "1kg" | "10kg"`, défaut `"10kg"`), une entrée de plus dans
`family-geometry.ts` (0,4 × 0,386 si on garde la densité), un second sprite. Les
documents écrits aujourd'hui se décodent toujours : **aucune migration**. Il
faudra juste un test « un document sans `size` reste une masse de 10 kg ».

**Ce qu'elle débloque.** « L'équilibre » : balle sur un plateau, masse de 1 kg sur
l'autre — 9,8 N contre 2,8 N, la masse gagne, et le joueur comprend que lourd ne
se bat pas, ça se contourne. Et le niveau 8 de la campagne (poutre et bascule)
pourrait exister en version « ⭐ » avec la masse de 1 kg à la place de la masse de
10 kg.

**Attention à la lisibilité :** 1 kg et 10 kg doivent se distinguer d'un coup
d'œil à 390 px de large (taille *et* sprite *et* libellé dans la carte du tiroir) ;
c'est un point pour la tâche U12, pas pour le domaine.

### 6.2 Boîte `box` — bois et métal : l'art est déjà dessiné

**Verbe.** *Boucher, empiler, faire masse.* Un volume qui se pousse, qui s'empile,
qui bouche un trou — ni une balle (il ne roule pas), ni une poutre (il bouge).
C'est l'objet qui manque pour que le décor devienne un matériau.

**Modèle.** Un carré dynamique de 0,6 × 0,6, deux matériaux : **bois**
(densité ≈ 0,7 → masse ≈ 0,25 kg, poids ≈ 2,5 N ; friction forte, restitution 0)
et **métal** (densité ≈ 6 → masse ≈ 2,2 kg, poids ≈ 21 N ; restitution 0,1).
Ces deux chiffres sont choisis pour une raison précise : le souffle d'un
ventilateur à pleine puissance (5,4 N) **tient** la boîte de métal (le frottement
dépasse la poussée) et **fait glisser** la boîte de bois, lentement. Une seule
famille, un matériau, deux sprites — comme les trois tailles de poutre.

**Document.** Un membre de plus dans l'union discriminée `objects`. Les anciens
documents se décodent toujours ; les nouveaux exigent une application à jour. Pas
de migration de schéma, un bump de version mineure, et un test de non-régression
sur les JSON embarqués.

**Ce qu'elle rend jouable.** Le **bouchon** : une boîte de bois ferme une goulotte,
la balle la pousse, ça cède après un délai — un *timing* sans fil ni bouton, qui
ne ressemble à rien de ce qui existe. L'**empilement** : deux boîtes font une
marche plus haute qu'une poutre, mais instable. Le **lest** : une boîte de métal
sur un plateau de bascule, et la question « est-ce que je la pousse ou je la
contourne ».

**Premier niveau proposé, « Le bouchon » :** goulotte en pente, boîte de bois qui
la ferme, panier en contrebas. Le joueur ne peut pas retirer la boîte (elle est
objet de départ, permissions à `false`) : il doit dériver la balle pour qu'elle aille
la heurter **par le côté**. Contre-exemple : poutre posée sur la boîte → elle
tient, et le joueur apprend qu'un frottement est une force.

**Verdict.** Premier des « vraies » familles : l'art est dessiné, le modèle est un
simple polygone, trois niveaux au moins l'exploitent, et elle n'introduit aucune
primitive nouvelle dans le port.

### 6.3 Pendule — un obstacle qui revient à heure fixe

**Verbe.** *Ce qui revient.* Tout ce que la campagne connaît reste où on le met,
ou se déclenche. Un pendule introduit un objet dont l'état **présent** dépend de
ce qui est arrivé **deux secondes plus tôt** : le joueur lit une trajectoire dans
le temps, plus seulement dans l'espace.

**Modèle — et c'est ce qui le rend acceptable.** Un seul placement, comme la
bascule : ancrage fixe, liaison rotule interne, lentille dynamique au bout d'une
barre. `architecture.md` admet déjà qu'une famille visible soit « physiquement
composée de plusieurs corps internes sans que cette composition devienne des
placements de niveau ». Le document ne porte donc qu'une transformée : **aucune
nouvelle relation persistante**, aucune migration.

**Contrainte chiffrée.** La période d'un pendule simple est `T = 2π √(L/g)` :
`L = 1,0` unité donne `T ≈ 2,0 s`, `L = 0,25` donne `T ≈ 1,0 s`. La borne que je
propose au § 3 (aucune fenêtre de réussite plus courte que 0,5 s) impose donc
`L ≥ 0,25`, et je recommande deux tailles — 1,0 et 1,5, soit 2,0 s et 2,4 s — pour
que le rythme reste lisible sur un écran de téléphone. Le pendule doit aussi
**s'amortir** : sans amortissement, il rejoue le même geste pendant les 20 s de la
partie et le niveau devient une question de timing pur.

**Premier niveau proposé, « Le métronome » :** la balle roule sur une poutre et
doit franchir un portique dont le battant est le pendule ; le panier est derrière.
Le joueur n'arrête pas le pendule — il choisit **où** la balle prend de la vitesse.
Second usage, plus drôle : le pendule comme **maillet**, qui envoie la balle où
elle ne pouvait pas aller seule.

**Coût et risques.** Liaison rotule avec butées (déjà nécessaire pour levier,
ventilateur et bascule : le port sait probablement faire) ; hit-test sur la
lentille et la barre sous un seul identifiant (précédent : la bascule, tâche L13) ;
sprite à deux calques dont un tourne autour d'un point qui n'est **pas** le centre
du placement — le seul point à vérifier avant de se lancer, car les familles
actuelles tournent autour de leur propre origine.

### 6.4 Clapet à sens unique — le tamis

**Verbe.** *Ne laisser passer que dans un sens.* Aucun objet de la campagne ne
filtre : barrière et poutre bloquent dans les deux sens. Un clapet rend possible
une chose nouvelle : **laisser la balle descendre et l'empêcher de remonter**, donc
construire un chemin qui ne peut pas se défaire.

**Modèle.** Une plaque articulée en son bord haut (rotule à une extrémité) et deux
**taquets** qui la bloquent d'un côté : la balle venue d'en haut écarte la plaque,
la balle venue d'en dessous trouve une plaque butée. Rien d'actif — pas de capteur,
pas de fil, pas d'état à sérialiser : la géométrie fait le tri. Conséquence
précieuse : le clapet ne demande **aucune** permission nouvelle, puisqu'on n'y
change rien.

**Document.** Une famille de plus, transformée simple et rotation par quarts de
tour (le sens du tri doit se lire d'un coup d'œil). Compatible, pas de migration.

**Premier niveau proposé, « Le tamis » :** deux paniers, un seul gagnant, et un
tamis qui sépare les deux trajectoires selon que la balle arrive **sur** le clapet
ou **contre** le clapet. Le joueur ne choisit pas un chemin, il choisit **de quel
côté** il y arrive — le premier niveau du jeu où le mot « ou » a un sens.

**À vérifier au banc avant d'écrire le JSON :** qu'une balle à ≈ 1 m/s écarte bien
la plaque, et qu'une balle arrive par dessous ne franchit jamais les taquets par
effet d'angle. Ces deux mesures font vivre ou mourir la famille.

### 6.5 Rails et chariot — transporter le long d'une pente

**Verbe.** *Porter le long d'une ligne dessinée par le décor.* Le convoyeur ne
transporte qu'à l'horizontale ; sur une poutre inclinée, la balle roule à une
vitesse qu'on ne maîtrise pas. Un chariot sur rail transporte **en pente**, à la
vitesse que la pente donne, et il peut porter autre chose que la balle — une
masse, une boîte.

**Modèle.** Une **seule** famille, `monorail` : un rail rigide (trois tailles comme
les poutres, orientable par quarts de tour) dont l'instance de simulation crée un
curseur glissant le long d'une liaison coulissante. Deux placements distincts (rail
+ chariot) obligeraient à une relation persistante entre les deux ; je l'écarte
pour cette raison, même si l'objet composite est moins évident à expliquer à
l'écran.

**Document** : compatible (`size` + `rotation`). **Port** : première liaison
coulissante — une primitive de plus, petite mais réelle.

**Verdict : peut-être.** Le verbe est vrai mais voisin de celui du convoyeur ; la
différence (la pente, et un porteur qui transporte autre chose) vaut-elle une
primitive de plus ? Je ne la propose qu'**après** la boîte et le clapet, et
seulement si un deuxième niveau l'exploite : `AGENTS.md` demande un **deuxième cas
réel** avant l'abstraction.

### 6.6 Poulie à contrepoids — la plus demandée, la plus chère

**Verbe.** *Deux endroits qui dépendent l'un de l'autre.* C'est le verbe qu'on
attend d'un jeu de physique, et le seul dont l'absence se voit : « je voudrais
tirer une corde d'ici pour faire monter un poids là-bas ».

**Pourquoi c'est cher, concrètement.** Une poulie relie **deux placements** : la
corde est une relation entre objets, comme le fil de commande. Il faudrait donc :

1. une nouvelle collection persistante, par exemple
   `links: [{ id, kind: "rope", aId, bId, length }]` — le contrat du document
   change, donc **`LevelDocument v3`**, migration de `v2` vers `v3`, et tests
   couvrant les deux versions comme l'exige `AGENTS.md` ;
2. un **ADR** : une relation n'est pas un détail d'implémentation, c'est un
   engagement sur ce que les niveaux pourront dire plus tard ;
3. un port capable de liaisons à distance à longueur bornée, sans quoi le
   déterminisme du pas fixe est en jeu ;
4. dans l'éditeur, une gestuelle pour relier deux objets au pouce — là où le fil a
   déjà la sienne ;
5. et le plus sournois : une corde qui s'enroule autour d'un corps tiers, qui se
   tend à l'envers ou qui en attrape un autre est une source de bugs sans fin. Il
   faudrait la restreindre à un trajet franc, ce qui la rend moins intéressante.

**Ce qui donne l'essentiel du verbe sans toucher au port.** Deux voies gratuites :

- **un levier, deux fils** (barrière *et* ventilateur commandés par le même
  levier) : une décision, deux endroits — c'est le niveau J du § 5, et le vrai
  succédané du verbe ;
- **une boîte de métal comme contrepoids** (§ 6.2) sur un plateau de bascule : un
  poids en fait monter un autre, sans corde, avec une lecture immédiate.

**Recommandation : différer.** Écrire ces deux niveaux. Si l'auteur en redemande un
troisième qui soit impossible sans corde, ouvrir l'ADR et le `v3`. Une migration de
document est difficile à défaire ; c'est précisément la discipline que le dépôt
s'impose ailleurs.

### 6.7 Ce que je ne propose volontairement pas

- **le fluide** (sable, eau) : il faudrait un solveur, et le pas fixe n'y est pas
  préparé ;
- **l'aimant** : une force à distance de plus, mais le ventilateur occupe déjà la
  case « pousser sans toucher » ;
- **le ressort relié** (un ressort entre deux objets) : le même problème que la
  corde — c'est une relation, donc un `v3` ;
- **des objectifs composés ou séquentiels** : l'architecture est explicite, un seul
  `goal.type === 'basket'`, et aucun niveau de ce document n'en demande plus ;
- **du code dans les niveaux** : ni code exécutable ni URL d'asset distante, et
  cette limite est le contrat qui permet le partage par lien ;
- **un second moteur, un second renderer, un ECS** : rien ici ne les justifie.


## 7. Ce que l'écran doit rendre lisible

Ces niveaux ne sont jouables que si quatre informations arrivent au joueur. Je ne
propose ici **aucun style, aucune couleur, aucune mise en page** — seulement
l'information que l'image doit transmettre, et le constat de ce qui manque. Tout
ce qui suit relève du § 6 de la feuille de route (interface visible) : des tâches
à l'essai, avec validation et captures par l'auteur, pas des tâches
d'implémentation autonome.

| Ce qui doit se voir | Pourquoi sans quoi le niveau ne se joue pas | État |
| ------------------- | ------------------------------------------ | ---- |
| **Le cône du ventilateur** | B et C se résolvent en lisant une **zone invisible** : un joueur qui ne voit pas le cône ne peut pas le manquer exprès | le souffle n'est dessiné nulle part, à ma connaissance |
| **L'empreinte de la barrière** | A et E consistent à comprendre qu'un **sol va disparaître** : sans les deux montants restés vides, une barrière fermée est un simple trait et son ouverture n'est pas anticipable | à vérifier ; deux montants non simulés suffisent |
| **Le sens et l'impulsion d'un fil** | E et F tournent autour d'un **ordre qui part d'ici et agit là-bas, un peu plus tard** : ADR 0009 stocke une relation sans tracé, donc c'est au rendu de dire qui commande quoi, et de faire voir l'instant où ça passe | le sens est peut-être déjà dessiné ; l'impulsion ne l'est pas |
| **Le capuchon enfoncé ou reposé** | le bouton est **momentané** : la trappe reste ouverte parce qu'une masse pèse encore ; si l'enfoncement ne se voit pas, la causalité devient invisible | à vérifier sur le sprite `button-cap` |

Deux remarques de conception qui ne coûtent rien :

- **un délai ne se voit pas, il se devine.** E et F demandent au joueur d'attendre
  un instant qu'il ne peut pas mesurer. Le minimum qui rende ça honnête, c'est
  l'impulsion visible sur le fil — pas un compte à rebours à l'écran, qui
  transformerait un puzzle en question de rapidité.
- **deux familles se distinguent par un chiffre** (masse 1 kg / 10 kg, boîte bois /
  métal). Un sprite et un libellé dans la carte du tiroir suffisent ; à 390 px de
  large, la différence de taille seule ne se lit pas.

---

## 8. Décisions à trancher, méthode, journal

### 8.1 Ce que seul l'auteur peut décider

Mes recommandations sont en gras ; ce document ne tranche rien.

1. **Un chapitre 3 de six niveaux, ou rien ?** → **garder A, B, C, F** et juger
   D et E à l'usage. Six niveaux de plus porteraient la campagne à vingt ; la
   feuille de route en fixe quatorze.
2. **Un niveau peut-il reposer sur une loi du moteur qu'aucun texte n'énonce ?**
   C est ce niveau : personne ne devine que l'air porte plus qu'il ne pèse. →
   **oui, à condition** que l'aide du niveau donne une phrase (« l'air porte la
   balle tant qu'elle est dans le courant ») ; sinon supprimer C.
3. **Le joueur doit-il pouvoir tourner autre chose qu'une poutre ou un levier ?**
   D aurait besoin d'un tremplin orientable par le joueur. → **non** : ces niveaux
   tournent l'objet **dans le document**, comme le ventilateur du niveau 4
   (`rotation: -π/2`). Coût nul, aucune permission nouvelle, et la difficulté
   reste un choix de pose, pas de réglage.
4. **Une source de fil peut-elle alimenter deux cibles ?** Le niveau J et le
   succédané de la poulie en dépendent. → **à vérifier dans le schéma** ; si
   c'est interdit, l'autoriser est un changement mineur et compatible, sinon
   abandonner J.
5. **La masse de 1 kg ?** → **oui**, première chose à faire : elle coûte une
   valeur de propriété et ouvre les niveaux à balance.
6. **La boîte bois / métal ?** → **oui**, première famille nouvelle ; l'art est
   déjà dessiné et elle n'ajoute aucune primitive au port.
7. **La poulie, le pendule, le clapet, les rails ?** → **poulie : non** (elle
   exige `LevelDocument v3` et un ADR) ; pendule et clapet **oui**, mais après la
   boîte et seulement si deux niveaux chacun les exploitent ; rails : **pas avant
   un deuxième cas réel**.
8. **Le palier 🏆 de E** se gagne avec une seule masse, mais à quelques centièmes
   près. → **l'écarter géométriquement** (décaler le bouton de 0,4 unité) et
   l'écrire comme test de non-régression, plutôt que de le laisser comme solution
   minime illisible.
9. **Trois fonds de scène dessinent trois chapitres** et ne sont pas servis. →
   un fond par chapitre seulement quand la dette D3 (fond qui suit la caméra,
   tâche U2) est réparée.
10. **Où atterrit ce document ?** → réécrire la partie retenue dans un document de
    campagne frère (`levels/progression-chapitre-3.md`), y reprendre le formalisme
    des mesures de `initial-progression.md`, et **supprimer ce fichier** ; le garder
    comme annexe d'idées ferait deux sources pour un même contenu.

