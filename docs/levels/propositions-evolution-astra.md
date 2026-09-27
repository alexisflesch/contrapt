# Propositions de puzzles et d’évolution — Contrapt!

Document de réflexion, 27 septembre 2026.

**Unique source consultée : [Concevoir un niveau](conception-niveaux.md).**
Aucun autre document du dépôt ni code de l’application n’a été consulté.
Les propositions ci-dessous sont des intentions de conception, pas des niveaux
validés physiquement, des décisions d’implémentation ou un remplacement des règles
existantes. « Existant » signifie ici « décrit comme existant dans cette source ».

Direction retenue après échange : **un atelier bricolé avec une identité propre**.
TIM est une référence pour le plaisir de comprendre une réaction en chaîne, pas
un catalogue d’objets, de personnages ou de gags à reproduire. Les machines
accomplissent de petites tâches avec des moyens démesurés ; leur fonctionnement
doit rester lisible.

**Contrainte de production : les visuels sont générés par GPT.** Privilégier des
pièces rigides dont l’animation vient de la physique, ou quelques poses fixes.
Des animaux et gadgets sont possibles, sans dépendre d’un personnage qui marche,
grimpe ou manipule finement des objets. La facilité de produire les images ne
garantit pas la facilité de rendre la simulation robuste ; les deux sont
distinguées dans les propositions.

## 1. Ce qui rendrait ces puzzles plaisants

Le plaisir principal devrait être : **« J’ai compris pourquoi cette machine ne
marche pas, puis j’ai trouvé comment la faire fonctionner. »** Le spectacle de
la réussite récompense cette compréhension.

Une bonne scène se lit à trois niveaux :

1. **Une mission immédiate.** « Livrer la bille au balcon. » Le départ, l’arrivée
   et le gros obstacle se repèrent en quelques secondes.
2. **Une causalité à reconstruire.** « Cette bille de service doit maintenir ce
   bouton, qui alimente le ventilateur. » Le joueur suit des indices visibles.
3. **Une astuce locale.** « Cette poutre doit faire écran au vent. » C’est le
   petit déplacement de sens qui donne envie de raconter la solution.

À chaque niveau, choisir une seule découverte principale. Les autres étapes
mettent cette découverte en valeur et réemploient des mécanismes déjà compris.
Une machine de huit étapes peut être facile si son déroulement est séquentiel et
visible ; une machine plus courte peut être difficile si une commande produit
deux effets qu’il faut concilier.

### Des rôles plus intéressants que des objets supplémentaires

Avant d’inventer une pièce, changer le rôle d’une pièce connue :

| Pièce | Usage attendu | Usage à faire découvrir |
| --- | --- | --- |
| Poutre | Faire rouler | Faire écran au vent, arrêter une bille, séparer deux trajets |
| Bille de service | Déclencher | Maintenir, retarder, encombrer un passage |
| Masse | Appuyer | Mémoriser une activation, occulter un souffle |
| Convoyeur | Transporter | Faire patienter, renvoyer une bille après inversion |
| Barrière | Bloquer | Retenir un départ, constituer un pont temporaire |
| Ventilateur | Pousser | Agir seulement après disparition d’un écran |
| Tremplin | Faire rebondir | Rejoindre une sortie intermédiaire avec l’énergie déjà disponible |

Les billes de service sont appelées « bleues » dans les fiches pour faciliter la
lecture. Leur différenciation visuelle reste une évolution annoncée par la source,
à livrer avant de s’appuyer dessus pour expliquer un puzzle au joueur.

### Des leurres qui enseignent quelque chose

Un bon leurre correspond à une hypothèse plausible : prendre le chemin le plus
court, employer une masse pour agir sur une bille, chercher à gagner de la
hauteur avec un tremplin. L’essai montre alors pourquoi cette hypothèse échoue.

Commencer avec un ou deux objets excédentaires, pas un catalogue. Éviter le leurre
qui oblige à connaître une propriété cachée. Le tremplin qui ne peut pas dépasser
la hauteur de chute doit avoir été présenté avant de devenir un faux ami.

Les solutions alternatives sont souhaitables lorsqu’elles expriment une autre
compréhension de la machine. Une poutre qui contourne toute la scène et dépose
immédiatement la rouge dans le panier détruit en revanche le puzzle.

## 2. Faire varier la difficulté sans demander plus de précision

Toutes les catégories conservent une machine de 5 à 8 étapes, environ 3 à 4
réparations, des placements tolérants et un déroulement compatible avec les
20 secondes actuelles. Les seuils de 0,3 unité pour les placements et de 0,5 s
pour les fenêtres temporelles sont des minima à vérifier, pas des cibles à frôler.

