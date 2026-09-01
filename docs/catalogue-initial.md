# Catalogue initial

Statut : périmètre fonctionnel accepté ; dimensions, rendu et constantes physiques
à mesurer pendant le développement.

## Principe

Le premier vocabulaire du jeu contient exactement quatre familles visibles :

- balle ;
- panier ;
- poutre ;
- bascule.

La simplicité du catalogue est une contrainte de game design. Une variante visuelle
ou une taille ne devient pas automatiquement une nouvelle famille. Les propriétés
non nécessaires à un puzzle ne sont pas exposées au joueur ou au créateur.

Pendant l'édition, la physique est arrêtée. La balle et la partie mobile de la
bascule ne réagissent à la gravité qu'après le lancement de la simulation.

## Balle

### Rôle

La balle est le seul corps libre nécessaire aux premiers niveaux. La gravité la met
en mouvement ; les poutres et la bascule modifient sa trajectoire jusqu'au panier.

### Modèle initial

- corps dynamique circulaire ;
- rayon, masse, friction et rebond fixes par la définition du jeu ;
- aucune propriété physique modifiable dans les premiers niveaux ;
- position initiale configurable par l'auteur ;
- permissions explicites de déplacement, rotation et retrait, ou disponible dans
  l'inventaire selon le niveau.

Il n'existe qu'une seule mécanique de balle au départ. Le choix tennis, basket ou
autre relève d'abord de la direction graphique. Des balles aux propriétés physiques
différentes ne seront ajoutées que si un futur puzzle justifie cette distinction.

## Panier

### Rôle

Le panier matérialise la cible finale. Le joueur doit y faire entrer la balle
désignée par le niveau.

### Modèle initial

- objet fixe pendant la simulation ;
- forme visuelle et colliders qui retiennent ou guident la balle ;
- volume capteur interne non visible ;
- position configurable par l'auteur ;
- orientation fixe par défaut, la rotation n'étant exposée que si les niveaux en ont
  réellement besoin ;
- normalement non déplaçable, non rotatable et non retirable en mode résolution.

Le panier émet un fait de domaine du type `ball-entered-target`. L'objectif du
niveau référence ce fait ou l'état du capteur ; il n'est pas codé directement dans
le renderer ou le moteur physique.

La condition exacte de réussite reste à tester. Le point de départ recommandé est :
le centre de la balle entre dans le volume du panier et y reste pendant une courte
durée. Une contrainte de direction ou de vitesse ne sera ajoutée que si des faux
positifs apparaissent dans de vrais niveaux.

## Poutre

### Rôle

La poutre sert de sol, rampe, mur ou guide. Elle est le principal objet manipulable
des premiers puzzles.

### Modèle initial

- corps statique pendant la simulation ;
- épaisseur et matériau physiques communs à toutes les tailles ;
- trois tailles provisoires : courte, moyenne et longue ;
- déplacement et rotation autorisables séparément par le niveau ;
- rotation avec snapping adapté au tactile, sans interdire un angle libre dans
  l'éditeur de niveau ;
- quantité gérée par l'inventaire pour chaque taille.

Les tailles sont des valeurs d'une propriété énumérée, pas des types `short-beam`,
`medium-beam` et `long-beam`. Cela garde les objectifs, outils et tests communs.
Un redimensionnement continu n'est pas exposé initialement : il serait moins lisible
sur téléphone et rendrait l'inventaire ainsi que les solutions plus difficiles à
contrôler.

## Bascule

### Rôle

La bascule introduit la rotation et le transfert de mouvement sans demander au
joueur de comprendre ou de configurer des joints.

### Modèle initial

- objet composite créé par un seul module ;
- socle fixe, planche dynamique et joint de rotation internes ;
- géométrie, limites angulaires, masse et friction fixes initialement ;
- déplacement de l'ensemble autorisable par le niveau ;
- pas de démontage, de redimensionnement ou de connexion manuelle ;
- normalement introduite déjà placée, sans permissions joueur, avant de devenir
  disponible dans l'inventaire.

La planche et le joint internes appartiennent à l'instance de simulation de la
bascule. Ils n'ont pas d'identifiants persistants de niveau et ne sont pas
sélectionnables indépendamment dans l'éditeur.

## Inventaire

Une entrée d'inventaire a son propre identifiant, référence une famille et les
propriétés déjà choisies. Elle porte aussi les permissions qui seront copiées vers
le placement créé :

```ts
interface InventoryEntry {
  id: string;
  type: "ball" | "basket" | "beam" | "seesaw";
  props: {} | { size: "short" | "medium" | "long" };
  quantity: number;
  permissions: { move: boolean; rotate: boolean; remove: boolean };
}
```

Le schéma concret est une union Zod stricte discriminée afin que les propriétés
soient typées selon `type`. Pour une poutre, `props` contient la taille ; les trois
autres familles n'acceptent aucune propriété en v1. La rotation est disponible pour
les poutres uniquement : `permissions.rotate` doit donc être `false` pour les
autres familles.

Les premiers niveaux peuvent n'offrir qu'une ou deux poutres. La balle, le panier
et la bascule peuvent être placés par l'auteur avec leurs trois permissions à
`false`, sans apparaître dans le tiroir du joueur.

## Progression suggérée

1. Une balle tombe seule dans un panier : apprendre lancement et reset.
2. Placer une poutre courte sans devoir la tourner.
3. Faire pivoter une poutre pour créer une pente.
4. Choisir la bonne longueur de poutre.
5. Enchaîner deux poutres et un rebond.
6. Observer une bascule déjà placée et chargée par la balle.
7. Déplacer une bascule sans modifier ses paramètres internes.
8. Combiner plusieurs poutres et une bascule pour atteindre le panier.

Cette liste décrit l'ordre pédagogique, pas encore le nombre final de niveaux. Une
étape peut demander plusieurs niveaux si les tests utilisateurs montrent qu'un
concept n'est pas acquis.

## Tests contractuels minimaux

- la balle commence exactement à la transform déclarée à chaque reset ;
- les trois tailles de poutre partagent épaisseur et matériau ;
- une poutre ne bouge pas sous l'effet de la simulation ;
- la bascule revient à son état initial après reset ;
- détruire une bascule détruit tous ses composants physiques internes ;
- le panier ne valide que la balle cible d'un objectif ;
- le capteur du panier ne modifie pas la trajectoire physique ;
- les objets dont une permission est à `false` refusent la commande correspondante ;
- l'inventaire distingue et décompte correctement les tailles de poutre.

## Décisions à prendre par expérimentation

- apparence exacte de la balle et du panier ;
- dimensions relatives des objets ;
- coefficients de friction et de rebond ;
- trois tailles de poutre définitives ;
- angles de snapping et comportement près des limites ;
- durée de maintien nécessaire dans le panier ;
- limites angulaires et amortissement de la bascule.
