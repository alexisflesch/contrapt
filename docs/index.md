# Carte de lecture du dépôt

Ce fichier est le point d'entrée des agents. Il ne contient aucune règle : il dit
**quel document fait autorité sur quoi**, et **quoi lire pour quel type de tâche**.

Un agent ne lit jamais `docs/` en entier. Il lit `AGENTS.md`, puis exactement la
ligne de routage qui correspond à sa tâche.

L'état réellement livré et les dettes sont dans `etat.md`. Le découpage en
tranches est dans `backlog.md`. **Le travail restant, tâche par tâche et dans
l'ordre, est dans `feuille-de-route-luna.md`** : c'est le point d'entrée d'un
agent qui reprend l'implémentation. `plan-remise-en-jeu.md` est l'historique de
la remise en jeu (phases A à F) ; on n'y lit que la section qu'une tâche cite.

## Autorité

Une information a un seul propriétaire. En cas de divergence, le propriétaire
gagne et l'autre document doit être corrigé, pas arbitré au cas par cas.

| Document                                                  | ~lignes | Fait autorité sur                                                |
| --------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `AGENTS.md`                                               | 103     | règles applicables à tout changement, invariants non négociables |
| `docs/backlog.md`                                         | 138     | découpage des tranches, dépendances, tranche courante            |
| `docs/cahier-des-charges.md`                              | 436     | vision produit, périmètre, hors-périmètre                        |
| `docs/etat.md`                                            | 133     | ce qui est livré, les dettes, la dernière gate                   |
| `docs/feuille-de-route-luna.md`                           | 757     | tâches restantes, leur ordre, règles de reprise, journal         |
| `docs/plan-remise-en-jeu.md`                              | 1208    | historique A–F ; spécifications détaillées de C1, C2, D3         |
| `docs/architecture.md`                                    | 223     | couches, dépendances, états distincts, modèle d'objet            |
| `docs/qualite.md`                                         | 149     | stratégie de test, niveaux de test, gates                        |
| `docs/catalogue-initial.md`                               | 239     | contrats des onze familles d'objets                              |
| `docs/tinkerbolt_control_wires_v1.md`                       | 125     | spécification fonctionnelle des fils de commande                 |
| `docs/mobile-editor-interactions.md`                      | 504     | gestes, états d'interface, scénarios d'acceptation tactiles      |
| `docs/levels/initial-progression.md`                      | 439     | campagne : 14 niveaux, géométries mesurées                       |
| `docs/levels/conception-niveaux.md`                       | 156     | concevoir un niveau : règles du jeu, objets, physique, méthode   |
| `docs/decisions/0001-product-foundations.md`              | 33      | fondations produit (accepté)                                     |
| `docs/decisions/0002-physics-engine-selection.md`         | 126     | choix du moteur physique, Planck.js (accepté)                    |
| `docs/decisions/0003-project-bootstrap.md`                | 309     | outillage, scripts, gates, politique de dépendances (accepté)    |
| `docs/decisions/0004-level-document-v1.md`                | 103     | contrat `LevelDocument` v1 (accepté ; v2 : ADR 0007, code)       |
| `docs/decisions/0005-construction-attempt.md`             | 51      | provenance éphémère d'une tentative (accepté)                    |
| `docs/decisions/0006-board-renderer.md`                   | 101     | renderer du plateau et pipeline de sprites (accepté)             |
| `docs/decisions/0007-world-scale-and-camera.md`           | 269     | repère du monde, scène, caméra, échelle des sprites (accepté)    |
| `docs/decisions/0008-client-side-routing.md`              | 99      | routage côté client, schéma d'URL (accepté)                      |
| `docs/decisions/0009-control-wires.md`                    | 90      | fils de commande : modèle, rendu, câblage (accepté, amendé)      |
| `docs/decisions/0010-object-challenge-and-progression.md` | 92      | défi d'objets ✅/⭐/🏆, ouverture des niveaux (accepté)          |
| `docs/decisions/0011-local-storage-and-url-sharing.md`    | 98      | `localStorage`, codec de fichier, partage par URL (accepté)      |
| `docs/decisions/0012-pwa-service-worker.md`               | 47      | PWA, service worker, mises à jour (accepté)                      |
| `docs/decisions/0013-puzzle-workshop-solution.md`         | 95      | objets à placer, solution de référence, export vérifié (accepté) |

Sources de vérité exécutables, prioritaires sur toute prose :

