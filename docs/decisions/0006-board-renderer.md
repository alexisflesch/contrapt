# ADR 0006 - Renderer du plateau et pipeline de sprites

Statut : accepté

Date : 1er septembre 2026

## Contexte

Le plateau est la surface partagée par le jeu et l'éditeur. Il doit afficher une
scène de dix à trente objets, en 2D plate, chaude et légèrement cartoon, sans faux
relief ni perspective, sur le navigateur d'un téléphone récent.

PixiJS était le candidat initial. La direction graphique s'appuiera sur des sprites
PNG produits en amont, et non sur des formes dessinées par le code.

## Décision

**Le plateau est rendu en Canvas 2D natif, derrière la projection du domaine.
PixiJS est écarté pour la version 1.**

Le renderer n'est pas une dépendance : c'est un module de `src/presentation/` qui
consomme une projection et écrit dans un `CanvasRenderingContext2D`.

## Raisons

### Le volume de la scène ne justifie pas un moteur de rendu

Le batching, les atlas et les shaders de PixiJS répondent à un problème de
plusieurs centaines à plusieurs milliers de sprites. Le catalogue initial en compte
quatre familles, et son critère de sortie interdit explicitement d'en ajouter tant
que ces quatre-là ne suffisent pas à une expérience complète. Un `drawImage` par
objet, trente fois par image, est accéléré matériellement et sans difficulté sur
tout téléphone en circulation.

### Le budget de chargement se dépense mieux ailleurs

PixiJS pèse plusieurs centaines de kilooctets compressés. Les sprites PNG entrent
désormais dans le précache du service worker, aux côtés de la coque, du moteur
physique et de la campagne embarquée. Le renderer est le poste le plus facile à
ramener à zéro sans rien perdre de visible pour le joueur.

### Un contexte WebGL se perd sur mobile

Un contexte WebGL peut être révoqué par le système quand l'onglet passe en
arrière-plan ou sous pression mémoire, et doit alors être recréé avec toutes ses
ressources. Canvas 2D n'a pas cette classe de panne.

Perdre le plateau au retour dans l'application, pendant une session d'édition,
serait une régression grave pour un éditeur dont l'usage mobile est une exigence de
premier rang. Écarter le risque coûte moins cher que le gérer.

### Le medium correspond à la direction visuelle

Une 2D plate, sans relief ni perspective, se compose de sprites blittés et de
quelques formes. C'est le domaine natif de Canvas 2D. Aucun besoin identifié ne
demande de shader, de filtre ou de mélange non trivial.

## Sprites et assets

Le rendu par sprites ne change pas la décision ; il en précise le pipeline.

- Un sprite est un asset de l'application, jamais une donnée de niveau. Son chemin
  appartient à la projection visuelle de la définition de famille. `LevelDocument`
  refuse déjà toute URL d'asset et n'est pas modifié.
- Le chargement est explicite : la première image n'est pas dessinée avant que les
  sprites nécessaires à la scène soient décodés. Utiliser `createImageBitmap` pour
  décoder hors du thread principal, et un état de chargement visible plutôt qu'un
  plateau qui se remplit par à-coups.
- Les sprites sont produits en 2× ou 3×. Le canvas est dimensionné en pixels
  physiques d'après `devicePixelRatio` puis transformé, jamais étiré par CSS.
- La conversion des unités du monde vers les pixels vit à un seul endroit de
  `src/presentation/`. Le domaine, les commandes et le test d'appartenance aux
  zones continuent d'ignorer l'écran.
- Le service worker précache les sprites de la campagne embarquée avec le reste de
  la coque.

## Limites acceptées

- Une teinte, un masque ou un effet par sprite se fait en `globalCompositeOperation`
  sur un canvas hors écran. C'est faisable, mais coûteux à multiplier. Un besoin
  récurrent de ce type est le signal qui rouvrirait la décision.
- Il n'y a pas de système de particules. S'il en faut un, il sera évalué séparément
  plutôt que traité comme une raison rétroactive d'avoir pris PixiJS.
- Le hit-testing n'est pas fourni par le renderer. Il s'appuie sur la géométrie du
  domaine en unités du monde, ce qui est de toute façon la règle.

## Conséquences

- Aucune dépendance de rendu n'entre au bundle de production.
- La projection du domaine reste le seul contrat du plateau. Adopter PixiJS plus
  tard serait un changement contenu à `src/presentation/`, sans effet sur le
  domaine, les commandes ni le format de niveau.
- Le jeu et l'éditeur partagent le même renderer ; seuls les overlays et outils
  diffèrent selon le mode et les permissions.
- La gestion de `devicePixelRatio`, du redimensionnement et du changement
  d'orientation est du code applicatif à écrire et à tester, non fourni par une
  bibliothèque.
- Le pipeline d'assets — dimensions de référence, convention de nommage, atlas
  éventuel, précache — devient un sujet de la tranche qui rend le niveau 1 jouable.
- Les budgets chiffrés de bundle et de mémoire restent à fixer ; cette décision les
  rend seulement plus faciles à tenir.

## Amendement du 2 octobre 2026 — abandon des ombres portées U3

L’auteur abandonne les ombres portées : elles ne correspondent pas à l’esprit
du jeu ni au design de l’application. Le plateau reste sans ombre ajoutée,
en jeu comme dans l’éditeur, pendant une simulation ou un placement.

L’implémentation expérimentale U3 est conservée, avec ses tests de renderer,
pour un éventuel réexamen. Elle est désactivée par défaut ; aucun appel de
l’application ne l’active et aucun réglage utilisateur ne la propose.
L’option interne `objectShadows` du renderer permet aux tests de continuer à
vérifier le code conservé. Une réactivation dans l’application exige une
nouvelle décision explicite de l’auteur.

Cet amendement remplace la demande C2 du plan de remise en jeu et la tâche U3
de la feuille de route ; U3 est abandonnée, elle n’attend plus de validation
visuelle.
