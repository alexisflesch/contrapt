# Interactions mobiles du plateau et de l'editeur

Statut : specification fonctionnelle initiale. Les seuils marques comme devant etre
valides sur appareil restent provisoires ; ils ne doivent pas etre disperses dans
le code.

## Portee

Ce document definit le langage d'interaction commun a la resolution et a la
creation de niveaux. Il ne fixe ni le style graphique, ni les animations, ni la
forme exacte des icones. Un etat fonctionnel doit toujours rester comprehensible
sans dependre d'une couleur, d'une texture ou d'un effet sonore particulier.

Les deux modes utilisent le meme plateau, les memes gestes et les memes commandes
de document. Ils different uniquement par leurs permissions et les panneaux
disponibles :

- en resolution, le joueur ne voit que son inventaire et ne modifie que les objets
  autorises par le niveau ;
- en creation, l'auteur accede au catalogue, aux proprietes du niveau, a
  l'inventaire, aux objectifs et au verrouillage ;
- un apercu « comme joueur » dans l'editeur applique les permissions du mode
  resolution sans creer un second plateau.

La priorite initiale est la manipulation fiable de la balle, du panier, des trois
tailles de poutre et de la bascule. Aucune interaction n'anticipe les connexions,
les objets complexes ou un systeme de plugins.

## Principes d'interaction

- Toute action essentielle possede un controle visible. Le multi-touch, le double
  toucher et l'appui long peuvent ameliorer le confort, mais ne sont jamais
  indispensables.
- Une action sur le document est soit validee en entier, soit ignoree en entier.
- Une manipulation continue ne produit qu'une commande dans l'historique.
- La navigation de la camera, la selection et l'ouverture d'un tiroir ne modifient
  pas le document et ne creent aucune entree d'historique.
- Pendant la construction, les objets dynamiques ne sont pas simules.
- Pendant une simulation, aucune modification du document n'est possible, meme
  lorsque la simulation est en pause.
- Une action interdite explique immediatement pourquoi elle est refusee.
- Les libelles, annonces accessibles et zones tactiles font partie du contrat ;
  ils ne sont pas reportes a la phase de direction artistique.

## Organisation de l'ecran

Le plateau occupe tout l'espace restant apres les controles indispensables. Les
overlays ne doivent pas masquer durablement la zone ou l'utilisateur agit.

En phase de construction, l'interface comporte au minimum :

- un acces a l'objectif ou aux proprietes du niveau selon le mode ;
- une barre d'actions avec annuler, retablir et tester ;
- un controle de cadrage donnant acces a zoom avant, zoom arriere et ajuster a la
  scene ;
- un tiroir d'objets ;
- un panneau contextuel compact lorsqu'un objet est selectionne.

En simulation, le tiroir et les controles d'edition disparaissent ou sont
desactives. Ils sont remplaces par pause ou reprendre et reinitialiser. Les
controles de camera restent disponibles.

En portrait sur telephone, le catalogue est un tiroir bas avec au moins deux
positions : replie et ouvert. En paysage, l'hypothese initiale est un tiroir
lateral afin de conserver la hauteur du plateau. Le contenu, l'ordre de focus et
les actions restent identiques dans les deux orientations.

Les barres respectent les safe areas du systeme. Un controle essentiel ne doit pas
etre place sous une encoche, un indicateur d'accueil ou une zone reservee aux
gestes du navigateur.

**A valider sur appareil :** hauteur des positions du tiroir, choix du cote en
paysage, espace reel laisse au plateau avec une police agrandie et accessibilite
des actions principales au pouce.

## Navigation du plateau

### Panoramique

- Glisser avec un doigt depuis une zone vide deplace la camera.
- Glisser depuis un objet manipulable deplace cet objet et non la camera.
- Glisser depuis un objet non manipulable selectionne l'objet mais ne deplace ni
  l'objet ni la camera. Un retour explique la restriction.
- La camera reste bornee de sorte qu'une partie utile du monde ne puisse pas etre
  perdue sans moyen visible de la retrouver.
- Le bouton « Ajuster a la scene » restaure toujours un cadrage utilisable.

