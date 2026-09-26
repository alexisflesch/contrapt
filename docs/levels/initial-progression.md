# Campagne — chapitres 1 et 2

Statut : spécification de contenu, révisée le 27 septembre 2026. Elle remplace la
progression initiale (niveaux « Laisser tomber », « Construire un pont »,
« Choisir la longueur »…), écrite avant que la physique existe.

Les géométries ci-dessous ont été **mesurées sur le moteur réel**
(`createSimulationSession`, pas fixe 1/60 s, commit `7ebd85b`) avec un banc
d’essai jetable. Elles sont un point de départ vérifié, pas un contrat : le JSON
du niveau et son test de régression font foi une fois écrits. Si une mesure ne se
reproduit pas, c’est le test qui a raison ; ajuster la géométrie, jamais les
constantes physiques.

## Principes communs

- Scène de **8 × 5,5** (règle de contenu de l’ADR 0007), sauf mention contraire.
  Repère : `x` vers la droite, `y` vers le bas, rotation positive = sens horaire
  à l’écran (une poutre de rotation positive a son extrémité droite plus basse).
- Toutes les balles commencent au repos. La gravité est la seule source
  d’énergie, en dehors des convoyeurs.
- **Tout objet présent au démarrage d’un niveau de campagne est verrouillé** :
  ses trois permissions sont à `false`. Seuls les objets que le joueur sort du
  tiroir se manipulent. Sinon le joueur pourrait, par exemple, déplacer la balle
  directement dans le panier (décision de l’auteur, 26 septembre 2026). Le
  validateur de contenu l’impose aux niveaux de campagne ; l’atelier et les
  niveaux créés par un auteur n’y sont pas soumis.
- **Chaque niveau demande au moins une action de construction**, sauf le niveau 6
  qui présente la bascule. Dans les autres niveaux, lancer la simulation sans
  rien poser doit échouer : le joueur apprend dès le niveau 1 que l’échec est
  normal et que « Recommencer » existe. Le niveau 6 se résout tel quel après que
  le joueur a lancé la simulation.
- Une solution ne repose jamais sur un rebond de précision, un tunneling ou un
  réglage au pixel près : chaque solution de référence est accompagnée d’une
  **fenêtre de robustesse** mesurée (grille de positions qui réussissent toutes).
- Pour un objet dont le centre de rotation est son centre, un objet posé sur une
  poutre a son centre à `½ épaisseur de la poutre + ½ hauteur de l’objet` au-dessus
  de l’axe de la poutre (balle : 0,125 + 0,3 = 0,425, divisé par `cos θ` sur une
  pente). Ajouter 0,01 de jeu pour éviter un chevauchement initial.
- **Défi d’objets** (ADR 0010) : un niveau qui admet plusieurs solutions déclare
  `challenge` ; les autres n’en ont pas et n’affichent que « Résolu ».

### Régression exigée pour chaque niveau

Écrite avec le harnais `src/content/level-regression.ts` (feuille de route, L4) :

1. l’état initial, sans action, **ne réussit pas** ;
2. la solution de référence, appliquée par commandes **en contexte joueur**
   (permissions et zones vérifiées), réussit ;
3. toute la **fenêtre de robustesse** annoncée réussit ;
4. les contre-exemples annoncés échouent ;
5. deux exécutions de la référence donnent le même nombre de pas ;
6. le document du niveau n’est pas modifié par la simulation ;
7. si le niveau déclare `challenge.minimalObjectCount = n`, une recherche sur
   grille ne trouve aucune solution à `n − 1` objets (voir L4, `searchSolutions`).

Chaque niveau a aussi un parcours Playwright `mobile` qui le résout au tactile.

---

## Chapitre 1 — Poutres et bascule

### Niveau 1 — Prolonger la pente

`id` : `level-1-prolonger-la-pente`

**Apprentissage.** Lancer, voir échouer, recommencer, sortir une poutre du
tiroir et la poser. Pas de rotation.

**Scène.** La balle est posée sur une poutre inclinée qui s’arrête dans le vide.
Le panier est plus bas, loin à droite. Lancée telle quelle, la balle quitte la
pente et heurte l’extérieur du panier. Une poutre courte posée à plat au bout de
la pente prolonge le trajet : la balle roule dessus, ralentit, et tombe dans le
panier.

