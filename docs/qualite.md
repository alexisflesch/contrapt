# Strategie de qualite

## Objectif

La qualite repose sur des contrats executables et une boucle de feedback courte.
Les outils ne remplacent pas la conception, mais doivent rendre les ecarts visibles
avant qu'ils ne se propagent aux niveaux et aux sauvegardes.

## TDD

Red-Green-Refactor est obligatoire pour les comportements du domaine, de la
simulation, des codecs, des migrations et pour toute correction de bug.

Un bon test decrit une consequence observable et reste valable apres un refactoring
interne. Il ne se contente pas de verifier qu'une methode privee a ete appelee ou
qu'un fichier contient une chaine donnee.

Une correction de bug commence par le plus petit test reproduisant le defaut. Les
tests de regression utilisant un niveau complet sont ajoutes en plus, et non a la
place, d'un test cible lorsque celui-ci est possible.

## Pyramide de tests

### Tests unitaires

- schemas et validateurs semantiques ;
- commandes et undo/redo ;
- inventaire, restrictions et objectifs ;
- migrations ;
- codecs et limites ;
- controleurs d'objets purs.

Ils doivent etre majoritaires et ne pas requerir de navigateur.

### Tests contractuels

Chaque module d'objet passe la meme suite : metadonnees valides, props par defaut
valides, aller-retour de serialisation, construction/destruction sans fuite connue,
ports coherents et comportement minimal.

Chaque implementation de repository passe un contrat commun pour les operations
qu'elle supporte.

### Tests d'integration de simulation

Des scenes minimales verifient les interactions avec le moteur physique a pas fixe.
Les assertions portent sur des tolerances et des invariants utiles, pas sur tous les
floats internes du moteur.

Les scenes de conformite sont conservees apres le choix du moteur pour detecter les
regressions lors des mises a jour de dependances.

### Tests end-to-end

Les parcours critiques sont testes dans de vrais navigateurs : ouvrir un niveau,
placer et pivoter au tactile, undo/redo, lancer, reinitialiser, reussir, creer,
sauvegarder, recharger, importer et partager.

Au moins un projet de test utilise un viewport et des interactions tactiles de
telephone. Les tests desktop ne sont pas consideres comme substituts.

### Tests de contenu

Tous les niveaux embarques sont valides au build. Une solution de reference ou un
scenario equivalent prouve leur resolubilite et sert de regression. Cette solution
n'est pas un secret de securite : une application statique ne peut pas cacher
durablement une donnee livree au navigateur.

## Determinisme et temps

- pas physique fixe ;
- ordre de creation stable ;
- graine explicite pour tout aleatoire ;
- aucun temps mural dans les regles ;
- versions du moteur et des parametres consignees ;
- replay par commandes envisage pour diagnostiquer les echecs, sans en faire une
  fonctionnalite utilisateur initiale.

La promesse exacte de reproductibilite sera fixee avec le moteur. Ne pas promettre
un resultat bit-a-bit si la suite multi-navigateurs ne le demontre pas.

## Garde-fous envisages

Le scaffolding doit fournir une commande globale unique, par exemple `check`, qui
orchestre sans les masquer :

- TypeScript strict sans emission ;
- ESLint avec informations de type ;
- verification Prettier ;
- tests unitaires et contractuels ;
- validation des schemas et niveaux embarques ;
- detection de code ou d'exports inutilises ;
- build de production ;
- sous-ensemble end-to-end critique selon le cout d'execution.

Les bibliotheques exactes seront confirmees au scaffolding. Les candidats initiaux
sont Vitest pour les tests TypeScript et Playwright pour les navigateurs. Un outil
ne doit etre ajoute que s'il detecte une classe d'erreur differente et produit un
signal exploitable.

La proposition concrete de bootstrap et l'interface des scripts sont decrites dans
`docs/decisions/0003-project-bootstrap.md`. Elles restent proposees jusqu'a
acceptation de cette decision.

La CI execute la meme commande que le developpement local. Aucun warning de lint ou
de TypeScript n'est tolere sur la branche principale.

## Regles de schemas

- Zod definit les formes runtime ;
- les types TypeScript sont inferes autant que possible ;
- les schemas externes sont stricts et refusent les champs inconnus, sauf decision
  de compatibilite explicite ;
- les valeurs numeriques ont bornes et finitude verifiees ;
- les references inter-objets passent une validation semantique distincte ;
- le parseur retourne des erreurs structurees transformables en messages utilisateur.

## Propriete et fuzzing

Les codecs URL, migrations, commandes inversibles et parseurs sont de bons candidats
aux tests generatifs. Ils seront introduits quand les premiers contrats seront
stables, plutot que d'ajouter immediatement une dependance sans cas reel.

Invariants prioritaires :

- decoder un niveau encode restitue le meme document canonique ;
- une sequence de commandes suivie de tous ses undo restitue le document initial ;
- migrer deux fois ne modifie pas un document deja courant ;
- aucune entree finie et bornee ne produit de valeur `NaN` ou infinie ;
- une charge depassant les limites est refusee avant allocation excessive.

## Dependances et mises a jour

Les versions sont verrouillees par le lockfile. Une mise a jour du moteur physique,
de Zod, du renderer, du service worker ou du stockage est traitee comme sensible et
doit passer la suite complete pertinente.

Une abstraction ne justifie pas l'installation de plusieurs implementations en
production. Les moteurs candidats ne cohabiteront que pendant l'evaluation, puis le
moteur non retenu sera retire.

## Skills futurs

Les skills projet seront crees apres l'existence des schemas et scripts auxquels
ils se referent. Ils resteront courts et specialises : auteur d'objet, auteur de
niveau, regression physique et validation de contenu.

Ils imposeront l'usage des contrats reels du depot. Ils ne recopieront ni ce
document, ni des conseils generiques deja appliques par les outils.
