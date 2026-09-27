# ADR 0009 - Fils de commande entre levier et convoyeur

Statut : accepté

Date : 2026-09-25

## Contexte

De nouveaux assets introduisent un levier à trois positions et un convoyeur. Une
première note de conception, produite en amont
([`contrapt_control_wires_v1.md`](../contrapt_control_wires_v1.md), depuis
réécrite), proposait des liaisons directes contrôleur → dispositif, routées
automatiquement, avec des ponts graphiques aux croisements. Le principe est
retenu ; plusieurs moyens proposés contredisaient les décisions en place ou
créaient de l'état inutile. Cette ADR tranche ces points. La spécification
fonctionnelle (comportement, gestes, rendu) vit dans la note réécrite.

## Décision

### Le document ne stocke que la relation

`LevelDocument.wires` est une liste de `{ id, sourceId, targetId }`. La lettre
du circuit, sa couleur, les points d'ancrage et le tracé ne sont **pas**
persistés : ils se dérivent de l'ordre des fils et de la position des objets.

- Un circuit est l'ensemble des fils d'un même levier. Sa lettre (A, B, …, Z,
  A2…) suit l'ordre dans lequel les leviers ont été reliés pour la première fois
  (`src/domain/control-circuits.ts`). La note d'origine attribuait une lettre
  par fil tout en montrant un bouton A relié à trois appareils : la lettre par
  levier lève cette contradiction.
- Les points d'ancrage appartiennent à la projection visuelle de chaque famille,
  pas au niveau.

Validation (`src/domain/level-document.ts`) : identifiant de fil unique, source
= levier placé, cible = convoyeur placé, **au plus un levier par convoyeur**
(deux leviers opposés rendraient le sens ambigu). Un levier peut commander
plusieurs convoyeurs. Supprimer un objet supprime ses fils dans la même
commande.

### Évolution compatible du format, sans nouvelle version

`wires` est facultatif en entrée et vaut `[]` par défaut. Tout document v2 écrit
avant cette décision reste valide et se relit à l'identique, fils vides compris.
Aucune migration n'est donc requise, comme pour l'ajout des familles masse,
levier et convoyeur à l'union discriminée. Aucun document n'est encore persisté
hors du dépôt (IndexedDB et partage restent à livrer), si bien qu'une ancienne
version de l'application relisant un fichier récent n'est pas un cas réel à ce
jour ; ce le deviendra avec T6, qui devra le traiter.

### Rendu en Canvas 2D, pas en SVG

La note proposait le SVG. L'[ADR 0006](0006-board-renderer.md) a choisi Canvas 2D
et un seul renderer pour le plateau : un calque SVG devrait suivre séparément la
caméra, le zoom et le `devicePixelRatio`. La chaîne proposée est conservée —
objets et fils → routeur → polyligne → dessin déterministe — mais le dessin
passe par le même renderer (`src/presentation/wire-renderer.ts`), sous les
objets, avec les pastilles de lettre par-dessus.

### Routage indépendant, ponts en post-traitement

Chaque fil est routé seul, orthogonalement, en évitant l'empreinte des autres
objets (`src/presentation/control-wires.ts`). La note voulait tenir compte des
autres fils pendant le routage : ajouter un fil pourrait alors déplacer tous les
autres. Les croisements sont traités ensuite : le fil le plus récent enjambe
l'ancien par un demi-cercle. « Éviter les zones de gameplay importantes »,
non défini, n'est pas retenu.

### Le câblage est un acte d'auteur

Relier et délier sont refusés au joueur (`wiring-not-permitted`). En résolution,
les circuits sont ceux que le niveau impose. Rien n'est déplacé pendant la
simulation par le joueur : seuls des objets peuvent faire changer un levier de
cran (décision produit du 25 septembre 2026).

### Sémantique du levier et du convoyeur

Levier gauche / centre / droite → convoyeur vers la gauche / arrêté / vers la
droite, lu à chaque pas fixe. Le convoyeur non relié suit sa propre propriété
`direction`. Le bouton momentané, le ventilateur et la porte de la note n'ont pas
d'assets et ne sont pas implémentés.

## Amendement du 26 septembre 2026 — bouton, ventilateur, barrière

De nouveaux assets ajoutent un contrôleur, le **bouton**, et deux dispositifs, le
**ventilateur** et la **barrière** (plus le tremplin, passif et jamais câblé).