| Objet    | Type   | Position      | Rotation | Propriétés       |
| -------- | ------ | ------------- | -------- | ---------------- |
| `ball`   | ball   | (2,3 ; 1,177) | 0        |                  |
| `slope`  | beam   | (2,2 ; 1,6)   | 15°      | `size: "medium"` |
| `basket` | basket | (6,9 ; 4,9)   | 0        |                  |

Inventaire : `beam`, `size: "short"`, quantité 1, permissions
`{ move: true, rotate: false, remove: true }`.
Zone de construction : `x 3,6 → 7,0`, `y 1,7 → 2,9`.
Objectif : `ball` dans `basket`. Pas de `challenge`.

**Référence.** Poutre courte en (5,0 ; 2,15), rotation 0.

**Robustesse mesurée.** Toutes gagnantes : `x ∈ {4,9 ; 5,0 ; 5,1}` ×
`y ∈ {2,05 ; 2,125 ; 2,2 ; 2,3}`, et `x ∈ {5,2 ; 5,3 ; 5,4}` ×
`y ∈ {2,125 ; 2,2 ; 2,3}`.

**Contre-exemples.** Aucune poutre ; poutre en (5,6 ; 2,125) (trop loin, la balle
tombe avant) ; poutre en (5,3 ; 2,05) (plus haute que la fin de pente, la balle
bute dessus).

**Pourquoi ces choix.** La balle est posée à mi-pente et non en haut : partie du
haut, elle arrive trop vite et saute par-dessus le panier. Sur le plat, la
résistance au roulement freine la balle (≈ 0,7 m/s²) : c’est ce qui la fait
tomber juste dans le panier.

### Niveau 2 — Le pont

`id` : `level-2-le-pont`

**Apprentissage.** Poser une poutre à un endroit précis, puis l’ajuster en la
**glissant** après l’avoir posée (sélection et déplacement de son propre objet).
Toujours sans rotation.

**Scène.** La balle descend une courte pente qui s’arrête devant un trou. De
l’autre côté, une seconde pente mène au panier. Une poutre courte posée en
travers du trou fait un pont.

| Objet    | Type   | Position      | Rotation | Propriétés      |
| -------- | ------ | ------------- | -------- | --------------- |
| `ball`   | ball   | (0,9 ; 0,862) | 0        |                 |
| `slope`  | beam   | (1,6 ; 1,5)   | 15°      | `size: "short"` |
| `ramp`   | beam   | (5,0 ; 2,3)   | 10°      | `size: "short"` |
| `basket` | basket | (7,1 ; 4,9)   | 0        |                 |

Inventaire : `beam short` ×1, `{ move: true, rotate: false, remove: true }`.
Zone : `x 1,7 → 4,9`, `y 1,4 → 2,6`. Pas de `challenge`.

**Référence.** Poutre courte en (3,3 ; 1,95).

**Robustesse mesurée.** `x ∈ {2,8 ; 2,9 ; 3,1 ; 3,3}` × `y` de 1,7 à 2,2 par
0,1 : toutes gagnent ; pour `x ∈ {3,5 ; 3,7 ; 3,8}`, toutes sauf `y = 1,7`.

**Contre-exemples.** Aucune poutre (la balle tombe dans le trou) ; commande de
rotation sur la poutre posée refusée (`rotate-not-permitted`) sans modifier le
document.

**Parcours tactile.** Poser la poutre à une position légale (`x = 2,8`,
`y = 1,95`), la glisser jusqu’à la référence (`x = 3,3`, `y = 1,95`), puis
lancer la simulation et gagner. Ne pas lancer la simulation avant ce déplacement.

### Niveau 3 — Incliner

`id` : `level-3-incliner`

**Apprentissage.** Tourner une poutre avec sa poignée pour transformer une chute
en trajectoire latérale.

**Scène.** La balle est suspendue en l’air à gauche. Le panier est en bas à
droite, adossé à un mur vertical qui rattrape les balles trop rapides. Sans rien,
la balle tombe dans le vide ; sur une poutre à plat, elle s’arrête.

| Objet    | Type   | Position     | Rotation | Propriétés       |
| -------- | ------ | ------------ | -------- | ---------------- |
| `ball`   | ball   | (1,8 ; 0,6)  | 0        |                  |
| `basket` | basket | (6,4 ; 4,9)  | 0        |                  |
| `wall`   | beam   | (7,35 ; 3,4) | 90°      | `size: "medium"` |

Inventaire : `beam` `medium`, quantité 1, `{ move: true, rotate: true, remove: true }`.
Zone : `x 0,4 → 5,4`, `y 1,2 → 4,0`. Pas de `challenge`.

