# Cahier des charges

Statut : ebauche de cadrage, version 0.1.

## Vision

Le projet est un jeu de puzzles mecaniques 2D moderne, original et mobile-first.
Le joueur place un petit nombre d'objets dans une scene, lance la simulation et
observe si la construction atteint un objectif clairement exprime.

Le jeu s'inspire du plaisir de construire une reaction en chaine, sans chercher a
reproduire les objets, niveaux, graphismes ou mecanismes d'un jeu existant. Son
identite visuelle sera construite par iterations successives.

## Principes produit

- Une regle nouvelle est introduite seule ou avec tres peu d'autres nouveautes.
- Les premiers niveaux se comprennent en quelques secondes.
- La complexite vient progressivement des combinaisons, pas d'interfaces cachees.
- Jouer, modifier une solution et creer un niveau emploient le meme langage
  d'interaction.
- Une erreur doit pouvoir etre annulee rapidement ; l'experimentation est au coeur
  de la boucle de jeu.
- Le jeu fonctionne hors ligne apres sa premiere installation.
- La version 1 ne requiert ni compte, ni backend, ni connexion permanente.

## Public et plateformes

La cible principale est le navigateur d'un telephone recent, en portrait comme en
paysage. Tablettes et ordinateurs sont egalement pris en charge. Le clavier et la
souris ameliorent le confort mais ne sont jamais requis pour une fonction
essentielle.

La liste exacte des navigateurs et appareils supportes sera fixee avant le premier
jalon de production et deviendra une matrice de tests explicite.

## Boucle principale

1. Comprendre l'objectif et observer les elements deja places.
2. Ouvrir le tiroir d'objets disponibles.
3. Placer, deplacer, pivoter ou relier les objets autorises.
4. Lancer la simulation.
5. Observer, arreter ou reinitialiser.
6. Ajuster la construction jusqu'a la reussite.
7. Passer au niveau suivant ou continuer a experimenter.

Le passage entre construction et simulation doit etre immediat. Le reset restitue
exactement l'etat precedant le lancement.

## Modes

### Campagne

La PWA embarque une campagne jouable hors ligne. Un manifeste versionne definit
l'ordre des chapitres, les prerequis et les objets introduits par chaque niveau.
La progression du joueur est conservee localement.

### Resolution d'un niveau

Le joueur ne peut manipuler que ce que le niveau autorise : inventaire limite,
objets deja places eventuellement verrouilles, zone de construction et parametres
modifiables.

### Creation de niveau

Le createur utilise le meme plateau et les memes gestes, avec des capacites
supplementaires : catalogue complet autorise, proprietes du monde, inventaire,
verrouillage, objectifs, metadonnees, validation et partage.

L'editeur est utilisable sur telephone des le premier jalon fonctionnel. Une
interface plus dense peut tirer parti d'un grand ecran, mais aucune fonction
d'auteur indispensable ne doit devenir exclusivement desktop.

## Interaction mobile

- Un tiroir bas donne acces aux objets, avec categories, recherche et objets
  recents.
- Un toucher selectionne ; un glisser deplace l'objet selectionne.
- Des poignees explicites gerent rotation et connexions.
- Le panoramique et le zoom restent disponibles sans entrer en conflit avec le
  deplacement d'un objet.
- Undo, redo, test, pause et reset restent accessibles avec le pouce.
- Aucune action essentielle ne depend du hover, du clic droit ou d'un raccourci.
- Les zones tactiles et les marges d'ecran tiennent compte des petits appareils et
  des safe areas.

Les gestes exacts feront l'objet de prototypes d'interaction testes sur de vrais
telephones. Ces prototypes pourront etre remplaces ; les scenarios de test tactile
qu'ils etablissent seront conserves.

## Progression pedagogique

La campagne suit une courbe en couches :

1. observer la gravite, lancer et reinitialiser ;
2. placer une poutre pour guider la balle ;
3. faire pivoter une poutre et comprendre les pentes ;
4. choisir entre plusieurs longueurs de poutre ;
5. combiner plusieurs poutres sans exiger de rebond intentionnel ;
6. observer puis placer une bascule ;
7. combiner poutres, bascule et trajectoire vers le panier.

