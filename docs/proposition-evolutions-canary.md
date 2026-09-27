# Propositions d'évolutions — niveaux, assets, objectifs

Document de travail issu d'un brainstorm à partir de
`docs/levels/conception-niveaux.md` (seule source consultée). **Rien d'ici n'est
validé ni mesuré au banc** : les coordonnées sont indicatives, les comportements
physiques sont présumés, et aucun de ces niveaux ne doit entrer dans
`src/content/embedded-levels.ts` avant d'avoir été résolu en test puis joué.

Les coûts sont appréciés d'après ce qu'impose le dépôt : une **propriété** sur
une famille existante est bon marché ; un **collider statique** est moyen ; une
**nouvelle famille d'objet** (schéma + définition + tests de comportement +
outils d'édition + sérialisation) est chère ; un **nouveau type d'objectif**
coûte peu mais touche au format de niveau.

## 0. Six ressources déjà là, sous-exploitées

En déroulant les chiffres du tableau des objets, on obtient des jouets gratuits,
sans écrire une ligne de code.

| Ressource                                                           | Ce que les chiffres impliquent                                                                                                                              | Usage de conception                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Force du ventilateur = `9 × largeur exposée × (1 − d/3)`            | Une balle (≈ 0,28 kg, ≈ 2,7 N) reçoit jusqu'à ≈ 5,4 N à la bouche : **≈ 19 m/s²**. Le ventilateur n'est pas qu'un ascenseur, c'est un **canon horizontal**. | Doser la _distance_ au ventilateur plutôt que de l'allumer. À 2,9 unité il effleure, à 0,5 unité il envoie la balle traverser la scène. |
| Le vent est arrêté par les solides ; les capteurs ne font pas écran | Une balle abrite ce qui est derrière elle : **un paravent de balles**. Trois bleues alignées dans un cône, c'est une seule qui monte.                       | Leurre parfait : le joueur empile des balles « pour faire une échelle » et obtient l'inverse.                                           |
| Ouverte, la barre n'a plus de collision                             | Une barrière placée **sous** un panier le vide.                                                                                                             | Le panier n'est pas une destination : c'est aussi un piège possible.                                                                    |
| Un levier tient à peine, rotation libre jusqu'à ±135°               | Un levier posé couché ou à l'envers devient une **petite palette**, et une balle rapide le fait basculer _trop tôt_.                                        | Erreur volontaire : un déclencheur qui s'active avant l'étape qu'il devait déclencher.                                                  |
| Tremplin : rend toute la vitesse, rien sous 1 m/s                   | Il ne fait **jamais** gagner de hauteur, et il est mort si on l'approche doucement.                                                                         | Un inventaire qui promet un saut impossible : le joueur comprend, puis le recycle en simple butoir.                                     |
| Bascule en butée à ±30°                                             | Une bascule bloquée est une **rampe**, pas un plateau.                                                                                                      | Un plan « équilibré » en fait figé depuis le départ : il faut rétablir l'équilibre _avant_ que le poids n'arrive.                       |

## 1. Objectifs

### 1.1 Nouveaux types de victoire

Aujourd'hui une seule victoire : la balle rouge reste 30 pas dans le panier. Les
variantes ci-dessous sont classées par coût, et chacune attaque le défaut visé
au § 2 du document de conception (« une machine, pas un trou à combler »).

| Idée                            | Règle                                                                                | Coût                                            | Pourquoi elle gagne sa place                                                                                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tenir bon**                   | À 20 s la balle doit encore être dans la scène, et hors d'une zone interdite.        | Nouveau type d'objectif, zéro physique          | Objectif **inverse** du jeu : on ne construit plus un chemin, on construit un frein. La condition de défaite devient la mécanique. Enseigne « sortir de la scène » sans niveau didactique. |
| **Passer par la porte**         | La balle doit traverser une ligne (capteur) _puis_ finir au panier.                  | Capteur + test d'état                           | Transforme la pose d'objets en **routage**. Rend possible « aller à gauche avant d'aller à droite », ce qui tue la solution-évidence.                                                      |
| **Dans l'ordre**                | Suite ordonnée de capteurs `A → B → C`.                                              | Le précédent + une liste                        | Trois chaînes candidates, un seul objectif : le joueur choisit **laquelle** enclencher.                                                                                                    |
| **Rythme / moteur**             | Un événement doit se produire N fois (≥ 4 bascules) **et** la balle finir au panier. | Compteur (petit état) + objectif                | La machine cesse d'être une cascade : elle devient un **moteur**. Sommets du genre, et construisible avec les objets du jour (fiche 5).                                                    |
| **Boucle causale**              | En fin de course, la balle rouge doit **rearmer** le déclencheur qui l'a lancée.     | « Passer par la porte » + capteur sur la source | Solution non truquable : elle doit être une boucle fermée. Très lisible, très satisfaisante.                                                                                               |
| **Deux livraisons simultanées** | Deux rouges dans deux paniers, toutes deux pendant les mêmes 30 pas.                 | Format v3 (déjà annoncé)                        | Un seul levier pour deux salles : la question n'est plus « est-ce que ça marche » mais « **est-ce que ça marche en même temps** ».                                                         |
| **Contre la montre**            | Victoire avant 10 s au lieu de 20.                                                   | Mémoriser le pas de victoire                    | Recycle tous les niveaux existants. Le convoyeur-horloge devient une **dépense** : chaque bande de 3 u = 2 s de budget.                                                                    |
| **Sans casse**                  | Un décor fragile ne doit recevoir que des balles.                                    | Prédicat de collision + seuil                   | Niveau défensif à une seule contrainte. Leurre vedette : la masse de 10 kg, qui écrase exactement ce qu'il ne fallait pas.                                                                 |