**Référence.** Poutre moyenne en (3,2 ; 2,5), rotation 15°.

**Robustesse physique mesurée.** À 15° : `x ∈ {2,8 ; 3,2 ; 3,6}` ×
`y ∈ {2,0 ; 2,5 ; 3,0}` gagnent toutes. À 30°, (3,2 ; 2,5) et (3,2 ; 3,0)
gagnent aussi.

**Poses accessibles au joueur.** Le contrôle exécutable exige que l’empreinte
complète tienne dans la zone. À 15°, le joueur peut donc atteindre les six poses
`x ∈ {2,8 ; 3,2}` × `y ∈ {2,0 ; 2,5 ; 3,0}` ; parmi les deux mesures à
30°, seule (3,2 ; 2,5) est accessible. Les poses physiquement gagnantes à `x = 3,6` (la poutre à plat
empiète déjà au-delà de `x = 5,4`) et à 30° en `y = 3,0` (la poutre dépasse
`y = 4,0`) sont conservées comme mesures de simulation, pas comme solutions
jouables.

**Contre-exemples.** Aucune poutre (sortie de scène) ; poutre à plat en
(2,8 ; 2,5) (temps écoulé) ; 45° en (3,2 ; 2,5) (la balle tombe sur l’extrémité
haute et part à gauche, mais l’empreinte déborde de la zone) ; −15° en
(3,2 ; 2,5) (la pente mène à gauche, pose accessible au joueur).

### Niveau 4 — Moins, c’est mieux

`id` : `level-4-moins-c-est-mieux`

**Apprentissage.** Les longueurs de poutre, et le défi d’objets : plusieurs
solutions existent, la plus économique vaut le trophée.

**Scène.** Balle suspendue en haut à gauche, panier en bas à droite contre un
petit mur. Deux poutres courtes enchaînées en escalier réussissent ; une poutre
longue seule aussi.

| Objet    | Type   | Position     | Rotation | Propriétés      |
| -------- | ------ | ------------ | -------- | --------------- |
| `ball`   | ball   | (0,9 ; 0,6)  | 0        |                 |
| `basket` | basket | (6,8 ; 4,9)  | 0        |                 |
| `back`   | beam   | (7,75 ; 4,4) | 90°      | `size: "short"` |

Inventaire :
`beam short` quantité 2 et `beam long` quantité 1, toutes
`{ move: true, rotate: true, remove: true }`.
Zone : `x 0,2 → 6,4`, `y 1,0 → 4,0`.
`challenge` : `{ elegantObjectCount: 2, minimalObjectCount: 1 }`.

**Références.**

- 1 objet : poutre longue en (3,2 ; 2,2) à 15°. Les mesures physiques
  gagnent aussi à 10° et 20° au même point, et à 15° pour
  `y ∈ {1,8 ; 2,2 ; 2,6}` à `x = 3,2`.

**Pose accessible au joueur.** À `y = 1,8`, l’empreinte de la poutre longue
sort par le haut de la zone (`y = 1,0`) et la commande la refuse. Les poses à
`y = 2,2` et `y = 2,6`, ainsi que les rotations de 10° et 20° à `y = 2,2`,
restent accessibles. Le parcours tactile dépose d’abord la poutre à plat en
(3,3 ; 2,2), puis la tourne à 15° avec la poignée ; cette pose gagne aussi.
À plat en `x = 3,2`, ses coins tombent exactement sur la borne gauche `x = 0,2`
de la zone : l’arrondi de la conversion du toucher en coordonnées monde peut la
faire refuser. Le point intérieur `x = 3,3` garde une marge de 0,1 unité.

- 2 objets : courte en (1,6 ; 1,6) à 15° puis courte en (3,8 ; 2,8) à 15°.
  Les mesures indiquent des succès pour la seconde en `x ∈ {3,6 ; 4,0}` ×
  `y ∈ {2,4 ; 2,8 ; 3,2}`, à 15° et 20°, sauf (3,6 ; 3,2) à 20° : cette
  combinaison, pourtant plaçable, ne gagne pas dans la régression actuelle.

**Contre-exemples.** Aucune poutre ; une seule poutre courte (aucune réussite
mesurée pour `x ∈ {1,2 ; 1,6 ; 2,0}`, `y ∈ {1,5 ; 2,0 ; 2,5}`, 15° à 30°). Le
test de minimalité (règle 7) porte ici sur « aucune solution à 0 objet ».

