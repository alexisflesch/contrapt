# Instructions de travail

Ces instructions s'appliquent a tout le depot.

## Sources de verite

Avant toute modification, lire les documents pertinents dans `docs/`. En cas de
contradiction, ne pas inventer de compromis silencieux : signaler le conflit et
mettre a jour la decision concernee avant l'implementation.

Le code, les schemas executables et les tests priment sur les exemples narratifs.
Un exemple obsolette doit etre corrige ou supprime.

## Methode de developpement

Pour tout comportement ou correction de bug, suivre Red-Green-Refactor :

1. ajouter ou modifier un test qui decrit le comportement attendu ;
2. verifier qu'il echoue pour la bonne raison ;
3. ecrire le minimum de code de production necessaire ;
4. verifier la reussite des tests ;
5. refactorer sans changer le comportement.

Ne pas affaiblir, supprimer ou contourner un test pour faire passer une
implementation. Une modification purement documentaire, un formatage ou un
scaffolding sans comportement observable ne necessite pas de test artificiel,
mais doit passer les validateurs applicables.

Avant de declarer une tache terminee, executer la commande de verification globale
du depot lorsqu'elle existe. Ne pas inventer le nom d'une commande absente : lire
`package.json` et la documentation du depot.

## Invariants d'architecture

- Le domaine ne depend ni du DOM, ni de PixiJS, ni d'IndexedDB, ni d'un moteur
  physique concret.
- Le format de niveau ne contient aucun objet interne au moteur physique ou au
  moteur de rendu.
- Toute donnee importee, lue depuis IndexedDB ou extraite d'une URL est non fiable
  et doit etre validee avec le schema Zod approprie avant d'entrer dans le domaine.
- Toute evolution incompatible d'un document persistant requiert une migration et
  des tests couvrant l'ancienne et la nouvelle version.
- La simulation utilise un pas de temps fixe. Elle ne lit pas directement
  `Date.now()`, `performance.now()` ou `Math.random()` ; horloge et aleatoire sont
  injectes quand ils sont necessaires.
- Le mode simulation travaille sur une projection ou une copie du document de
  niveau. Il ne modifie jamais le document edite.
- Les positions du domaine sont exprimees en unites du monde, jamais en pixels
  d'ecran.
- Les niveaux ne peuvent contenir ni code executable, ni URL d'asset distante.
- Le jeu et l'editeur partagent le meme modele de niveau et la meme vue du plateau.

## TypeScript et qualite statique

- TypeScript reste en mode strict.
- Ne pas introduire `any`, `@ts-ignore`, assertion non sure ou desactivation ESLint
  pour eviter de modeliser un cas. Toute exception reellement necessaire doit etre
  locale, commentee et testee.
- Preferer `unknown` avec validation ou narrowing explicite aux conversions de
  type forcees.
- Ne pas lire ou ecrire du JSON persistant hors des codecs et repositories prevus.
- Garder les fonctions du domaine petites, pures et testables lorsque le
  comportement ne requiert pas d'effet de bord.
- Ne pas ajouter une dependance structurante sans documenter la decision et ses
  consequences.

## Mobile-first

Toute fonctionnalite de jeu ou d'edition doit etre utilisable au tactile sur un
petit ecran. Ne pas rendre une action essentielle dependante du survol, du clic
droit ou d'un clavier. Les tests end-to-end critiques incluent au moins un viewport
de telephone pris en charge.

## Discipline de changement

- Ne pas melanger un refactoring sans rapport avec la fonctionnalite demandee.
- Ne pas anticiper un systeme de plugins, un backend ou une mecanique complexe sans
  besoin valide.
- Ajouter les abstractions au moment ou un deuxieme cas reel demontre leur utilite,
  sauf pour les frontieres explicitement imposees dans `docs/architecture.md`.
- Une nouvelle famille d'objet doit fournir son schema, sa definition, ses tests de
  comportement, ses outils d'edition et ses regles de serialisation.

