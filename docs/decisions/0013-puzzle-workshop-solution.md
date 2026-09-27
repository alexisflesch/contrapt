# ADR 0013 - Atelier créateur de puzzles : objets à placer et solution de référence

Statut : accepté

Date : 2026-09-27

## Contexte

L'atelier produit une machine complète qui gagne seule. Décision de l'auteur du
27 septembre 2026 (U22, `feuille-de-route-luna.md` § 6) : il doit produire un
puzzle. Chaque objet posé est « fixe » ou « à placer » ; l'export donne un
document dont le décor est l'ensemble des objets fixes, l'inventaire les objets
à placer, et qui contient une **solution de référence** visible. Le document
doit rester un `LevelDocument` v2 relu par le codec de fichier (ADR 0011).

## Décision

Deux champs facultatifs, compatibles avec la v2 : un document v2 qui ne les porte
pas reste valide et se relit à l'identique, donc **pas de nouvelle version ni de
migration** (même régime que `wires`, ADR 0009, et `challenge`, ADR 0010).

### Forme atelier : `toPlace` sur un objet posé

```ts
objects[i].toPlace?: true
```

Absent, l'objet est fixe. Seul `true` est accepté, pour qu'un objet fixe n'ait
qu'une écriture. La balle et le panier de l'objectif ne sont jamais à placer.
Ce marquage n'existe que dans l'atelier et ses brouillons (ADR 0011) : un
document qui porte une `solution` n'a aucun objet `toPlace`.

### Forme puzzle : `solution`

```ts
solution?: {
  placements: { inventoryId: string; transform: { position; rotation } }[]
}
```

Chaque pose de la solution désigne une entrée d'inventaire posable (pas un fil)
et une pose ; la famille et les propriétés sont celles de l'entrée, visibles
dans le même fichier. Règles validées par le schéma :

- l'entrée existe et n'est pas un fil ;
- une entrée n'est pas utilisée plus de fois que sa quantité (vérifié contre
  l'inventaire d'origine, pas contre l'inventaire restant d'une tentative) ;
- le centre de chaque pose est dans la scène ; la rotation suit la règle de la
  famille (quarts de tour, butée du levier) ;
- au plus 512 poses.

La solution n'est pas une tentative : aucun identifiant d'objet n'y figure, et
la jouer (régression, vérification) pose chaque objet par la commande joueur
`placeFromInventory`, zones de construction comprises.

### Passage de l'atelier au puzzle

Une fonction pure de `src/application/` transforme l'atelier en puzzle :

- les objets fixes restent le décor, fils compris ;
- l'inventaire de l'atelier (invisible pour l'auteur, qui pose depuis le
  catalogue) est remplacé par les objets à placer, regroupés par famille et
  propriétés identiques ; permissions : déplacer et retirer, tourner selon la
  règle de la famille (`rotationMode`) ;
- la solution reçoit la pose de chaque objet à placer ;
- sans zone de construction, la zone est toute la scène ; les zones existantes
  sont conservées ;
- `challenge` : ⭐ et 🏆 au nombre d'objets à placer (le minimum connu est la
  solution de l'auteur) ;
- un fil qui touche un objet à placer est refusé en U22 (voir Conséquences).

La transformation inverse (puzzle → atelier) remet les poses de la solution sur
le plateau, marquées `toPlace`, et retire leurs unités de l'inventaire ; elle
sert à rouvrir un niveau de campagne dans l'atelier (U17).

### Vérifications à l'export

Avant tout export (fichier L22 ou lien L23), sans action de l'auteur, par
simulation déterministe à pas fixe (sans horloge réelle) :

1. au moins un objet est à placer ;
2. le puzzle, solution posée par les commandes du joueur, gagne ;
3. le puzzle sans aucune pose du joueur ne gagne pas.

Un échec refuse l'export avec un message. La simulation est injectée dans la
couche application par un port ; l'application ne dépend pas du moteur.

## Conséquences

- Tests : ancien document (sans les champs) relu à l'identique ; nouveau document
  relu à l'identique par le codec de fichier et le codec URL.
- Le schéma des tentatives ne contrôle pas le nombre de poses contre
  l'inventaire restant, comme il ne contrôle pas `challenge`.
- La régression d'un niveau de campagne peut rejouer sa `solution`.
- Un objet à placer relié par un fil n'est pas exportable en U22. Le jour où ce
  cas est nécessaire, la solution recevra des `wires` et l'inventaire une entrée
  `wire` (U21) ; ce sera un nouvel ajout compatible.