**Point d’attention.** La fenêtre de la poutre longue est étroite en `x` (3,2
sûr, 3,5 partiel). Si elle ne tient pas en test, élargir en déplaçant le panier
ou le mur, pas en retouchant la physique. La pose tactile intérieure à `x = 3,3`
est couverte séparément de la référence mesurée à `x = 3,2`.

### Niveau 5 — Le détour

`id` : `level-5-le-detour`

**Apprentissage.** Deux objets, deux zones, et un chemin qui n’est pas le plus
direct : le panier est sous un toit, il faut sortir par la droite puis revenir.

**Scène.** La balle tombe sur un toit plat qui couvre le panier : elle s’y
arrête. Une poutre au-dessus du toit l’envoie à droite, une seconde, plus bas, la
ramène à gauche sous le toit, jusqu’au panier.

| Objet    | Type   | Position    | Rotation | Propriétés       |
| -------- | ------ | ----------- | -------- | ---------------- |
| `ball`   | ball   | (1,5 ; 0,6) | 0        |                  |
| `roof`   | beam   | (1,6 ; 2,3) | 0        | `size: "medium"` |
| `basket` | basket | (1,2 ; 4,9) | 0        |                  |

Inventaire : `beam short` ×1 et `beam medium` ×1, toutes rotation permise.
Zones : A `x 0,6 → 4,0`, `y 0,9 → 2,05` ; B `x 1,6 → 6,2`, `y 2,7 → 4,3`.
`challenge` : `{ elegantObjectCount: 2, minimalObjectCount: 2 }`.

**Référence.** Courte en (2,3 ; 1,4) à 10° ; moyenne en (3,8 ; 3,5) à −15°.

**Robustesse physique mesurée.** Les 36 combinaisons de la courte à 10° ou 15°
en (2,3 ; 1,4) avec la moyenne à −10°, −15° ou −20°, `x ∈ {3,8 ; 4,2}` ×
`y ∈ {3,2 ; 3,5 ; 3,8}` gagnent.

**Poses acceptées par les zones.** Pour la poutre moyenne, le confinement de
l’empreinte accepte, pour chacun des `x ∈ {3,8 ; 4,2}` : `y = 3,2` à −10°,
`y = 3,5` à −10° ou −15°, et `y = 3,8` à −10°. Avec la courte à 10° ou 15°,
cela donne 16 combinaisons gagnantes acceptées par les commandes.

**Parcours tactile.** La poignée tourne par pas de 15°. Les poses complètes
atteignables dans cette fenêtre sont donc la courte à 15° et la moyenne à −15°
en `y = 3,5`, avec `x ∈ {3,8 ; 4,2}` pour cette seconde poutre ; les deux poses
gagnent.

**Contre-exemples.** Aucune poutre (temps écoulé sur le toit) ; la courte seule
(sortie de scène à droite) ; la courte décalée en (2,5 ; 1,5) (la balle la manque
et tombe sur le toit).

**Minimalité mesurée.** Aucune des 1 680 poses d’une seule poutre (courte ou
moyenne, 10 angles de −45° à 90° par 15°, `x` de 0,4 à 4,8 par 0,4, `y` de 1,0
à 4,0 par 0,5) ne réussit. Les zones écartent les poses dont l’empreinte sort.

### Niveau 6 — La bascule

`id` : `level-6-la-bascule`

**Apprentissage.** Découvrir la bascule sans avoir à la manipuler. C’est le seul
niveau d’observation : il introduit un objet nouveau.

**Scène.** La balle tombe sur la moitié droite d’une bascule, qui penche et la
dépose dans le panier.

| Objet    | Type   | Position    |
| -------- | ------ | ----------- |
| `ball`   | ball   | (4,2 ; 0,8) |
| `seesaw` | seesaw | (3,2 ; 2,8) |
| `basket` | basket | (5,6 ; 4,9) |

Inventaire vide, aucune zone, pas de `challenge`.

**Robustesse mesurée.** Balle en `x ∈ {3,9 ; 4,2 ; 4,5}` × panier en
`x ∈ {5,2 ; 5,6 ; 6,0}` : les 9 combinaisons gagnent. Réussite en 120 pas ;
angle final de la planche ≈ 0,56 rad (butée à π/6).

**Régression spécifique.** L’angle de la planche quitte 0 avant la réussite.
Après reset, transformée de la balle, angle et vitesse angulaire de la planche
exactement initiaux.

### Niveau 7 — Placer la bascule

