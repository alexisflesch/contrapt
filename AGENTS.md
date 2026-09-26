# Instructions de travail

Ces instructions s'appliquent à tout le dépôt.

## Sources de vérité

`docs/index.md` est la carte de lecture du dépôt : il dit quel document fait
autorité sur quoi, et quoi lire pour quel type de tâche. Le consulter avant de
lire quoi que ce soit d'autre, et s'en tenir à la liste qu'il indique.

En cas de contradiction entre deux sources, ne pas inventer de compromis
silencieux : signaler le conflit et mettre à jour la décision concernée avant
l'implémentation.

## Reprise en cours

Le travail restant est ordonné, tâche par tâche, dans
`docs/feuille-de-route-luna.md`. Un agent d'implémentation qui reprend le dépôt
lit ce fichier juste après `docs/index.md`, suit ses tâches dans l'ordre et tient
son journal. L'état réellement livré est dans `docs/etat.md`.

Le découpage en tranches est dans `docs/backlog.md`. Le skill `orchestrate`
(`.codex/skills/orchestrate/`) ne sert qu'à une session qui délègue à plusieurs
agents ; un agent seul ne l'utilise pas.

Le code, les schémas exécutables et les tests priment sur les exemples narratifs.
Un exemple obsolète doit être corrigé ou supprimé.

## Méthode de développement

Pour tout comportement ou correction de bug, suivre Red-Green-Refactor :

1. ajouter ou modifier un test qui décrit le comportement attendu ;
2. vérifier qu'il échoue pour la bonne raison ;
3. écrire le minimum de code de production nécessaire ;
4. vérifier la réussite des tests ;
5. refactorer sans changer le comportement.

Ne pas affaiblir, supprimer ou contourner un test pour faire passer une
implémentation. Une modification purement documentaire, un formatage ou un
scaffolding sans comportement observable ne nécessite pas de test artificiel,
mais doit passer les validateurs applicables.

Avant de déclarer une tâche terminée, exécuter `pnpm check` (gate globale) ;
`pnpm check:fast` suffit pendant le travail. Ne pas inventer le nom d'une commande
absente : lire `package.json`. Playwright sert le build (`vite preview`) : lancer
`pnpm build` avant tout `pnpm exec playwright test` isolé.

Un changement visible à l'écran (mise en page, style, sprites, textes) n'est
terminé qu'après validation à l'œil par l'auteur : fournir des captures aux
formats concernés.

## Invariants d'architecture

- Le domaine ne dépend ni du DOM, ni de PixiJS, ni d'IndexedDB, ni d'un moteur
  physique concret.
- Le format de niveau ne contient aucun objet interne au moteur physique ou au
  moteur de rendu.
- Toute donnée importée, lue depuis IndexedDB ou extraite d'une URL est non fiable
  et doit être validée avec le schéma Zod approprié avant d'entrer dans le domaine.
- Toute évolution incompatible d'un document persistant requiert une migration et
  des tests couvrant l'ancienne et la nouvelle version.
- La simulation utilise un pas de temps fixe. Elle ne lit pas directement
  `Date.now()`, `performance.now()` ou `Math.random()` ; horloge et aléatoire sont
  injectés quand ils sont nécessaires.
- Le mode simulation travaille sur une projection ou une copie du document de
  niveau. Il ne modifie jamais le document édité.
- Les positions du domaine sont exprimées en unités du monde, jamais en pixels
  d'écran.
- Les niveaux ne peuvent contenir ni code exécutable, ni URL d'asset distante.
- Le jeu et l'éditeur partagent le même modèle de niveau et la même vue du plateau.

## TypeScript et qualité statique

- TypeScript reste en mode strict.
- Ne pas introduire `any`, `@ts-ignore`, assertion non sûre ou désactivation ESLint
  pour éviter de modéliser un cas. Toute exception réellement nécessaire doit être
  locale, commentée et testée.
- Préférer `unknown` avec validation ou narrowing explicite aux conversions de
  type forcées.
- Ne pas lire ou écrire du JSON persistant hors des codecs et repositories prévus.
- Garder les fonctions du domaine petites, pures et testables lorsque le
  comportement ne requiert pas d'effet de bord.
- Ne pas ajouter une dépendance structurante sans documenter la décision et ses
  conséquences.

## Mobile-first

Toute fonctionnalité de jeu ou d'édition doit être utilisable au tactile sur un
petit écran. Ne pas rendre une action essentielle dépendante du survol, du clic
droit ou d'un clavier. Les tests end-to-end critiques incluent au moins un viewport
de téléphone pris en charge.

## Discipline de changement

- Ne pas mélanger un refactoring sans rapport avec la fonctionnalité demandée.
- Ne pas anticiper un système de plugins, un backend ou une mécanique complexe sans
  besoin valide.
- Ajouter les abstractions au moment où un deuxième cas réel démontre leur utilité,
  sauf pour les frontières explicitement imposées dans `docs/architecture.md`.
- Une nouvelle famille d'objet doit fournir son schéma, sa définition, ses tests de
  comportement, ses outils d'édition et ses règles de sérialisation.