| Catégorie | Ce que le joueur doit comprendre | Ce qui facilite la lecture |
| --- | --- | --- |
| Découverte | Une chaîne séquentielle et un effet à distance | Une bille de service ; départs retenus jusqu’au bon événement ; larges réceptions |
| Intermédiaire | Un objet utilisé autrement, ou deux branches indépendantes | Un point d’attente visible ; résultat de chaque branche observable séparément |
| Avancé | Ordre de deux événements, commande commune, trajet volontairement plus long | Attentes stables ; retard fourni par une pièce fixe ; échec local identifiable |
| Expert | Plusieurs contraintes connues et choix entre deux stratégies | Même tolérance de placement ; aucun nouveau comportement caché |

Quelques façons de durcir un puzzle sans ajouter d’objets :

- Remplacer deux commandes indépendantes par une commande commune.
- Faire que la bille de service arrive au bon endroit mais ne doive pas y rester.
- Faire partager une portion de trajet à deux billes, à des moments différents.
- Rendre deux solutions possibles : une évidente et coûteuse, une plus économique.
- Demander de conserver un état final, après avoir obtenu le premier succès.

Ne pas cumuler ces variations dès le premier niveau d’une famille. Les étoiles
récompensent actuellement le nombre d’objets : garder la réussite principale
accessible, puis proposer l’économie de pièces comme seconde lecture du puzzle.
Les seuils d’étoiles seront fixés après recherche de solutions alternatives.

## 3. Huit puzzles avec les familles d’objets décrites comme existantes

Ces fiches décrivent des machines à esquisser puis à éprouver. Les fils, réglages,
objets de départ et délais fournis par la machine sont fixés par l’auteur. Le
joueur ne câble rien et ne modifie aucune propriété.

Les inventaires sont indicatifs : les longueurs de poutres, positions et angles
restent à déterminer au prototypage. Une réparation désigne une fonction à
rétablir, pas la certitude qu’un objet suffira avant essai.

### A1 — Service à l’étage

**Découverte · idée centrale : une bille travaille pour l’autre.**

La rouge attend au rez-de-chaussée ; son panier se trouve sur un petit balcon.
À côté, une bille bleue semble suivre une piste sans rapport avec sa destination.

**Chaîne envisagée :** bleue descend → rejoint un bouton → reste dessus dans une
petite réception → ventilateur vertical démarre → rouge monte → sortie latérale
la recueille → panier.

**Trois réparations :** acheminer la bleue ; l’empêcher de quitter le bouton ;
recueillir la rouge à la sortie du souffle. Inventaire de départ : des poutres de
longueurs différentes, dont une excédentaire, et un tremplin tentant mais inutile
pour gagner l’altitude manquante.

**Déclic :** il ne suffit pas de toucher le bouton. Il faut lui laisser un gardien.
Le premier essai peut montrer la rouge commencer à monter puis retomber.

**À vérifier :** petite élévation compatible avec le ventilateur ; écran
involontaire créé par la poutre de réception ; possibilité d’une simple rampe
jusqu’au panier. La bleue doit reposer sur le capuchon, sans être portée par son
arrêt. Le maintien du bouton doit être beaucoup plus tolérant qu’un équilibre.

### A2 — Après vous

**Intermédiaire · idée centrale : deux services doivent se rendre dans l’ordre.**

Une première bleue met en marche un ascenseur à air. Une seconde voyage sur un
convoyeur avant d’ouvrir la sortie du palier supérieur.

**Chaîne envisagée :** bleue A maintient un bouton → ventilateur monte la rouge
vers un palier → rouge attend sur une trappe fermée ; en parallèle, bleue B
traverse un convoyeur → rejoint un autre bouton → trappe s’ouvre → rouge descend
par une réception jusqu’au panier.

**Trois réparations :** guider A vers son poste ; raccorder la sortie du
convoyeur de B ; recevoir la chute finale de la rouge. Les postes de maintien
sont déjà formés et généreux.

**Déclic :** le convoyeur de B sert surtout à laisser le premier travail se
terminer. Le détour a une fonction.

**À vérifier :** si la trappe s’ouvre avant que la rouge atteigne le palier, la
rouge doit réellement manquer sa réception. Sinon le niveau ne fait que raconter
un ordre qui n’est pas nécessaire. Prévoir une arrivée nettement après celle de
la rouge, puis une ouverture maintenue ; éviter un rendez-vous fugace.

### A3 — Le gardien de la porte

**Découverte après A1 · idée centrale : rendre une commande durable.**

Une masse suspendue est le gardien idéal d’un bouton. Encore faut-il la faire
descendre au bon endroit.

**Chaîne envisagée :** bleue atteint un levier → première trappe libère une masse
fixée au départ dans la scène → masse tombe sur un bouton → seconde trappe
libère la rouge → rouge chute sur un tremplin → rebond recueilli → panier.

**Trois réparations :** arrivée de la bleue contre le levier ; placement du
tremplin ; réception du rebond. Le puits de la masse et le bouton sont déjà
correctement alignés. Inventaire : poutres, tremplin, une poutre supplémentaire.

**Déclic :** le poids ne propulse rien. Il transforme le petit geste de la bleue
en une ouverture qui dure.

**À vérifier :** panier plus bas que le point de libération de la rouge ; impact
fiable sur le levier ; masse isolée du trajet des billes. Ne pas fournir une masse
libre que le joueur pourrait simplement poser sur le bouton en ignorant toute
la première moitié de la machine.

