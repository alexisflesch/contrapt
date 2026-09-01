# Progression des huit premiers niveaux

Statut : specification pedagogique initiale. Les dimensions, angles, positions et
constantes physiques seront fixes apres les essais sur telephone et la selection
du moteur physique.

## Principes communs

Ces huit niveaux utilisent uniquement la balle, le panier, les poutres de tailles
discretes et la bascule. Toutes les balles commencent au repos. La gravite est la
seule source d'energie : aucun objet ne recoit de vitesse initiale ni d'impulsion
cachee.

Les descriptions de position sont intentionnellement relatives. Elles fixent le
role des objets et les relations spatiales necessaires au puzzle sans transformer
des valeurs provisoires en contrat. Chaque solution de reference devra devenir
une fixture executable lorsque les dimensions et constantes physiques auront ete
retenues.

Dans tous les niveaux :

- lancer, mettre en pause, arreter et reinitialiser la simulation sont disponibles ;
- le reset restitue exactement le document d'avant simulation ;
- la balle, le panier et les elements annonces comme verrouilles ne peuvent etre
  ni deplaces, ni tournes, ni supprimes ;
- les zones de construction autorisees sont visibles avant la manipulation ;
- la reussite correspond au fait que la balle cible entre dans le capteur du panier
  et y reste pendant la duree definie par le jeu ;
- une solution ne doit pas reposer sur un rebond de haute precision, un tunneling,
  un empilement instable ou une tolerance au pixel pres ;
- le scenario de regression s'execute avec un pas de temps fixe, dans une duree
  simulee bornee, et verifie aussi que le document de niveau n'a pas ete modifie.

## Niveau 1 — Laisser tomber

### Apprentissage vise

Comprendre l'objectif, lancer la simulation et observer l'effet de la gravite. Le
bouton de reset est montre apres la reussite, mais sa maitrise n'est pas requise
pour terminer ce premier niveau.

### Scene initiale et verrouillee

Une balle au repos est suspendue directement au-dessus d'un panier largement
ouvert. Les deux objets sont verrouilles. Aucun obstacle ne se trouve entre eux.

### Inventaire

Vide. Le tiroir reste ferme afin de ne pas suggerer qu'une construction est
necessaire.

### Actions autorisees

Lancer, mettre en pause, arreter et reinitialiser. Aucune action d'edition.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Lancer la simulation sans modifier la scene. La balle tombe dans le panier.

### Risque pedagogique

Si une explication textuelle masque le plateau ou exige une validation avant le
lancement, le niveau enseigne une boite de dialogue plutot que le jeu. L'aide doit
donc etre breve, non bloquante et pointer le bouton de lancement.

### Scenario de regression

Depuis l'etat initial, lancer et avancer la simulation jusqu'a la limite bornee :
le fait `ball-entered-target` est emis pour la balle cible. Apres reset, la balle
retrouve exactement sa transformation initiale et le capteur n'est plus actif.

## Niveau 2 — Construire un pont

### Apprentissage vise

Ouvrir le tiroir, placer une poutre et la deplacer sans avoir encore a la tourner.

### Scene initiale et verrouillee

La balle repose au sommet d'une pente douce formee par une poutre verrouillee. La
pente se termine devant un petit vide. De l'autre cote, une reception verrouillee
conduit directement au panier. Une zone de construction horizontale, large et
clairement marquee, couvre le vide.

### Inventaire

Une poutre courte, deja presentee a l'orientation horizontale attendue.

### Actions autorisees

Sortir la poutre du tiroir, la placer, la deplacer dans la zone de construction,
la retirer, puis utiliser undo et redo. La rotation de cette poutre est desactivee
et aucune poignee de rotation n'est affichee.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Placer la poutre courte en travers du vide. Au lancement, la balle descend la
pente par gravite, traverse la poutre et rejoint la reception puis le panier.

### Risque pedagogique

Une zone trop vaste transformerait l'exercice en recherche d'alignement. Une zone
trop ajustee donnerait l'impression que le jeu place la poutre a la place du
joueur. Elle doit permettre un deplacement manifeste tout en offrant une marge
genereuse a la solution.

### Scenario de regression

Verifier que la scene sans poutre ne reussit pas dans la duree bornee. Placer la
poutre selon la fixture de reference, lancer et verifier l'emission de
`ball-entered-target`. Verifier aussi qu'une commande de rotation est refusee sans
changer le document.

## Niveau 3 — Faire une pente

### Apprentissage vise

Tourner une poutre et comprendre qu'une inclinaison transforme une chute verticale
en trajectoire laterale.

### Scene initiale et verrouillee

La balle est suspendue au-dessus d'une zone de construction. Le panier se trouve
plus bas et decale sur un cote, avec une ouverture genereuse. Sans construction,
la balle tombe a cote du panier.

### Inventaire

Une poutre moyenne.

