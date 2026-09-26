# ADR 0002 - Sélection du moteur physique

Statut : accepté

Date : 1er septembre 2026

## Contexte

Le jeu requiert des corps rigides, des collisions, des capteurs, une rotation et
des forces simples. Cordes, poulies ou engrenages pourront arriver plus tard. La
stabilité mobile, la reproductibilité et la capacité de test comptent davantage
qu'une longue liste de fonctions jamais utilisées.

Planck.js et Rapier 2D étaient les deux candidats. La version précédente de cette
décision prévoyait de trancher uniquement après avoir mesuré huit scènes de
conformité sur les deux moteurs.

## Décision

**Planck.js est retenu. Rapier 2D est écarté.**

La décision est prise sur des critères d'architecture et de budget, avant mesure.
Ce n'est pas un contournement du protocole de conformité : ce protocole est
conservé, mais son rôle change. Deux de ses scènes deviennent une porte de
validation qui peut rouvrir la décision ; les six autres deviennent la suite de
régression permanente du moteur retenu, ce qu'elles auraient été de toute façon.

Ce choix est peu coûteux à inverser tant que le port physique est respecté, et
c'est ce qui autorise à le prendre tôt.

## Raisons

### Le budget mobile est le facteur contraignant, pas la performance

Planck est du JavaScript pur, de l'ordre de quelques dizaines de kilooctets
compressés. Rapier 2D est du WebAssembly dont le build pèse plusieurs centaines de
kilooctets. Sur une PWA mobile-first qui doit aussi précacher une coque, un
renderer, la campagne embarquée et désormais des sprites PNG, cet écart est le plus
structurant des deux.

Rapier est nettement plus rapide. Mais les scènes du catalogue initial comptent
entre dix et trente corps, et le critère de sortie du catalogue interdit d'en
ajouter avant que ces quatre familles suffisent. La performance n'est pas le
facteur limitant du projet ; choisir sur ce critère reviendrait à payer un budget
de chargement pour une marge que le game design n'utilisera pas.

### La testabilité headless prime

La suite de conformité et la majorité des tests tournent en Vitest avec
l'environnement `node`, précisément pour que le domaine et la simulation ne
dépendent pas du navigateur. Planck est synchrone et s'y charge sans cérémonie.

Rapier impose une instanciation WebAssembly asynchrone. Cette asynchronie remonte
dans le port physique, les fixtures, la composition de l'application et
l'enregistrement du service worker, pour un bénéfice nul à cette taille de scène.

### Ne pas choisir une impasse technique

Le cahier des charges nomme poulies et engrenages parmi les extensions plausibles.
Box2D, dont Planck est le portage, fournit nativement des joints `pulley` et
`gear`. Rapier 2D n'expose pas d'équivalent direct et demanderait de les
reconstruire.

C'est exactement le risque que la scène 8 du protocole cherchait à écarter.
L'inventaire exact des joints de chaque moteur reste à confirmer au moment où
cette scène sera écrite ; si l'écart n'existe pas, cette raison tombe et les deux
premières suffisent.

## Sur le déterminisme

Rapier possède un avantage théorique réel. WebAssembly spécifie complètement les
opérations flottantes, là où `Math.sin` et `Math.cos` en JavaScript sont laissés à
l'implémentation du moteur. Un même build Rapier produit donc les mêmes bits dans
tous les navigateurs ; Planck n'offre pas cette garantie sur ses fonctions
trigonométriques.

Cet avantage ne se paie pas ici, parce que la stratégie de qualité du dépôt refuse
explicitement de promettre un résultat bit-à-bit et assied ses assertions sur des
invariants et des tolérances. Les régressions de simulation tournent en Node, donc
sur un moteur JavaScript fixé et reproductible. Les navigateurs ne vérifient que
des propriétés à large marge, du type « la balle finit dans le panier ».

La promesse de reproductibilité du projet est donc : identique en Node à build
fixé ; stable par tolérances entre navigateurs ; aucune promesse bit-à-bit.

