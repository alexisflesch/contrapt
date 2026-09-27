# Propositions d'évolutions — Niveaux, Assets et Objectifs (Gemini)

Document de réflexion et de conception, inspiré de *The Incredible Machine* (TIM) et fidèle à l'esprit de *TinkerBolt* : **un atelier de bricolage physique, déterministe, lisible et expressif**.

Ce document s'appuie exclusivement sur les règles et constats de `conception-niveaux.md`, en dialogue avec les propositions d'`evolution-astra.md` et de `proposition-evolutions-canary.md`.

---

## 1. Philosophie & Constats : Qu'est-ce qui fait l'âme de "The Incredible Machine" ?

Dans TIM, le génie ne vient pas de la complexité mathématique, mais de la **collision poétique entre des objets du quotidien aux propriétés physiques tranchées** :
1. **Des transformations d'énergie mécaniques et tangibles** : de l'énergie potentielle (une masse qui tombe) transformée en poussée, en coupure, en traction, en déviation ou en temporisation.
2. **Le spectacle de la causalité** : une petite action anodine au départ entraîne une cascade disproportionnée, où chaque étape a une fonction évidente une fois vue.
3. **L'esprit "Rube Goldberg / Heath Robinson"** : utiliser un tourne-disque, un seau, une bougie, un ballon de baudruche ou un élastique pour faire ce qu'un simple câble électrique ferait froidement.
4. **La lisibilité absolue (zéro flou cognitif)** : chaque pièce a un état visuel clair (tendu/lâche, allumé/éteint, ouvert/fermé, plein/vide).

### Principes directeurs pour nos propositions :
- **Minimiser le coût technique** : exploiter d'abord les géométries simples (rigides, rotations libres, capteurs de contact) avant d'inventer des entités complexes.
- **Respecter les contraintes de rendu (assets rigides, pas d'animation squelettique)** : privilégier des objets dont le mouvement résulte de la simulation physique (corps rigides, articulations, ressorts, bascules) ou d'un sprite à 2 états (on/off, ouvert/fermé).
- **Mobile-first** : des mécaniques compréhensibles sur un écran de 6 pouces, manipulables au doigt sans micro-ajustement au millimètre.
- **La machine d'abord, la pièce ensuite** : une pièce n'est jamais introduite sans une idée précise de niveau où elle est indispensable.

---

## 2. Nouveaux Assets & Familles d'Objets

Pour enrichir le vocabulaire sans transformer le jeu en simulateur électronique, voici des propositions d'assets classées par coût d'implémentation.

### Catégorie A — Coût nul à très faible (Variantes & propriétés sur familles existantes)

1. **La Caisse en bois (0,5 kg) et la Caisse métallique (5 kg)**
   - *Nature* : Déjà prévue dans les assets (`art/assets/boxes/`). Boîte rectangulaire rigide soumise à la gravité et au frottement (contrairement à la balle qui roule sans fin).
   - *Rôle mécanique* : Blocage, calage de bascule, lest qui ne roule pas, tampon d'amortissement, plateforme empilable.
   - *Intérêt TIM* : Elle glisse sur un convoyeur mais s'arrête net sur une poutre rugueuse ; elle peut boucher un trou ou servir de contrepoids stable.

2. **Le Ballon d'hélium (Masse négative / Portance)**
   - *Nature* : Balle avec une force ascensionnelle constante vers le haut (gravité inversée locale) et une traînée d'air plus forte.
   - *Rôle mécanique* : L'inverse exact de la masse de 10 kg. Il monte, déclenche des boutons au plafond, soulève une trappe ou lévite doucement dans un flux de ventilateur inversé.
   - *Visuel* : Une sphère colorée avec une petite ficelle qui pend en bas (visuel rigide, facile à générer).

3. **Le Pignon / Galet d'inversion mécanique (Flip-Flop)**
   - *Nature* : Petit bras rotatif à cliquet (comme un tourniquet ou une roue à rochet) qui bascule de 90° à chaque passage d'une balle.
   - *Rôle mécanique* : Aiguillage alterné : la 1ère balle passe à gauche, la 2nde passe à droite. Permet de séparer les flux sans électronique.

### Catégorie B — Coût modéré (Nouvelles pièces mécaniques rigides)

4. **La Bougie & la Corde fusible (Le "timer thermique" de TIM)**
   - *Nature* :
     - **Corde** : liaison mécanique entre deux objets ou maintien d'un objet en tension (ex: retient une masse au plafond).
     - **Bougie / Flambeau** : objet fixe ou posé qui possède une petite zone chaude au-dessus de sa mèche.
   - *Rôle mécanique* : Quand une corde (ou un ballon) croise la flamme, la corde brûle (rupture du lien mécanique) après 0,5 s de contact.
   - *Intérêt TIM* : L'un des gags les plus emblématiques de The Incredible Machine. Permet un délai pur, une libération spectaculaire d'énergie potentielle emmagasinée.

5. **L'Aimant (Électro-aimant ou permanent)**
   - *Nature* : Zone d'attraction radiale ou directionnelle (comme le ventilateur, mais attire les objets ferreux : masse, caisse métallique, balle de métal).
   - *Rôle mécanique* : Dévier une trajectoire sans contact physique, suspendre une bille au vol, arracher un contrepoids métallique. Relié à un fil, il s'éteint ou s'allume (lâcher un objet au moment précis où un bouton est activé).

6. **Le Récipient basculant (Le Seau)**
   - *Nature* : Coque creuse montée sur un pivot décentré.
   - *Rôle mécanique* : Vide, il tient droit. Quand une ou deux billes tombent dedans, son centre de gravité se déplace et il bascule d'un coup en versant son contenu plus bas.
   - *Intérêt TIM* : Accumulateur / seuil. "Attends d'avoir 2 billes avant de déclencher l'étage suivant".

7. **Le Piston à ressort (Détente mécanique)**
   - *Nature* : Boîtier muni d'un plateau monté sur ressort comprimé, verrouillé par un cliquet.
   - *Déclencheur* : Soit par fil (électrique), soit par choc mécanique sur son cliquet arrière.
   - *Effet* : Impulsion instantanée sèche et vigoureuse vers l'avant (vitesse d'éjection fixe, par exemple +8 m/s), puis reste en position déployée.
   - *Intérêt TIM* : Permet de renvoyer une bille avec de l'énergie neuve dans un axe horizontal sans dépendre de la chute libre.



