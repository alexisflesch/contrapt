# ADR 0001 - Fondations produit

Statut : accepté

## Décision

Le jeu, nommé **Contrapt!**, est une réinterprétation moderne et originale du
puzzle mécanique à réaction en chaîne. Il ne cherche pas la fidélité à un catalogue
ou à des mécanismes historiques.

La version 1 est une PWA statique, jouable et éditable hors ligne, sans backend. La
création de niveaux sur téléphone est une exigence de premier rang et réutilise le
même plateau que la résolution.

Le contenu commence avec peu de familles d'objets et introduit les concepts un par
un. Les mécanismes complexes sont reportés jusqu'à ce que le gameplay simple, le
format de niveau et l'éditeur soient solides.

Le développement comportemental suit TDD et s'appuie sur TypeScript strict, Zod,
lint, formatage et tests automatisés.

## Conséquences

- le premier catalogue contient uniquement balle, panier, bascule et poutre ;
- les poutres ont des tailles discrètes et la bascule est un objet préassemblé ;
- la gravité est la seule source d'énergie des premiers niveaux ;
- interrupteurs, ventilateurs, moteurs et autres actionneurs sont reportés
  (levé en partie : levier et convoyeur le 25 septembre 2026, bouton, ventilateur
  et barrière le 26, voir [ADR 0009](0009-control-wires.md)) ;
- l'UX tactile ne peut pas être ajoutée après une interface desktop ;
- le format et les repositories ne dépendent pas d'un backend ;
- une future communauté est un adaptateur et un ensemble d'écrans supplémentaires,
  pas une réécriture du moteur ;
- la direction graphique peut évoluer sans modifier les identifiants et schémas de
  mécanique.
