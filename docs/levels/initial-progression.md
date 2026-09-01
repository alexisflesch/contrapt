# Progression des huit premiers niveaux

Statut : spécification pédagogique initiale. Les dimensions, angles, positions et
constantes physiques seront fixés après les essais sur téléphone et la sélection
du moteur physique.

## Principes communs

Ces huit niveaux utilisent uniquement la balle, le panier, les poutres de tailles
discrètes et la bascule. Toutes les balles commencent au repos. La gravité est la
seule source d'énergie : aucun objet ne reçoit de vitesse initiale ni d'impulsion
cachée.

Les descriptions de position sont intentionnellement relatives. Elles fixent le
rôle des objets et les relations spatiales nécessaires au puzzle sans transformer
des valeurs provisoires en contrat. Chaque solution de référence devra devenir
une fixture exécutable lorsque les dimensions et constantes physiques auront été
retenues.

Dans tous les niveaux :

- lancer, mettre en pause, arrêter et réinitialiser la simulation sont disponibles ;
- le reset restitue exactement le document d'avant simulation ;
- la balle, le panier et les éléments annoncés comme verrouillés ne peuvent être
  ni déplacés, ni tournés, ni supprimés ;
- les zones de construction autorisées sont visibles avant la manipulation ;
- la réussite correspond au fait que la balle cible entre dans le capteur du panier
  et y reste pendant la durée définie par le jeu ;
- une solution ne doit pas reposer sur un rebond de haute précision, un tunneling,
  un empilement instable ou une tolérance au pixel près ;
- le scénario de régression s'exécute avec un pas de temps fixe, dans une durée
  simulée bornée, et vérifie aussi que le document de niveau n'a pas été modifié.

## Niveau 1 — Laisser tomber

### Apprentissage visé

Comprendre l'objectif, lancer la simulation et observer l'effet de la gravité. Le
bouton de reset est montré après la réussite, mais sa maîtrise n'est pas requise
pour terminer ce premier niveau.

### Scène initiale et verrouillée

Une balle au repos est suspendue directement au-dessus d'un panier largement
ouvert. Les deux objets sont verrouillés. Aucun obstacle ne se trouve entre eux.

### Inventaire

Vide. Le tiroir reste fermé afin de ne pas suggérer qu'une construction est
nécessaire.

### Actions autorisées

Lancer, mettre en pause, arrêter et réinitialiser. Aucune action d'édition.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Lancer la simulation sans modifier la scène. La balle tombe dans le panier.

### Risque pédagogique

Si une explication textuelle masque le plateau ou exige une validation avant le
lancement, le niveau enseigne une boîte de dialogue plutôt que le jeu. L'aide doit
donc être brève, non bloquante et pointer le bouton de lancement.

### Scénario de régression

Depuis l'état initial, lancer et avancer la simulation jusqu'à la limite bornée :
le fait `ball-entered-target` est émis pour la balle cible. Après reset, la balle
retrouve exactement sa transformation initiale et le capteur n'est plus actif.

## Niveau 2 — Construire un pont

### Apprentissage visé

Ouvrir le tiroir, placer une poutre et la déplacer sans avoir encore à la tourner.

### Scène initiale et verrouillée

La balle repose au sommet d'une pente douce formée par une poutre verrouillée. La
pente se termine devant un petit vide. De l'autre côté, une réception verrouillée
conduit directement au panier. Une zone de construction horizontale, large et
clairement marquée, couvre le vide.

### Inventaire

Une poutre courte, déjà présentée à l'orientation horizontale attendue.

### Actions autorisées

Sortir la poutre du tiroir, la placer, la déplacer dans la zone de construction,
la retirer, puis utiliser undo et redo. La rotation de cette poutre est désactivée
et aucune poignée de rotation n'est affichée.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Placer la poutre courte en travers du vide. Au lancement, la balle descend la
pente par gravité, traverse la poutre et rejoint la réception puis le panier.

### Risque pédagogique

Une zone trop vaste transformerait l'exercice en recherche d'alignement. Une zone
trop ajustée donnerait l'impression que le jeu place la poutre à la place du
joueur. Elle doit permettre un déplacement manifeste tout en offrant une marge
généreuse à la solution.

### Scénario de régression

Vérifier que la scène sans poutre ne réussit pas dans la durée bornée. Placer la
poutre selon la fixture de référence, lancer et vérifier l'émission de
`ball-entered-target`. Vérifier aussi qu'une commande de rotation est refusée sans
changer le document.

## Niveau 3 — Faire une pente

### Apprentissage visé

Tourner une poutre et comprendre qu'une inclinaison transforme une chute verticale
en trajectoire latérale.

### Scène initiale et verrouillée

La balle est suspendue au-dessus d'une zone de construction. Le panier se trouve
plus bas et décalé sur un côté, avec une ouverture généreuse. Sans construction,
la balle tombe à côté du panier.

