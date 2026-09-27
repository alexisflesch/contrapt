# ADR 0014 - Bibliothèque d’icônes de l’interface

Statut : accepté

Date : 2026-09-27

## Contexte

L’interface emploie encore des caractères Unicode comme pictogrammes pour les
actions et les paliers. Leur rendu varie selon la police et la plateforme, ce
qui rend les boutons moins cohérents sur les téléphones et complique leur
évolution.

## Décision

Utiliser `lucide-react` comme bibliothèque unique d’icônes pour les pictogrammes
de l’interface React. Les icônes sont importées explicitement depuis le package,
rendues décoratives quand le bouton porte déjà son nom accessible, et ne sont
jamais la seule information transmise aux technologies d’assistance. Les
libellés visibles et les noms accessibles des actions restent en français.

Les icônes Lucide sont utilisées uniquement dans la couche UI et la composition
de l’application. Le domaine, la simulation, le format des niveaux et le
renderer Canvas n’en dépendent pas. La dépendance runtime est épinglée
exactement dans `package.json` et `pnpm-lock.yaml`, conformément à l’ADR 0003.

## Conséquences

- les actions ont une forme stable, indépendante des glyphes disponibles dans
  la police du système ;
- le bundle reçoit une dépendance runtime supplémentaire, limitée aux icônes
  importées ;
- les tests vérifient les noms accessibles et la présence des icônes sans
  dépendre du rendu d’un caractère Unicode ;
- les paliers de campagne conservent leur nom textuel et gagnent des icônes
  décoratives cohérentes.