### A4 — Retour à l’expéditeur

**Intermédiaire · idée centrale : un transporteur peut faire repartir en sens inverse.**

La rouge roule sur un convoyeur qui l’amène contre un arrêt à gauche. Son panier
est à droite. La machine semble travailler à l’envers.

**Chaîne envisagée :** rouge est retenue à gauche du convoyeur → bleue descend
par sa piste → frappe un levier initialement à gauche → levier passe à droite →
convoyeur inverse son sens → rouge repart → petit rebond et réception → panier.

**Trois réparations :** guider la bleue vers le bon côté du levier ; placer un
tremplin après le convoyeur ; recueillir le rebond. L’attente à gauche est déjà
sécurisée et ne demande pas d’ajustement au joueur.

**Déclic :** un premier déplacement dans le mauvais sens peut être normal.

**À vérifier :** passage fiable du levier jusqu’au cran droit, sans arrêt
aléatoire au centre ; reprise de la bille après inversion ; impossibilité de
court-circuiter le convoyeur avec une longue poutre. Aucun fil bouton → convoyeur.

### A5 — Le courant d’air

**Intermédiaire · idée centrale : une poutre peut protéger au lieu de porter.**

Un ventilateur latéral souffle sur le seul passage praticable. Il chasse la
rouge hors de sa trajectoire, alors que son trajet semble pourtant bien réparé.

**Chaîne envisagée :** bleue rejoint un levier → trappe libère la rouge → rouge
prend de l’élan sur une pente fixe → traverse le passage exposé → rejoint un
tremplin déjà installé → rebond recueilli → panier.

**Trois réparations :** guider la bleue ; placer un écran entre le ventilateur
et le passage ; recueillir le rebond final. Inventaire : poutres, avec au moins
une pièce suffisamment courte pour protéger sans condamner le passage, et un
objet excédentaire.

**Déclic :** la poutre décisive ne touche jamais la rouge. Son effet se lit dans
l’interruption du souffle.

**À vérifier :** masquer tout le segment de trajectoire sensible, pas un point
unique ; conserver une large marge ; empêcher l’écran de devenir une passerelle
directe jusqu’au panier. Si le vent ne rend pas son obstruction visible, cette
idée attend une amélioration visuelle.

### A6 — La porte de trop

**Avancé · idée centrale : une commande produit un effet utile et un effet gênant.**

Le même levier ouvre deux trappes : celle de la rouge et celle d’une deuxième
bleue qui risque d’encombrer sa réception.

**Chaîne envisagée :** bleue A atteint le levier → deux trappes s’ouvrent → rouge
part vers son rebond ; bleue B chute vers le même secteur → un déflecteur l’envoie
dans une poche latérale → rouge rejoint sa réception → panier.

**Quatre réparations :** arrivée de A ; déviation de B ; placement du tremplin
de la rouge ; réception finale. La poche de B fait partie de la scène et garde
la bille à l’intérieur du plateau.

**Déclic :** une bille de service peut devenir un encombrant. Il faut organiser
les conséquences du déclenchement, pas seulement obtenir ce déclenchement.

**À vérifier :** l’interférence de B doit être franche et compréhensible, plutôt
qu’une collision aléatoire près du panier. Les départs peuvent être étagés par
la géométrie pour que l’on voie d’abord le problème. Une source qui commande deux
barrières respecte le câblage décrit dans la source.

### A7 — Lever le rideau

**Avancé · idée centrale : activer un effet sans toucher à sa commande.**

Le ventilateur tourne déjà, mais rien ne bouge : une masse suspendue lui fait
écran. La bleue doit faire tomber ce rideau de fer.

**Chaîne envisagée :** bleue atteint un levier → trappe retire le support de la
masse → masse descend sous l’axe d’un souffle horizontal → vent atteint la rouge
→ rouge rejoint un tremplin fixe → rebond recueilli → panier.

**Trois réparations :** guidage de la bleue ; réception de la masse hors du
souffle et du trajet utile ; réception du rebond de la rouge.

**Déclic :** le ventilateur fonctionnait depuis le début. C’est le chemin de son
souffle qui était fermé. A5 apprend à créer une ombre ; A7 demande à l’enlever.

**À vérifier :** la masse doit descendre entièrement sous le souffle et rester
loin de la rouge. Ne pas utiliser une masse qui tombe devant un ventilateur
vertical : elle risquerait de continuer à l’occulter. La réception choisie par
le joueur doit avoir une vraie fonction, sans masquer à nouveau le vent.

### A8 — Prenez votre temps

**Avancé à expert · idée centrale : le chemin le plus court est le mauvais.**

Un bouton ouvre à la fois le départ de la rouge et une barrière qui lui sert de
pont plus loin. Tant que le départ est ouvert, le pont manque.

**Chaîne envisagée :** bleue passe sur un bouton → trappe de départ et pont
s’ouvrent → rouge est libérée → détour par un convoyeur → bleue quitte le bouton
→ pont se referme → rouge traverse le pont → panier.