`id` : `level-7-placer-la-bascule`

**Apprentissage.** Poser une bascule comme un objet unique, et comprendre que le
côté où tombe la balle décide du sens.

| Objet    | Type   | Position    |
| -------- | ------ | ----------- |
| `ball`   | ball   | (3,0 ; 0,6) |
| `basket` | basket | (4,8 ; 4,9) |

Inventaire : `seesaw` ×1, `{ move: true, rotate: false, remove: true }`.
Zone : `x 0,2 → 6,0`, `y 2,0 → 4,4`. Pas de `challenge`.

**Référence.** Bascule en (2,5 ; 3,2).

**Robustesse mesurée.** Pivot `x ∈ {2,5 ; 2,8}` × `y ∈ {2,4 ; 2,8 ; 3,2 ; 3,6}`
gagnent tous ; `x = 2,2` gagne pour `y ≤ 3,2`.

**Contre-exemples.** Aucune bascule ; pivot en `x ≥ 3,1` (la balle tombe sur la
moitié gauche, la bascule l’envoie à gauche). Une bascule ne se tourne pas :
commande de rotation refusée.

**Régression spécifique.** Un point de la planche et un point du pied renvoient
le même identifiant de placement au hit-test (`board-hit-test.ts`).

### Niveau 8 — Poutre et bascule

`id` : `level-8-poutre-et-bascule`

**Apprentissage.** Enchaîner les deux familles : la poutre amène la balle, un mur
l’arrête, elle tombe sur la bascule qui la porte au panier.

| Objet    | Type   | Position    | Rotation | Propriétés      |
| -------- | ------ | ----------- | -------- | --------------- |
| `ball`   | ball   | (1,0 ; 0,6) | 0        |                 |
| `wall`   | beam   | (5,3 ; 1,9) | 90°      | `size: "short"` |
| `basket` | basket | (6,2 ; 4,9) | 0        |                 |

Inventaire : `beam medium` ×1 (rotation permise) et `seesaw` ×1 (sans rotation).
Zones : A `x 0,2 → 4,6`, `y 0,8 → 2,6` ; B `x 2,2 → 6,0`, `y 3,0 → 4,5`.
`challenge` : `{ elegantObjectCount: 2, minimalObjectCount: 2 }`.

**Référence.** Poutre moyenne en (2,3 ; 1,5) à 15° ; bascule en (4,0 ; 3,4).

**Robustesse mesurée.** Poutre à 10°, 15° ou 20° ; pivot `x ∈ {4,0 ; 4,3}` ×
`y ∈ {3,4 ; 3,8}` : gagnant dans les trois cas ; `x = 3,7` gagne à `y = 3,4`
seulement. Fenêtre étroite (≈ 0,6 en `x`) : si elle ne tient pas en test,
déplacer le mur ou le panier.

**Contre-exemples.** Poutre seule (sortie de scène) ; bascule seule, pivot de 2,0
à 5,2 et `y` de 2,6 à 4,2 (27 poses, aucune réussite) ; aucune action.

**Poses accessibles au joueur.** La poutre moyenne de référence en (2,3 ; 1,5)
à 15° tient dans la zone A. Avec la rotation tactile par pas de 15°, les cinq
poses de bascule de la fenêtre à `x ∈ {3,7 ; 4,0 ; 4,3}` et
`y ∈ {3,4 ; 3,8}` (en excluant les combinaisons non mesurées à `x = 3,7`)
sont acceptées dans la zone B et gagnent avec cette poutre. Les mesures à 10°
et 20° sont des mesures physiques, pas des angles que le contrôle tactile peut
choisir.

**Grille du contre-exemple à préciser.** La spec annonce 27 poses « bascule seule »
avec les bornes x/y, mais ne donne pas les coordonnées discrètes de ces poses.
Ne pas en déduire une grille arbitraire ; la recherche de minimalité reste à
compléter lorsque les 27 coordonnées seront connues.

---

## Chapitre 2 — Mécanismes

Introduit masse, convoyeur et levier. Rappels : le joueur ne change **aucune
propriété** (sens d’un convoyeur, cran d’un levier) et ne relie **aucun fil** ;
c’est le niveau qui les fixe (ADR 0009). Masse, levier et convoyeur ne tournent
pas.

### Niveau 9 — Le tapis

`id` : `level-9-le-tapis`

**Apprentissage.** Un convoyeur transporte ce qu’il porte.

