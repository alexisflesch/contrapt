# Carte de lecture du dépôt

Ce fichier est le point d'entrée des agents. Il ne contient aucune règle : il dit
**quel document fait autorité sur quoi**, et **quoi lire pour quel type de tâche**.

Un agent ne lit jamais `docs/` en entier. Il lit `AGENTS.md`, puis exactement la
ligne de routage qui correspond à sa tâche.

L'état réellement livré et les dettes sont dans `etat.md`. Le découpage en
tranches délégables est dans `backlog.md`.

## Autorité

Une information a un seul propriétaire. En cas de divergence, le propriétaire
gagne et l'autre document doit être corrigé, pas arbitré au cas par cas.

| Document | ~lignes | Fait autorité sur |
| --- | --- | --- |
| `AGENTS.md` | 91 | règles applicables à tout changement, invariants non négociables |
| `docs/backlog.md` | 125 | découpage des tranches, dépendances, tranche courante |
| `docs/cahier-des-charges.md` | 404 | vision produit, périmètre, hors-périmètre |
| `docs/etat.md` | 79 | ce qui est livré, les dettes, la dernière gate |
| `docs/architecture.md` | 213 | couches, dépendances, états distincts, modèle d'objet |
| `docs/qualite.md` | 149 | stratégie de test, niveaux de test, gates |
| `docs/catalogue-initial.md` | 173 | contrats des quatre familles d'objets |
| `docs/mobile-editor-interactions.md` | 491 | gestes, états d'interface, scénarios d'acceptation tactiles |
| `docs/levels/initial-progression.md` | 421 | spécification des huit premiers niveaux |
| `docs/decisions/0001-product-foundations.md` | 33 | fondations produit (accepté) |
| `docs/decisions/0002-physics-engine-selection.md` | 123 | choix du moteur physique, Planck.js (accepté) |
| `docs/decisions/0003-project-bootstrap.md` | 308 | outillage, scripts, gates, politique de dépendances (accepté) |
| `docs/decisions/0004-level-document-v1.md` | 103 | contrat persistant `LevelDocument v1` (accepté) |
| `docs/decisions/0005-construction-attempt.md` | 51 | provenance éphémère d'une tentative (accepté) |
| `docs/decisions/0006-board-renderer.md` | 101 | renderer du plateau et pipeline de sprites (accepté) |

Sources de vérité exécutables, prioritaires sur toute prose :

| Sujet | Fichier |
| --- | --- |
| Schéma de niveau | `src/domain/level-document.ts` |
| Registre des familles | `src/domain/object-family-registry.ts` |
| Commandes de tentative | `src/application/construction/construction-attempt.ts` |
| Historique undo/redo | `src/application/history/history.ts` |
| Frontières de couches | `src/architecture/layer-boundaries.test.ts` |
| Scripts et gates | `package.json` |
| Niveaux embarqués | `src/content/levels/*.json` |

## Routage par tâche

Colonne « lire » = lecture obligatoire et suffisante. Ne pas élargir sans raison
écrite dans le rapport.

| Tâche | Lire | Écrire dans |
| --- | --- | --- |
| Format de niveau, schéma Zod, migration | ADR 0004, `architecture.md` § Enveloppe de niveau, `level-document.ts` | `src/domain/` |
| Commande, historique, undo/redo, tentative | ADR 0005, `architecture.md` § Commandes et historique | `src/application/` |
| Nouvelle famille d'objet | `catalogue-initial.md`, `architecture.md` § Modèle d'objet, ADR 0004 | `src/domain/`, `src/simulation/` |
| Port physique, boucle à pas fixe, déterminisme | ADR 0002, `qualite.md` § Déterminisme, `architecture.md` § Simulation | `src/simulation/`, `test/conformance/` |
| Conformité physique, arbitrage moteur | ADR 0002, `catalogue-initial.md` § Tests contractuels | `test/conformance/` |
| Rendu du plateau, projection | `architecture.md` § Rendu et interface | `src/presentation/` |
| Interface tactile, tiroir, gestes | `mobile-editor-interactions.md`, `cahier-des-charges.md` § Interaction mobile | `src/ui/`, `src/app/` |
| Contenu d'un niveau | `levels/initial-progression.md` (section du niveau), `catalogue-initial.md` | `src/content/levels/` |
| Parcours end-to-end | `mobile-editor-interactions.md` § Scénarios d'acceptation, `qualite.md` § Tests end-to-end | `e2e/` |
| Stockage, import/export, codec URL | `architecture.md` § Stockage et partage, `cahier-des-charges.md` § Persistance | `src/infrastructure/` |
| Outillage, script, configuration, CI | ADR 0003, `package.json` | racine |
| Décision structurante, nouvelle ADR | `cahier-des-charges.md` § Décisions ouvertes, ADR concernée | `docs/decisions/` |

## Règles de lecture

- `cahier-des-charges.md` n'est jamais la source d'un contrat technique : il
  renvoie vers l'ADR ou le code qui fait autorité. Le lire pour comprendre
  l'intention, pas pour implémenter.
- Une ADR au statut `proposé` décrit une méthode, pas une décision. Ne pas
  l'appliquer comme un fait acquis.
- Un exemple narratif qui contredit un schéma exécutable est un bug de
  documentation : le signaler, ne pas coder d'après lui.