**Trois réparations :** trajet lent de la bleue sur le bouton, puis vers sa
sortie ; entrée de la rouge sur le détour ; réception après le pont. Les éléments
qui imposent le délai principal sont fixés dans la machine.

**Déclic :** maintenir le bouton enfoncé serait ici une erreur. Le joueur
réemploie sa connaissance du bouton momentané pour lui demander l’inverse d’A1.

**À vérifier en priorité :** obtenir une pression assez longue pour libérer la
rouge, suivie d’un relâchement fiable. Le convoyeur doit donner une marge généreuse
après fermeture du pont ; ne pas concevoir un passage juste à la fermeture. La
rouge ne peut pas simplement attendre au bord du trou sans tomber, ni rejoindre
le panier en passant dessous. Si cette géométrie impose de la précision, réserver
la variante au retardateur futur au lieu d’insister.

## 4. Cinq puzzles qui justifieraient les évolutions annoncées

Ces niveaux nécessitent des pièces ou objectifs non encore implémentés selon la
source. Ils constituent des candidats pour décider à quoi ces évolutions serviront.
Les comportements nouveaux mentionnés restent à définir et à valider.

### B1 — La tournée des dominos

**Découverte d’une nouvelle pièce · requis : dominos.**

Une bille lance une rangée de dominos. Le dernier actionne un levier qui démarre
un ventilateur et libère la rouge. Celle-ci rejoint son panier par une réception.

**Chaîne :** bleue descend → première rangée tombe → virage entre deux rangées
→ dernier domino frappe le levier → ventilateur et trappe s’activent → rouge
est transportée → panier.

**Trois réparations :** arrivée de la bleue ; relais au virage des dominos ;
réception de la rouge. Les longues rangées sont déjà présentes : le joueur ne
passe pas son temps à poser vingt éléments identiques.

**Intérêt :** spectacle, direction de propagation très visible et propagation
plus lente qu’une chute libre. Le virage est une question de transmission, pas
une recherche de distance au millimètre.

**Variante ultérieure :** une bifurcation déclenche deux branches, dont l’une
prépare une réception pour l’autre. La première apparition reste séquentielle.

### B2 — Le réveil du gardien

**Intermédiaire · requis : retardateur.**

La machine doit préparer un souffle avant de libérer sa passagère.

**Chaîne :** bleue rejoint et maintient un bouton → ventilateur démarre et
retardateur reçoit le signal → réveil compte visiblement → trappe s’ouvre →
rouge rejoint le souffle → réception latérale → panier.

**Trois réparations :** arrivée de la bleue ; entrée de la rouge dans le trajet
soufflé ; sortie vers le panier. Durée du réveil et câblage imposés par le niveau.

**Intérêt :** rendre tangible l’idée de « préparer, puis libérer ». Le joueur
organise des trajets autour d’un délai connu, sans saisir une valeur.

**À décider :** réaction du retardateur à une impulsion, à une entrée maintenue
et à sa disparition. Pour cette famille, proposition simple : une activation
lance une seule attente, puis une sortie maintenue jusqu’à la fin de l’essai.
C’est une proposition de règle, pas une propriété acquise.

### B3 — Le colis fait le pont

**Intermédiaire à avancé · requis : piston et boîte.**

La boîte n’est pas la cargaison : c’est une pièce de la voie que la machine doit
installer avant le passage de la rouge.

**Chaîne :** bleue atteint un levier → piston pousse une boîte → boîte entre
dans un logement → son poids maintient un bouton → trappe libère la rouge →
rouge traverse le dessus de la boîte → réception → panier.

**Trois réparations :** arrivée de la bleue ; guidage de la boîte vers son
logement ; réception de la rouge. La course du piston et le logement sont fixés.

**Intérêt :** une première machine construit une partie de la seconde. Le
bouton atteste physiquement que le pont est en place avant de donner le départ.

**À vérifier :** la boîte doit être stable, porter la bille et appuyer sur le
bouton sans être bloquée au-dessus. Un logement légèrement plus bas que les accès
peut permettre le passage en descente. S’il faut une boîte calée au cheveu près,
revoir le logement. La boîte doit être reconnaissable comme surface porteuse.

### B4 — Les deux quais

**Avancé · requis : plusieurs objectifs et identification des paires.**

Deux rouges partent vers deux paniers. Un mécanisme commun prépare leur départ,
puis chaque trajet demande une solution différente.

**Chaîne :** bleue actionne un levier → trappe A s’ouvre et ventilateur B démarre
→ rouge A descend par un convoyeur ; rouge B rejoint un étage supérieur → deux
réceptions distinctes → deux paniers occupés.

**Quatre réparations :** commande commune ; raccord de la voie A ; entrée de B
dans son souffle ; réception de B. La chaîne commune et les deux branches doivent
rester suffisamment courtes pour être lues sur le même écran.