### Actions autorisees

Placer, deplacer et tourner la poutre avec sa poignee tactile ; retirer, annuler et
retablir. Le snapping propose quelques inclinaisons lisibles, sans exiger un angle
exact.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Placer la poutre sous la trajectoire de chute et l'incliner vers le panier. La
balle tombe sur la partie haute, roule vers la partie basse puis tombe dans le
panier.

### Risque pedagogique

Si seule une inclinaison tres precise fonctionne, le joueur attribuera l'echec au
controle tactile. La reception et le panier doivent accepter une plage d'angles et
de positions suffisamment large.

### Scenario de regression

Verifier qu'une poutre horizontale placee sous la balle ne permet pas la reussite.
Appliquer ensuite une inclinaison de reference appartenant a la plage annoncee et
verifier `ball-entered-target`. Rejouer le scenario avec les deux valeurs extremes
de cette plage pour prevenir une solution au pixel pres.

## Niveau 4 — Choisir la longueur

### Apprentissage vise

Identifier les tailles discretes comme variantes d'une meme poutre et choisir une
longueur adaptee a une distance.

### Scene initiale et verrouillee

Une pente verrouillee conduit la balle vers un vide plus large que dans le niveau
2. Une reception verrouillee mene au panier de l'autre cote. Une zone de
construction etroite, centree sur le vide, rend visible l'emplacement a couvrir
sans autoriser la construction d'un pont en plusieurs troncons.

### Inventaire

Une poutre courte, une moyenne et une longue. Les trois entrees partagent le meme
nom de famille et montrent clairement leur longueur relative.

### Actions autorisees

Placer, deplacer et retirer les poutres dans la zone de construction ; undo et
redo. Leur rotation est desactivee dans ce niveau afin que la longueur reste
l'unique notion nouvelle.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Choisir la poutre longue et la placer horizontalement au centre du vide. Les
poutres courte et moyenne ne rejoignent pas les deux appuis lorsqu'elles sont
placees seules dans la zone autorisee.

### Risque pedagogique

Permettre d'aligner les deux petites poutres introduirait une contrainte de budget
ou une solution concurrente et brouillerait l'apprentissage. La geometrie de la
zone doit empecher cette combinaison de facon visible, sans regle cachee du type
« une seule poutre autorisee ».

### Scenario de regression

Executer trois variantes depuis un reset : une poutre courte seule et une poutre
moyenne seule ne reussissent pas ; la poutre longue de reference emet
`ball-entered-target`. Verifier que les trois variantes sont decomptees comme des
proprietes de la famille `beam`, pas comme trois familles d'objets.

## Niveau 5 — Deux passages

### Apprentissage vise

Combiner deux placements deja connus et raisonner sur une trajectoire en plusieurs
etapes, sans introduire de nouvelle famille ni de nouvelle interaction.

### Scene initiale et verrouillee

La balle commence sur une pente verrouillee. Son parcours vers le panier comporte
deux interruptions bien separees et visibles. Chaque interruption dispose de sa
propre zone de construction. Des guides verrouilles larges canalisent la balle
entre les deux passages.

### Inventaire

Deux poutres moyennes identiques.

### Actions autorisees

Placer, deplacer et tourner legerement les deux poutres ; retirer, annuler et
retablir. Chaque zone accepte une poutre avec une marge confortable.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Utiliser une poutre pour prolonger le premier passage et l'autre pour prolonger le
second, toutes deux orientees dans le sens general de la descente. La balle suit
les guides jusqu'au panier sans saut ni rebond exige.

### Risque pedagogique

Un rebond intentionnel ajouterait ici une propriete physique encore invisible et
sensible aux constantes du moteur. Il est explicitement reporte. Les deux passages
doivent etre lisibles ensemble sur un petit ecran ou accessibles par un
panoramique evident, sans demander des allers-retours aveugles.

### Scenario de regression

Verifier que chacune des deux solutions partielles, avec une seule poutre placee,
echoue dans la duree bornee. Avec les deux poutres de reference, verifier
`ball-entered-target`. Executer le scenario plusieurs fois depuis un reset et
verifier le meme resultat et le meme nombre de pas simules.

## Niveau 6 — Regarder la bascule

### Apprentissage vise

Observer qu'une bascule est un objet preassemble dont la planche tourne sous le
poids de la balle. Aucun reglage de joint n'est presente.

### Scene initiale et verrouillee

Une balle est suspendue au-dessus d'un cote d'une bascule verrouillee. Le panier
est place sous la sortie de ce meme cote, legerement plus bas. Des poutres
verrouillees forment une reception large afin que la balle reste visible pendant
tout le mouvement.

### Inventaire

Vide. Le tiroir reste ferme.

### Actions autorisees

