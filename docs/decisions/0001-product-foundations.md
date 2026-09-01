# ADR 0001 - Fondations produit

Statut : accepte

## Decision

Le jeu est une reinterpretation moderne et originale du puzzle mecanique a reaction
en chaine. Il ne cherche pas la fidelite a un catalogue ou a des mecanismes
historiques.

La version 1 est une PWA statique, jouable et editable hors ligne, sans backend. La
creation de niveaux sur telephone est une exigence de premier rang et reutilise le
meme plateau que la resolution.

Le contenu commence avec peu de familles d'objets et introduit les concepts un par
un. Les mecanismes complexes sont reportes jusqu'a ce que le gameplay simple, le
format de niveau et l'editeur soient solides.

Le developpement comportemental suit TDD et s'appuie sur TypeScript strict, Zod,
lint, formatage et tests automatises.

## Consequences

- le premier catalogue contient uniquement balle, panier, bascule et poutre ;
- les poutres ont des tailles discretes et la bascule est un objet preassemble ;
- la gravite est la seule source d'energie des premiers niveaux ;
- interrupteurs, ventilateurs, moteurs et autres actionneurs sont reportes ;
- l'UX tactile ne peut pas etre ajoutee apres une interface desktop ;
- le format et les repositories ne dependent pas d'un backend ;
- une future communaute est un adaptateur et un ensemble d'ecrans supplementaires,
  pas une reecriture du moteur ;
- la direction graphique peut evoluer sans modifier les identifiants et schemas de
  mecanique.