**Intérêt :** satisfaire deux problèmes avec un inventaire partagé. L’objet que
l’on ajoute confortablement à A peut manquer à B. Commencer avec assez de pièces ;
réserver le partage le plus économique au défi facultatif.

**À décider :** paniers interchangeables ou paires précises. Pour ce puzzle,
préférer des paires identifiées par des symboles en plus de la couleur. Proposition
de victoire : toutes les balles attendues sont simultanément dans leurs paniers
pendant au moins 0,5 s. Éviter une première livraison mémorisée si la bille est
ensuite éjectée.

### B5 — On éteint en sortant

**Expert après apprentissage des pièces · requis : retardateur, piston,
objectif d’état final.**

Il faut livrer la rouge grâce au ventilateur, puis laisser la machine au repos.

**Chaîne :** bleue maintient un bouton → ventilateur et retardateur démarrent
→ rouge monte → réception stable dans le panier → réveil déclenche le piston →
piston dégage la bleue du bouton → ventilateur s’arrête.

**Trois réparations :** arrivée de la bleue ; réception de la rouge ; évacuation
de la bleue poussée par le piston. Le trajet de sortie empêche la bleue de revenir
sur le capuchon.

**Intérêt :** réussir un transport puis annuler proprement le moyen qui l’a rendu
possible. La séquence a une vraie conclusion : livraison, petit dernier geste,
silence.

**À décider :** objectif final explicite « rouge au panier + ventilateur arrêté
pendant une durée lisible ». Il faut une activation mémorisée du retardateur et
un piston qui ne répète pas son coup tant que son entrée reste active. La rouge
doit pouvoir patienter dans le panier ; aucune synchronisation à la fraction de
seconde n’est souhaitée.

## 5. Quels assets donneraient le plus de possibilités ?

### Pièces déjà annoncées : le bénéfice à rechercher

| Asset | Nouvel usage dans les puzzles | États et indices à montrer | Vigilance |
| --- | --- | --- | --- |
| Goulotte courbe | Recevoir et rediriger une trajectoire avec une grande tolérance | Entrée évasée, sortie nette, intérieur visible | Éviter les tuyaux opaques qui cachent les causes d’un échec |
| Dominos | Transmettre une action par contacts successifs ; faire une bifurcation | Debout, en chute, couché ; côté de contact lisible | Quelques relais à placer, grandes séquences déjà montées |
| Réveil retardateur | Préparer avant de libérer ; séparer deux passages | Repos, décompte visible, déclenchement, état final | Règles d’activation simples et délai décidé par l’auteur |
| Piston | Déplacer latéralement une boîte, déloger un poids, donner une impulsion | Repos, course, position atteinte ; empreinte de la course | Définir la répétition, le retour et ce qui arrive si la course est bloquée |
| Boîte | Construire un pont mobile ; recevoir une poussée ; servir de support | Dessus porteur, silhouette et matériau distincts | Lui donner un rôle différent de la masse existante |
| Masse de 1 kg | Offrir un effort intermédiaire dans une mécanique qui le justifie | Petit gabarit et inscription lisible | Une version moins lourde n’est intéressante que si une situation rend ce choix pertinent |

**Priorité proposée :** goulotte et dominos d’abord, pour améliorer la tolérance
et enrichir les chaînes visibles ; réveil ensuite pour mieux composer les ordres
d’événements ; piston avec boîte pour permettre à la machine de se reconfigurer.
Ce classement concerne le gain de conception attendu, pas un coût technique
évalué dans le code.

La masse de 1 kg et la distinction bois/métal peuvent attendre leur puzzle
spécifique. Si les deux boîtes ne se comportent pas différemment, commencer avec
une seule : multiplier les silhouettes ne multiplie pas les choix intéressants.

### Six extensions fondées sur les formes et les mouvements

Ces idées dépassent les évolutions déjà décidées. Elles cherchent la variété
dans les contacts, pivots, guidages et répartitions de masse. Elles ne nécessitent
pas d’animation dessinée image par image. Sans examiner le moteur, on ne peut
cependant pas garantir leur coût ni leur stabilité.

| Pièce proposée | Ce qu’elle permet | Images à produire | Point physique à éprouver |
| --- | --- | --- | --- |
| **Trieur à ouvertures** | Une petite bille passe ; un colis plus large continue vers une autre sortie | Un cadre rigide et des cargaisons très différentes | Éviter le coincement ; toutes les orientations du colis doivent respecter le tri |
| **Auget à contrepoids** | Retenir une première bille, basculer avec une seconde, puis se vider | Un godet, son support et un contrepoids, tous rigides | Deux états francs ; éviter que la première bille déclenche par son seul choc |
| **Navette sur rail** | Transporter une bille à travers une interruption de voie | Une nacelle rigide et un rail ; translation de l’ensemble | Chargement, arrêt et déchargement sans réglage fin |
| **Portillon à sens unique** | Laisser entrer une bille puis empêcher son retour | Un battant et un montant ; rotation du battant | Retour par gravité, butée et absence de coincement |
| **Volet-voile** | Transformer un souffle en rotation, pour dégager un trajet ou un autre souffle | Un panneau rigide sur pivot, un socle | Couple suffisant, ouverture stable et absence d’oscillation parasite |
| **Roue à godets** | Recevoir, retenir puis distribuer des billes à des sorties successives | Une roue rigide avec logements et un support | Rotation et indexation fiables ; mécanisme plus ambitieux que les cinq précédents |