### Inventaire

Une poutre moyenne.

### Actions autorisées

Placer, déplacer et tourner la poutre avec sa poignée tactile ; retirer, annuler et
rétablir. Le snapping propose quelques inclinaisons lisibles, sans exiger un angle
exact.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Placer la poutre sous la trajectoire de chute et l'incliner vers le panier. La
balle tombe sur la partie haute, roule vers la partie basse puis tombe dans le
panier.

### Risque pédagogique

Si seule une inclinaison très précise fonctionne, le joueur attribuera l'échec au
contrôle tactile. La réception et le panier doivent accepter une plage d'angles et
de positions suffisamment large.

### Scénario de régression

Vérifier qu'une poutre horizontale placée sous la balle ne permet pas la réussite.
Appliquer ensuite une inclinaison de référence appartenant à la plage annoncée et
vérifier `ball-entered-target`. Rejouer le scénario avec les deux valeurs extrêmes
de cette plage pour prévenir une solution au pixel près.

## Niveau 4 — Choisir la longueur

### Apprentissage visé

Identifier les tailles discrètes comme variantes d'une même poutre et choisir une
longueur adaptée à une distance.

### Scène initiale et verrouillée

Une pente verrouillée conduit la balle vers un vide plus large que dans le niveau
2. Une réception verrouillée mène au panier de l'autre côté. Une zone de
construction étroite, centrée sur le vide, rend visible l'emplacement à couvrir
sans autoriser la construction d'un pont en plusieurs tronçons.

### Inventaire

Une poutre courte, une moyenne et une longue. Les trois entrées partagent le même
nom de famille et montrent clairement leur longueur relative.

### Actions autorisées

Placer, déplacer et retirer les poutres dans la zone de construction ; undo et
redo. Leur rotation est désactivée dans ce niveau afin que la longueur reste
l'unique notion nouvelle.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Choisir la poutre longue et la placer horizontalement au centre du vide. Les
poutres courte et moyenne ne rejoignent pas les deux appuis lorsqu'elles sont
placées seules dans la zone autorisée.

### Risque pédagogique

Permettre d'aligner les deux petites poutres introduirait une contrainte de budget
ou une solution concurrente et brouillerait l'apprentissage. La géométrie de la
zone doit empêcher cette combinaison de façon visible, sans règle cachée du type
« une seule poutre autorisée ».

### Scénario de régression

Exécuter trois variantes depuis un reset : une poutre courte seule et une poutre
moyenne seule ne réussissent pas ; la poutre longue de référence émet
`ball-entered-target`. Vérifier que les trois variantes sont décomptées comme des
propriétés de la famille `beam`, pas comme trois familles d'objets.

## Niveau 5 — Deux passages

### Apprentissage visé

Combiner deux placements déjà connus et raisonner sur une trajectoire en plusieurs
étapes, sans introduire de nouvelle famille ni de nouvelle interaction.

### Scène initiale et verrouillée

La balle commence sur une pente verrouillée. Son parcours vers le panier comporte
deux interruptions bien séparées et visibles. Chaque interruption dispose de sa
propre zone de construction. Des guides verrouillés larges canalisent la balle
entre les deux passages.

### Inventaire

Deux poutres moyennes identiques.

### Actions autorisées

Placer, déplacer et tourner légèrement les deux poutres ; retirer, annuler et
rétablir. Chaque zone accepte une poutre avec une marge confortable.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Utiliser une poutre pour prolonger le premier passage et l'autre pour prolonger le
second, toutes deux orientées dans le sens général de la descente. La balle suit
les guides jusqu'au panier sans saut ni rebond exigé.

### Risque pédagogique

Un rebond intentionnel ajouterait ici une propriété physique encore invisible et
sensible aux constantes du moteur. Il est explicitement reporté. Les deux passages
doivent être lisibles ensemble sur un petit écran ou accessibles par un
panoramique évident, sans demander des allers-retours aveugles.

### Scénario de régression

Vérifier que chacune des deux solutions partielles, avec une seule poutre placée,
échoue dans la durée bornée. Avec les deux poutres de référence, vérifier
`ball-entered-target`. Exécuter le scénario plusieurs fois depuis un reset et
vérifier le même résultat et le même nombre de pas simulés.

## Niveau 6 — Regarder la bascule

### Apprentissage visé

Observer qu'une bascule est un objet préassemblé dont la planche tourne sous le
poids de la balle. Aucun réglage de joint n'est présenté.

### Scène initiale et verrouillée

Une balle est suspendue au-dessus d'un côté d'une bascule verrouillée. Le panier
est placé sous la sortie de ce même côté, légèrement plus bas. Des poutres
verrouillées forment une réception large afin que la balle reste visible pendant
tout le mouvement.

### Inventaire

Vide. Le tiroir reste fermé.

### Actions autorisées

