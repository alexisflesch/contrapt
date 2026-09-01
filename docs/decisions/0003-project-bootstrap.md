# ADR 0003 - Bootstrap du projet

Statut : accepte

Date : 2026-09-01

## Contexte

Le depot doit devenir une PWA statique mobile-first, avec un editeur et une
simulation partageant le meme plateau. Le bootstrap doit fournir une boucle TDD
rapide et des garde-fous executables sans figer le moteur physique, le renderer du
plateau, la direction graphique ou des abstractions encore sans second cas reel.

Une configuration stricte n'est utile que si elle reste comprehensible et si la
meme verification peut etre executee localement et en CI. Un empilement de packages
ou d'outils redondants augmenterait au contraire les faux positifs et les chemins
que les contributeurs et agents doivent connaitre.

## Decision proposee

### Runtime et gestionnaire de packages

- utiliser Node.js 24 LTS pour le developpement et la CI ;
- accepter uniquement la majeure 24 dans `engines.node` et consigner la version de
  reference dans un fichier reconnu par les gestionnaires de versions ;
- utiliser pnpm 11, epingle a une version exacte dans `packageManager` ;
- committer un unique `pnpm-lock.yaml` et installer en CI avec
  `pnpm install --frozen-lockfile` ;
- declarer le projet `private` et ESM avec `"type": "module"`.

Node.js 26 est encore en phase Current a la date de cette decision. pnpm 12 vient
de remplacer une grande partie de son implementation par un binaire natif et son
tag npm par defaut reste pnpm 11. Les adopter immediatement ne donne aucun benefice
produit. Leur evaluation se fera lors d'une mise a jour outillage dediee, pas au
milieu d'une fonctionnalite.

La version exacte de Node utilisee par la CI et la version exacte de pnpm sont
mises a jour explicitement. Un intervalle non borne, `latest`, un lockfile regenere
sans revue ou plusieurs gestionnaires de packages sont interdits.

### Build et application DOM

- utiliser Vite 8 pour le serveur de developpement et le build statique ;
- utiliser React avec le plugin React officiel de Vite pour la coque DOM : ecrans,
  tiroirs, formulaires, dialogues, focus et accessibilite ;
- ne pas utiliser React comme modele de domaine, horloge de simulation ou renderer
  du plateau ;
- ne pas ajouter de gestionnaire d'etat, routeur ou bibliotheque de composants tant
  qu'un besoin concret ne le justifie ;
- ne pas ajouter PixiJS, Planck.js ou Rapier au bootstrap.

React est retenu plutot qu'une UI DOM maison : l'editeur comporte assez d'etat
d'interface, de formulaires et de contraintes d'accessibilite pour qu'une couche de
composants explicite soit utile. Sa maturite, ses outils de test et sa familiarite
reduisent aussi l'ambiguite pour les contributeurs. Le cout de bundle supplementaire
est acceptable face au renderer et au moteur futurs, mais devra etre mesure.

React ne peut etre importe que par la couche UI et le point de composition. Les cas
d'usage restent du TypeScript independant du framework afin qu'un changement de
framework ne remette pas en cause le domaine ou le format des niveaux.

Le mecanisme de service worker n'est pas active par un preset opaque pendant ce
bootstrap. Le manifeste web peut etre pose tot, mais la strategie de precache,
d'activation d'une nouvelle version et de restauration des brouillons doit etre
decidee et testee avant l'enregistrement du service worker. `vite-plugin-pwa` et
Workbox restent des candidats, pas des dependances acceptees par cette ADR.

### Un seul package, plusieurs frontieres

Le depot commence avec un seul package applicatif. Un workspace ou un monorepo ne
sera cree que lorsqu'un deuxieme livrable deployable ou une bibliotheque reutilisee
independamment l'exigera. Les dossiers initiaux sont :