Chaque niveau declare les concepts qu'il introduit et ceux qu'il suppose acquis.
Un chapitre commence par une demonstration guidee, puis retire progressivement les
aides. Le dernier niveau d'un chapitre combine ses acquis sans introduire une regle
inconnue.

Les huit premiers niveaux et leurs regressions sont decrits dans
`docs/levels/initial-progression.md`. Ils reportent volontairement les rebonds de
precision au chapitre suivant.

Le catalogue initial est limite a quatre familles : balle, panier, bascule et
poutre. Les poutres existent en quelques tailles discretes mais restent une seule
famille d'objet. La bascule est un objet preassemble et ne demande pas au joueur de
relier lui-meme une poutre a un pivot.

La gravite fournit seule l'energie des premiers puzzles. Il n'y a initialement ni
interrupteur, ni ventilateur, ni moteur. Blocs, dominos, roues libres, ressorts,
cordes, poulies, engrenages, electricite, fluides, objets deformables et destruction
sont reportes. Le format ne doit pas empecher leur ajout ulterieur.

Les responsabilites exactes des quatre familles sont decrites dans
`docs/catalogue-initial.md`.

## Niveaux fournis

La version 1 comporte une campagne complete, pas seulement des scenes techniques.
Le nombre de niveaux sera fixe apres validation du rythme de production. Chaque
niveau livre doit :

- avoir un objectif valide et comprehensible ;
- etre resoluble avec l'inventaire annonce ;
- etre jouable au tactile sur le plus petit viewport supporte ;
- passer la validation automatique de format et de complexite ;
- disposer d'au moins un scenario de regression prouvant sa resolubilite ;
- ne pas dependre d'un comportement physique accidentel trop sensible.

## Persistance et partage

IndexedDB conserve au minimum la progression, les preferences, les brouillons, les
niveaux crees ou importes et leur version de schema.

Un petit niveau peut etre partage dans le fragment de l'URL sous forme d'une
enveloppe versionnee, compressee et protegee par une somme de controle. Le fragment
n'est jamais la copie canonique du niveau. Une limite s'applique a la taille
compressee et decompressee.

Tout niveau peut etre exporte et importe comme fichier JSON versionne. Les niveaux
trop grands pour une URL utilisent obligatoirement ce mecanisme en version 1.

## Evolution communautaire

La version 1 reste entierement statique. Une future couche communautaire pourra
ajouter publication, recherche, notation ou moderation via un backend, sans
modifier le modele de niveau ni rendre le moteur de jeu dependant du reseau.

Le domaine depend d'un contrat de repository de niveaux. La version 1 fournit des
adaptateurs pour les niveaux embarques et IndexedDB ; un adaptateur distant pourra
etre ajoute plus tard. Les contenus distants resteront soumis exactement aux memes
schemas et limites de securite.

## Hors perimetre initial

- multijoueur et collaboration en temps reel ;
- comptes, profils distants et synchronisation cloud ;
- galerie communautaire ;
- scripts utilisateur ou plugins charges a l'execution ;
- assets distants references par un niveau ;
- simulation de fluides, corps souples ou destruction generale ;
- compatibilite garantie avec des niveaux crees avant la premiere version publique.

## Criteres transversaux

- comportement du domaine couvert en TDD ;
- simulation a pas fixe et reproductible dans les limites documentees ;
- erreurs d'import comprehensibles et sans perte du brouillon courant ;
- demarrage et utilisation hors ligne apres mise en cache ;
- interface sans blocage sur un petit ecran tactile ;
- aucune donnee de niveau non validee n'atteint la simulation ;
- migrations testees pour chaque version persistante supportee.

## Decisions encore ouvertes

- moteur physique retenu apres la suite de conformite ;
- framework de composants pour l'interface DOM ;
- identite, direction graphique et audio ;
- apparence de la balle et du panier ;
- tailles exactes des poutres et parametres physiques initiaux ;
- regle precise validant qu'une balle est entree dans le panier ;
- matrice de navigateurs et seuils de performance ;
- nombre de chapitres et de niveaux de la version 1 ;
- limites chiffrees des documents et URL partagees ;
- modele exact des objectifs composes et des indices.