Lancer, mettre en pause, arrêter et réinitialiser. Aucune action d'édition.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Lancer sans modifier la scène. La balle tombe sur un côté de la planche, son poids
fait tourner la bascule et elle roule vers la réception puis dans le panier.

### Risque pédagogique

Le mouvement ne doit pas ressembler à un catapultage aléatoire. Il doit être lent,
ample et reproductible, avec une caméra montrant simultanément la balle, le pivot
et le panier. Si cette scène exige un rebond pour fonctionner, elle doit être
redessinée plutôt que compensée par des constantes physiques extrêmes.

### Scénario de régression

Lancer depuis l'état initial et vérifier successivement que l'angle de la planche
quitte son état de repos puis que `ball-entered-target` est émis. Après reset,
vérifier la transformation initiale de la balle ainsi que l'angle et la vitesse
angulaire initiaux de la partie mobile de la bascule.

## Niveau 7 — Placer la bascule

### Apprentissage visé

Déplacer une bascule comme un objet unique, sans modifier sa géométrie ni manipuler
ses composants internes.

### Scène initiale et verrouillée

La balle est suspendue au-dessus d'une aire de construction. Le panier se trouve
plus bas, sur le côté vers lequel la balle doit sortir. Des guides verrouillés
encadrent une large position de réception, mais un vide empêche la balle
d'atteindre seule le panier.

### Inventaire

Une bascule.

### Actions autorisées

Placer et déplacer la bascule entière dans l'aire ; la retirer, annuler et rétablir.
La rotation, le redimensionnement et la sélection de la planche ou du pivot
internes sont interdits et aucune poignée correspondante n'est affichée.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Placer la bascule sous la chute, avec le côté destiné à recevoir la balle devant
la réception menant au panier. Au lancement, la balle charge ce côté, la planche
tourne et la balle rejoint la réception.

### Risque pédagogique

La position ne doit pas demander d'anticiper une trajectoire balistique. Plusieurs
placements proches doivent fonctionner. Toute tentative de saisir la planche
mobile pendant l'édition doit sélectionner la bascule complète, faute de quoi le
modèle préassemblé ne serait pas compréhensible.

### Scénario de régression

Vérifier qu'une bascule laissée dans sa position de dépôt ne produit pas la
réussite. La déplacer à la position de référence, lancer et vérifier
`ball-entered-target`. Vérifier qu'une commande visant un composant interne ne peut
ni le sélectionner indépendamment ni modifier le document, puis vérifier le retour
complet à l'état initial après reset.

## Niveau 8 — Guider puis basculer

### Apprentissage visé

Combiner les deux familles manipulables déjà apprises : une poutre guide la balle
vers une bascule, puis la bascule l'amène au panier.

### Scène initiale et verrouillée

La balle est suspendue en hauteur. Le panier est plus bas et décalé, hors de la
chute directe. Deux aires de construction voisines sont visibles : la première
sous la balle pour la poutre, la seconde entre cette aire et la réception du
panier pour la bascule. La réception finale est large et formée de poutres
verrouillées.

### Inventaire

Une poutre moyenne et une bascule.

### Actions autorisées

Placer, déplacer et tourner la poutre ; placer et déplacer la bascule sans la
tourner ; retirer, annuler et rétablir les deux objets.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de référence

Incliner la poutre sous la chute pour guider la balle vers le côté utile de la
bascule. Placer la bascule afin que son mouvement livre la balle à la réception
du panier. Les zones et les réceptions doivent tolérer plusieurs placements
proches, et non une configuration numérique unique.

### Risque pédagogique

Ajouter deux poutres, un rebond ou une bascule à position et orientation libres
chargerait excessivement ce premier niveau de synthèse sur téléphone. Ce niveau se
limite donc à deux objets à placer. Une combinaison plus longue appartient au
chapitre suivant, une fois ce geste validé par les tests utilisateurs.

### Scénario de régression

Vérifier séparément que la poutre seule et la bascule seule ne peuvent atteindre
l'objectif dans la durée bornée. Appliquer les deux placements de référence,
lancer et vérifier `ball-entered-target`. Répéter depuis un reset pour vérifier la
reproductibilité, puis enchaîner undo et redo sur chaque placement et confirmer
que la solution reconstruite réussit encore.

## Décisions repoussées volontairement

Les huit niveaux ne valident pas encore :

- un rebond intentionnel, qui dépendra des coefficients physiques mesurés ;
- plusieurs balles et la distinction entre balle motrice et balle cible ;
- plusieurs poutres combinées avec une bascule dans un même puzzle ;
- la rotation ou le paramétrage d'une bascule ;
- une notation fondée sur le nombre d'objets, le temps ou l'optimalité.

Ces mécanismes ne doivent pas être introduits pour densifier artificiellement la
fin du premier chapitre. Ils pourront être proposés un par un dans la progression
suivante lorsque les huit scénarios ci-dessus seront robustes sur les appareils
cibles.