**Scène.** La balle tombe sur un sol plat et s’y arrête. Un convoyeur (sens
imposé : droite) posé sous la chute l’emmène au bout du sol, d’où elle tombe dans
le panier.

| Objet    | Type   | Position    | Rotation | Propriétés       |
| -------- | ------ | ----------- | -------- | ---------------- |
| `ball`   | ball   | (1,6 ; 0,6) | 0        |                  |
| `floor`  | beam   | (2,2 ; 3,0) | 0        | `size: "medium"` |
| `basket` | basket | (5,6 ; 4,9) | 0        |                  |

Inventaire : `conveyor`, `direction: "right"`, ×1,
`{ move: true, rotate: false, remove: true }`.
Zone : `x 0,2 → 4,4`, `y 1,2 → 2,87`. Pas de `challenge`.

**Référence.** Convoyeur en (2,2 ; 2,2). Réussite en 231 pas.

**Robustesse mesurée.** `x ∈ {1,8 ; 2,2 ; 2,6 ; 3,0}` × `y ∈ {1,6 ; 2,2 ; 2,6}`
gagnent toutes ; `x = 1,4` ne gagne qu’à `y = 1,6`.

**Contre-exemples.** Aucun convoyeur (temps écoulé).

**Poses accessibles au joueur.** Le convoyeur a une empreinte de 3 × 0,58 ;
avec la zone donnée, seules les six poses de la fenêtre à
`x ∈ {1,8 ; 2,2 ; 2,6}` et `y ∈ {1,6 ; 2,2}` sont entièrement contenues.
Les candidats à `x = 3,0` ou `y = 2,6` débordent de la zone. La mesure physique
à (1,4 ; 1,6) gagne aussi, mais la pose est hors zone.

### Niveau 10 — Le butoir

`id` : `level-10-le-butoir`

**Apprentissage.** La masse est lourde : posée sur un rebord, elle sert de mur.

**Scène.** La balle dévale une pente raide et passe au-dessus du panier. Une masse
posée sur le rebord, juste après le panier, l’arrête et la fait tomber dedans.

| Objet    | Type   | Position      | Rotation | Propriétés       |
| -------- | ------ | ------------- | -------- | ---------------- |
| `ball`   | ball   | (0,7 ; 0,584) | 0        |                  |
| `slope`  | beam   | (2,2 ; 1,6)   | 20°      | `size: "medium"` |
| `basket` | basket | (4,6 ; 4,9)   | 0        |                  |
| `ledge`  | beam   | (6,5 ; 3,6)   | 0        | `size: "short"`  |

Inventaire : `mass`, `weight: "10kg"`, ×1, `{ move: true, rotate: false, remove: true }`.
Zone : `x 5,4 → 7,6`, `y 2,0 → 3,5`. Pas de `challenge`.

**Référence.** Masse en (6,0 ; 3,08) (posée sur le rebord).

**Robustesse mesurée.** `x ∈ {5,8 ; 6,0 ; 6,2 ; 6,4}`, que la masse soit posée
(`y = 3,08`) ou lâchée de plus haut (`y = 2,8` ou `2,4`) : toutes gagnent.

**Contre-exemples.** Aucune masse (sortie de scène à droite) ; masse en
`x = 5,6` ou `6,6`.

**Écart à mesurer.** Les contre-exemples latéraux ne précisent pas de hauteur.
Avec la géométrie ci-dessus, les deux positions gagnent aux trois hauteurs de la
fenêtre robuste (`y = 2,4`, `2,8` et `3,08`). Ne pas ajuster la scène sans
consigne ; les mesures sont couvertes par `level-10-le-butoir.test.ts`.

### Niveau 11 — L’interrupteur

`id` : `level-11-l-interrupteur`

**Apprentissage.** Un levier commande un convoyeur par un fil ; un objet qui
percute le levier le fait changer de cran.

**Scène.** La balle attend sur un convoyeur arrêté, relié à un levier au cran
central. Le panier est en bas. Une masse lâchée **à gauche** du pommeau pousse le
levier vers la droite : le convoyeur part vers la droite et la balle tombe dans le
panier. Lâchée à droite du pommeau, la masse pousse le levier à gauche et la balle
part du mauvais côté.

| Objet    | Type     | Position    | Propriétés             |
| -------- | -------- | ----------- | ---------------------- |
| `ball`   | ball     | (1,9 ; 1,8) |                        |
| `belt`   | conveyor | (2,2 ; 2,4) | `direction: "stopped"` |
| `lever`  | lever    | (6,5 ; 3,2) | `position: "center"`   |
| `basket` | basket   | (4,4 ; 4,9) |                        |