```text
/
|-- content/
|   `-- levels/             # niveaux JSON embarques
|-- e2e/                    # parcours Playwright
|-- public/                 # fichiers copies tels quels, sans logique
|-- scripts/                # validation/build du contenu et maintenance
|-- src/
|   |-- app/                # composition, cycle de vie navigateur
|   |-- application/        # cas d'usage, commandes, historique et ports
|   |-- domain/             # schemas Zod et regles pures
|   |-- infrastructure/     # IndexedDB, fichiers, URL et autres adaptateurs
|   |-- presentation/       # projection et futur renderer du plateau
|   |-- simulation/         # boucle fixe et port physique abstrait
|   `-- ui/                 # composants React et styles DOM
|-- test/
|   |-- fixtures/           # donnees partagees, petites et intentionnelles
|   `-- conformance/        # contrats transversaux et physique future
`-- docs/
```

Les tests unitaires sont colocalises avec le code sous la forme
`*.test.ts`/`*.test.tsx`. `test/` ne contient que les fixtures et suites reellement
transversales. Les artefacts de build, rapports et captures de test sont ignores.

Les imports entre couches passent par leurs API publiques explicites. Les imports
profonds entre deux couches, les cycles et les dependances interdites par
`docs/architecture.md` echouent au lint. Les fichiers `index.ts` ne sont pas generes
automatiquement et ne doivent pas devenir des barils exportant tout un dossier.

Le placement exact des modules `ball`, `basket`, `beam` et `seesaw` reste ouvert
jusqu'a la definition de leur premier contrat executable. Il devra permettre la
colocalisation des elements d'une famille sans autoriser le domaine a importer
React, le renderer ou un moteur physique.

### TypeScript et validation runtime

TypeScript est execute avec `strict` et sans emission lors du typecheck. Le socle
active aussi au minimum :

- `noUncheckedIndexedAccess` ;
- `exactOptionalPropertyTypes` ;
- `noImplicitOverride` ;
- `noImplicitReturns` ;
- `noFallthroughCasesInSwitch` ;
- `useUnknownInCatchVariables` ;
- `verbatimModuleSyntax` ;
- `isolatedModules`.

Une configuration navigateur et une configuration outillage peuvent etendre une
base commune. Elles n'affaiblissent pas les options strictes. Vite transpile, mais
ne remplace jamais `tsc --noEmit` comme gate de types.

Zod est une dependance de production et la source de verite des donnees runtime.
Les types persistants sont inferes depuis les schemas lorsque possible. Toute
entree JSON, IndexedDB, fichier ou URL commence en `unknown`, passe par un codec
borne puis par Zod et la validation semantique. Les composants React et les
adaptateurs ne recreent pas de schema concurrent.

### Tests

Vitest est le runner des tests unitaires, contractuels et d'integration headless.
Son environnement par defaut est `node` afin que le domaine ne depende pas
accidentellement du navigateur. Les rares tests de composants DOM utilisent un
environnement DOM declare fichier par fichier et Testing Library ; les gestes,
le layout, le canvas et les APIs navigateur restent verifies par Playwright.

Playwright couvre les parcours end-to-end sur le build de production servi
localement, pas uniquement sur le serveur HMR. Il fournit des projets separes :

- Chromium tactile avec un petit viewport, obligatoire sur chaque changement ;
- Chromium desktop pour verifier l'adaptation de l'interface ;
- Firefox et WebKit pour la suite complete avant livraison et regulierement sur la
  branche principale.

La matrice finale des appareils reste a decider dans le cahier des charges. Les
profils Playwright ne constituent pas a eux seuls une validation sur de vrais
telephones. En CI, `forbidOnly` est actif, les retries sont limites et chaque
echec final publie trace, capture et rapport. Un test instable n'est ni ignore ni
relance indefiniment : il est corrige ou le changement reste bloque.

Le bootstrap ne fixe pas un pourcentage global de couverture. Une cible arbitraire
encourage les assertions sans valeur. La couverture est produite pour rendre les
trous visibles ; des seuils par couche seront ajoutes des qu'il existe assez de
comportement pour les calibrer, sans remplacer les contrats obligatoires de
`docs/qualite.md`.

### Lint, formatage et code mort

ESLint utilise la flat config et le service de projet de `typescript-eslint` pour
un lint type-aware. Les presets stricts type-aware sont le point de depart. Sont
egalement des erreurs :

- `any` explicite et operations non sures ;
- promesses oubliees ou employees comme booleens ;
- `switch` non exhaustifs sur les unions fermees ;
- imports de types incoherents ;
- violations de frontieres et cycles de couches ;
- regles React Hooks ;
- problemes d'accessibilite JSX detectables statiquement.