---

## 3. Nouveaux Types d'Objectifs

Actuellement, TinkerBolt a une seule condition de victoire : *amener la balle rouge dans le panier et y rester 0,5 s*. Pour ouvrir le design de niveau sans dénaturer le moteur, voici 4 nouveaux types d'objectifs stimulants :

### Objectif 1 : "La Machine à Éteindre" (Désactivation / Interruption)
- **Concept** : Le niveau commence avec une machine folle qui tourne à plein régime (ventilateur qui bloque un passage, barrières battantes, convoyeur rapide). L'objectif est d'**amener la machine à l'arrêt complet**.
- **Condition de victoire** : L'interrupteur principal ou le levier de sécurité passe à l'état `off` et aucun objet ne bouge pendant 1 s.
- **Sensation** : Contrairement au parcours où l'on pousse une bille vers l'arrivée, ici on résout un puzzle de désamorçage / sabotage bienveillant.

### Objectif 2 : "Le Remplissage / Tri sélectif" (Multi-collecte)
- **Concept** : Le niveau possède 2 paniers (ou 1 panier et 1 bac).
- **Condition de victoire** :
  - La balle rouge doit finir dans le panier rouge.
  - La caisse en bois (ou bille bleue) doit finir dans la zone de décharge / bac vert.
- **Sensation** : Exige de concevoir un système d'aiguillage mécanique où les deux objets se croisent ou se séparent au bon endroit.

### Objectif 3 : "L'Allumage en Cascade" (Parcours de relais)
- **Concept** : Faire sonner 3 cloches (ou actionner 3 boutons poussoirs muraux) dans un ordre libre ou précis au cours de la simulation.
- **Condition de victoire** : Les 3 cibles ont été percutées au moins une fois, puis la bille rouge s'immobilise dans le réceptacle final.
- **Sensation** : Très fidèle à Rube Goldberg : l'important n'est pas juste l'arrivée, mais tout le spectacle des étapes intermédiaires validées au passage.

