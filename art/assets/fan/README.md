# Animation du ventilateur

Le ventilateur est composé de deux éléments séparés :

- le corps fixe ;
- les pales, animées indépendamment.

## Orientation visuelle

L’asset est légèrement vu de biais afin que la direction du souffle reste lisible dans un environnement 2D.

Les pales peuvent rester dessinées de face puis être légèrement déformées au rendu, par exemple avec une compression horizontale (`scaleX`) pour donner l’impression qu’elles sont inscrites dans un plan incliné.

L’effet doit rester subtil : l’objectif est surtout d’éviter l’impression d’un ventilateur qui souffle vers la caméra.

## Rotation des pales

Les pales peuvent tourner autour de leur centre avec une animation continue et linéaire.

Points à surveiller :

- conserver un `transform-origin` parfaitement centré ;
- éviter les variations de vitesse involontaires ;
- maintenir la même déformation de perspective pendant toute la rotation ;
- ajuster la vitesse selon l’état du ventilateur.

Une rotation rapide, de l’ordre de quelques dixièmes de seconde par tour, devrait donner un bon point de départ.

## Composition des calques

Le calque des pales peut être placé légèrement en retrait dans l’ouverture du ventilateur.

Selon le rendu obtenu, un petit décalage horizontal ou une légère réduction d’échelle peut aider à donner l’impression qu’elles sont réellement logées dans le cylindre.

Le bord avant du corps peut éventuellement masquer légèrement les pales, ce qui renforcera naturellement la sensation de profondeur.

## États possibles

L’animation peut rester très simple :

- **arrêté** : pales immobiles ;
- **actif** : rotation continue ;
- éventuellement une courte accélération/décélération lors des changements d’état.

Il n’est pas nécessaire d’ajouter un effet de vent directement dans l’asset : le souffle peut être représenté séparément par le moteur du jeu si besoin.