Il n'y a pas d'auto-pan au bord de l'ecran dans l'interaction initiale. Pour
deplacer un objet sur une longue distance, l'utilisateur cadre ou dezoome d'abord,
puis le deplace. Ce choix doit etre reouvert si les tests montrent qu'il rend la
creation penible.

### Zoom

- Pincer avec deux doigts zoome autour du point situe entre les doigts et permet
  simultanement de translater la camera.
- Les boutons zoom avant, zoom arriere et ajuster a la scene offrent une
  alternative complete au pincement.
- Le zoom a des bornes communes aux deux modes. Elles garantissent que les objets
  restent manipulables au maximum et que le niveau reste retrouvable au minimum.
- La taille des poignees et des controles tactiles reste exprimee en pixels CSS ;
  elle ne diminue pas avec le zoom du monde.

Si un second doigt touche le plateau pendant un deplacement ou une rotation en
cours, la manipulation d'objet est annulee et revient a son etat de depart. Les
deux doigts controlent alors la camera. Aucune commande n'est ajoutee.

Le navigateur ne doit pas faire defiler ou zoomer la page lorsqu'un geste a
commence dans le plateau. Les zones DOM hors plateau conservent leur comportement
de defilement normal.

**A valider sur appareil :** seuil distinguant toucher et glisser, vitesse du
panoramique, courbe de zoom, bornes de zoom et comportement de l'annulation lors
de l'ajout du second doigt, notamment sous iOS Safari.

## Selection et panneau contextuel

- Toucher un objet le selectionne.
- Commencer a glisser un objet manipulable peut le selectionner et le deplacer en
  un seul geste.
- Toucher une zone vide sans glisser deselectionne l'objet courant.
- Un seul objet visible est selectionne a la fois dans le perimetre initial.
- La selection est signalee par au moins deux moyens parmi contour, poignees,
  libelle et panneau contextuel ; la couleur seule ne suffit pas.
- Les composants internes d'une bascule ne sont jamais selectionnables. La
  bascule est une seule cible.
- Si plusieurs objets occupent la zone touchee, la priorite de hit-test est
  deterministe. Une action visible « Autres objets ici » donne acces a la liste
  des candidats ; des touchers repetes ou un appui long ne sont pas l'unique moyen
  de les atteindre.

Le panneau contextuel affiche le nom accessible de l'objet, les actions permises
et l'etat verrouille eventuel. En resolution, il peut proposer retirer pour un
objet issu de l'inventaire. En creation, il propose au minimum supprimer,
dupliquer lorsque permis, et les proprietes exposees par la famille.

Supprimer ou retirer est une commande annulable. Retirer un objet place depuis
l'inventaire restitue atomiquement la quantite correspondante. Une confirmation
modale n'est pas requise pour une action immediatement annulable ; l'interface
annonce l'action et rend « Annuler » accessible.

## Deplacement d'un objet

1. Le contact commence sur la surface ou la zone tactile elargie de l'objet.
2. Avant le seuil de glissement, l'action reste un toucher de selection.
3. Apres le seuil, une projection temporaire suit le doigt sans modifier le
   `LevelDocument`.
4. Le relachement dans une position valide produit une seule commande de
   deplacement.
5. Le relachement dans une position invalide restaure exactement la transformee de
   depart, explique l'erreur et ne modifie pas l'historique.
6. `pointercancel`, la perte de focus, un changement d'orientation ou l'arrivee
   d'un second pointeur annule de la meme facon la projection temporaire.

La validite tient compte des permissions et de la zone de construction. Le simple
chevauchement de deux formes physiques n'est pas declare invalide par ce document :
si une regle de niveau doit l'interdire, elle devra etre explicite et testee.

Il n'y a pas de snapping de position obligatoire au depart. Une grille ne sera
ajoutee qu'apres avoir observe un besoin reel.

## Rotation

- Un objet rotatable selectionne affiche une poignee de rotation explicite,
  separee de sa zone de deplacement.
- Glisser cette poignee affiche une previsualisation ; le relachement valide une
  seule commande de rotation.
- Deux boutons accessibles, rotation negative et rotation positive, fournissent
  une alternative au geste et appliquent le pas courant.
