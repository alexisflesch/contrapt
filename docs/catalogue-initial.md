# Catalogue initial

Statut : perimetre fonctionnel accepte ; dimensions, rendu et constantes physiques
a mesurer pendant le developpement.

## Principe

Le premier vocabulaire du jeu contient exactement quatre familles visibles :

- balle ;
- panier ;
- poutre ;
- bascule.

La simplicite du catalogue est une contrainte de game design. Une variante visuelle
ou une taille ne devient pas automatiquement une nouvelle famille. Les proprietes
non necessaires a un puzzle ne sont pas exposees au joueur ou au createur.

Pendant l'edition, la physique est arretee. La balle et la partie mobile de la
bascule ne reagissent a la gravite qu'apres le lancement de la simulation.

## Balle

### Role

La balle est le seul corps libre necessaire aux premiers niveaux. La gravite la met
en mouvement ; les poutres et la bascule modifient sa trajectoire jusqu'au panier.

### Modele initial

- corps dynamique circulaire ;
- rayon, masse, friction et rebond fixes par la definition du jeu ;
- aucune propriete physique modifiable dans les premiers niveaux ;
- position initiale configurable par l'auteur ;
- objet verrouille ou disponible dans l'inventaire selon le niveau.

Il n'existe qu'une seule mecanique de balle au depart. Le choix tennis, basket ou
autre releve d'abord de la direction graphique. Des balles aux proprietes physiques
differentes ne seront ajoutees que si un futur puzzle justifie cette distinction.

## Panier

### Role

Le panier materialise la cible finale. Le joueur doit y faire entrer la balle
designee par le niveau.

### Modele initial

- objet fixe pendant la simulation ;
- forme visuelle et colliders qui retiennent ou guident la balle ;
- volume capteur interne non visible ;
- position configurable par l'auteur ;
- orientation fixe par defaut, la rotation n'etant exposee que si les niveaux en ont
  reellement besoin ;
- normalement verrouille en mode resolution.

Le panier emet un fait de domaine du type `ball-entered-target`. L'objectif du
niveau reference ce fait ou l'etat du capteur ; il n'est pas code directement dans
le renderer ou le moteur physique.

La condition exacte de reussite reste a tester. Le point de depart recommande est :
le centre de la balle entre dans le volume du panier et y reste pendant une courte
duree. Une contrainte de direction ou de vitesse ne sera ajoutee que si des faux
positifs apparaissent dans de vrais niveaux.

## Poutre

### Role

La poutre sert de sol, rampe, mur ou guide. Elle est le principal objet manipulable
des premiers puzzles.

### Modele initial

- corps statique pendant la simulation ;
- epaisseur et materiau physiques communs a toutes les tailles ;
- trois tailles provisoires : courte, moyenne et longue ;
- deplacement et rotation autorisables separement par le niveau ;
- rotation avec snapping adapte au tactile, sans interdire un angle libre dans
  l'editeur de niveau ;
- quantite geree par l'inventaire pour chaque taille.

Les tailles sont des valeurs d'une propriete enumeree, pas des types `short-beam`,
`medium-beam` et `long-beam`. Cela garde les objectifs, outils et tests communs.
Un redimensionnement continu n'est pas expose initialement : il serait moins lisible
sur telephone et rendrait l'inventaire ainsi que les solutions plus difficiles a
controler.

## Bascule

### Role

La bascule introduit la rotation et le transfert de mouvement sans demander au
joueur de comprendre ou de configurer des joints.

### Modele initial

- objet composite cree par un seul module ;
- socle fixe, planche dynamique et joint de rotation internes ;
- geometrie, limites angulaires, masse et friction fixes initialement ;
- deplacement de l'ensemble autorisable par le niveau ;
- pas de demontage, de redimensionnement ou de connexion manuelle ;
- normalement introduite deja placee et verrouillee avant de devenir disponible
  dans l'inventaire.

La planche et le joint internes appartiennent a l'instance de simulation de la
bascule. Ils n'ont pas d'identifiants persistants de niveau et ne sont pas
selectionnables independamment dans l'editeur.

## Inventaire

Une entree d'inventaire reference une famille et les proprietes deja choisies :

```ts
interface InventoryEntry {
  objectType: "ball" | "basket" | "beam" | "seesaw";
  props: Record<string, unknown>;
  quantity: number;
}
```

Pour une poutre, `props` contient la taille. Le schema concret sera une union Zod
discriminee afin que les proprietes soient typees selon `objectType` ; le
`Record<string, unknown>` ci-dessus illustre seulement la forme generale.

Les premiers niveaux peuvent n'offrir qu'une ou deux poutres. La balle, le panier
et la bascule peuvent etre places et verrouilles par l'auteur sans apparaitre dans
le tiroir du joueur.

## Progression suggeree

1. Une balle tombe seule dans un panier : apprendre lancement et reset.
2. Placer une poutre courte sans devoir la tourner.
3. Faire pivoter une poutre pour creer une pente.
4. Choisir la bonne longueur de poutre.
5. Enchainer deux poutres et un rebond.
6. Observer une bascule deja placee et chargee par la balle.
7. Deplacer une bascule sans modifier ses parametres internes.
8. Combiner plusieurs poutres et une bascule pour atteindre le panier.

Cette liste decrit l'ordre pedagogique, pas encore le nombre final de niveaux. Une
etape peut demander plusieurs niveaux si les tests utilisateurs montrent qu'un
concept n'est pas acquis.

## Tests contractuels minimaux

- la balle commence exactement a la transform declaree a chaque reset ;
- les trois tailles de poutre partagent epaisseur et materiau ;
- une poutre ne bouge pas sous l'effet de la simulation ;
- la bascule revient a son etat initial apres reset ;
- detruire une bascule detruit tous ses composants physiques internes ;
- le panier ne valide que la balle cible d'un objectif ;
- le capteur du panier ne modifie pas la trajectoire physique ;
- les objets verrouilles refusent les commandes d'edition interdites ;
- l'inventaire distingue et decompte correctement les tailles de poutre.

## Decisions a prendre par experimentation

- apparence exacte de la balle et du panier ;
- dimensions relatives des objets ;
- coefficients de friction et de rebond ;
- trois tailles de poutre definitives ;
- angles de snapping et comportement pres des limites ;
- duree de maintien necessaire dans le panier ;
- limites angulaires et amortissement de la bascule.