Fil : `{ id: "wire-1", sourceId: "lever", targetId: "belt" }`.
Inventaire : `mass` ×1, `{ move: true, rotate: false, remove: true }`.
Zone : `x 5,2 → 7,8`, `y 0,4 → 1,9`. Pas de `challenge`.

**Référence.** Masse en (6,2 ; 1,1).

**Robustesse mesurée.** `x ∈ {6,0 ; 6,2 ; 6,4}` × `y ∈ {0,8 ; 1,4}` gagnent.
`x ≤ 5,8` : le levier reste au centre. `x ≥ 6,6` : le levier passe à gauche.

**Régression spécifique.** Lire `readState().devices` : le levier est `right` et
le convoyeur `1` avant la réussite ; les contre-exemples laissent le levier
`center` ou `left`.

**Écart mesuré à examiner.** La référence (6,2 ; 1,1) expire sans action du
levier. Dans la grille robuste annoncée, les poses à `x = 6,2` expirent également ;
seules celles à `x = 6,0` ou `6,4` gagnent. Aucune coordonnée de la scène n’a été
ajustée. La régression note cet écart et conserve une pose gagnante mesurée pour
que le niveau reste jouable.

### Niveau 12 — Le bon ordre

`id` : `level-12-le-bon-ordre`

**Apprentissage.** Le joueur met d’abord le levier en marche en faisant tomber
une masse dessus ; le convoyeur entraîne alors la balle vers une poutre qui la
guide dans le panier. La chaîne physique exige les deux objets.

**Scène.** Scène 8 × 5,5. Le levier est relié au convoyeur et démarre au centre ;
le convoyeur est arrêté. La balle attend dessus, à gauche d’une courte poutre à
poser. Le panier est sous l’extrémité de la poutre. La masse tombe sur le côté
gauche du levier : il passe à droite et met le convoyeur en marche.

| Objet    | Type     | Position    | Propriétés             |
| -------- | -------- | ----------- | ---------------------- |
| `ball`   | ball     | (1,9 ; 1,6) |                        |
| `belt`   | conveyor | (2,2 ; 2,2) | `direction: "stopped"` |
| `lever`  | lever    | (6,5 ; 3,2) | `position: "center"`   |
| `basket` | basket   | (5,0 ; 2,8) |                        |

Fil : `{ id: "wire-1", sourceId: "lever", targetId: "belt" }`.
Inventaire : `mass` ×2 (`weight: "10kg"`) et `beam short` ×2 ; permissions
`{ move: true, rotate: false, remove: true }` pour les masses et
`{ move: true, rotate: true, remove: true }` pour les poutres. Zone unique :
`x 0 → 7,6`, `y 0,4 → 4,0`. `challenge` :
`{ elegantObjectCount: 3, minimalObjectCount: 2 }`.

**Référence.** Poser une masse en (6,0 ; 0,8), puis une poutre courte à plat en
(4,7 ; 2,7) et la tourner à +30° avec la poignée.

**Fenêtre de robustesse mesurée.** Avec la poutre de référence fixée, les neuf
poses gagnantes de masse sont
`x ∈ {5,9 ; 6,1 ; 6,4}` × `y ∈ {0,8 ; 1,2 ; 1,6}`. Avec la masse de référence
fixée, les 17 poses gagnantes de la poutre à +30° sont :

- `y = 2,5` : `x ∈ {4,2 ; 4,3 ; 4,4 ; 4,5 ; 4,6 ; 4,7}` ;
- `y = 2,6` : `x ∈ {4,4 ; 4,5 ; 4,6 ; 4,7 ; 4,8}` ;
- `y = 2,7` : `x ∈ {4,6 ; 4,7 ; 4,8 ; 4,9}` ;
- `y = 2,8` : `x ∈ {4,8 ; 4,9}`.

Les 153 combinaisons du produit croisé des deux fenêtres gagnent ; le centre de
la balle entre dans le capteur du panier. La référence gagne en 204 pas fixes.

**Contre-exemples.** Aucune action : le levier reste au centre, le convoyeur est
arrêté et la balle attend. Masse seule à (6,0 ; 0,8) : le levier passe à droite
et le convoyeur démarre, mais la balle manque le panier. Poutre seule à
(4,7 ; 2,7), +30° : le levier et le convoyeur restent à l’arrêt.