- En resolution, une poutre utilise le snapping configure pour le jeu.
- En creation, l'auteur peut choisir snapping ou angle libre. Le mode courant est
  visible dans le panneau contextuel.
- Le panier n'affiche pas de rotation tant qu'un besoin de niveau ne l'a pas
  rendue disponible.
- La bascule tourne selon sa simulation interne, mais l'ensemble n'a pas de
  commande de rotation dans le catalogue initial.

Une rotation invalide ou annulee revient a l'angle de depart sans entree
d'historique. Les angles de snapping et la taille ou distance de la poignee sont
des constantes centralisees.

**A valider sur appareil :** pas de snapping, hysteresis autour d'un angle,
distance de la poignee, precision du mode libre et facilite d'utilisation avec le
doigt qui masque partiellement l'objet.

## Tiroir d'objets et placement

Le tiroir est un composant commun avec un contenu determine par la session :

- en resolution, il montre uniquement les entrees disponibles et leur quantite ;
- en creation, il montre le catalogue autorise et donne acces a la configuration
  de l'inventaire du futur joueur ;
- la recherche filtre sur le nom et les synonymes accessibles ;
- « Tous », « Recents » et les categories fournies par les metadonnees du
  catalogue peuvent filtrer la liste ; les filtres sans utilite pour le petit
  inventaire d'un niveau sont masques ;
- la recherche, les filtres et le defilement du tiroir ne deplacent jamais le
  plateau.

Le placement principal ne repose pas sur un glisser depuis le tiroir :

1. toucher une entree active le mode placement ;
2. le tiroir se replie suffisamment pour rendre le plateau accessible ;
3. toucher ou toucher-glisser dans le plateau positionne une previsualisation ;
4. relacher dans une position valide cree l'objet, le selectionne et decompte
   l'inventaire dans une seule commande ;
5. annuler ou revenir au tiroir quitte le mode sans consommer l'inventaire.

Une entree dont la quantite est nulle reste identifiable mais ne peut pas activer
le placement. Le motif du refus est annonce. Si une position invalide est choisie
pour un nouvel objet, le mode placement reste actif pour permettre une nouvelle
tentative ; une action annuler explicite demeure visible.

Le glisser direct d'une carte du tiroir vers le plateau est hors du comportement
requis initial. Il pourra etre ajoute comme raccourci sans remplacer le parcours
ci-dessus.

### Tailles de poutre

La poutre reste une seule famille avec une propriete de taille enumeree. Courte,
moyenne et longue sont presentees comme trois variantes clairement nommees et
visuellement comparables :

- en resolution, chaque taille autorisee est une entree d'inventaire distincte
  avec sa propre quantite ;
- en creation, choisir poutre demande de choisir l'un des trois presets avant le
  placement ;
- changer la taille d'une poutre existante, lorsque le mode le permet, remplace la
  propriete enumeree par une commande atomique ;
- aucune poignee de redimensionnement continu n'est affichee.

## Objets verrouilles et permissions

Un objet verrouille reste selectionnable afin que son role soit comprehensible.
En resolution :

- il n'affiche aucune poignee correspondant a une action interdite ;
- un glisser ne le deplace pas et ne devient pas silencieusement un panoramique ;
- le panneau indique « Verrouille par ce niveau » ;
- une tentative de modification produit un retour bref, visible et annonce aux
  technologies d'assistance.

Dans l'editeur de creation, `locked` est la propriete persistante qui definit les
permissions du futur joueur. Elle n'empeche pas l'auteur de modifier l'objet. Le
mode d'apercu « comme joueur » applique en revanche le verrouillage. Cette
distinction evite d'introduire un second mecanisme de verrouillage propre a l'outil
d'auteur.

Les autres restrictions de niveau, telles que deplacement autorise mais rotation
interdite, suivent la meme regle : seules les poignees permises sont visibles et
les commandes sont refusees par la couche application, pas seulement par l'UI.

## Annuler et retablir

- Annuler et retablir restent visibles en construction et indiquent leur etat
  indisponible sans disparaitre.
- Placement, retrait, suppression, duplication, deplacement, rotation et
  modification d'une propriete produisent chacun une commande atomique.