## Ce qui invaliderait la décision

Deux mesures, et deux seulement, sont prioritaires. Elles doivent être conduites
sur les deux moteurs pour rester comparables.

1. **Scène 6 — création, reset et destruction répétés.** Une croissance mémoire
   anormale chez Planck qui serait absente chez Rapier rouvre la décision. C'est le
   risque réel : le jeu détruit et recrée un monde à chaque reset, et la bascule
   crée des corps et un joint internes à chaque instance.
2. **Scène 7 — scène dense au budget maximal provisoire.** Une incapacité à tenir
   soixante images par seconde sur un téléphone de référence bas de gamme rouvre la
   décision.

Les scènes 1 à 5 et 8 ne sont plus des mesures comparatives : elles sont écrites
une fois, contre Planck, et deviennent la suite de régression permanente. Ce
recentrage divise par trois le coût de la première tranche.

## Résultat de la porte — 26 septembre 2026 : franchie, Planck confirmé

Scène 7 mesurée sur téléphone réel par l'auteur, avec la page `/bench` déployée
sur GitHub Pages (scène dense de 31 corps dynamiques et 6 articulations,
`src/app/bench/dense-bench-document.ts`) :

| Appareil                              | Médiane / pas | 95e centile / pas | Pire cas | Plateau |
| ------------------------------------- | ------------- | ----------------- | -------- | ------- |
| Pixel 7                               | 0,6 ms        | 1,5 ms            | 20,6 ms  | fluide  |
| Xiaomi d'environ 7 ans (bas de gamme) | 2,3 ms        | 5,2 ms            | 65,9 ms  | fluide  |

Le 95e centile reste sous 8 ms par pas même sur l'appareil bas de gamme, et le
jeu de la scène sur le plateau est fluide sur les deux. Les pires cas isolés
(jusqu'à 66 ms) sont compatibles avec des pauses du ramasse-miettes ou de la
compilation à chaud ; ils ne se traduisent pas par une saccade visible, et le
rattrapage de la boucle est plafonné à 5 pas par image. La scène 6 (création,
reset et destruction répétés) a été mesurée en Node sur les deux moteurs sans
croissance mémoire anormale chez Planck.

La décision n'est donc pas rouverte. Conformément aux conséquences ci-dessous,
Rapier est retiré du dépôt ; les scènes 6 et 7 restent dans la suite de
conformité, contre Planck seul.

Observation à suivre : sur le Xiaomi, la page `/bench/play` a dû être rechargée
une fois pour fonctionner. Cause non établie (chargement lent des sprites,
premier accès à froid ?) ; consignée comme dette dans `etat.md`.

## Conséquences

- Un seul moteur entre dans le graphe d'import de production : Planck. Rapier
  n'entre dans aucun import de production. Son installation est autorisée
  uniquement comme dépendance de développement temporaire, strictement réservée
  aux mesures comparatives des scènes 6 et 7 ; il doit être retiré dès que leurs
  résultats sont consignés dans cette ADR.
- Le port physique reste défini à partir des besoins des scènes de conformité et
  non de l'API de Planck. Aucun type, handle, vecteur ou callback propre à Planck
  ne traverse ce port. C'est cette contrainte qui rend la décision réversible, et
  elle n'est pas négociable au motif que le moteur est désormais connu.
- La suite de conformité reste dans le dépôt après la décision et sert de
  régression lors des mises à jour de dépendances.
- Toute limite du moteur retenu qui affecte le game design est consignée
  explicitement, dans cette ADR ou dans celle qui la remplacera.
- Planck devient une dépendance sensible au sens de la politique de dépendances :
  sa mise à jour passe la suite complète.
- Si l'une des deux mesures prioritaires échoue, la décision se rouvre. Le port
  protège alors l'essentiel du travail déjà fait.

## Références

- [Planck.js](https://piqnt.com/planck.js)
- [Rapier](https://rapier.rs)
