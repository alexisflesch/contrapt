# Panier en deux calques — brief pour la régénération de sprite

Ce document est un brief court pour un agent de génération d'assets (Codex ou
équivalent). Il ne décrit pas de code, seulement le besoin visuel et la
convention à respecter. Le câblage renderer correspondant est noté en bas, à
faire séparément.

## État actuel constaté (25 septembre 2026)

Le câblage renderer décrit plus bas comme « à faire séparément » **existe déjà** :
`board-renderer.ts` dessine `basket-back` → `ball` → `basket-front` dans cet
ordre (`drawOrderByAsset`). Le défaut n'est donc plus dans le code, il est dans
les deux fichiers PNG actuels, diagnostiqué en jouant :

- **Les deux calques sont inversés** par rapport à la convention ci-dessous :
  `basket-back@2x.png` contient actuellement le rebord avant, et
  `basket-front@2x.png` contient la paroi arrière intérieure — l'exact
  contraire de ce que demande ce brief.
- **Perspective 3/4**, pas la vue strictement de côté exigée plus bas :
  l'ouverture du panier occupe environ le tiers supérieur de l'image, alors que
  la balle au repos (donnée par la physique, `BASKET_FLOOR_OFFSET_Y` dans
  `simulation-session.ts`) se trouve à environ 86 % de la hauteur du panier.
  Résultat observé : la balle apparaît à moitié enterrée dans le tressage
  plutôt que nichée dans l'ouverture.