- Un glisser de deux secondes ne produit qu'une entree.
- Une commande annulee peut etre retablie. Une nouvelle commande apres annulation
  vide la branche de retablissement.
- Une commande refusee ou une projection annulee n'apparait jamais dans
  l'historique.
- Annuler un placement restaure aussi l'inventaire ; retablir le redecompte.
- Le lancement, la pause, le cadrage et le reset de simulation ne font pas partie
  de l'historique du document.

Pendant une simulation, annuler et retablir sont inaccessibles. Reinitialiser
revient en construction avec l'historique exactement tel qu'il etait avant le
test.

## Tester, mettre en pause et reinitialiser

Les phases forment l'automate suivant :

```text
construction --tester--> simulation en cours
simulation en cours --pause--> simulation en pause
simulation en pause --reprendre--> simulation en cours
simulation en cours ou en pause --reinitialiser--> construction
simulation en cours --objectif atteint--> resultat
resultat --reinitialiser ou retour edition--> construction
```

Tester valide d'abord le document. Une erreur bloquante empeche le lancement,
ouvre le panneau pertinent et place le focus sur la premiere erreur. Un
avertissement non bloquant permet le test.

Au lancement, la simulation est creee depuis un snapshot du document. Le tiroir
se ferme, la selection d'edition est conservee dans `EditorSession` mais ses
poignees disparaissent. Pause fige seulement la simulation : elle ne permet pas de
modifier un objet. Reinitialiser detruit l'etat physique et restitue exactement la
construction precedant le lancement, y compris transformees et inventaire.

Quand l'objectif est atteint, la physique se fige et un panneau de resultat est
annonce. En campagne il propose au minimum niveau suivant et reessayer. En creation
il propose retour a l'edition. Examiner la scene reste possible avec les controles
de camera, sans rendre les objets editables.

## Etats de session

`EditorSession` porte les informations ephemeres necessaires a l'interface sans les
serialiser dans le niveau :

- mode `resolution` ou `creation` ;
- phase `construction`, `running`, `paused` ou `result` ;
- objet selectionne, outil de placement et projection temporaire eventuelle ;
- ouverture du tiroir, filtre, recherche et panneau contextuel ;
- camera en unites du monde et zoom ;
- historique undo/redo ;
- statut du brouillon `unchanged`, `dirty`, `saving` ou `save-error` ;
- reference au snapshot utilise par la simulation courante.

Une seule manipulation modale peut etre active a la fois : placement, deplacement,
rotation, navigation multi-touch ou dialogue. Entrer dans une autre manipulation
annule proprement la projection non validee de la precedente.

En creation, toute commande valide marque le brouillon comme modifie puis declenche
l'autosauvegarde. Un echec ne supprime ni le brouillon en memoire ni l'historique ;
il reste visible jusqu'a reussite ou action de l'utilisateur. En resolution, la
source de campagne n'est jamais modifiee : la construction de la tentative reside
dans la session.

Quitter une session de creation avec un echec de sauvegarde requiert une
confirmation explicite. Un changement d'orientation, une mise en arriere-plan ou
une installation de mise a jour ne constitue pas une sortie volontaire et doit
preserver le brouillon.

## Erreurs et retours utilisateur

Un retour d'erreur combine, selon le contexte :

- un marqueur proche de l'objet ou du champ concerne ;
- un message bref dans une zone stable qui ne masque pas l'action ;
- une annonce `aria-live` adaptee, sans repetition a chaque mouvement ;
- une action concrete telle que annuler, reessayer ou ouvrir le champ fautif.

La couleur, le son et la vibration ne sont jamais les seuls signaux. Une vibration
legere peut accompagner un snapping ou un refus sur les appareils compatibles,
mais elle est optionnelle et respecte les preferences de l'utilisateur.

Les erreurs attendues incluent au minimum : action interdite, position hors zone,
inventaire epuise, document invalide, echec de sauvegarde et impossibilite de
charger une session. Les erreurs d'import et de partage sont traitees en dehors du
plateau et ne remplacent jamais le brouillon courant.

## Accessibilite tactile et alternatives

