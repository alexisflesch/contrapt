# Stratégie de qualité

## Objectif

La qualité repose sur des contrats exécutables et une boucle de feedback courte.
Les outils ne remplacent pas la conception, mais doivent rendre les écarts visibles
avant qu'ils ne se propagent aux niveaux et aux sauvegardes.

## TDD

Red-Green-Refactor est obligatoire pour les comportements du domaine, de la
simulation, des codecs, des migrations et pour toute correction de bug.

Un bon test décrit une conséquence observable et reste valable après un refactoring
interne. Il ne se contente pas de vérifier qu'une méthode privée a été appelée ou
qu'un fichier contient une chaîne donnée.

Une correction de bug commence par le plus petit test reproduisant le défaut. Les
tests de régression utilisant un niveau complet sont ajoutés en plus, et non à la
place, d'un test ciblé lorsque celui-ci est possible.

## Pyramide de tests

### Tests unitaires

- schémas et validateurs sémantiques ;
- commandes et undo/redo ;
- inventaire, restrictions et objectifs ;
- migrations ;
- codecs et limites ;
- contrôleurs d'objets purs.

Ils doivent être majoritaires et ne pas requérir de navigateur.

### Tests contractuels

Chaque module d'objet passe la même suite : métadonnées valides, props par défaut
valides, aller-retour de sérialisation, construction/destruction sans fuite connue,
ports cohérents et comportement minimal.

Chaque implémentation de repository passe un contrat commun pour les opérations
qu'elle supporte.

### Tests d'intégration de simulation

Des scènes minimales vérifient les interactions avec le moteur physique à pas fixe.
Les assertions portent sur des tolérances et des invariants utiles, pas sur tous les
floats internes du moteur.

Les scènes de conformité sont conservées après le choix du moteur pour détecter les
régressions lors des mises à jour de dépendances.

### Tests end-to-end

Les parcours critiques sont testés dans de vrais navigateurs : ouvrir un niveau,
placer et pivoter au tactile, undo/redo, lancer, réinitialiser, réussir, créer,
sauvegarder, recharger, importer et partager.

Au moins un projet de test utilise un viewport et des interactions tactiles de
téléphone. Les tests desktop ne sont pas considérés comme substituts.

Amendement du 2 octobre 2026 (v1 desktop d'abord) : la gate (`test:e2e:critical`)
passe sur le projet Playwright `v1` (Desktop Chrome, 1440 × 900, `hasTouch`), qui
exclut les specs étiquetées `@mobile`. Le projet `mobile` reste lançable à la main,
hors gate ; l'exigence d'un projet téléphone dans la gate revient en v2.

### Tests de contenu

Tous les niveaux embarqués sont valides au build. Une solution de référence ou un
scénario équivalent prouve leur résolubilité et sert de régression. Cette solution
n'est pas un secret de sécurité : une application statique ne peut pas cacher
durablement une donnée livrée au navigateur.

## Déterminisme et temps

- pas physique fixe ;
- ordre de création stable ;
- graine explicite pour tout aléatoire ;
- aucun temps mural dans les règles ;
- versions du moteur et des paramètres consignées ;
- replay par commandes envisagé pour diagnostiquer les échecs, sans en faire une
  fonctionnalité utilisateur initiale.

La promesse exacte de reproductibilité sera fixée avec le moteur. Ne pas promettre
un résultat bit-à-bit si la suite multi-navigateurs ne le démontre pas.

## Garde-fous envisagés

Le scaffolding doit fournir une commande globale unique, par exemple `check`, qui
orchestre sans les masquer :

- TypeScript strict sans émission ;
- ESLint avec informations de type ;
- vérification Prettier ;
- tests unitaires et contractuels ;
- validation des schémas et niveaux embarqués ;
- détection de code ou d'exports inutilisés ;
- build de production ;
- sous-ensemble end-to-end critique selon le coût d'exécution.

Les bibliothèques exactes seront confirmées au scaffolding. Les candidats initiaux
sont Vitest pour les tests TypeScript et Playwright pour les navigateurs. Un outil
ne doit être ajouté que s'il détecte une classe d'erreur différente et produit un
signal exploitable.

La proposition concrète de bootstrap et l'interface des scripts sont décrites dans
`docs/decisions/0003-project-bootstrap.md`. Elles restent proposées jusqu'à
acceptation de cette décision.

La CI exécute la même commande que le développement local. Aucun warning de lint ou
de TypeScript n'est toléré sur la branche principale.

## Règles de schémas

- Zod définit les formes runtime ;
- les types TypeScript sont inférés autant que possible ;
- les schémas externes sont stricts et refusent les champs inconnus, sauf décision
  de compatibilité explicite ;
- les valeurs numériques ont bornes et finitude vérifiées ;
- les références inter-objets passent une validation sémantique distincte ;
- le parseur retourne des erreurs structurées transformables en messages utilisateur.

## Propriété et fuzzing

Les codecs URL, migrations, commandes inversibles et parseurs sont de bons candidats
aux tests génératifs. Ils seront introduits quand les premiers contrats seront
stables, plutôt que d'ajouter immédiatement une dépendance sans cas réel.

Invariants prioritaires :

- décoder un niveau encodé restitue le même document canonique ;
- une séquence de commandes suivie de tous ses undo restitue le document initial ;
- migrer deux fois ne modifie pas un document déjà courant ;
- aucune entrée finie et bornée ne produit de valeur `NaN` ou infinie ;
- une charge dépassant les limites est refusée avant allocation excessive.

## Dépendances et mises à jour

Les versions sont verrouillées par le lockfile. Une mise à jour du moteur physique,
de Zod, du renderer, du service worker ou du stockage est traitée comme sensible et
doit passer la suite complète pertinente.

Une abstraction ne justifie pas l'installation de plusieurs implémentations en
production. Les moteurs candidats ne cohabiteront que pendant l'évaluation, puis le
moteur non retenu sera retiré.

## Skills futurs

Les skills projet seront créés après l'existence des schémas et scripts auxquels
ils se réfèrent. Ils resteront courts et spécialisés : auteur d'objet, auteur de
niveau, régression physique et validation de contenu.

Ils imposeront l'usage des contrats réels du dépôt. Ils ne recopieront ni ce
document, ni des conseils génériques déjà appliqués par les outils.
