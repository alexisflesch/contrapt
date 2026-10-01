# TinkerBolt

TinkerBolt est un jeu de puzzles mécaniques en 2D : place des objets, règle leurs
mécanismes, lance la simulation et guide la balle jusque dans le panier.

## Licence

Le code de TinkerBolt est distribué sous la GNU Affero General Public License,
version 3 ou ultérieure (`AGPL-3.0-or-later`). Le texte complet est dans
[`LICENSE`](LICENSE). Le [dépôt source](https://github.com/alexisflesch/tinkerbolt)
contient le code de l’application ; les dépendances et ressources tierces restent
soumises à leurs propres licences.

Le projet est encore en développement. La campagne contient actuellement douze
niveaux jouables ; le mode auteur permet aussi de tester, modifier, sauvegarder
et partager des niveaux localement.

## Développement

Pré-requis : Node.js 24 et pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Pour vérifier le projet :

```bash
pnpm check:fast  # typecheck, lint et tests unitaires
pnpm check       # gate complète, build et tests E2E mobiles
```

Le build de production se lance avec `pnpm build`, puis peut être servi avec
`pnpm preview`.

## Organisation

- `src/domain/` contient le modèle de niveau et les règles métier ;
- `src/application/` contient les commandes, l’historique et les cas d’usage ;
- `src/simulation/` contient la simulation physique déterministe ;
- `src/presentation/` contient la projection et le rendu du plateau ;
- `src/ui/` et `src/app/` composent l’interface ;
- `src/content/levels/` contient les niveaux embarqués ;
- `docs/index.md` indique la source de vérité à consulter pour chaque sujet.

Les décisions d’architecture, l’état livré et les tâches restantes sont
documentés dans [`docs/`](docs/), notamment [`docs/etat.md`](docs/etat.md) et
[`docs/feuille-de-route.md`](docs/feuille-de-route.md).

## Déploiement

Le workflow [Déploiement GitHub Pages](.github/workflows/deploy-pages.yml)
publie automatiquement le build lors d’un push sur `main`. Le chemin de base
est calculé à partir du nom du dépôt, ce qui permet aussi de lancer TinkerBolt
localement à la racine.