- Sources : levier et bouton. Cibles : convoyeur, ventilateur, barrière.
  `canCommand` (`src/domain/level-document.ts`) fait autorité ; la validation
  et l'outil de câblage l'utilisent tous deux.
- Un dispositif obéit toujours à **un seul** contrôleur.
- Un **bouton ne commande jamais un convoyeur** : il a deux états, le convoyeur
  trois (gauche, arrêt, droite) ; aucun sens ne se déduirait d'un appui.
- Ventilateur et barrière sont à deux états. Relié à un **levier**, le centre
  vaut « arrêt / fermé » et chaque côté « marche / ouvert » : c'est la règle du
  convoyeur, où le centre est toujours l'arrêt, sans donner de sens à un
  dispositif qui n'en a pas. Relié à un **bouton**, l'appui vaut « marche /
  ouvert ». Non relié, chacun suit sa propriété `state` ; relié, elle est
  ignorée, comme `direction` pour le convoyeur.
- Le bouton est momentané : actif tant qu'un corps dynamique pèse sur son
  capuchon, sans mémoire.
- Le document gagne quatre familles à l'union discriminée, sans nouvelle
  version ni migration, pour la même raison que la masse et le levier.
- Le sens du ventilateur, le côté de la barre et l'orientation du tremplin sont
  la rotation du placement, limitée aux quarts de tour, et non une propriété :
  l'auteur les tourne avec les mêmes gestes qu'une poutre. Le demi-tour d'un
  ventilateur ou d'une barrière est dessiné en miroir.

La phrase « Le bouton momentané, le ventilateur et la porte de la note n'ont pas
d'assets et ne sont pas implémentés » ci-dessus est caduque pour le bouton et le
ventilateur ; la porte est la barrière.

## Amendement du 27 septembre 2026 — fils droits et discrets (U14)

Le routage orthogonal et ses ponts produisaient des dizaines de virages et des
fils trop voyants. Demande de l'auteur : chaque fil est désormais **un segment
droit** entre le port de la source et celui de la cible (le port de chaque
objet tourné vers l'autre), dessiné sous les objets, sans contournement ni pont.
Les fils sont translucides en construction et presque effacés pendant la
simulation. La lettre de circuit reste aux deux bouts (la couleur n'est jamais
le seul indice), en petite pastille aussi translucide que le fil. La section
« Routage indépendant, ponts en post-traitement » ci-dessus est caduque ; la
chaîne devient objets et fils → ports → segment → dessin.

## Amendement du 27 septembre 2026 — fil dans l'inventaire du joueur (U21)

Décision de l'auteur : **un fil est un objet d'inventaire comme les autres** ;
un puzzle peut en donner au joueur. La section « Le câblage est un acte
d'auteur » ci-dessus est caduque pour les fils d'inventaire.

- Format : l'inventaire v2 accepte `{ id, type: 'wire', quantity, props: {},
  permissions }`, avec `move` et `rotate` toujours `false` (un fil n'a ni
  position ni angle) ; `remove` dit si le joueur peut reprendre un fil qu'il a
  posé, comme pour un objet. Ajout compatible, sans nouvelle version ni
  migration ; l'inventaire v1 n'accepte pas de fil.
- Commande : `connectControlWire` en contexte joueur exige `inventoryEntryId`
  (sinon `wiring-not-permitted`), consomme une unité de cette entrée et
  enregistre la provenance du fil (ADR 0005 : la provenance associe l'id d'un
  objet ou d'un fil à son entrée). Mêmes règles de domaine que pour l'auteur.
- Retrait : `disconnectControlWire` en contexte joueur ne délie qu'un fil
  posé par le joueur (`inventory-provenance-missing` pour un fil du niveau) et
  le rend à l'inventaire ; retirer un objet rend aussi les fils du joueur qui
  y étaient attachés.
- Défi : un fil posé par le joueur compte comme un objet (ADR 0010), et la
  quantité de fils compte dans le total opposé à `minimalObjectCount`.

## Conséquences

- Aucune dépendance ajoutée ; le port physique gagne des « dispositifs » dans
  son instantané (`devices` : position des leviers, sens et défilement des
  convoyeurs), lus par la présentation sans importer le moteur.
- Le tracé est un calcul pur, testé sans navigateur.
- Un besoin futur de réseau (jonctions, logique) rouvre cette ADR : il n'est
  pas anticipé.