Lancer, mettre en pause, arreter et reinitialiser. Aucune action d'edition.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Lancer sans modifier la scene. La balle tombe sur un cote de la planche, son poids
fait tourner la bascule et elle roule vers la reception puis dans le panier.

### Risque pedagogique

Le mouvement ne doit pas ressembler a un catapultage aleatoire. Il doit etre lent,
ample et reproductible, avec une camera montrant simultanement la balle, le pivot
et le panier. Si cette scene exige un rebond pour fonctionner, elle doit etre
redessinee plutot que compensee par des constantes physiques extremes.

### Scenario de regression

Lancer depuis l'etat initial et verifier successivement que l'angle de la planche
quitte son etat de repos puis que `ball-entered-target` est emis. Apres reset,
verifier la transformation initiale de la balle ainsi que l'angle et la vitesse
angulaire initiaux de la partie mobile de la bascule.

## Niveau 7 — Placer la bascule

### Apprentissage vise

Deplacer une bascule comme un objet unique, sans modifier sa geometrie ni manipuler
ses composants internes.

### Scene initiale et verrouillee

La balle est suspendue au-dessus d'une aire de construction. Le panier se trouve
plus bas, sur le cote vers lequel la balle doit sortir. Des guides verrouilles
encadrent une large position de reception, mais un vide empeche la balle
d'atteindre seule le panier.

### Inventaire

Une bascule.

### Actions autorisees

Placer et deplacer la bascule entiere dans l'aire ; la retirer, annuler et retablir.
La rotation, le redimensionnement et la selection de la planche ou du pivot
internes sont interdits et aucune poignee correspondante n'est affichee.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Placer la bascule sous la chute, avec le cote destine a recevoir la balle devant
la reception menant au panier. Au lancement, la balle charge ce cote, la planche
tourne et la balle rejoint la reception.

### Risque pedagogique

La position ne doit pas demander d'anticiper une trajectoire balistique. Plusieurs
placements proches doivent fonctionner. Toute tentative de saisir la planche
mobile pendant l'edition doit selectionner la bascule complete, faute de quoi le
modele preassemble ne serait pas comprehensible.

### Scenario de regression

Verifier qu'une bascule laissee dans sa position de depot ne produit pas la
reussite. La deplacer a la position de reference, lancer et verifier
`ball-entered-target`. Verifier qu'une commande visant un composant interne ne peut
ni le selectionner independamment ni modifier le document, puis verifier le retour
complet a l'etat initial apres reset.

## Niveau 8 — Guider puis basculer

### Apprentissage vise

Combiner les deux familles manipulables deja apprises : une poutre guide la balle
vers une bascule, puis la bascule l'amene au panier.

### Scene initiale et verrouillee

La balle est suspendue en hauteur. Le panier est plus bas et decale, hors de la
chute directe. Deux aires de construction voisines sont visibles : la premiere
sous la balle pour la poutre, la seconde entre cette aire et la reception du
panier pour la bascule. La reception finale est large et formee de poutres
verrouillees.

### Inventaire

Une poutre moyenne et une bascule.

### Actions autorisees

Placer, deplacer et tourner la poutre ; placer et deplacer la bascule sans la
tourner ; retirer, annuler et retablir les deux objets.

### Objectif

Faire entrer la balle cible dans le panier.

### Solution de reference

Incliner la poutre sous la chute pour guider la balle vers le cote utile de la
bascule. Placer la bascule afin que son mouvement livre la balle a la reception
du panier. Les zones et les receptions doivent tolerer plusieurs placements
proches, et non une configuration numerique unique.

### Risque pedagogique

Ajouter deux poutres, un rebond ou une bascule a position et orientation libres
chargerait excessivement ce premier niveau de synthese sur telephone. Ce niveau se
limite donc a deux objets a placer. Une combinaison plus longue appartient au
chapitre suivant, une fois ce geste valide par les tests utilisateurs.

### Scenario de regression

Verifier separement que la poutre seule et la bascule seule ne peuvent atteindre
l'objectif dans la duree bornee. Appliquer les deux placements de reference,
lancer et verifier `ball-entered-target`. Repeter depuis un reset pour verifier la
reproductibilite, puis enchainer undo et redo sur chaque placement et confirmer
que la solution reconstruite reussit encore.

## Decisions repoussees volontairement

Les huit niveaux ne valident pas encore :

- un rebond intentionnel, qui dependra des coefficients physiques mesures ;
- plusieurs balles et la distinction entre balle motrice et balle cible ;
- plusieurs poutres combinees avec une bascule dans un meme puzzle ;
- la rotation ou le parametrage d'une bascule ;
- une notation fondee sur le nombre d'objets, le temps ou l'optimalite.

Ces mecanismes ne doivent pas etre introduits pour densifier artificiellement la
fin du premier chapitre. Ils pourront etre proposes un par un dans la progression
suivante lorsque les huit scenarios ci-dessus seront robustes sur les appareils
cibles.
