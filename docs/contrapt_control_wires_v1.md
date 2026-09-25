# Contrapt! — Fils de commande entre levier et convoyeur

Statut : spécification fonctionnelle de la v1, conforme à l'implémentation du
25 septembre 2026. Les décisions et leurs raisons sont dans
[l'ADR 0009](decisions/0009-control-wires.md) ; le code et les tests priment sur
ce texte.

Cette note remplace une première version produite en amont. Ce qui a changé, et
pourquoi, est résumé à la fin.

## Principe

Un fil est une **liaison directe** d'un contrôleur vers un dispositif. En v1, le
seul contrôleur est le **levier** et le seul dispositif est le **convoyeur**.

Le joueur ne construit pas de réseau électrique et ne dessine pas le trajet : le
tracé, les virages et les ponts sont calculés. Il n'existe ni jonction, ni
dérivation, ni nœud, ni branchement fil-vers-fil, ni outil « pont ».

- Un levier peut commander plusieurs convoyeurs : autant de fils indépendants.
- Un convoyeur obéit à **un seul** levier.
- Deux fils peuvent se croiser ; un croisement n'a aucune signification.

## Levier

Trois crans : **gauche**, **centre**, **droite**. La poignée pivote de ±45° autour
de son axe et se range dans le cran le plus proche.

- La position de départ est une propriété du niveau (`position`), réglée par
  l'auteur.
- Le joueur n'agit **jamais** sur un levier pendant la simulation. Seul un objet
  qui percute la poignée — une balle, une masse — peut la faire changer de cran.
- Au-delà de la mi-course (22,5°), la poignée bascule dans le cran suivant.

## Convoyeur

Un tapis qui entraîne ce qu'il porte à 1,5 unité/s.

| Levier relié | Sens du convoyeur |
| ------------ | ----------------- |
| gauche       | vers la gauche    |
| centre       | arrêté            |
| droite       | vers la droite    |

- Sans levier, le convoyeur suit sa propre propriété `direction` (`left`,
  `stopped`, `right`), réglée par l'auteur ; c'est le niveau qui impose son
  sens.
- Relié, il suit le levier dès le premier pas de simulation et change de sens
  dès que le levier change de cran, en pleine simulation. Sa propriété
  `direction` est alors ignorée, et le panneau ne la propose plus.
- La bande visible défile dans le sens de la marche ; ses chevrons pointent vers
  la dernière direction prise.

Exemple : une masse sur un convoyeur relié à un levier au centre ne bouge pas ;
une balle tombe sur le pommeau et le couche vers la droite ; le convoyeur part
vers la droite et emporte la masse.

## Créer et défaire une liaison

En mode éditeur uniquement, sans survol ni clic droit :

1. toucher un levier pour le sélectionner ;
2. dans « Propriétés », toucher **Relier à un convoyeur** ;
3. toucher le convoyeur.

Toucher le plateau vide annule ; toucher un autre objet redemande un convoyeur.
Un convoyeur déjà commandé est refusé avec un message. La liaison entre dans
l'historique : annuler et rétablir la défont et la refont.

Le panneau d'un levier ou d'un convoyeur relié affiche son circuit (« Circuit A »)
et un bouton **Délier**. Supprimer l'un des deux objets supprime ses fils.

## Modèle de données

Seule la relation est enregistrée dans le niveau :

```json
"wires": [{ "id": "wire-1", "sourceId": "lever-1", "targetId": "conveyor-1" }]
```

`wires` est facultatif et vaut `[]` par défaut. La lettre, la couleur, les
points d'ancrage et le tracé sont recalculés à chaque dessin.

### Circuits, lettres, couleurs

Un **circuit** regroupe les fils d'un même levier. Les lettres suivent l'ordre
dans lequel les leviers ont été reliés : A, B, … Z, puis A2, B2… Couleurs, dans
l'ordre : rouge, bleu, vert, orange, violet, sarcelle, puis de nouveau rouge.
La couleur n'est jamais la seule information : la lettre est dessinée aux deux
bouts de chaque fil.

## Tracé

- Ancrages : aux deux extrémités du socle du levier et aux deux bouts du
  convoyeur. Chaque fil part du côté qui regarde l'autre objet.
- Segments horizontaux et verticaux uniquement, coins arrondis.
- Préférences, dans l'ordre : ne traverser aucun objet, être court, tourner peu.
  Si aucun tracé direct n'évite les objets, le fil les contourne par-dessus ou
  par-dessous.
- Chaque fil est tracé seul : ajouter un fil ne déplace jamais les autres.
- Un croisement est dessiné comme un **pont** : le fil le plus récent enjambe
  l'ancien par un petit demi-cercle.

## Affichage

- Les fils sont dessinés sous les objets : câble sombre et âme de la couleur du
  circuit. Les lettres, dans une pastille, sont posées sur le fil près de chaque
  bout, par-dessus les objets.
- Levier ou convoyeur sélectionné : ses fils restent vifs, les autres
  s'estompent.
- Pendant la simulation, tous les fils sont fortement atténués.

## Écarts avec la première version de cette note

| Proposé                                              | Retenu                                                    | Raison                                                                               |
| ---------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Rendu SVG                                            | Canvas 2D, même renderer que le plateau                   | ADR 0006 ; un calque SVG devrait suivre caméra, zoom et DPR séparément               |
| `label` et `color` stockés sur chaque fil            | Dérivés, un circuit par levier                            | Rien à valider ni à désynchroniser ; la note montrait déjà un bouton A → 3 appareils |
| `sourceAnchor` / `targetAnchor` dans le niveau       | Ancrages définis par la famille                           | Donnée visuelle, pas donnée de niveau                                                |
| Routage tenant compte des autres fils                | Routage indépendant, ponts ensuite                        | Ajouter un fil ne doit pas redessiner les autres                                     |
| « Éviter les zones de gameplay importantes »         | Abandonné                                                 | Non défini                                                                           |
| Plusieurs contrôleurs possibles sur un dispositif    | Un seul levier par convoyeur                              | Deux leviers opposés rendraient le sens ambigu                                       |
| Le joueur peut actionner le levier en simulation     | Jamais ; seuls les objets le font changer de cran         | Principe « construire, puis regarder »                                               |
| Bouton, ventilateur, porte, moteur, électroaimant    | Non implémentés                                           | Pas d'assets ; on ajoutera une famille quand un puzzle en aura besoin                |
| Outil « Wire » dans la boîte à outils, deux clics    | Bouton « Relier » dans le panneau du levier, puis un tap  | Réutilise la sélection existante, adapté au tactile                                  |