### 1.2 Nouveaux défis (au-delà du compte d'objets)

Les ✅⭐🏆 comptent des objets ; ils ne disent rien de la _manière_. Les défis
ci-dessous sont des champs de niveau lus au moment de la victoire.

- **Vide l'inventaire** — il faut tout poser. Exact opposé philosophique du 🏆 :
  à réserver à des niveaux dédiés et à annoncer dans l'interface (voir § 6).
- **Sans souffle / sans courant** — interdiction d'utiliser le ventilateur, ou de
  poser un levier : la solution doit être entièrement mécanique.
- **Sans les mains** — la rouge ne touche ni sol ni poutre : uniquement du
  souffle, des rouleaux, un tremplin, une goulotte.
- **Sans bruit** — aucune bleue ne sort de la scène : toutes les pièces de la
  machine doivent finir rangées.
- **Une seule pièce montée** — tous les objets posés doivent se toucher (graphe
  connexe). Vérifiable sur les empreintes : bon marché, et cela pousse à
  _composer_ au lieu de mitiger.
- **La dernière étape** — le dernier événement observable doit être X (c'est la
  bascule qui doit bouger en dernier). Contrainte d'ordonnancement sur un niveau
  déjà résoluble.
- **Palier de style** — bonus visuel, non comptable, quand la solution n'utilise
  aucun objet d'une liste noire : signale poliment qu'il existait plus malin.

## 2. Assets

### Étape A — contenir sans câbler (colliders statiques seuls)

Ces objets n'introduisent **ni signal, ni dynamique** : ils rendent seulement la
physique prévisible, ce qui libère les leurres et fait baisser le nombre de
solutions au pixel près.

| Asset                                       | Rôle                                  | Pourquoi c'est rentable                                                                                                                                         |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goulotte / tuyau** (¼ de tour, 3 tailles) | Routage garanti d'une bille.          | Prolonge la « goulotte courbe » déjà décidée. C'est l'anti-ambiguïté : là où une poutre donne une solution fragile, la goulotte est robuste _par construction_. |
| **Entonnoir**                               | Centre une chute.                     | Tue la cause n° 1 de niveaux fragiles : « la balle tombe à cheval sur la bascule ».                                                                             |
| **Bol / niche de parking**                  | Gare une bille à une position connue. | Sans lui, garer une bleue est une gageure ; avec lui, le joueur range les pièces de la machine (fiche 7).                                                       |
| **Pare-chocs mou**                          | Rebond ≈ 0, absorbe.                  | Pendant du tremplin. Sert aussi à **boucher** les solutions évidentes sans ajouter d'interdit visible.                                                          |
| **Piste à galets**                          | Frottement ≈ 0.                       | L'anti-friction : la balle ne décélère plus de 0,7 m/s². Permet les longues courses et le réglage du **temps** plutôt que de la position.                       |
| **Clapet (anti-retour)**                    | Laisse passer dans un seul sens.      | **Un sens unique change la nature des énigmes** : les boucles deviennent possibles, et « faire demi-tour » cesse d'être une sortie de secours.                  |
| **Pied / cale (0,25 u)**                    | Surélève n'importe quel objet.        | Remplace les piles de boîtes ; rend la hauteur réglable sans objet lourd.                                                                                       |

### Étape B — une propriété de plus sur une famille existante

Le moins cher de tout : pas de nouvelle famille, juste un champ de plus dans un
schéma existant, donc pas d'outils d'édition ni de sérialisation à réinventer.

- **`pivot: left | center | right` sur la bascule.** Une propriété, et la bascule
  devient trois machines : balance, tremplin à bras, bélier. À mon avis le
  **meilleur rapport gain / effort du lot**.
