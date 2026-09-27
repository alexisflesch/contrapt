# Contrapt! — Fils de commande

Statut : spécification fonctionnelle de la v1, conforme à l'implémentation du
26 septembre 2026 (bouton, ventilateur, barrière ajoutés). Les décisions et leurs raisons sont dans
[l'ADR 0009](decisions/0009-control-wires.md) ; le code et les tests priment sur
ce texte.

Cette note remplace une première version produite en amont. Ce qui a changé, et
pourquoi, est résumé à la fin.

## Principe

Un fil est une **liaison directe** d'un contrôleur vers un dispositif. Les
contrôleurs sont le **levier** et le **bouton** ; les dispositifs sont le
**convoyeur**, le **ventilateur** et la **barrière**. Un bouton ne commande
jamais un convoyeur (deux états contre trois).

Le joueur ne construit pas de réseau électrique et ne dessine pas le trajet : le
tracé est calculé. Il n'existe ni jonction, ni
dérivation, ni nœud, ni branchement fil-vers-fil, ni outil « pont ».

- Un contrôleur peut commander plusieurs dispositifs : autant de fils
  indépendants.
- Un dispositif obéit à **un seul** contrôleur.
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

## Bouton

Un bouton-poussoir posé au sol. Il est **enfoncé tant qu'un objet** — balle,
masse, planche — **pèse sur son capuchon**, et se relâche dès qu'il n'y a plus
rien : il n'a pas de mémoire et rien à régler.

## Ventilateur et barrière

Deux dispositifs à deux états.

| Contrôleur relié | Ventilateur | Barrière |
| ---------------- | ----------- | -------- |
| levier au centre | arrêté      | fermée   |
| levier à gauche  | en marche   | ouverte  |
| levier à droite  | en marche   | ouverte  |
| bouton relâché   | arrêté      | fermée   |
| bouton enfoncé   | en marche   | ouverte  |

- Non relié, chacun suit sa propriété `state` (`on`/`off`, `closed`/`open`),
  que le panneau ne propose plus une fois relié.
- Le **ventilateur** souffle dans le sens que donne sa rotation, par quarts de
  tour (droite, bas, gauche, haut), réglable même relié. Le souffle occupe un cône de 3 unités
  devant la bouche ; il pousse proportionnellement à la largeur exposée, si bien
  qu'il soulève une balle et bouge à peine une masse.
- La **barrière** est une barre qui coulisse dans son poteau, du côté que donne
  sa rotation, par quarts de tour. Fermée, elle arrête ou porte ce qui la touche ; en s'ouvrant, elle
  rentre en moins d'une demi-seconde et laisse tomber ce qu'elle portait.

## Créer et défaire une liaison

En mode éditeur uniquement, sans survol ni clic droit :

1. toucher un levier ou un bouton pour le sélectionner ;
2. dans « Propriétés », toucher **Relier à un appareil** ;
3. toucher le dispositif.

Toucher le plateau vide annule ; toucher un objet que ce contrôleur ne peut pas
commander redemande un dispositif. Un dispositif déjà commandé est refusé avec
un message. La liaison entre dans
l'historique : annuler et rétablir la défont et la refont.

Le panneau d'un contrôleur ou d'un dispositif relié affiche son circuit (« Circuit A »)
et un bouton **Délier**. Supprimer l'un des deux objets supprime ses fils.

## Modèle de données

Seule la relation est enregistrée dans le niveau :

```json
"wires": [{ "id": "wire-1", "sourceId": "lever-1", "targetId": "conveyor-1" }]
```

`wires` est facultatif et vaut `[]` par défaut. La lettre, la couleur, les
points d'ancrage et le tracé sont recalculés à chaque dessin.

### Circuits, lettres, couleurs

Un **circuit** regroupe les fils d'un même contrôleur. Les lettres suivent
l'ordre dans lequel les contrôleurs ont été reliés : A, B, … Z, puis A2, B2… Couleurs, dans
l'ordre : rouge, bleu, vert, orange, violet, sarcelle, puis de nouveau rouge.
La couleur n'est jamais la seule information : la lettre est dessinée aux deux
bouts de chaque fil.

## Tracé

- Ancrages : aux deux extrémités du socle du levier et du bouton, aux deux
  bouts du convoyeur, au pied du ventilateur et du poteau de la barrière. Chaque fil part du côté qui regarde l'autre objet.
- Un seul segment droit, d'un ancrage à l'autre, sans virage : il ne contourne
  pas les objets et passe sous eux. Un croisement de fils ne signifie rien et
  n'est pas marqué.

## Affichage

- Les fils sont dessinés sous les objets, fins et translucides : câble sombre et
  âme de la couleur du circuit. Les lettres, dans une petite pastille aussi
  translucide que le fil, sont posées sur le fil près de chaque bout.
- Contrôleur ou dispositif sélectionné : les autres fils s'estompent davantage.
- Pendant la simulation, les fils sont presque effacés.

## Écarts avec la première version de cette note

| Proposé                                           | Retenu                                                       | Raison                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Rendu SVG                                         | Canvas 2D, même renderer que le plateau                      | ADR 0006 ; un calque SVG devrait suivre caméra, zoom et DPR séparément               |
| `label` et `color` stockés sur chaque fil         | Dérivés, un circuit par levier                               | Rien à valider ni à désynchroniser ; la note montrait déjà un bouton A → 3 appareils |
| `sourceAnchor` / `targetAnchor` dans le niveau    | Ancrages définis par la famille                              | Donnée visuelle, pas donnée de niveau                                                |
| Routage tenant compte des autres fils             | Segment droit, sans routage ni pont (U14)                    | Les tracés orthogonaux étaient trop voyants                                          |
| « Éviter les zones de gameplay importantes »      | Abandonné                                                    | Non défini                                                                           |
| Plusieurs contrôleurs possibles sur un dispositif | Un seul contrôleur par dispositif                            | Deux contrôleurs opposés rendraient l'état ambigu                                    |
| Le joueur peut actionner le levier en simulation  | Jamais ; seuls les objets le font changer de cran            | Principe « construire, puis regarder »                                               |
| Bouton, ventilateur, porte, moteur, électroaimant | Bouton, ventilateur, barrière le 26 septembre ; le reste non | Ajoutés avec leurs assets ; moteur et électroaimant n'en ont pas                     |
| Outil « Wire » dans la boîte à outils, deux clics | « Relier à un appareil » dans le panneau, puis un tap        | Réutilise la sélection existante, adapté au tactile                                  |