Toute régénération doit donc, en plus de respecter la convention ci-dessous,
vérifier que le point de coupe avant/arrière et la hauteur du rebord avant
restent cohérents avec la position de repos physique de la balle — sous peine
de reproduire le même défaut avec un art différent. Pas de changement de
`simulation-session.ts` prévu pour compenser ceci (décision de l'auteur :
corriger par l'art, pas par la physique).

## Résolu (25 septembre 2026)

L'auteur a fourni deux nouvelles images à la racine du dépôt,
`panier-plein.png` (panier plein, tressage intérieur opaque) et
`panier-transparent.png` (même panier, intérieur découpé/transparent) —
générées différemment de ce que ce brief anticipait : pas une coupe haut/bas,
mais un panier complet en deux variantes (plein / évidé), toutes deux au même
cadrage et à la même échelle l'une que l'autre (vérifié par bbox de seuil
d'alpha, alignées à 1 px près).

Intégration retenue :

- `basket-back@2x.png` ← `panier-plein.png` (recadré sur la silhouette, mis à
  l'échelle 192 × 141, ancrage haut du rebord / bas de la base identique à la
  convention existante) : sert de fond plein, visible quand rien n'occulte le
  panier.
- `basket-front@2x.png` ← `panier-transparent.png`, même recadrage, **puis
  post-traité en deux passes** :
  1. Une première passe a effacé toute la paroi basse (37 %–100 %) pour ne
     garder que l'anneau du rebord (0–20 %), rendant la balle entièrement
     visible mais flottant devant le panier, sans aucune occlusion — signalé
     par l'auteur en jouant comme lisant « la balle devant le panier », pas
     dedans.
  2. Correction : l'anneau du rebord (0–20 %) est conservé tel quel, la
     fenêtre reste ouverte de 20 % à 60 % (la balle y est visible sur toute
     sa moitié haute), puis de 60 % à 100 % le calque redevient opaque — non
     pas en restaurant l'art d'origine de `panier-transparent` (perdu, le
     fichier source a été supprimé après la première intégration), mais en
     reprenant directement les pixels de `basket-back@2x.png` à cet endroit
     (même cadrage, même échelle, alignement vérifié au pixel près, donc
     recollage invisible). Résultat : la moitié haute de la balle est
     nettement visible, la moitié basse est occultée par la paroi avant —
     l'effet d'emboîtement recherché à l'origine, sans reproduire le défaut
     initial (balle quasi entièrement enterrée, elle, sur 90 % de sa hauteur).

  Le panier vide (sans balle) n'est pas affecté par ces deux passes :
  `basket-back` reste plein partout, et la bande 60–100 % de `basket-front`
  lui est désormais identique pixel pour pixel.

Si une régénération future veut restaurer un vrai effet d'emboîtement sans ce
bricolage, il faudra un panier dont la zone visible/évidée descend nettement
plus bas dans l'art d'origine (jusqu'à ~85 % de la hauteur du cadre) — ce que
ni cette génération ni la précédente ne fournissaient nativement.

## Le problème

Le panier est actuellement un seul sprite plat et opaque (`basket@2x.png`,
192 × 141 px @2x, empreinte monde 1,5 × 1,1 unité). Le renderer dessine tout
objet balle après tout objet panier (voir `src/presentation/board-renderer.ts`,
règle B4), donc une balle à l'intérieur du panier est désormais visible — mais
seulement **posée par-dessus** le panier, jamais **nichée dedans**. Avec un
sprite unique, aucun ordre de dessin ne peut donner les deux à la fois : soit
le panier cache la balle, soit la balle flotte au-dessus du panier sans
qu'aucune paroi ne passe devant elle.

## Ce qui est demandé

Découper le panier en **deux fichiers** :

- `basket-back@2x.png` — le fond et les parois du panier vues de derrière : ce
  qui doit apparaître **derrière** la balle (le tressage du fond et le haut
  des parois, côté loin de la caméra).
- `basket-front@2x.png` — la lèvre avant / le rebord proche : ce qui doit
  apparaître **devant** la balle une fois qu'elle est posée au fond (le bord
  proche du panier, la partie qui masquerait normalement le bas d'un objet
  posé à l'intérieur).

Le panier vu de face n'a pas de vraie perspective 3D (direction artistique
plate, ADR 0006/0007) : la séparation avant/arrière n'est donc pas un rendu de
profondeur réaliste, plutôt une convention illustrative — typiquement, la
moitié basse du tressage (le fond + le bas des parois) comme calque avant, et
la moitié haute des parois comme calque arrière. Le point de coupe exact est
laissé à l'appréciation de l'agent qui génère les images ; l'essentiel est que
la balle, dessinée entre les deux calques, ait l'air posée à l'intérieur du
panier plutôt qu'à côté ou dessus.

## Convention à respecter (ADR 0007 § Convention de sprite)

- Fond entièrement transparent, aucun halo, aucune ombre incrustée.
- 2D plate, vue strictement de côté — pas de perspective 3/4.
- **Les deux calques partagent exactement le même cadre et la même échelle**
  que le sprite unique actuel : 192 × 141 px @2x, soit 128 px par unité monde,
  pour une empreinte monde de 1,5 × 1,1. Le point d'ancrage (centre du cadre)
  reste le même pour les deux fichiers — c'est ce qui permet au renderer de les
  superposer sans recalcul de position.
- Chaque calque a sa propre boîte alpha (transparence en dehors de sa propre
  silhouette), mais les deux boîtes doivent rester **cohérentes entre elles** :
  additionnées, elles doivent reconstituer visuellement le panier actuel vu en
  un seul morceau, sans chevauchement qui produirait un double-tressage ni
  interstice qui laisserait un vide entre les deux calques.
- Budget : ≤ 60 Ko par fichier après compression (donc ≤ 120 Ko pour les deux,
  contre 60 Ko pour l'actuel sprite unique — c'est le coût accepté du découpage).

## Ce que ce document ne couvre pas

Le câblage n'est pas dans ce brief — c'est un travail de code, pas d'asset :

- `object-family-registry.ts` / `sprite-loader.ts` doivent apprendre à charger
  deux images pour la famille `basket` au lieu d'une ;
- `board-renderer.ts` doit dessiner `basket-back` dans le passage "avant balle"
  (aux côtés de `beam`/`seesaw`, ordre B4) et `basket-front` dans un nouveau
  passage après toutes les balles ;
- un test de renderer doit verrouiller cet ordre en trois temps (arrière du
  panier, balle, avant du panier), sur le modèle des tests déjà écrits pour la
  règle B4 dans `board-renderer.test.ts`.

Tant que ce câblage n'existe pas, produire les deux fichiers ne change rien à
l'affichage : le renderer continuera à utiliser le seul `basket@2x.png` tant
qu'il n'a pas été modifié pour consommer les deux calques.

## Référence

Visuel de ton et de qualité (pas un contrat littéral, le catalogue réel a
4 familles) : `/home/aflesch/tinkerbolt/ee99b245-f82e-4090-992b-15305004f8a3.png`.
Convention complète des sprites : [ADR 0007](../decisions/0007-world-scale-and-camera.md)
§ Convention de sprite.