Le lint s'execute avec `--max-warnings 0`. Une desactivation locale exige un
commentaire precis et respecte les exceptions de `AGENTS.md`; une desactivation de
fichier ou de configuration pour faire passer un changement est refusee.

Prettier est l'unique responsable du formatage. ESLint ne duplique pas ses regles
cosmetiques. La CI lance `prettier --check`; la commande d'ecriture reste une action
locale explicite.

Knip detecte fichiers, exports et dependances inutilises. Ses entrypoints sont
configures explicitement pour Vite, les scripts, Vitest et Playwright. Une
exception Knip doit nommer le consommateur dynamique qui la rend necessaire. Knip
complete TypeScript et ESLint, il ne les remplace pas.

### Scripts `package.json`

Les noms suivants forment l'interface stable du depot :

| Script | Responsabilite |
| --- | --- |
| `dev` | lancer Vite en developpement |
| `build` | produire uniquement le build statique de production |
| `preview` | servir localement le build produit |
| `typecheck` | verifier toutes les configurations TypeScript sans emission |
| `lint` | lancer ESLint type-aware avec zero warning |
| `lint:fix` | appliquer uniquement les corrections ESLint sures |
| `format` | appliquer Prettier |
| `format:check` | verifier Prettier sans ecriture |
| `deadcode` | lancer Knip |
| `test` | lancer Vitest en watch pour la boucle TDD |
| `test:run` | lancer Vitest une fois |
| `test:coverage` | produire le rapport de couverture Vitest |
| `content:check` | valider schemas, references et manifeste des niveaux |
| `test:e2e` | lancer toute la matrice Playwright configuree |
| `test:e2e:critical` | lancer le sous-ensemble tactile critique |
| `check` | lancer la gate locale et CI complete |

`check` execute, dans un ordre stable : typecheck, lint, format check, code mort,
tests Vitest, validation du contenu, build, puis E2E critique sur ce build. Il ne
masque pas les sorties des sous-commandes et s'arrete au premier echec. Un script
vide ou un `echo` de remplacement n'est pas acceptable : un nom n'est ajoute que
lorsque sa verification existe. Ainsi, avant l'existence du premier schema et
niveau, `content:check` et son appel depuis `check` sont ajoutes dans le meme
changement comportemental.

Les suites plus lentes peuvent etre lancees en plus de `check`, mais aucune CI ne
reimplemente une variante plus faible de ces commandes.

### Gates CI

Chaque pull request et chaque push sur la branche principale doivent :

1. installer Node et la version pnpm epinglee ;
2. executer `pnpm install --frozen-lockfile` ;
3. installer le navigateur Playwright requis ;
4. executer `pnpm check` ;
5. conserver les rapports utiles en cas d'echec.

La suite Playwright multi-navigateurs s'execute sur la branche principale, avant
une livraison et de facon planifiee. La validation sur telephones physiques devient
une gate de jalon des que la matrice d'appareils est fixee.

Une CI ne lance pas de correction automatique, ne regenere pas le lockfile et ne
tolere aucun warning. Les controles dependant du reseau, comme les advisories de
securite, sont planifies et visibles mais ne sont pas integres a `check`, afin que
la gate reste reproductible hors ligne.

### Politique de dependances

- toute dependance directe est epinglee exactement et le lockfile est revu ;
- les dependances runtime et de developpement sont distinguees ;
- aucun import direct d'une dependance transitive n'est autorise ;
- aucune dependance provenant d'une branche Git, d'une URL ou d'un tag flottant
  n'est acceptee en production ;
- les scripts d'installation des dependances sont bloques par defaut et chaque
  exception est explicitement approuvee ;
- une dependance structurante exige une ADR ou une mise a jour d'ADR ;
- une dependance plus petite exige au minimum une justification dans le changement,
  une licence compatible et un signal de maintenance acceptable ;
- les mises a jour sont groupees par sujet, jamais melangees a une fonctionnalite ;
- Zod, React, Vite, le futur renderer, le futur moteur physique, IndexedDB et le
  service worker sont traites comme sensibles et passent leurs suites completes.

