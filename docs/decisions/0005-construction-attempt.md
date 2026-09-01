# ADR 0005 - Provenance ephemere d'une tentative de construction

Statut : accepte

Date : 2026-09-01

## Contexte

En resolution, retirer un objet place depuis l'inventaire doit restituer exactement
l'entree consommee. `LevelDocument v1` ne conserve pas cette origine et ne doit pas
melanger l'intention persistante de l'auteur avec l'etat d'une tentative du joueur.

## Decision

L'application manipule un `ConstructionAttempt` immuable et JSON-like contenant :

- le `LevelDocument` courant de la construction ;
- une table ephemere `placementId -> inventoryEntryId` nommee `provenance`.

Une nouvelle tentative clone et valide le niveau source puis commence avec une
provenance vide. Placer depuis l'inventaire ajoute la provenance dans la meme
commande atomique que la creation du placement et le decrement de quantite.
Retirer en mode joueur exige une provenance existante, une entree source encore
presente et une definition identique (`type`, `props`, `permissions`) avant de
restituer la quantite. Retirer un objet fixe sans provenance reste possible pour
l'auteur, mais jamais pour le joueur. La balle et le panier references par
l'objectif ne peuvent etre retires dans aucun contexte.

Les commandes recoivent explicitement le contexte `player` ou `author`. Le joueur
est contraint par les permissions persistantes et les zones de construction ; ces
regles de futur joueur ne bloquent pas l'auteur. La rotation reste une capacite des
poutres uniquement. Chaque document produit est revalide par le schema
`LevelDocument v1` avant acceptation, et chaque refus retourne un code d'erreur
stable sans mutation partielle.

Pour la v1, un placement ou un deplacement est dans une zone lorsque le centre de
sa transformee appartient a au moins un rectangle, bornes incluses. Verifier la
geometrie complete attend les dimensions provenant du futur catalogue physique ;
elles ne sont pas disponibles dans le contrat persistant actuel.

## Consequences

- `LevelDocument` reste partageable sans historique d'une partie particuliere ;
- l'historique porte le document et sa provenance ensemble, donc annuler et
  retablir restaurent atomiquement objets et quantites ;
- recharger uniquement un `LevelDocument` recommence une tentative et perd, par
  conception, la possibilite de retirer comme inventaire les objets fixes ;
- une future sauvegarde de partie devra serialiser une enveloppe de session
  versionnee distincte, sans ajouter la provenance au niveau ;
- le confinement par forme complete devra remplacer le test du centre lorsque le
  catalogue physique fournira des dimensions testables.