**Le trieur** introduit une question de forme : « quel objet peut passer ici ? »
Il peut séparer commande et objectif, protéger une voie d’un gros colis ou envoyer
deux cargaisons vers des fonctions différentes. Ouvertures et silhouettes doivent
se comparer à l’œil, avec des différences franches. Les variations de taille et
de forme sont de nouvelles capacités, pas des propriétés actuellement décrites
pour les balles.

**L’auget** introduit l’accumulation. Il rassemble une charge avant de la
transmettre. L’auteur fixe son contrepoids ; le joueur organise les arrivées.
Sa première utilisation oppose nettement une bille à deux, sans dosage continu.
Si un auget libre est instable, il faudra étudier un arrêt ou un loquet visible :
ce serait un mécanisme supplémentaire, pas un détail à dissimuler.

**La navette** dissocie transporter et faire rouler. Le passager peut rester
immobile relativement à son support pendant que la machine change sa position.
Au départ, préférer un rail légèrement descendant et un seul voyage : cela évite
d’inventer immédiatement câbles, treuils et trajets de retour.

**Le portillon** crée une mémoire par la géométrie : une bille a franchi une
frontière et ne peut plus revenir. Il peut rendre une réception robuste,
permettre un trajet aller-retour avec deux sorties distinctes, ou conserver le
résultat d’une brève poussée. Il peut améliorer un puzzle sans le compliquer.

**Le volet-voile** crée une commande physique à distance. Le vent déplace le
volet ; le volet change la scène. Le souffle devient autre chose qu’un moyen de
transport de la rouge. Une petite plaque montée sur un axe suffit ; aucun tissu
à déformer ou à animer.

**La roue à godets** pourrait livrer une bille, utiliser la suivante comme
contrepoids, ou faire attendre un passager dans un logement. Son animation est
économique, mais une bonne distribution mécanique ne l’est pas nécessairement.
Commencer par un seul transfert, puis décider si plusieurs positions justifient
le mécanisme. C’est un candidat pour plus tard.

Pour explorer au-delà des pièces déjà prévues, je choisirais **trieur, auget,
navette**, dans cet ordre. Ils apportent trois questions distinctes : quelle
forme passe, quelle quantité déclenche, quel support doit se déplacer ?

Un candidat mérite sa place si l’on peut décrire plusieurs puzzles différents
avec lui, dont un accessible. Remplacer un bouton par une autre silhouette peut
être un bon habillage, mais n’apporte pas à lui seul une nouvelle mécanique.

### Quatre puzzles pour éprouver ces nouvelles directions

**C1 — Le guichet sélectif · intermédiaire · trieur.** Une bleue actionne un
levier qui libère la rouge et un gros colis. Le trieur laisse descendre la rouge
vers une trappe d’attente, tandis que le colis rejoint un bouton. Le bouton ouvre
la trappe ; la rouge rejoint une réception puis son panier. Trois réparations :
commande de départ, acheminement du colis, réception finale. Déclic : la forme
choisit la fonction, sans aiguillage commandé. Vérifier que le colis ne peut pas
passer dans l’ouverture en pivotant, et que la rouge ne peut pas suivre la voie
du colis jusqu’au panier.

**C2 — Deux pour partir · intermédiaire · auget.** Deux bleues arrivent par des
voies différentes. La première attend dans le godet ; la seconde fait basculer
l’ensemble. Les billes déversées rejoignent une réception qui maintient un bouton,
libère la rouge et lance son parcours jusqu’au panier. Trois réparations : les
deux alimentations et la réception finale de la rouge. Déclic : arriver tôt
ne sert à rien tant que la charge n’est pas complète. La collecte joue le rôle
d’un rendez-vous stable. Prévoir une entrée amortie afin que la première bille
ne déclenche pas le godet par la violence de sa chute.

**C3 — Correspondance sur le quai · avancé · navette.** Une bleue libère la rouge
dans une nacelle encore retenue. Une seconde bleue, retardée par un convoyeur,
actionne le levier qui libère la navette. Elle descend son rail, rejoint une butée,
puis une sortie aménagée recueille la rouge vers le panier. Trois réparations :
commande du chargement, guidage dans la nacelle, réception au quai d’arrivée.
Déclic : déplacer la réception, puis transporter sa passagère. Le déchargement
est le point à démontrer au prototype : une éjection par choc serait fragile ;
préférer une ouverture mécanique du godet au contact du quai si une simple sortie
en pente ne suffit pas. Cette ouverture augmente le périmètre de la pièce.