Un audit automatise de vulnerabilites est utile comme signal, mais sa sortie n'est
pas assimilee aveuglement a une faille exploitable. Toute alerte affectant du code
livre est analysee, documentee et corrigee ou acceptee explicitement.

## Separation du moteur physique

Le bootstrap cree seulement la frontiere conceptuelle suivante :

```text
application/domain -> simulation a pas fixe -> port physique minimal
                                              ^
                                              |
                                      adaptateur choisi plus tard
```

Le port physique est defini a partir des besoins des scenes de conformite, pas en
copiant l'API de Planck ou Rapier. Aucun type, handle, vecteur ou callback propre a
un candidat ne traverse ce port.

Pendant l'ADR 0002, les adaptateurs candidats et leurs dependances vivent dans un
espace de conformite hors du graphe d'import de l'application de production. Les
gates verifient que l'entree Vite ne peut pas les importer par accident. Apres la
decision, un seul adaptateur rejoint le graphe de production et l'autre candidat
est retire. Il n'y aura pas de selection dynamique de moteur ni de facade visant a
supporter toutes leurs fonctions.

Cette separation permet de commencer schemas, commandes, historique, UI tactile et
projection visuelle avant le choix physique, sans inventer une fausse simulation.

## Compromis

- Un seul package donne moins d'isolation qu'un monorepo, mais reduit fortement le
  cout de configuration. Les frontieres sont compensees par TypeScript, ESLint et
  des imports publics verifies.
- React alourdit la coque par rapport a Preact ou au DOM nu, mais apporte un contrat
  de composants et un ecosysteme de test plus previsibles. Il reste confine a l'UI.
- Le lint type-aware et Knip ralentissent `check`; ce cout est accepte pour obtenir
  des erreurs actionnables avant le navigateur.
- Faire tourner un E2E tactile dans `check` impose l'installation d'un navigateur,
  mais garantit que la promesse mobile-first n'est pas reservee a la CI distante.
- Différer le service worker retarde momentanement l'installabilite hors ligne, mais
  evite d'inscrire trop tot une politique de mise a jour susceptible de perdre un
  brouillon.
- L'epingle exacte rend les mises a jour plus explicites et moins automatiques ;
  c'est intentionnel pour les premiers schemas persistants et la simulation.

## Ce qui reste non decide

- PixiJS ou un autre renderer du plateau ;
- Planck.js ou Rapier 2D, conformement a l'ADR 0002 ;
- bibliotheque et strategie exactes de service worker/PWA ;
- wrapper IndexedDB ;
- routeur, gestionnaire d'etat ou bibliotheque de composants, si un besoin apparait ;
- CSS Modules, CSS natif structure ou autre convention de styles ;
- emplacement interne definitif des modules d'objets ;
- navigateurs, telephones et budgets chiffres de bundle/performance ;
- seuils de couverture par couche ;
- fournisseur CI et outil d'automatisation des mises a jour.

Ces points ne bloquent pas le bootstrap de la chaine TypeScript, React, Vite et des
gates de qualite. Chacun doit etre tranche au plus tard dans le changement qui en a
besoin.

## Consequences

- le premier changement de scaffolding peut etre purement structurel mais doit
  faire fonctionner les scripts applicables, sans faux tests ;
- tout comportement suivant commence par un test en echec pour la bonne raison ;
- la direction graphique peut avancer en parallele sous forme d'assets et de
  prototypes jetables sans devenir une dependance du domaine ;
- un passage futur en workspace reste possible sans modifier les contrats du jeu ;
- le choix physique peut reposer sur des mesures plutot que sur le cout deja investi
  dans un candidat.

## References officielles consultees

- [Calendrier des versions Node.js](https://nodejs.org/en/about/previous-releases)
- [Guide de demarrage Vite](https://vite.dev/guide/)
- [Annonce Vite 8](https://vite.dev/blog/announcing-vite8)
- [Installation et compatibilite pnpm](https://pnpm.io/installation)
- [Lint TypeScript avec informations de type](https://typescript-eslint.io/getting-started/typed-linting/)
- [Configuration Vitest](https://vitest.dev/config/)
- [Playwright en CI](https://playwright.dev/docs/ci)
- [Detection de code inutilise avec Knip](https://knip.dev/overview/getting-started)