| Sujet                  | Fichier                                                |
| ---------------------- | ------------------------------------------------------ |
| Schéma de niveau       | `src/domain/level-document.ts`                         |
| Registre des familles  | `src/domain/object-family-registry.ts`                 |
| Commandes de tentative | `src/application/construction/construction-attempt.ts` |
| Historique undo/redo   | `src/application/history/history.ts`                   |
| Frontières de couches  | `src/architecture/layer-boundaries.test.ts`            |
| Scripts et gates       | `package.json`                                         |
| Niveaux embarqués      | `src/content/levels/*.json`                            |
| Géométrie des familles | `src/domain/family-geometry.ts`                        |
| Export des sprites     | `art/build-sprites.py`                                 |

## Routage par tâche

Colonne « lire » = lecture obligatoire et suffisante. Ne pas élargir sans raison
écrite dans le rapport.

| Tâche                                          | Lire                                                                                                              | Écrire dans                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Format de niveau, schéma Zod, migration        | ADR 0004, ADR 0007 § Scène d'un niveau, ADR 0013, `architecture.md` § Enveloppe de niveau, `level-document.ts`              | `src/domain/`                                  |
| Commande, historique, undo/redo, tentative     | ADR 0005, `architecture.md` § Commandes et historique                                                             | `src/application/`                             |
| Nouvelle famille d'objet                       | `catalogue-initial.md`, `architecture.md` § Modèle d'objet, ADR 0004                                              | `src/domain/`, `src/simulation/`               |
| Port physique, boucle à pas fixe, déterminisme | ADR 0002, `qualite.md` § Déterminisme, `architecture.md` § Simulation                                             | `src/simulation/`, `test/conformance/`         |
| Conformité physique, arbitrage moteur          | ADR 0002, `catalogue-initial.md` § Tests contractuels                                                             | `test/conformance/`                            |
| Rendu du plateau, cadrage, projection          | ADR 0007, ADR 0006, `architecture.md` § Rendu et interface                                                        | `src/presentation/`                            |
| Assets, sprites, export depuis `art/`          | ADR 0007 § Amendement du 25 septembre 2026, `art/build-sprites.py`                                                | `art/`, `public/assets/`                       |
| Fils de commande, levier, convoyeur            | ADR 0009, `tinkerbolt_control_wires_v1.md`, `catalogue-initial.md` § Levier, § Convoyeur                            | `src/domain/`, `src/presentation/`             |
| Interface tactile, tiroir, gestes              | `mobile-editor-interactions.md`, `cahier-des-charges.md` § Interaction mobile                                     | `src/ui/`, `src/app/`                          |
| Routage, navigation, schéma d'URL              | ADR 0008                                                                                                          | `src/app/`                                     |
| Conception d'un nouveau niveau                 | `levels/conception-niveaux.md` (se suffit à lui-même)                                                             | `src/content/levels/`                          |
| Contenu d'un niveau                            | `levels/initial-progression.md` (section du niveau), `feuille-de-route-luna.md` § 3, ADR 0007 § Scène d'un niveau | `src/content/levels/`                          |
| Parcours end-to-end                            | `mobile-editor-interactions.md` § Scénarios d'acceptation, `qualite.md` § Tests end-to-end                        | `e2e/`                                         |
| Stockage, import/export, codec URL             | ADR 0011, `architecture.md` § Stockage et partage                                                                 | `src/infrastructure/`, `src/application/`      |
| Défi d'objets, progression de campagne         | ADR 0010, ADR 0011 § `localStorage`                                                                               | `src/application/progression/`, `src/content/` |
| PWA, service worker                            | ADR 0012, ADR 0003                                                                                                | racine, `src/app/`                             |
| Outillage, script, configuration, CI           | ADR 0003, `package.json`                                                                                          | racine                                         |
| Décision structurante, nouvelle ADR            | `cahier-des-charges.md` § Décisions ouvertes, ADR concernée                                                       | `docs/decisions/`                              |

## Règles de lecture

- `cahier-des-charges.md` n'est jamais la source d'un contrat technique : il
  renvoie vers l'ADR ou le code qui fait autorité. Le lire pour comprendre
  l'intention, pas pour implémenter.
- Une ADR au statut `proposé` décrit une méthode, pas une décision. Ne pas
  l'appliquer comme un fait acquis.
- Un exemple narratif qui contredit un schéma exécutable est un bug de
  documentation : le signaler, ne pas coder d'après lui.
