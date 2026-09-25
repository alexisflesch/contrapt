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

## Conséquences

- Aucune dépendance ajoutée ; le port physique gagne des « dispositifs » dans
  son instantané (`devices` : position des leviers, sens et défilement des
  convoyeurs), lus par la présentation sans importer le moteur.
- Le routage est un calcul pur, testé sans navigateur ; son coût est
  négligeable aux budgets d'objets actuels.
- Un besoin futur de réseau (jonctions, logique) rouvre cette ADR : il n'est
  pas anticipé.