- **`angle: ±15°` sur le convoyeur** (faible pente seulement) : l'horloge devient
  montagne russe. À spécifier avant de coder : la vitesse de surface s'ajoute-t-elle
  à la gravité, ou la bande reste-t-elle une référence de temps de 2 s ?
- **`grip: normal | glissant | adhésif` sur les poutres** : le glissant pour les
  longues courses, l'adhésif pour maintenir une masse en haut d'une rampe.
- **`power: low | normal | strong` sur le ventilateur** (× 0,25 / 1 / 2,25 dans la
  formule) : doser sans déplacer au dixième, et un palier 🏆 qui consiste à _choisir
  le petit_ ventilateur.
- **`glide: vertical | horizontal` sur la barrière** : une porte qui coulisse à
  l'horizontale (sas, guillotine latérale) est un engin très différent d'un pilier
  qui s'efface.
- **`restitution` sur la poutre** : une poutre devient un tremplin **réglable**,
  plus doux que le tremplin — et qui, lui, peut monter plus haut en deux bonds.
- **`pivot: top | bottom` sur le levier** (rotation libre autour d'un autre point)
  permet des palettes, des fléaux et des bascules à un cran.

### Étape C — nouvelles sources

Le document de conception fige les sources à `lever | button`. C'est ce qui rend
le câblage lisible — et c'est ce qui interdit toute la famille des niveaux
« **quand la balle arrive ici, fais cela** ».

- **Capteur de passage** (`tripwire`) : source qui émet tant qu'un corps dynamique
  traverse une ligne. Aucune donnée exécutable, que des coordonnées : cohérent
  avec les invariants. C'est la clé des objectifs ordonnés et de la boucle causale.
- **Horloge** (`clock`) : source périodique déterministe, asservie au compteur de
  pas (jamais à une horloge murale), période fixée par le niveau. Deux usages : une
  cible ouverte 0,5 s sur 2 s devient une **fenêtre temporelle pure** ; un battement
  régulier devient le métronome des niveaux « moteur ».
- **Capteur de contenu** (`basket: full`) : source en sortie de remplissage. Donne
  « quand la niche est pleine, ouvre la porte » — la logique des récipients, sans
  logique du tout.
- **Compteur** (`count ≥ n`) : nécessaire aux objectifs « la bascule doit basculer
  quatre fois » et au niveau-moteur de la fiche 5.

⚠️ **Ce que je déconseille** : des boîtes ET / OU / NON. Bon marché à écrire, mais
cela transforme un jeu de physique en jeu de câblage logique, et le joueur sur
petit écran n'y gagne rien en lisibilité. Garder la règle « une cible, un seul
contrôleur » : c'est elle qui rend les fils compréhensibles d'un coup d'œil.

### Étape D — nouveaux corps (cher)

| Asset                                                      | Ce qu'il ouvre                                                                                               | Bien ou pas                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dominos**                                                | Le seul objet où le joueur choisit une **position continue sur N points** ; la chaîne s'écrit à vue.         | Déjà décidé au doc : à garder. Meilleur antidote au « trou à combler ».                                                                                                               |
| **Piston**                                                 | Une impulsion franche sur commande ; rien d'autre ne sait faire ça.                                          | Déjà décidé : à garder.                                                                                                                                                               |
| **Masse de 1 kg**                                          | « Une bille au carré » : trop léger pour la masse de 10 kg, trop lourd pour la bille.                        | Déjà décidé : à garder, comble un trou réel.                                                                                                                                          |
| **Caisses (bois / métal), déjà dessinées**                 | Marchepied, lest, écran à vent, cible, et **empilables** : la hauteur devient une décision.                  | Le dessin existe : aucun travail d'art. Commencer par le bois (une masse, un sprite).                                                                                                 |
| **Chariot à roues**                                        | Une plateforme qui transporte une bille et se laisse charger : les contrepoids et les ascenseurs sans corde. | Cher (corps + roues). À ne prendre que si au moins trois niveaux en vivent.                                                                                                           |
| **Poulie / contre-poids**                                  | Un bras monte pendant que l'autre descend.                                                                   | Très « The Incredible Machine », mais contraintes + corde = le plus gros ticket. Tenter d'abord **deux bascules reliées par une poutre** : si ça rend l'effet, la poulie est inutile. |
| **Arbre tournant** (barre tournante, roue à aubes, moulin) | Laisse passer **une** bille par tour : quantificateur de temps et convertisseur souffle → événement discret. | Intéressant seulement si l'on refuse les capteurs de l'étape C ; sinon redondant.                                                                                                     |
| **Ballon (leste négatif)**                                 | Le seul moyen simple de monter **plus haut que le départ** sans ventilateur.                                 | Forte signature visuelle, deux pièges : le ballon attaché à la rouge résout tout, et il faut décider **comment il se détache** (impact, poids, délai).                                |
| **Fil coupe-circuit** (un coup casse un fil)               | La machine **se détruit** en tournant : l'ordre devient irréversible.                                        | Tentant, et cher : un fil n'est pas un corps. À traiter comme un _état_ du fil (`intact: true/false`) et non comme un objet — coût moyen.                                             |

### Étape E — assets purement visuels

Rien de mécanique, mais ces dessins débloquent des objectifs et se paient en une
planche chacun. Deux sont déjà prêts dans `art/assets/` : la **seconde bille**
(les bleues, pièces de la machine) et les **caisses**.

- **Cloche / carillon** : rend visible un objectif de comptage (« 4 sonneries »).
  Sans lui, un niveau-moteur est illisible à l'œil.
- **Zone hachurée « fragile »** (décalque au sol) : rend lisible un objectif
  d'interdiction sans zone de construction.
- **Bande chronométrée** (sablier, aiguille) : signale un niveau chronométré avant
  l'appui sur Tester.
- **Niche / bol et goulotte** : à dessiner en même temps que les collisions, sinon
  l'étape A reste inutilisable en jeu.
- **Objet « verrouillé »** (chaîne, cadenas) : une variante _visuelle_ du même
  sprite pour rappeler qu'un objet de départ ne se touche pas — le verrouillage
  étant déjà la règle de campagne, seul le dessin manque.
- **Traces / traînée de peinture** : surtout utile comme **outil de l'éditeur**
  (comprendre une chaîne ratée à l'œil), et accessoirement comme objectif bonus
  (« peins la cible »).

## 3. Huit fiches de niveaux

Chaque fiche donne l'intention, la chaîne, les maillons cassés, l'inventaire et
les pièges à vérifier. Coordonnées **indicatives** (scène 8 × 5,5, `y` vers le
bas) : à mesurer au banc, pas à supposer.

### Fiche 1 — « Le ventilateur de trop »

_Coût moteur : rien (objets du jour). Objectif : le ventilateur n'est pas un
ascenseur, c'est un mur qu'on peut pousser._

- **Scène & chaîne.** Rouge en haut à gauche (≈ (1 ; 1,2)) sur une poutre fixe ;
  elle roule, tombe sur une barrière fermée qui la retient ; en face, à droite,
  une tablette (haut ≈ y 3,0) porte un bouton que seule une bleue peut tenir.
  Sous cette tablette, un ventilateur **déjà `on`** : aucun fil ne le commande,
  donc rien ne l'éteint, et il souffle en permanence en déséquilibrant la chute de
  la bleue qui devait monter. Le joueur doit **boucher** ce souffle.
- **Ce qui est cassé.** (1) Le convoyeur au sol est au point mort (levier au cran
  `center`) : les bleues n'arrivent pas. (2) Le levier est hors de portée : il
  faut qu'une bleue lui tombe dessus, donc qu'une poutre le surplombe. (3) La
  poutre-bascule qui devait déposer la bleue sur la tablette n'existe pas : il faut
  poser le plancher **au sommet du cône**, pas un escalier. (4) Le ventilateur de
  trop : rien ne l'éteint, aucun fil ne le commande.
- **Inventaire.** 1 ventilateur, 2 poutres longues, 1 poutre courte, 1 tremplin,
  1 masse de 10 kg, 2 bleues.
- **Leurres.** Les poutres longues en « escalier » : elles coupent le cône et
  clouent la bleue au sol. Le tremplin : la tablette est 3 unités au-dessus, il ne
  montera jamais jusque-là. La masse : elle écrase le levier et le laisse figé dans
  une position qui ne convient qu'à moitié.
- **La solution maligne.** Une poutre **devant** la bouche du ventilateur de trop :
  le vent s'arrête sur le solide, ce qui est derrière redevient calme. Le joueur
  résout un problème en posant un objet _pour rien_ en apparence.
- **Robustesse.** Le levier à un cran est tranché ; le point de lévitation est
  auto-stable ; aucune fenêtre sous 0,5 s.
- **Anti-solutions à chercher.** Poser la poutre courte comme rampe directe du
  point de lévitation au panier : si ça passe avec une marge ≥ 0,3, c'est le 🏆 ;
  sinon resserrer la tablette.

### Fiche 2 — « Une seule main, deux pièces »

_Coût moteur : format v3 (plusieurs objectifs), déjà annoncé._

- **Scène & chaîne.** Une cloison (poutre longue à 90°) coupe la scène à x ≈ 4.
  À gauche : panier au sol, rouge à livrer par un convoyeur qui la ramène vers la
  gauche. À droite : panier en hauteur, rouge à livrer par un ventilateur. **Un
  seul levier**, à gauche de la cloison, câblé aux deux : `center` = tout éteint,
  cran gauche = bande vers la gauche **et** souffle.
- **Ce qui est cassé.** (1) Le levier est au centre. (2) La bleue qui doit le
  basculer tombe du mauvais côté de la cloison. (3) Rien ne retient la rouge de
  gauche : elle part avant que la bande ne tourne.
- **Ce que le joueur doit comprendre.** Le levier ne suffit pas : une seconde
  bleue, plus tard, le ramènera au centre et **tout s'éteint** avant la seconde
  livraison. La clé est de poser une poutre **en butée contre le manche** pour
  l'empêcher de revenir. Matériel, lisible, et conforme à la règle : le joueur
  n'a câblé aucun fil.
- **Leurres.** Un second levier, non câblé, qui a l'air de commander la barrière.
  La masse de 10 kg : elle met le levier à un cran pour toujours — une livraison,
  jamais deux.
- **Robustesse.** Deux verrous binaires (levier, bouton du § 1.1 si on l'ajoute) ;
  la simultanéité se juge sur 30 pas, donc la fenêtre reste large.
- **Paliers.** ⭐ deux objets posés (la butée + l'arrêtoir de gauche) ; 🏆 un seul.

### Fiche 3 — « Tenir bon »

_Coût moteur : un nouveau type d'objectif (survivre 20 s + zone interdite).
Aucun objet nouveau._

- **Scène & chaîne.** Ici la machine **marche** : la rouge est déjà lancée et
  part par la sortie de scène au bout de 6 s. Le panier est là, hors d'atteinte,
  et c'est une tentation : y aller serait une autre partie. Objectif affiché :
  « à 20 s, la balle est encore dans la scène, et elle n'a jamais touché la zone
  hachurée sous la trappe ».
- **Ce que le joueur doit faire.** Construire un frein, pas un chemin : une poche
  où la balle vient battre, une rampe qui la ramène, un butoir qui l'absorbe.
- **Inventaire.** 2 poutres, 1 bascule, 1 tremplin, 1 masse de 10 kg, 1 barrière.
- **Leurres.** La masse : posée sur la bascule, elle la fige à −30° et **ouvre une
  rampe de sortie** plus rapide. La barrière : en urgence on la pose « pour faire
  mur », mais ouverte elle n'a plus de collision — la balle passe au travers.
- **Surprise lisible.** Le tremplin rend toute la vitesse _vers le haut_ : dans une
  niche étroite, la balle remonte exactement à sa hauteur de chute et redescend.
  Deux poutres et un tremplin font un **battement** qui tient 20 s — et le joueur
  vient d'inventer un moteur sans le savoir.
- **Vérification obligatoire.** Le test n° 1 de la méthode (aucune pose) doit
  **perdre** : la géométrie doit garantir la sortie, sinon le niveau est gratuit.
- **Paliers.** ⭐ deux objets ; 🏆 un seul (la niche à une poutre, s'il en reste une).

### Fiche 4 — « Treize secondes »

_Coût moteur : rien. Le convoyeur n'est pas un transport, c'est un retard de 2 s._

- **Scène & chaîne.** La rouge tombe sur une bande de 3 unités (2 s), traverse un
  goulet fermé par une **barrière-trappe**, et doit tomber dans un panier en
  contrebas. La barrière est commandée par un bouton **momentané** : il faut
  quelque chose **dessus**, pas seulement qui passe dessus.
- **Le conflit de ressources (le cœur du niveau).** L'inventaire ne contient
  **qu'une** masse de 10 kg. Elle peut caler le levier (pour que la bande tourne)
  **ou** tenir le bouton enfoncé. Pas les deux. Le joueur doit comprendre qu'une
  bleue garée dans une poche au-dessus du bouton fait l'affaire, et rendre cette
  poche possible.
- **Ce qui est cassé.** (1) Le levier est au centre : la bande ne tourne pas.
  (2) La bleue destinée au bouton s'échappe par un canal non guidé. (3) Il manque
  la demi-poutre qui aligne la chute sur la bande. (4) Une seconde barrière,
  inutile, est en place et vole 0,4 s.
- **Contrainte de conception stricte.** La fenêtre d'ouverture ne peut pas être
  sous 0,5 s (règle du doc) : la barrière met 0,4 s à coulisser, donc la fenêtre
  se gagne en **maintenant** le bouton, jamais en visant l'instant.
- **Leurres.** Un second convoyeur : la solution marche avec, mais elle coûte
  2 s de plus et fait rater le chrono. Un bouton **non câblé**, placé juste là où
  le joueur veut le mettre. Un ventilateur, parfait pour sortir la balle de la
  fenêtre.
- **Défi bonus.** Gagner avant 10 s : chaque bande ajoutée devient une dépense.

### Fiche 5 — « Le moteur »

_Coût moteur : un compteur (petit état + objectif). Construisible avec les objets
d'aujourd'hui._

- **L'idée.** La machine ne doit pas se terminer : elle doit **tourner**, et la
  rouge doit finir au panier sur le quatrième battement. C'est le sommet du genre,
  et l'oscillateur est déjà fabriqué avec les pièces actuelles :
  bascule chargée d'une bleue → la bleue roule et tombe sur un levier → levier →
  barrière ouverte → la masse tombe sur l'autre bout de la bascule → la bascule
  repart et rejoue le cycle.
- **Pourquoi ça reste robuste.** Chaque battement est remis à l'état propre par le
  levier : c'est exactement le rôle de resynchronisation que le doc attribue aux
  sources binaires. Sans ce verrou, un moteur est une loterie — donc ce niveau
  n'existe que si le levier est le juge.
- **Ce qui est cassé.** (1) Le cycle s'amorce mais la bleue, au troisième tour,
  part dans le mauvais sens. (2) La barrière ne se referme jamais, donc la masse
  tombe une seule fois. (3) Rien ne temporise : le cycle tourne en 1,2 s et épuise
  les 20 s avant la livraison finale. Le joueur doit **allonger** un tour avec une
  bande de 3 unités.
- **Leurres.** Un tremplin qui double la fréquence et casse le rythme ; une
  seconde masse qui sature la bascule en butée permanente.
- **Sans compteur, variante gratuite.** Objectif en conjonction d'états : « la
  masse au sol **et** le levier au cran droit **et** la rouge au panier » — ce
  qui n'est atteignable qu'après plusieurs battements.
- **Asset d'accompagnement.** Une cloche (Étape E) pour rendre les battements
  comptables à l'œil.

### Fiche 6 — « Sens unique »

_Coût moteur : un collider à sens unique (Étape A). Le level-design devient un
graphe orienté._

- **L'idée.** Un **clapet** laisse passer la bille de gauche à droite et la bloque
  dans l'autre sens. La rouge doit descendre en A, être soufflée jusqu'en B, puis
  **revenir** en A — une seule fois, et pas par le même chemin.
- **Pourquoi c'est fort.** Le demi-tour cesse d'être une sortie de secours : les
  boucles deviennent possibles, et le joueur ne peut plus « revenir en arrière »
  en reposant une poutre. Une seule famille d'objets, et la lecture d'un niveau
  change de nature.
- **Ce qui est cassé.** (1) Le clapet est monté à l'envers (le joueur doit le
  retourner d'un quart de tour). (2) Le souffle arrive trop tôt : la bleue qui
  devait le déclencher est partie. (3) Le chemin du retour n'existe pas.
- **Leurres.** Le **paravent de balles** : trois bleues alignées dans le cône, et
  une seule monte. Le tremplin, qui fait faire demi-tour au mauvais endroit.
- **Robustesse.** Le clapet est discret et sans état : aucune fenêtre temporelle.

### Fiche 7 — « Panier occupé »

_Coût moteur : une niche de parking (Étape A). Dessin des bleues déjà prêt._

- **L'idée.** Le panier est une **ressource unique**. Trois bleues doivent y
  tomber pour que la machine tourne, et la victoire ne reconnaît que
  la rouge. Il faut donc **garer** les bleues — ce qui, aujourd'hui, est presque
  impossible sans objet dédié.
- **Ce que ça change.** Le joueur ne construit plus seulement un chemin : il
  gère un stock de places. « Où vont les bleues ? » devient une question de niveau.
- **Pièges.** Une barrière posée **sous** le panier le vide (une bleue qui y
  stationne bloque la place, et une bleue qui en sort la libère au pire moment) ;
  une bascule qui envoie deux bleues à la fois ; la rouge qui arrive au pas 29,
  ressort, et perd les 30 pas.
- **Leurres.** Le panier lui-même, présent en deux exemplaires dont un seul est
  désigné par `goal.basketId` — l'autre devient un meuble.
- **Défi bonus.** « Vide l'inventaire » : toutes les bleues doivent être garées.

### Fiche 8 — « La machine se mord la queue »

_Coût moteur : rien (un objectif = un état de levier à lire à la fin)._

- **L'idée.** La rouge doit faire **deux aller-retours** dans un circuit fermé,
  puis s'arrêter dans un panier qui, au départ, était une **réserve** de bleues.
  Le joueur doit comprendre le rôle de chaque objet en **lisant la machine**, pas
  en cherchant un chemin.
- **Le ressort de l'énigme.** Le cycle doit être correct du premier coup : au
  deuxième tour, un fil est sectionné, une barrière reste ouverte, la bleue de
  service est partie. Ici le niveau n'est pas difficile à _recommencer_, il est
  difficile à **prévoir**.
- **Ce qui est cassé.** (1) L'ordre de deux barrières est inversé (le niveau
  jumeau « Le bon ordre » existe déjà ; ici l'enjeu est l'**irréversibilité**, pas
  l'ordonnancement). (2) La bleue de service s'égoutte en continu au lieu de
  tomber d'un coup. (3) Il manque une temporisation d'un tour.
- **Leurres.** Une bleue de trop : le circuit tourne aussi bien avec deux, et il
  meurt avec trois.
- **Paliers.** ⭐ trois objets ; 🏆 deux. C'est le niveau où `searchSolutions`
  trouvera sûrement une solution à un objet : à corriger par la géométrie, pas par
  une règle.

## 4. Catalogue de surprises lisibles

Une liste de « détails qui se comprennent après coup », à puiser pour construire
les surprises demandées par le § 2 du document de conception. Tous ces points
doivent être **vérifiés en test** avant d'être écrits dans un niveau : ils sont
déduits des valeurs documentées, pas mesurés.

| Le joueur croit…                                | Il découvre…                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| « une poutre en escalier, et la balle monte »   | Le ventilateur ne fait pas monter le long du cône : il fait léviter **à l'aplomb de la bouche**. Son escalier est un toit qui bloque le souffle. |
| « je pose une poutre pour guider le vent »      | Le vent meurt sur le premier solide : il vient de **construire un écran** et d'abriter ce qu'il voulait pousser.                                 |
| « deux ventilateurs, deux fois plus de montée » | Trois bleues alignées dans le cône : seule la première monte, les autres lui servent de **paravent**.                                            |
| « le tremplin est un ascenseur »                | Il rend la vitesse, jamais la hauteur perdue ; et sous 1 m/s, il ne rend **rien du tout**.                                                       |
| « le panier, c'est la fin »                     | Une barrière ouverte sous le panier en fait une **trappe** : on peut gagner, puis perdre.                                                        |
| « je pose un mur pour retenir la balle »        | Une barrière ouverte n'a plus de collision : son mur est un **trou**.                                                                            |
| « la bascule est à l'équilibre »                | Elle est en **butée** depuis le début, donc c'est une rampe, et le joueur a réparé quelque chose qui n'était pas cassé.                          |
| « la bleue va appuyer sur le bouton »           | Elle passe trop vite pour les 0,4 s de la barrière : il faut la **garer** sur le bouton, pas la faire passer.                                    |
| « une balle dans le panier, c'est gagné »       | Elle l'a traversé : il faut **30 pas**. Les 29 premiers ne comptent pas.                                                                         |
| « ma chaîne est parfaite »                      | Elle dure 21 s : la géométrie est juste, le **chrono** a perdu.                                                                                  |
| « le levier est un interrupteur »               | Il tient à peine : une balle rapide l'a déjà fait basculer **avant** l'étape qu'il devait déclencher.                                            |
| « je n'ai qu'à mettre la masse partout »        | Elle pèse 35 balles : elle **écrase** le levier, bloque la niche et ouvre une rampe de sortie.                                                   |

## 5. Trois règles de fabrication qui en découlent

De ces fiches se dégagent trois règles qui permettent d'en produire beaucoup
d'autres sans abaisser la qualité.

1. **Un niveau, un moment.** Exactement un endroit de la chaîne où le **temps**
   décide (une barrière à traverser, un souffle à attendre, une bande de 2 s à
   respecter). Deux moments, et le niveau devient une loterie ; aucun, et il se
   résout à l'inspection. Et ce moment doit être gardé par un **juge binaire** —
   levier en cran ou bouton enfoncé — qui remet la chaîne à l'état propre et
   rend la pose tolérante à ± 0,3.
2. **Un inventaire qui peut faire perdre.** Chaque inventaire contient (a) au
   moins un objet qui, posé là où le joueur a envie de le poser, **fait perdre**
   (l'escalier qui coupe le cône, la masse qui fige la bascule) et (b) au moins un
   objet dont le bon usage est de **supprimer** un effet : boucher un vent, caler
   un manche, remplir une place. Un niveau dont l'inventaire ne peut qu'aider est
   un trou à combler.
3. **Un leurre ressemble à la solution.** Un leurre efficace est un objet de la
   **même famille** que la solution, avec la même portée visuelle : une poutre de
   plus dans un niveau de pentes, pas un ventilateur dans un niveau de pentes. Un
   objet sans rapport n'est pas un leurre, c'est du bruit — et sur un écran de
   téléphone, du bruit, c'est une faute de conception.

## 6. Tensions à trancher avant d'implémenter

- **« Vide l'inventaire » contredit le 🏆.** L'un récompense tout poser, l'autre
  le minimum. Ce n'est pas un compromis à inventer en silence : ce sont deux
  **familles de niveaux**, à déclarer comme telles (un niveau porte l'une ou
  l'autre, jamais les deux) et à signaler dans l'interface. À trancher dans le
  document de conception avant d'écrire le premier défi.
- **Zones et « la géométrie, pas la zone ».** La fiche 3 repose sur une **zone
  interdite**, alors que le § 2 du document de conception dit qu'un bon niveau
  interdit les raccourcis par sa géométrie et non par une zone. Ce n'est pas le
  même objet : ici la zone est une **condition de défaite**, pas une restriction
  de pose. La distinction doit être écrite noir sur blanc, sinon la règle sera
  invoquée pour interdire l'objectif.
- **Capteurs et « une cible, un seul contrôleur ».** Ajouter des sources
  (passage, horloge, contenu, compteur) ne casse pas la règle : une cible garde un
  seul contrôleur. Mais cela **dilue la lisibilité purement physique** du câblage.
  Proposition : au plus **un capteur par niveau**, et jamais un capteur qui en
  commande un autre.
- **Boîtes logiques : non.** Bon marché, mais transforme le jeu en câblage
  booléen et n'apporte aucune surprise lisible.
- **Fils sectionnables (fiche 8).** Cela touche le modèle des `wires` (un état
  `intact`), donc la sérialisation et les tests de migration. Non décidé ; la
  fiche 8 est jouable sans, en utilisant une barrière qui reste ouverte.
- **Le format v3 est le vrai verrou.** Les fiches 2 et 7 (deux paniers, plusieurs
  balles rouges) l'exigent, avec migration et tests sur les deux versions. C'est
  le chantier le plus lourd du document, et le seul qui débloque deux fiches d'un
  coup.
- **Règle « pas de système sans besoin valide ».** Aucun capteur, aucun collider
  nouveau ne doit être codé **avant** la fiche qui le réclame : les étapes A, B, C, D
  de ce document sont ordonnées pour ça. Chaque ajout doit arriver avec son
  niveau, son test de comportement et ses outils d'édition.
- **Mobile-first.** Un nouvel objectif n'est terminé que s'il est **lisible sans
  survol** sur un viewport de téléphone (icône de défi + une ligne de texte), et
  les fiches nouvelles doivent être validées à l'œil au format concerné.

## 7. Par où commencer

De la dette la plus basse au plus gros chantier :

1. **Étape B — les propriétés** (`pivot` de bascule, `power` du ventilateur,
   `glide` de la barrière). Quelques heures, aucune nouvelle famille, aucun niveau
   bloqué, et un gain immédiat pour les niveaux existants.
2. **Deux objectifs sans objet neuf.** _Tenir bon_ (fiche 3) et _état final d'un
   levier_ (fiches 5 et 8). Ils testent de bout en bout le câblage d'un nouveau
   type d'objectif — schéma, victoire, affichage, E2E — pour un coût de domaine
   minime. **La fiche 3 est le prototype à jouer en premier** : elle n'attend
   aucun asset, et elle inverse le but du jeu, donc elle valide le plus de plomberie.
3. **Étape A — trois colliders** (goulotte, niche, clapet), chacun livré **avec**
   son niveau : la goulotte avec la fiche 1, la niche avec la fiche 7, le clapet
   avec la fiche 6.
4. **Étape C — capteur de passage et compteur**, uniquement quand la fiche 4 et la
   fiche 5 sortent du papier. Ils n'apportent rien tant qu'aucun niveau ne les
   exige.
5. **Format v3** (plusieurs balles rouges et paniers) : à planifier comme un
   chantier à part, avec migration et tests sur la version 2 et la version 3. Il
   débloque les fiches 2 et 7, mais rien d'urgent.

Pour chacune des fiches, l'ordre de validation du document de conception reste la
loi : aucune pose (doit perdre) → solution de référence (doit gagner) → grille
autour de chaque pose (fenêtre ≥ 0,3) → `searchSolutions` avec moins d'objets
(aucune victoire attendue, sauf si c'est le 🏆 voulu) → `pnpm content:check` et
`pnpm check:fast` → **puis jouer l'auteur, capture à l'appui**, avant d'en écrire
une deuxième.