- Toute cible tactile interactive mesure au moins 44 x 44 pixels CSS, quitte a
  posseder une zone de hit-test plus grande que sa representation.
- Deux cibles distinctes sont espacees suffisamment pour limiter les activations
  accidentelles ; les poignees ne se superposent pas aux controles du systeme.
- Aucune action essentielle ne depend d'un appui long, d'un geste rapide, du hover,
  du clic droit ou de plusieurs doigts.
- Les boutons de zoom, les boutons de rotation et les controles de position du
  panneau contextuel offrent des alternatives aux gestes. Les controles de
  position permettent au minimum un deplacement par pas dans quatre directions.
- Les controles DOM ont un nom accessible, un etat et un ordre de focus stables.
- Le panneau contextuel et une liste DOM de la scene permettent de selectionner un
  objet sans devoir viser son rendu dans le canvas.
- Les changements de selection, les refus, le lancement, la pause, le reset et la
  reussite sont annonces sans annoncer chaque image de simulation.
- L'interface reste utilisable avec une taille de texte augmentee et ne bloque pas
  le zoom d'accessibilite du navigateur hors du plateau.
- `prefers-reduced-motion` supprime les transitions non indispensables ; aucune
  information ne depend d'une animation.
- Les raccourcis clavier et la souris sont des ameliorations, jamais la seule voie
  vers une commande.

Les dimensions physiques d'une cible tactile varient selon la densite et le
navigateur. Le minimum CSS doit donc etre verifie par des essais humains, et pas
seulement par une assertion de style.

## Portrait, paysage et changements de viewport

- Les deux orientations prennent en charge toutes les fonctions de resolution et
  de creation.
- Changer d'orientation conserve document, historique, selection, phase et centre
  de camera en coordonnees du monde.
- Une manipulation tactile en cours est annulee avant le recalcul du layout.
- Le nouveau cadrage garde si possible l'objet selectionne visible ; « Ajuster a
  la scene » offre toujours une issue.
- Le tiroir peut changer de bord et de taille sans perdre recherche, filtre ou
  choix de variante.
- L'apparition du clavier virtuel pour la recherche ou une propriete ne doit ni
  deplacer un objet ni redimensionner definitivement le canvas.

**A valider sur appareil :** rotation avec clavier virtuel ouvert, changements de
viewport lies aux barres d'adresse mobiles, preservation du centre de camera et
ergonomie du tiroir lateral sur un telephone court en paysage.

## Scenarios d'acceptation

Les scenarios critiques sont automatises au niveau le plus bas pertinent puis
rejoues dans un navigateur avec au moins un viewport de telephone. Ceux marques
`APPAREIL` exigent aussi une verification sur un telephone physique de la matrice
supportee.

1. **Selection et deplacement.** Etant donne une poutre deplacable, quand le joueur
   la touche puis la glisse vers une position valide, alors elle est selectionnee,
   sa position est modifiee et une seule commande apparait dans l'historique.
2. **Panoramique sans mutation.** Quand le joueur glisse depuis une zone vide,
   alors seule la camera se deplace et le document ainsi que l'historique restent
   identiques.
3. **Conflit multi-touch.** Etant donne un deplacement d'objet non relache, quand un
   second doigt touche le plateau, alors l'objet revient a sa position initiale,
   aucune commande n'est creee et les deux doigts naviguent dans la camera.
4. **Alternative au pincement.** Etant donne un utilisateur n'employant qu'un
   doigt, quand il utilise zoom avant, zoom arriere et ajuster a la scene, alors il
   peut atteindre le meme domaine de cadrage qu'avec le pincement.
5. **Placement depuis le tiroir.** Etant donne une poutre courte disponible en
   quantite un, quand le joueur la choisit puis la place, alors une poutre avec la
   propriete `short` est creee, selectionnee, et la quantite devient zero dans la
   meme commande.
6. **Placement invalide.** Quand le joueur relache un nouvel objet hors de la zone
   de construction, alors aucun placement n'est cree, l'inventaire ne change pas,
   le mode placement reste actif et la raison est annoncee.
