# ADR 0010 - Défi d'objets et progression de campagne

Statut : accepté

Date : 2026-09-26

## Contexte

Un niveau résolu n'offre aujourd'hui aucune raison d'y revenir, et rien ne relie
les niveaux entre eux. L'auteur veut une métaprogression légère qui valorise deux
plaisirs distincts, **trouver une solution** et **trouver une belle solution**,
sans dévaloriser la première victoire. Un score unique du type
`10 000 − 500 × objets` pousse à la solution la moins chère et rend « mauvaise »
une solution créative : il est écarté.

## Décision

### Trois paliers de réussite

Le critère est le **nombre d'objets utilisés** : le nombre de placements présents
dans la tentative au moment du lancement réussi et **issus de l'inventaire**
(provenance de `ConstructionAttempt`, ADR 0005). Un objet du décor déplacé ne
compte pas.

| Palier     | Condition                                                |
| ---------- | -------------------------------------------------------- |
| ✅ Résolu  | l'objectif est atteint, quel que soit le nombre d'objets |
| ⭐ Élégant | résolu avec `objets ≤ elegantObjectCount`                |
| 🏆 Minimal | résolu avec `objets ≤ minimalObjectCount`                |

`minimalObjectCount` est le minimum **connu** de l'auteur, établi par recherche
sur grille au banc d'essai, pas une preuve mathématique. Un joueur qui fait moins
obtient 🏆 et l'interface le signale comme un nouveau record ; le niveau n'est
pas modifié.

### Format : champ facultatif `challenge`

`LevelDocument` v2 reçoit un champ facultatif :

```ts
challenge?: { elegantObjectCount: number; minimalObjectCount: number }
```

Entiers, `1 ≤ minimalObjectCount ≤ elegantObjectCount ≤ 999`, et
`minimalObjectCount` au plus égal à la quantité totale de l'inventaire. Absent,
le niveau n'affiche que ✅. Comme `wires` (ADR 0009), c'est une évolution
compatible : un document v2 sans `challenge` reste valide et se relit à
l'identique, donc **pas de nouvelle version ni de migration**. Le champ n'est
pas facultatif « par défaut à une valeur » : absent signifie « pas de défi ».

Le champ est une donnée de contenu du niveau, pas un détail de moteur ni de
rendu : il respecte l'invariant du format.

### Révélation progressive

Pour que la première victoire reste une victoire :

1. avant toute réussite, aucun objectif chiffré n'est affiché ;
2. après une réussite non élégante : « Résolu avec 7 objets. Tu penses pouvoir
   le faire avec 5 ? » (5 = `elegantObjectCount`) ;
3. après une réussite élégante mais non minimale : le record 🏆 est révélé ;
4. après 🏆 : rien de plus à demander.

Le texte exact et la mise en forme sont des décisions d'interface, validées par
l'auteur.

### Progression de campagne

- La campagne est une liste ordonnée de chapitres, chacun une liste ordonnée de
  niveaux, déclarée dans `src/content/` (donnée de contenu, pas champ du
  document de niveau).
- Le premier niveau de la campagne est toujours ouvert. Un niveau est ouvert dès
  que le niveau précédent de la campagne est résolu. Pas d'autre verrou (ni
  nombre d'étoiles minimal, ni chapitre à terminer à 100 %).
- Pour chaque niveau, la progression retient : résolu ou non, meilleur nombre
  d'objets. Le palier se recalcule depuis ces deux valeurs et le `challenge`
  courant du niveau, jamais stocké, pour qu'une correction du contenu s'applique
  aux anciennes parties.
- Le stockage de la progression relève de l'ADR 0011.

## Conséquences

- Le calcul du palier et du verrouillage est une fonction pure de
  `src/application/`, testée sans navigateur.
- Le validateur de contenu vérifie la cohérence de `challenge` avec l'inventaire.
- Chaque niveau qui déclare `challenge` doit prouver dans son test de régression
  qu'aucune solution à `minimalObjectCount − 1` objets n'existe sur la grille de
  recherche documentée.
- Une solution par nombre d'objets n'a de sens que si l'inventaire propose plus
  que le minimum : les niveaux à défi prévoient un surplus.
- Un temps, un classement en ligne ou des succès (« badges ») ne sont pas
  décidés ici.
