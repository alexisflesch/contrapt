# ADR 0002 - Selection du moteur physique

Statut : propose

## Contexte

Le jeu initial requiert surtout corps rigides, collisions, capteurs, rotation et
forces simples. Des mecanismes tels que cordes, poulies ou engrenages pourront
arriver plus tard. La stabilite mobile, la reproductibilite et la capacite de test
sont plus importantes qu'une longue liste de fonctions jamais utilisees.

Planck.js et Rapier 2D sont les candidats initiaux. Aucun moteur n'est retenu sur la
seule base de sa documentation ou d'une demo visuelle.

## Methode de decision

Construire une suite de conformite qui reste dans le depot :

1. chute, rebond et repos d'une balle ;
2. balle roulant puis rebondissant sur plusieurs poutres inclinees ;
3. collision de la balle avec les bords d'un panier ;
4. bascule chargee de facon symetrique puis asymetrique ;
5. entree de la balle dans le capteur du panier ;
6. creation, reset et destruction repetes sans croissance anormale ;
7. scene dense au budget maximal provisoire ;
8. un joint futur representatif pour ne pas choisir une impasse technique.

Chaque scene possede des assertions headless sur des invariants et tolerances. Les
scenes critiques sont aussi executees sur les navigateurs mobiles de la matrice.

## Criteres

- comportement suffisamment stable et previsible pour le game design ;
- resultats reproductibles sur les navigateurs supportes ;
- performance et memoire sur telephones de reference ;
- API permettant une couche d'adaptation mince ;
- qualite des joints et capteurs requis ;
- taille et cout de chargement compatibles avec la PWA ;
- maintenance, documentation et licence ;
- ergonomie TypeScript et diagnostic des erreurs.

## Sortie attendue

Documenter les mesures, choisir un seul moteur et retirer l'autre du bundle. La
suite de conformite devient une suite de regression permanente. Une limite du
moteur retenu qui affecte le game design doit etre consignee explicitement.