7. **Tailles de poutre.** Etant donne les trois tailles autorisees, quand le joueur
   filtre ou parcourt le tiroir, alors courte, moyenne et longue restent une seule
   famille mais ont des quantites et des choix distincts.
8. **Rotation.** Quand une poignee de rotation est glissee a travers plusieurs
   angles de snapping puis relachee, alors seul l'angle final produit une commande ;
   annuler restaure exactement l'angle initial.
9. **Objet verrouille.** Etant donne une poutre verrouillee en resolution, quand le
   joueur tente de la glisser, alors elle est selectionnee mais ne bouge pas, la
   camera ne bouge pas, aucune commande n'est creee et la restriction est annoncee.
10. **Verrouillage d'auteur.** Etant donne le meme document ouvert en creation,
    quand l'auteur selectionne cet objet, alors il peut le modifier et changer la
    propriete de verrouillage ; l'apercu comme joueur applique ensuite la
    restriction.
11. **Undo, redo et inventaire.** Apres placement puis deplacement d'une poutre,
    deux annulations restaurent d'abord sa position puis la retirent en rendant la
    quantite ; deux retablissements reproduisent les deux actions.
12. **Snapshot de test.** Etant donne une construction modifiee, quand la simulation
    est lancee puis reinitialisee apres mouvement de la balle et de la bascule,
    alors le document, l'inventaire et l'historique correspondent exactement a
    l'instant precedant le lancement.
13. **Pause non editable.** Quand la simulation est mise en pause, alors la
    physique cesse d'avancer mais aucun objet ni propriete ne devient editable.
14. **Validation avant test.** Etant donne un niveau auteur invalide, quand tester
    est active, alors aucune simulation n'est creee, la premiere erreur est visible
    et annoncee, et le brouillon reste intact.
15. **Resultat.** Quand la balle cible satisfait l'objectif du panier, alors la
    simulation entre en phase resultat une seule fois, annonce la reussite et offre
    les actions adaptees au mode.
16. **Changement d'orientation.** Etant donne une poutre selectionnee et un tiroir
    filtre, quand le telephone passe de portrait a paysage, alors la manipulation
    en cours est annulee, la selection et le filtre sont conserves et la poutre
    reste retrouvable. `APPAREIL`
17. **Cibles tactiles.** Sur le plus petit viewport supporte, toutes les actions
    essentielles et poignees offrent une cible d'au moins 44 x 44 pixels CSS sans
    chevauchement bloquant. `APPAREIL`
18. **Interferences navigateur.** Panoramiquer, pincer, ouvrir le tiroir et utiliser
    une poignee pres des bords ne declenche ni scroll de page, ni retour systeme
    involontaire, ni perte de commande. `APPAREIL`
19. **Accessibilite sans geste complexe.** Avec les controles DOM uniquement, un
    utilisateur peut selectionner une poutre dans la liste de scene, la deplacer
    par pas, la faire pivoter, ajuster le cadrage, tester, mettre en pause et
    reinitialiser.
20. **Echec d'autosauvegarde.** Quand une sauvegarde echoue apres une commande de
    creation, alors le brouillon et l'historique restent disponibles, l'erreur est
    persistante et quitter demande confirmation.

## Decisions a mesurer avant gel de l'interface

Ces choix doivent etre prototypes avec le vrai renderer, mais sans engager de
direction artistique :

- seuils toucher/glisser et tolerance aux petits tremblements ;
- positions et tailles du tiroir en portrait et en paysage ;
- taille, distance et placement de la poignee de rotation ;
- pas de rotation et hysteresis du snapping ;
- bornes, vitesse et recentrage du zoom ;
- necessite eventuelle d'un auto-pan pendant un long deplacement ;
- densite maximale de la barre d'actions sur le plus petit ecran ;
- comportement pres des gestes systeme et des safe areas ;
- utilite reelle d'un retour haptique ;
- confort des alternatives par boutons avec les reglages de police et de zoom
  d'accessibilite.

Chaque resultat retenu doit devenir une constante nommee, un scenario automatise
lorsque possible et une entree dans la matrice de tests sur appareils. Une
observation graphique ne doit pas modifier le contrat de commande, le modele du
niveau ou la separation entre document et session.