**C4 — La fenêtre de l’atelier · avancé · volet-voile.** Une bleue maintient un
bouton qui alimente un premier ventilateur. Son souffle fait pivoter un volet,
qui masquait un second ventilateur déjà allumé. Ce second souffle peut alors
envoyer la rouge vers un rebond, une réception et son panier. Trois réparations :
arrivée de la bleue, placement du tremplin, réception finale. Déclic : un souffle
en libère un autre. Le volet et ses butées sont fixes ; son angle ouvert doit
rester stable, et ne pas couper lui-même le souffle qui le maintient. Une belle
suite à A5 et A7, une fois leur principe compris.

### Animaux et gadgets compatibles avec des images générées

Un animal peut être **passager, charge ou témoin**, sans devoir jouer une scène
corporelle complexe. Quelques directions possibles :

- **Un escargot passager**, déjà installé sur une nacelle. Il ne rampe jamais :
  la machine lui fournit le voyage. Une pose au repos et une pose d’arrivée
  suffisent. Le puzzle porte sur le transporteur.
- **Un hérisson déjà roulé en boule**, transporté comme un corps rond. Une pose
  déroulée à l’arrivée peut servir de récompense visuelle. Son déroulement ne
  change pas les collisions pendant l’essai.
- **Une chouette de guichet**, immobile, qui ouvre les yeux lorsque son poste
  reçoit la bonne livraison. Deux images indiquent l’état ; aucune marche,
  poursuite ni manipulation d’objet.
- **Des petits automates de fer-blanc**, composés de deux ou trois pièces
  rigides. Un bec sur pivot, un œil qui s’allume ou une tête qui bascule suffisent
  à leur donner du caractère. Leur action reprend un mécanisme clairement montré.

Ce sont d’abord des pistes de direction artistique. Les premiers prototypes
peuvent conserver balles et paniers ; remplacer une balle par un personnage ou
un panier par une station demandera une décision de présentation et, selon le
cas, de modèle d’objectif. Ne pas déguiser un comportement différent sous une
simple nouvelle image.

**Brief d’asset recommandé :** vue latérale orthographique, fond transparent,
silhouette lisible en petit, pivot repérable, éléments mobiles séparés. Une pièce
qui tourne reste un dessin rigide. Pour deux états illustrés, conserver cadrage,
échelle et points d’ancrage. Éviter une perspective qui fait croire à un passage
derrière la scène alors que les collisions sont en 2D.

Les corps souples, tissus, eau simulée, longues cordes nouables et locomotions
animales complexes ne sont pas de bons premiers paris sous cette contrainte.
Ils peuvent sembler naturels à dessiner, tout en rendant les réactions moins
prévisibles ou l’animation beaucoup plus exigeante.

### Assets visuels : rendre le raisonnement observable

Quelques améliorations pourraient rendre les puzzles meilleurs avant toute
nouvelle mécanique :

- **Billes de service distinctes des objectifs**, avec un signe de forme ou un
  motif en complément de la couleur.
- **Vent visible**, avec des filets qui s’arrêtent sur les écrans. Un arrêt du
  souffle doit se distinguer d’un ventilateur éteint.
- **Sens du convoyeur lisible**, y compris à l’arrêt et après inversion.
- **Bouton nettement enfoncé**, et fil dont l’état actif se voit sans animation
  agressive. L’information doit rester accessible sans le son.
- **Barrière dont les deux positions se comprennent**, pour révéler qu’elle peut
  aussi faire office de plancher ou de pont.
- **Réveil qui montre le temps restant** et piston qui montre sa course.
- **Paniers identifiés par pictogrammes**, si les objectifs multiples arrivent.

Pour l’habillage, proposer trois petits univers : le bureau postal, la serre de
bricoleur et l’atelier de nettoyage. Chaque famille peut donner des noms, fonds,
sons et quelques décorations aux machines. Les fleurs, enveloppes ou balais ne
créent pas de règles supplémentaires tant qu’ils restent décoratifs. Garder les
pièces actives contrastées et les fonds discrets, notamment sur téléphone.

## 6. Des objectifs plus variés

Changer l’objectif peut renouveler une machine sans ajouter un nouvel objet.
Ces objectifs sont des évolutions proposées, à introduire progressivement après
la livraison au panier et les objectifs multiples déjà annoncés.

| Objectif | Exemple de mission | Ce qu’il change dans le raisonnement | Condition à rendre explicite |
| --- | --- | --- | --- |
| Livrer plusieurs balles | « Remplis les deux quais » | Répartir les pièces entre des branches | Présence finale simultanée ; correspondance éventuelle des paires |
| Traverser des étapes dans l’ordre | « Fais tamponner le colis avant livraison » | Concevoir un itinéraire plutôt qu’une seule arrivée | Repères A puis B puis panier, avec validation visible de chaque passage |
| Maintenir une activation | « Alimente la serre pendant trois secondes » | Stabiliser une position ; distinguer toucher et tenir | Jauge de maintien continu, remise à zéro expliquée visuellement |
| Finir au repos | « Livre, puis coupe le ventilateur » | Annuler un état après l’avoir exploité | État final des seuls appareils marqués comme objectifs |
| Assembler une situation stable | « Installe le pont et gare la caisse » | Faire construire la scène par sa propre machine | Zone d’accueil généreuse, immobilité lisible, pas de pose exacte invisible |
| Protéger une pièce marquée | « Livre sans faire tomber le colis fragile » | Contrôler les effets secondaires de la chaîne | D’abord une zone interdite bien visible ; éviter un seuil d’impact caché |
| Réunir deux activations | « Appuie sur les deux plateaux ensemble » | Faire converger deux branches | Maintien commun long et lisible, plutôt qu’un instant précis |