### Objectif 4 : "Le Sauvetage / Échafaudage Fragile" (Protection)
- **Concept** : Une bille fragile (ou un objet précieux) est perchée sur une tour instable. Une masse tombe ou un boulet roule vers elle dès le départ.
- **Condition de victoire** : La bille rouge atteint le panier, ET l'objet fragile n'a subi aucun choc supérieur à un seuil critique (ou n'est pas tombé de son piédestal).
- **Sensation** : Pression temporelle et gestion d'interception d'urgence.


---

## 4. Fiches de Niveaux Originaux

Voici 6 fiches complètes de niveaux, conçues selon la méthode et les exigences de `conception-niveaux.md` (machine préexistante cassée à 3 ou 4 endroits, fenêtre de tolérance ≥ 0,3 unité, rôles détournés, solutions élégantes récompensées).

---

### Fiche N1 : "L'Aspirateur à l'Envers" (Puzzle d'aérodynamique & écran)

- **Inventaire fourni au joueur** :
  - 1 poutre courte (1,5 u)
  - 1 boîte en bois (1 u × 1 u)
  - 1 fil électrique
  - *Leurre* : 1 tremplin (tentation de sauter par-dessus le mur, mais angle impossible)
- **Décor de départ** :
  - En haut à gauche : départ de la balle rouge, bloquée derrière une barrière fermée.
  - En bas au milieu : un ventilateur orienté vers le haut, allumé en continu.
  - Juste au-dessus du ventilateur, à mi-hauteur : un goulet vertical étroit qui mène au panier tout en haut à droite.
  - À droite du ventilateur : une balle bleue sur une rampe, retenue par un loquet mécanique.
- **Le problème** :
  - Si la balle rouge tombe droit dans le souffle du ventilateur, elle lévite à 1,5 unité mais ne peut pas entrer dans le goulet car le vent est trop violent et la refoule de biais contre un mur d'épines.
  - La barrière qui retient la rouge n'a aucun fil relié.
- **Les 3 réparations à faire** :
  1. *Relier la commande* : Il y a un bouton poussoir près de la bleue, mais pas de fil. Le joueur doit relier le bouton à la barrière du haut.
  2. *Amortir et libérer la bleue* : Utiliser la boîte en bois pour guider la bleue vers son bouton au bon moment.
  3. *Le rôle détourné de la poutre (l'écran de vent)* : Placer la poutre courte horizontalement *à mi-hauteur du flux d'air*. La poutre coupe le souffle dans la partie supérieure du goulet : la balle rouge monte, franchit la zone abritée par la poutre, perd sa vitesse ascendante pile à l'entrée du panier et s'y dépose doucement par gravité !
- **Pourquoi c'est amusant** : Le joueur découvre que la poutre ne sert pas à rouler, mais sert d'ombrelle aérodynamique.

---

### Fiche N2 : "Le Télégraphe à Poids" (Puzzle de synchronisation & cadence)

- **Idée maîtresse** : Utiliser un convoyeur non pas pour transporter, mais pour créer un déphasage temporel précis entre deux masses.
- **Inventaire fourni** :
  - 1 balle bleue
  - 1 poutre moyenne (3 u)
  - 1 levier libre
  - *Leurre* : 1 ventilateur (sans prise de courant à portée utile)
- **Décor de départ** :
  - Deux rampes parallèles superposées (étage supérieur : balle rouge ; étage inférieur : circuit d'activation).
  - Au centre : une bascule géante asymétrique qui ferme l'accès au panier. Pour que la rouge passe, la bascule doit s'incliner vers la gauche pendant exactement 1 seconde, puis revenir à l'horizontale pour former un pont continu.
- **La réaction en chaîne pré-installée** :
  - Une masse de 10 kg tombe au début sur un convoyeur court qui tourne vers la droite.
  - Au bout du convoyeur, un bouton poussoir ouvre une barrière.
- **Les réparations du joueur** :
  1. *Le temporisateur* : La balle rouge arrive trop tôt et s'écrase dans le vide si elle part tout de suite. Le joueur pose la poutre moyenne pour créer un chemin en lacets qui allonge son temps de trajet de 2 secondes.
  2. *Le contrepoids retardé* : La balle bleue fournie doit être injectée sur la bascule pile quand la rouge s'apprête à la traverser, afin d'annuler l'effet de la masse.
  3. *L'aiguillage du levier* : Le levier doit être posé tête en bas sous la rampe pour que la première bille le fasse basculer, fermant ainsi la trappe pour éviter que la seconde bille ne tombe dans le panier et n'en chasse la rouge.
- **Défi** :
  - ⭐ Victoire standard (3 objets posés).
  - 🏆 Victoire minimale (2 objets posés) : en trouvant un angle de poutre qui ralentit la rouge par micro-rebonds successifs, rendant le levier superflu.

---

### Fiche N3 : "L'Arroseur Arrosé" (Puzzle d'inversion & de boucle)

- **Inventaire fourni** :
  - 2 fils
  - 1 masse de 10 kg
  - 1 poutre courte
- **Décor de départ** :
  - Une chaîne fermée : un ventilateur A pousse un chariot/boîte vers un bouton B. Le bouton B allume un ventilateur C qui souffle dans le sens opposé !
  - La balle rouge est coincée dans un tube vertical entre les deux souffles. Si les deux tournent, elle oscille sans fin au milieu sans jamais tomber dans le panier situé en dessous.
- **Le puzzle** :
  - Le joueur doit casser la boucle infinie pour créer une séquence finie : Allumage A -> Déplacement -> Extinction A -> Allumage C -> Chute finale dans le panier.
- **La solution** :
  1. Utiliser la masse de 10 kg comme "mémoire permanente" : la faire tomber sur une bascule qui verrouille mécaniquement l'un des circuits.
  2. Câbler judicieusement les deux fils : l'un sur le bouton-poussoir pour couper le premier ventilateur au moment précis de l'impact.
  3. Placer la poutre courte comme cale de fin de course pour que le chariot reste bloqué sur le contacteur au lieu de rebondir.
- **Déclic recherché** : Comprendre qu'un bouton maintenu enfoncé vaut mieux qu'une impulsion fugitive pour stabiliser une machine instable.

---

### Fiche N4 : "Le Percolateur à Billes" (Puzzle de masse et triage)

- **Inventaire fourni** :
  - 1 boîte métallique (lourde)
  - 1 bascule
  - 1 poutre moyenne
  - *Leurre* : 1 fil électrique inutile (aucun composant actif à brancher)
- **Décor de départ** :
  - La machine contient 3 billes : 2 billes de service bleues et 1 bille rouge objectif.
  - Elles sont libérées en grappe serrée dès le début de la simulation.
  - Plus bas, la route se divise :
    - Un chemin descend directement vers le vide (défaite).
    - Un chemin étroit mène au panier, mais il est protégé par un seuil à contrepoids qui ne s'ouvre que si le poids exact d'UNE SEULE bille s'y présente. Si deux billes arrivent ensemble, le seuil s'effondre.
- **Le problème** : Comment séparer la rouge de ses deux gardes du corps bleus ?
- **La solution** :
  1. *Le peigne mécanique* : Poser la bascule avec son pivot décentré sous la chute. La première bille bleue fait basculer le plateau et s'engouffre dans un puits perdu.
  2. *Le retardateur à friction* : Poser la boîte métallique sur le trajet de la rouge : la bille heurte la boîte, perd toute sa vitesse horizontale et prend 1 seconde de retard pendant que la deuxième bleue est évacuée.
  3. *La rampe finale* : La poutre moyenne recueille la rouge isolée et la conduit tranquillement au seuil désormais libre.
- **Plaisir de jeu** : Voir un peloton désordonné se faire trier et cadencer par de simples obstacles passifs.

---

### Fiche N5 : "Le Grand Saut Élastique" (Détournement du tremplin)

- **Rappel de la règle physique** : Le tremplin rend 100 % de la vitesse d'impact perpendiculaire, mais n'ajoute AUCUNE énergie et est inerte à moins de 1 m/s.
- **Inventaire fourni** :
  - 1 tremplin
  - 1 ventilateur
  - 1 fil
  - 1 poutre courte
- **Décor de départ** :
  - La balle rouge part d'une petite colline à gauche (vitesse initiale faible).
  - Le panier est perché sur un promontoire très élevé à droite (au-dessus de la hauteur de départ de la rouge !).
  - Au fond du ravin entre les deux : un sol plat.
- **Le piège / fausse piste** : Mettre le tremplin au fond du ravin. La rouge y tombe, rebondit, mais ne peut jamais remonter plus haut que son point de départ (conservation de l'énergie). Elle s'arrête à 2 unités sous le panier.
- **L'astuce lumineuse** :
  1. Le ventilateur est le *seul* objet capable d'injecter de l'énergie dans le système pour dépasser l'altitude de départ.
  2. Mais si le ventilateur souffle vers le haut, il disperse la bille.
  3. *Solution* : Le joueur oriente le ventilateur **horizontalement au fond du gouffre**. La bille tombe, est accélérée brutalement par le souffle horizontal (gain de vitesse cinétique massif > 15 m/s), puis percute le tremplin incliné à 45° posé au bout de la piste !
  4. Le tremplin convertit cette énorme vitesse horizontale en une trajectoire verticale fulgurante qui propulse la bille bien au-dessus du panier.
  5. La poutre courte posée en haut fait office de "panneau de basket" pour rabattre la bille dans le panier.
- **Déclic** : "Le tremplin ne crée pas d'énergie, mais il change l'angle de n'importe quelle fusée que je lui envoie !"

---

### Fiche N6 : "Le Fusible Mécanique" (Puzzle à double temps & auto-destruction)

- **Inventaire fourni** :
  - 1 masse de 10 kg
  - 1 barrière
  - 1 fil
  - *Leurre* : 1 poutre longue
- **Décor de départ** :
  - Une bille bleue roule sur une piste en surplomb et va écraser un mécanisme vital si on ne l'arrête pas.
  - La balle rouge est enfermée dans une cage fermée par une barrière électrique.
  - Un bouton poussoir unique est présent sur le plateau.
- **Le dilemme** :
  - Si on relie le bouton à la barrière, la rouge est libérée, mais la bleue détruit la machine.
  - Si on bloque la bleue, la rouge reste enfermée à jamais.
- **La solution "TIM"** :
  1. Le joueur pose la barrière d'inventaire en travers de la route de la bleue, fermée au repos : la bleue est stoppée net.
  2. Il relie le bouton à cette barrière d'inventaire, mais avec la masse de 10 kg suspendue au-dessus dudit bouton.
  3. La rouge, dans son parcours initial, effleure un levier qui libère la masse.
  4. La masse s'écrase sur le bouton à t = 3,0 s : la barrière s'ouvre, ce qui libère la bleue *seulement après* que le danger est passé !
  5. La bleue libérée en second temps vient alors percuter la cage de la rouge pour la pousser dans le panier.
- **Pourquoi c'est satisfaisant** : Un objet sert d'abord de mur, puis devient une porte une fois son premier rôle achevé.

---

## 5. Matrice Récapitulative des Niveaux Proposés

| Réf | Titre | Déclic / Surprise principale | Pièces clés utilisées | Fenêtre de tolérance |
|---|---|---|---|---|
| **N1** | *L'Aspirateur à l'Envers* | Poutre utilisée comme bouclier anti-vent | Poutre, Boîte bois, Fil | Large (≥ 0,5 u) |
| **N2** | *Le Télégraphe à Poids* | Allonger un parcours pour attendre un décalage | Poutre, Levier, Balle bleue | Confortable (≥ 0,4 u) |
| **N3** | *L'Arroseur Arrosé* | Casser une boucle infinie par une mémoire permanente | Masse 10kg, Fils, Bascule | Robuste (resynchronisation par bouton) |
| **N4** | *Le Percolateur* | Tri mécanique passif d'une grappe de billes | Bascule décentrée, Boîte métal | Large (géométrie en entonnoir) |
| **N5** | *Le Grand Saut Élastique* | Injection d'énergie par vent + renvoi à 90° par tremplin | Ventilateur, Tremplin, Poutre | Moyenne (guidage nécessaire en réception) |
| **N6** | *Le Fusible Mécanique* | Un obstacle temporaire qui s'ouvre quand le danger est passé | Barrière, Masse 10kg, Fil | Très large (timing géré par chute libre) |

---

## 6. Recommandations pour le Prochain Prototype à Implémenter

Si une fiche doit être prototypée en premier dans le moteur existant (sans coder aucun nouvel asset ni changer de schéma de données) :

👉 **Recommander la Fiche N1 (*L'Aspirateur à l'Envers*) ou la Fiche N5 (*Le Grand Saut Élastique*)** :
- **N1** ne demande aucun nouvel objet si l'on remplace la boîte par une seconde poutre en cale. Elle met magnifiquement en scène la règle physique déjà codée du rayon de souffle occulté par un solide.
- **N5** utilise 100 % des composants actuels (ventilateur, tremplin, poutre, panier, balle rouge) et réhabilite immédiatement le tremplin, souvent mal compris par les concepteurs de niveaux, en lui donnant un rôle de déflecteur balistique spectaculaire.

Ces niveaux respectent scrupuleusement la règle d'or : **la difficulté naît de l'intelligence du montage, jamais de la maladresse du pixel.**