**Minimalité.** Aucun succès à un objet parmi 936 poses légales : 144 poses de
masse sur `x = 0,4..7,2` et `y = 0,7..3,5`, au pas de 0,4 ; 792 poses de poutre
courte sur `x = 1,4..6,4` au pas de 0,5, `y ∈ {1,5 ; 2,0 ; 2,5}` et toutes les
rotations de 0° à 345° par pas de 15°. Les empreintes de ces poses tiennent dans
la zone de construction. Le minimum reste donc deux objets.

**Régression spécifique.** Lire `readState().devices` à la réussite : levier
`right`, convoyeur `1`. Sans masse, le levier reste `center` et le convoyeur à
`0`; avec une masse seule, le levier et le convoyeur changent bien d’état mais
la balle n’atteint pas le panier.

### Niveaux 13 et 14 — Synthèses restantes

À concevoir au banc d’essai (feuille de route, tâche L18b puis L18c), un niveau à
la fois :

- **13 — Deux tapis.** Un levier commande deux convoyeurs (un circuit), dont un
  en sens opposé à l’autre au départ. Solution minimale de 1 ou 2 objets,
  inventaire en surplus.

**Mesures L18b — aucun plan retenu.** Trois esquisses au banc n’ont pas donné une
fenêtre de pose d’au moins 0,3 unité en largeur : (1) des tapis en (2,2 ; 2,4) et
(5,2 ; 2,4) se touchent au droit du levier en (6,5 ; 3,2), qui part à gauche sans
action ; (2) les tapis en (1,7 ; 2,4) et (4,7 ; 2,4), avec levier en (7,1 ; 3,2),
font sortir la balle de scène avant le panier en (7,2 ; 4,8) ; (3) rapprocher le
second tapis en (4,1 ; 2,4) et le panier en (6,2 ; 4,8) permet à la référence de
masse en (6,6 ; 0,8) de gagner en 313 pas. Toutefois, sur la grille de masses
`x = 6,2..7,4`, `y = 0,6..1,8` au pas de 0,1, aucune bande continue gagnante ne
couvre 0,3 en `x` : toutes les poses à `x = 6,8` échouent et la meilleure bande
continue mesurée ne fait que 0,2. L18b s’arrête ici selon la limite de trois
esquisses ; ne pas reprendre ces coordonnées comme une solution validée.

- **14 — Grand final.** Scène 16 × 9 (grande scène de référence de l’ADR 0007).
  Au moins une bascule, un convoyeur et un levier. Solution minimale d’au moins
  3 objets, inventaire en surplus.

**Mesures L18c — aucun plan retenu.** Trois esquisses n’ont pas donné une fenêtre
robuste pour chaque objet posé : (1) le convoyeur fait sortir la balle de scène
ou celle-ci reste bloquée près d’une bascule fixe ; (2) une bascule posée en
(3,8 ; 4,1) et une poutre +20° en (6,5 ; 5,8) laissent la balle en (5,95 ; 5,14)
après 1 200 pas. (3) La scène 16 × 9 avec balle en (1,9 ; 1,6), convoyeur en
(2,5 ; 2,2), levier en (13,4 ; 3,2), bascule fixe en (7,5 ; 4,6) et panier en
(14,2 ; 8,0) gagne en 449 pas avec une masse en (12,9 ; 0,8), une poutre longue
en (5,2 ; 3,2) tournée à +15°, et une seconde poutre longue en (10,65 ; 6,3)
tournée à +15°. Toutefois, la masse ne gagne qu’en x = 12,85, 12,90, 13,00 et
13,15 à y = 0,8 sur la grille au pas de 0,05 ; la plus grande bande continue ne
fait que 0,05. Les poutres ont des bandes gagnantes de 0,5 et 0,65 (approche),
puis 0,65 (sortie), mais la référence échoue donc au critère L18c. L18c s’arrête
après trois esquisses ; ne pas reprendre ces coordonnées comme solution validée.

Pour chacun : régression complète (règles 1 à 7), minimalité établie par
recherche sur grille, et deux captures pour l’auteur.

## Hors de cette campagne, volontairement

- Rebond intentionnel, catapulte (masse lâchée sur une bascule chargée) : mesuré
  trop sensible à la position le 26 septembre 2026 (3 réussites sur 15 poses).
- Plusieurs balles, distinction balle motrice / balle cible.
- Rotation d’une bascule, réglage d’un joint, câblage par le joueur.
- Notation au temps.