Un objectif de protection ne devrait pas rendre toute collision interdite. Une
règle simple, comme « cette caisse ne doit pas entrer dans la fosse marquée »,
permet de comprendre immédiatement un échec. Le réalisme de la casse serait un
autre chantier.

Les rendez-vous sont plus accueillants lorsque le premier arrivé peut attendre
le second. Les rencontres entre deux mobiles dans une fenêtre courte restent
réservées à des défis facultatifs, avec les mêmes exigences de tolérance.

**À éviter comme premières évolutions :** finir le plus vite possible, limiter
fortement le nombre d’essais, cacher des conditions de victoire, ajouter plusieurs
contraintes négatives en même temps. Ces règles risquent de punir l’observation
et l’expérimentation qui font le plaisir du jeu.

## 7. Une progression possible

L’ordre ci-dessous n’est pas une numérotation de campagne définitive. C’est une
courbe d’apprentissage à tester avec des joueurs.

1. **A1, Service à l’étage** : identifier bille utile et bille objectif ; tenir
   un bouton ; lire un effet à distance.
2. **A3, Le gardien de la porte** : comprendre une chaîne longue mais séquentielle,
   puis un rebond dont la réception est large.
3. **A4, Retour à l’expéditeur** : découvrir l’inversion et l’attente stable.
4. **A5, Le courant d’air** : changer le rôle d’une poutre.
5. **B1, La tournée des dominos**, quand disponible : respiration spectaculaire
   et nouvelle pièce dans une machine facile à lire.
6. **A2, Après vous** : organiser deux branches dans le bon ordre.
7. **A7, Lever le rideau** : réemployer l’écran au vent avec une solution inverse.
8. **B2, Le réveil du gardien**, quand disponible : lire un délai explicite.
9. **A6, La porte de trop** : gérer les deux conséquences d’une commande.
10. **B3, Le colis fait le pont**, quand disponible : construire une réception
    avant d’y envoyer la rouge.
11. **A8, Prenez votre temps** : comprendre pourquoi relâcher et ralentir.
12. **B4, Les deux quais**, puis **B5, On éteint en sortant** : combiner les acquis.

Alterner défi et respiration. Un nouveau chapitre n’a pas besoin d’être toujours
plus difficile : il peut présenter une pièce amusante dans une machine lisible,
puis demander davantage de raisonnement au niveau suivant. Chaque introduction
conserve néanmoins plusieurs réparations et une véritable réaction en chaîne.

## 8. Comment choisir les premiers prototypes

Ne pas produire toute cette collection immédiatement. **Commencer par A1**, puis
le faire jouer avant de construire le suivant. Il vérifie qu’une machine à trois
réparations peut être accueillante sans se réduire à compléter une rampe.

Si A1 fonctionne, **A5** éprouve une utilisation détournée d’un objet ; **A8**
éprouve un raisonnement temporel plus riche. Ces trois candidats couvrent des
plaisirs différents et donnent des informations utiles sur le jeu.

Pour chaque prototype, préparer :

- Une esquisse qui montre tous les départs, les fils, les attentes et les
  réceptions. Elle doit rester lisible à la taille d’un téléphone.
- Une solution de référence et au moins deux hypothèses d’erreur plausibles.
- Les trois ou quatre endroits cassés, leur fonction, l’inventaire proposé et
  le raccourci le plus dangereux.
- Une explication en une phrase du déclic recherché. Si elle nécessite de décrire
  dix détails, simplifier la machine.

Lors du jeu, observer surtout :

- Le joueur sait-il ce qu’il cherche à obtenir, puis ce qui a raté ?
- Modifie-t-il son hypothèse entre deux essais, ou déplace-t-il au hasard ?
- Trouve-t-il l’idée avant d’avoir trouvé le placement exact ? Si oui, combien
  d’essais inutiles reste-t-il ?
- Regarde-t-il la réaction en chaîne réussie avec plaisir ?
- Une solution inattendue simplifie-t-elle joliment la machine, ou en ignore-t-elle
  tout le principe ?

**Retenir un niveau lorsque la découverte est intéressante et sa réalisation
confortable.** Si le raisonnement est bon mais le placement frustrant, agrandir
les réceptions, ajouter un état d’attente ou employer une goulotte. Si la solution
est évidente et l’exécution laborieuse, ajouter des pièces n’aidera probablement
pas : il faut changer la question posée par la machine.
