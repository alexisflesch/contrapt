# Gamification de TinkerBolt — analyse et propositions Astra

27 septembre 2026 · Document de réflexion produit.

Cette analyse porte sur l’envie de progresser, de revenir, de créer et de partager.
Elle ne propose pas de nouvelles pièces physiques. Elle complète les
[propositions de puzzles](levels/propositions-evolution-astra.md).

**Lecture exclusivement documentaire : fichiers Markdown du dépôt.** Aucun code,
JSON, visuel ou écran de l’application n’a été inspecté ; aucun essai de jeu n’a
été réalisé. « Livré » ci-dessous signifie « déclaré livré dans `etat.md` ».
Les recommandations sont des hypothèses de conception, à faire jouer, et non des
effets mesurés sur la fidélisation.

La lecture a été élargie au cadrage produit, à l’état livré, aux décisions de
progression et de partage, aux parcours mobiles et aux idées de niveaux, comme
l’autorise la demande. Les références déterminantes sont liées au fil du texte.
Le présent document ne modifie aucune décision acceptée ni l’ordre de réalisation
actuel ; les évolutions qui exigeraient un nouvel arbitrage sont signalées.

## 1. Mon avis : un bon principe, mais une expérience encore à relier

**Je conserverais l’idée « réussir d’abord, améliorer ensuite ».** C’est une bonne
base pour ce jeu : trouver une solution doit suffire à rendre fier. Une économie
de pièces peut ensuite devenir un nouveau problème pour ceux qui le souhaitent.
La révélation progressive et l’absence de verrou fondé sur les étoiles sont des
points forts de l’[ADR 0010](decisions/0010-object-challenge-and-progression.md).

Mon principal reproche serait ailleurs : les documents décrivent bien ce qui
valide une réussite, mais moins ce qui donne envie de vivre la suivante. Le
parcours visible n’est pas encore complet ; la collection de ses propres
solutions, la progression personnelle et la conversation entre amis restent
largement à concevoir.

Je privilégierais quatre promesses :

- **« Je comprends de mieux en mieux. »** Les difficultés deviennent lisibles,
  les échecs donnent des idées et l’aide ne dévalorise pas le joueur.
- **« Ce que j’ai fait reste à moi. »** Je retrouve mon chantier, ma solution et
  les petites réussites auxquelles je tiens.
- **« Il reste quelque chose qui m’intrigue. »** Je peux choisir un prochain
  problème, sans devoir perfectionner tous les précédents.
- **« J’ai quelque chose à te faire essayer. »** Le partage est une invitation
  personnelle, pas seulement la diffusion d’un score.

Des points d’expérience ou une série de connexions quotidiennes ne sont pas
nécessaires pour obtenir cela. Je commencerais par rendre ces quatre promesses
concrètes.

## 2. Ce que les documents prévoient réellement

| Sujet | État documentaire | Conséquence pour la proposition |
| --- | --- | --- |
| Trois paliers, records et déblocages | Décidés ; logique et sauvegarde locale livrées, interface encore à compléter | Terminer leur présentation avant d’ajouter un autre système de récompenses |
| Résultat et poursuite | Aucun bouton « Niveau suivant » selon l’état ; U4 prévoit résultat, palier et suite | C’est une priorité pour donner envie de continuer une session |
| Liste des niveaux | U5 prévoit chapitres, verrouillage et paliers | La carte de progression reste à rendre utile au joueur |
| Campagne | Douze niveaux déclarés jouables ; 13 et 14 bloqués ; les niveaux actuels sont qualifiés de prototypes par la référence de conception | Ne pas construire une grande économie de récompenses autour de ce contenu provisoire |
| Éditeur | Atelier utilisable, commandes auteur présentes, interface de configuration et de gestion incomplète | La promesse « crée un vrai puzzle pour un ami » demande encore un parcours dédié |
| Partage | Export et copie de lien U16, codec et ouverture `/shared` livrés | On peut enrichir une base existante, sans inventer immédiatement une plateforme sociale |
| Niveaux reçus | Éphémères, hors progression de campagne, sans création automatique de brouillon | Prévoir une conservation explicite et séparée si l’on veut les retrouver |
| Reprise | Reset exact de la simulation ; persistance des records ; brouillons non encore reliés à leur interface | Cela ne constitue pas encore une sauvegarde documentée de chaque tentative de campagne |
| Installation et hors ligne | PWA livrée ; invitation visible U10 encore prévue | Le hors-ligne est un avantage à rendre compréhensible au bon moment |

Sources : [état livré et dettes](etat.md), [feuille de route, L19–L28 et U4–U17](feuille-de-route-luna.md),
[conception des niveaux](levels/conception-niveaux.md),
[partage et stockage](decisions/0011-local-storage-and-url-sharing.md).

Deux nuances comptent pour ne pas surestimer l’existant :

- La progression enregistre une réussite et un meilleur nombre d’objets ; elle
  n’enregistre pas pour autant la construction qui a produit ce record.
- U16 exporte le document actuel de l’atelier, avec son inventaire restant. Le
  lien n’est pas automatiquement un puzzle bien préparé, avec une situation de
  départ intéressante et des règles de résolution vérifiées.

Je retiens l’ADR 0011 pour le stockage local, même si certaines sections anciennes
parlent encore d’IndexedDB. De même, les quatorze niveaux de la spécification ne
signifient pas quatorze niveaux livrés. Ces écarts de prose ne changent pas le
diagnostic ; ils devront être alignés avant une implémentation qui s’y appuierait.

## 3. Ce qui me donnerait envie de continuer immédiatement

### Une victoire qui me laisse profiter de ma machine

Je voudrais pouvoir voir le résultat, savourer ce qui fonctionne et décider de
la suite sans être recouvert par trois fenêtres de récompenses.

Proposition de résultat :

> **Machine réparée !**
>
> Solution conservée.
>
> **Continuer**
>
> Améliorer ma solution · Montrer à un ami

« Solution conservée » ne doit apparaître qu’après une sauvegarde réellement
réussie. « Améliorer » n’impose pas un objectif d’économie avant que le niveau
n’ait été gagné ; l’interface suit la révélation progressive décidée.

Une seule action principale : continuer. Les autres restent accessibles mais
secondaires. La célébration est courte, peut se réduire selon les préférences,
et laisse la construction visible. Une petite marque dans le carnet suffit ;
pas besoin d’une cinématique ou d’un personnage animé.

Le parcours « Recommencer » doit conserver la construction, conformément à la
[spécification mobile](mobile-editor-interactions.md). Améliorer ne doit jamais
signifier effacer par surprise ce qui vient de marcher.

### Un prochain problème qui suscite une question

Sur la carte ou après la victoire, montrer le titre et une miniature du prochain
puzzle, accompagnés d’une courte promesse : « Deux livraisons, un seul départ »,
« Le passage ne restera pas ouvert ». Pas de solution montrée en miniature, ni
d’objectif d’économie révélé trop tôt.

Le joueur doit anticiper une nouvelle idée, pas seulement le nombre suivant.
Varier aussi l’effort : après un puzzle exigeant, proposer une scène plus légère
ou spectaculaire. Cette alternance dépend de la qualité du contenu, pas d’une
jauge d’expérience.

### Le droit de bloquer sans que toute la partie s’arrête

L’ouverture strictement linéaire de l’ADR 0010 est simple à comprendre, mais un
seul puzzle difficile peut devenir la fin de la campagne pour un joueur.

**Évolution proposée :** conserver un départ guidé, puis offrir deux ou trois
missions accessibles dans le chapitre. Un niveau laissé de côté porte la mention
neutre « À reprendre ». Le jeu rappelle où l’on s’était arrêté sans présenter ce
choix comme une défaite.

Pour un chapitre hypothétique de six missions, en résoudre quatre pourrait
ouvrir le suivant ; les deux restantes resteraient disponibles. Les nombres
sont un exemple à tester, pas un équilibrage arrêté. Les compétences nécessaires
au chapitre suivant doivent pouvoir être apprises par les chemins réellement
ouverts ; une difficulté facultative ne doit pas cacher un prérequis obligatoire.

**Décision à revoir :** cela change explicitement la règle de déblocage de
l’ADR 0010. À court terme, U4 et U5 peuvent appliquer la règle actuelle ; le choix
entre missions est une évolution ultérieure, pas une modification implicite.

### Une aide qui préserve le plaisir de comprendre

Je proposerais trois degrés d’aide, demandés par le joueur :

1. **Regarder autrement** : une question sur le problème, sans placement indiqué.
2. **Localiser la difficulté** : attirer l’attention sur une partie de la scène.
3. **Montrer une piste** : révéler une étape de solution, avec choix explicite
   avant de dévoiler davantage.

L’aide est écrite par l’auteur du niveau, sans agent conversationnel ni serveur.
Elle doit suivre les variantes du contenu. Ne pas compter les essais pour
humilier le joueur, diminuer son palier ou faire payer un indice. La victoire
reste entière lorsqu’il a demandé de l’aide.

Une proposition discrète d’aide peut arriver après plusieurs essais, mais elle
ne doit pas insister : quelqu’un qui expérimente beaucoup n’est pas forcément
perdu. Le retour d’échec explique les faits observables, sans inventer un
« presque réussi à 92 % » pour une chaîne qui n’a pas de progression linéaire.

## 4. Ce qui me donnerait envie de revenir demain, ou la semaine prochaine

### Retrouver exactement mon chantier

Sur téléphone, je voudrais fermer la page et retrouver les pièces que j’avais
posées. **Sauvegarder un record et sauvegarder un travail en cours sont deux
promesses différentes.** La seconde peut être plus déterminante que beaucoup de
badges.

Une entrée « Reprendre » montrerait la miniature du chantier en cours, puis des
accès secondaires à la campagne et à mes créations. Lors d’une première visite,
on conserverait l’accès rapide au jeu.

Au retour, restaurer la construction, pas une simulation lancée à moitié. Le
joueur choisit quand il relance. Si la sauvegarde locale échoue, le message doit
être clair et ne jamais promettre une reprise impossible. Prévoir ensuite un
export de sauvegarde pour les joueurs attachés à leur collection ; l’export
actuel d’un niveau n’est pas une sauvegarde complète de la progression.

**Décisions à compléter :** persistance des tentatives et solutions, distincte des
records et brouillons actuels ; amendement de l’ADR 0008 si la destination de `/`
change pour les joueurs qui reviennent.

### Un carnet de machines, plutôt qu’une simple liste de coches

Chaque puzzle résolu laisserait une petite fiche : titre, miniature de ma
construction, nombre de pièces et bouton pour revoir ou reprendre cette solution.
Je pourrais marquer quelques fiches comme favorites.

Deux emplacements suffiraient au départ : **ma première réussite** et **ma
meilleure économie de pièces**. Une construction plus récente ne détruit pas la
première. La capacité et le poids du stockage restent à étudier ; ne pas promettre
un historique illimité des essais.

Ce carnet donne une forme à l’apprentissage : « je me souviens de cette idée ».
Il fournit aussi naturellement quelque chose à montrer. Les enregistrements
doivent conserver le lien avec la version du puzzle ; après modification de la
scène ou de la simulation, un ancien résultat ne doit pas être présenté comme
un record vérifié sur la nouvelle version.

Le replay est un complément ultérieur. Conserver une construction et une vignette
est un premier périmètre plus modeste que garantir la reproduction de tous les
anciens mouvements après chaque mise à jour.

### Des chapitres qui changent un petit morceau de mon atelier

J’aimerais voir les missions accomplies transformer un lieu qui m’appartient :
un panneau se remplit, une étagère accueille un souvenir, une enseigne se révèle.

Proposition légère : un fond fixe et un petit nombre de calques ou de vignettes
ajoutés à la fin de chaque chapitre. Chaque souvenir évoque une aventure précise.
Il n’y a ni loyer, ni entretien, ni monnaie à récolter pour garder l’endroit vivant.

Le joueur peut choisir quelle réalisation exposer, sans qu’une décoration lui
donne un avantage dans les puzzles. Les outils de l’éditeur restent disponibles :
leur accès ne doit pas dépendre d’un travail répétitif dans la campagne.

**Budget graphique :** images fixes générées, quelques apparitions ou rotations
simples. La mascotte mentionnée dans U12 pourrait commenter un jalon avec deux ou
trois poses réutilisables ; elle n’a pas besoin de marcher dans l’atelier.
L’habillage doit développer une identité propre, conformément à notre échange.

### Des rendez-vous de contenu sans obligation de présence

Une petite sélection thématique de trois puzzles donnerait un motif concret de
revenir : « les réparations du week-end », avec une entrée accessible et un défi
plus exigeant. Les anciens lots resteraient disponibles.

Je ne promettrais une fréquence hebdomadaire qu’après avoir mesuré la capacité à
produire de bons niveaux. Un nouveau lot ponctuel vaut mieux qu’un calendrier
qui pousse à publier des variantes sans intérêt.

Ces lots peuvent être préparés et embarqués avec le jeu. Hors ligne, on joue ce
qui a déjà été reçu ; un contenu encore absent nécessite naturellement une mise
à jour. Aucune génération automatique infinie ni publication distante n’est
supposée acquise.

Un « puzzle du jour » pourrait simplement mettre en avant un niveau d’un stock
préparé, avec accès aux archives. Il ne remplace pas la création de contenu neuf.
Pas de récompense perdue à minuit, pas de série remise à zéro après une absence.

## 5. Récompenser plusieurs façons d’aimer le jeu

### Garder l’économie de pièces, préciser ce qu’elle signifie

Le mot **« élégant »** associe actuellement une qualité esthétique à un nombre
de pièces. Une machine un peu extravagante peut pourtant être la plus amusante
à regarder. Je conserverais le défi, mais le présenterais comme une économie.

| Présentation actuelle | Proposition de libellé | Intention |
| --- | --- | --- |
| ✅ Résolu | Réparé / Résolu | La mission est pleinement réussie |
| ⭐ Élégant | Économe | Une contrainte facultative a été satisfaite |
| 🏆 Minimal | Référence atteinte | Le seuil connu de l’auteur est atteint, sans prétendre prouver un optimum |

On peut garder les symboles actuels ; les textes évitent de réduire toute la
créativité à un seul critère. Ces changements demandent une mise à jour explicite
de l’ADR 0010 et une validation des libellés.

Si le joueur fait mieux que son précédent résultat : « Nouveau record personnel ».
S’il fait mieux que le seuil de l’auteur : « Moins de pièces que la référence ! ».
Ne pas annoncer un record mondial : le partage actuel n’établit ni identité ni
classement vérifié. L’ADR précise déjà que le minimum de l’auteur est un minimum
connu, non une preuve absolue.

### Un défi bonus qui change vraiment la question

Après la réussite d’un niveau choisi, proposer parfois **un contrat facultatif** :
réussir avec une famille d’objets retirée de l’inventaire, conserver une pièce
marquée, ou résoudre une variante dont le point de départ a changé.

L’intérêt est de chercher une autre idée, pas d’exécuter dix fois la même solution.
Un seul contrat bonus par niveau au départ ; tous les niveaux n’en ont pas besoin.
La variante doit avoir été réellement conçue et éprouvée. « Utilise autre chose »
n’est pas une condition suffisamment précise pour donner une récompense.

Ces contrats ne sont pas couverts par le seul compteur d’objets actuel. Ils
exigent une décision de contenu et de progression, et parfois une évolution du
format. La campagne principale reste ouverte sans eux. Après le meilleur palier,
ne pas empiler automatiquement de nouvelles exigences dans le résultat : l’accès
aux variantes se fait volontairement depuis la fiche du niveau.

### Quelques souvenirs de parcours, pas une usine à badges

Je choisirais peu de jalons, faciles à expliquer :

- Première machine réparée.
- Premier chapitre terminé.
- Première solution personnelle améliorée.
- Premier contrat bonus terminé.
- Premier puzzle créé et résolu dans ses conditions de joueur.

Chacun ajoute une fiche ou un tampon au carnet. Pas de récompense pour « avoir
cliqué cent fois sur Tester », « avoir copié dix liens » ou « être revenu sept
jours de suite ». Cela détournerait l’activité vers des actions faciles à répéter.

Je ne calculerais pas automatiquement la beauté, l’originalité ou l’ingéniosité
d’une solution. Ces qualités peuvent être exprimées par le joueur ou discutées
entre amis. Deux constructions différentes ne sont pas forcément deux idées
différentes.

### Éviter de reprendre une récompense déjà gagnée

L’ADR 0010 recalcule les paliers à partir des seuils courants. C’est pratique pour
corriger le contenu, mais une modification pourrait faire disparaître une
récompense obtenue auparavant.

Proposition à arbitrer : garder dans le carnet le souvenir de la réussite sur
l’ancienne version, et distinguer un éventuel nouveau défi. Ne pas afficher un
ancien score comme directement comparable si la géométrie ou l’inventaire a
changé ; ne pas effacer non plus ce que le joueur avait accompli.

Cela demande une politique de révision des niveaux et d’évolution des sauvegardes.
Ce n’est pas une simple modification de texte.

## 6. Ce qui me donnerait envie d’envoyer le jeu à un ami

### Trois invitations, trois présentations

| Invitation | Ce que j’envoie | Ce que mon ami voit d’abord |
| --- | --- | --- |
| **« Essaie celui-là »** | Le puzzle dans son état initial et une courte invitation | L’objectif et le plateau à résoudre, sans ma solution |
| **« Regarde ce que j’ai fait »** | Une fiche de ma construction, puis éventuellement son replay | Un aperçu explicitement présenté comme une solution révélée |
| **« J’ai préparé quelque chose pour toi »** | Un puzzle créé ou adapté, remis à son état de départ | Une mission personnelle, avec possibilité de jouer immédiatement |

La première est la priorité : je dois pouvoir partager un bon moment sans devenir
auteur de niveaux. Le bouton de partage devrait proposer un texte court modifiable,
par exemple « Cette machine m’a surpris. Tu arrives à la réparer ? ».

L’ami arrive directement sur le puzzle, sans compte, installation préalable ou
traversée obligatoire de la campagne. Un rappel compact des gestes essentiels
peut être proposé sur place. Le niveau reçu reste séparé de sa progression de
campagne, comme le prévoit l’ADR 0011.

### Éviter de gâcher la découverte

Séparer clairement **le défi vierge** et **la solution à regarder**. Un partage
depuis une victoire ne doit pas transformer involontairement ma construction
résolue en situation de départ de mon ami.

Avant qu’il ait réussi, l’entrée par défaut ne montre ni ma solution ni un objectif
chiffré d’économie. Après sa victoire, nous pouvons comparer nos constructions et
nos nombres de pièces. Une action volontaire « Voir la solution » peut exister,
avec une indication claire de ce qu’elle révèle.

Pour une invitation au jeu en général, proposer quelques puzzles particulièrement
lisibles et représentatifs, choisis éditorialement. Le puzzle le plus difficile
que je viens de résoudre n’est pas forcément la meilleure première expérience
pour quelqu’un qui découvre TinkerBolt.

### Une carte partageable qui montre pourquoi c’est intéressant

Je voudrais une carte simple : titre, petite image du plateau initial, promesse
en une phrase et lien pour jouer. Pour montrer une réussite, employer au contraire
une image de la construction finale et un libellé explicite.

Les fragments URL actuels ne sont pas envoyés au serveur. On ne doit donc pas
supposer qu’une messagerie pourra fabriquer automatiquement un aperçu spécifique
à chaque niveau encodé. Une carte image créée localement, accompagnée du lien,
est une piste distincte à éprouver ; l’aperçu automatique peut rester générique.

Une courte vidéo de la réussite serait séduisante plus tard. La physique anime
déjà les sprites : cela ne demande pas un animal dessiné dans vingt positions.
En revanche, l’enregistrement et l’export vidéo sur téléphone constituent un
travail supplémentaire. Commencer par le lien et l’image fixe.

### Pouvoir répondre, pas seulement ouvrir

Après avoir gagné un défi reçu, mon ami pourrait choisir « Envoyer ma solution ».
Le jeu prépare une réponse que l’ami partage lui-même dans notre conversation.
Il n’y a aucun envoi automatique ni besoin de messagerie interne.

Une réponse peut d’abord être une carte résultat, puis une construction rejouable
quand ce format aura été défini. Le message idéal est « Voilà comment j’ai fait »,
ou « J’ai utilisé une pièce de moins », plutôt qu’un classement anonyme.

**Limite à assumer :** un lien copié n’est pas la preuve qu’il a été envoyé, ouvert
ou résolu. Sans service distant, on ne promet ni notification automatique « ton ami
a gagné », ni nombre de joueurs ayant essayé, ni record certifié. Les résultats
échangés restent ceux d’une conversation amicale.

### Une étagère « Défis reçus »

Un bouton explicite « Garder ce puzzle » permettrait de le retrouver, même si le
message d’origine est loin dans la conversation. L’ouverture seule n’enregistre
rien. Les réussites de cette étagère restent distinctes de la campagne.

Cette conservation doit respecter l’[ADR 0011](decisions/0011-local-storage-and-url-sharing.md)
et définir sa propre place dans les sauvegardes. Elle donne une bonne raison de
revenir sans modifier silencieusement le brouillon d’atelier.

## 7. La création : le prolongement le plus distinctif du jeu

### Faire passer de joueur à auteur par une petite action

Une page vide et un catalogue complet peuvent demander trop d’effort. Je
préférerais une première invitation : **« Prépare un puzzle à partir de cette
machine. »**

Le parcours pourrait être :

1. Ouvrir une copie d’un modèle autorisé, sans toucher au niveau original.
2. Choisir les quelques pièces à retirer et à proposer au futur joueur.
3. Donner un titre et une consigne courte.
4. Repartir de l’état du futur joueur et résoudre le puzzle dans ses permissions.
5. Partager cet état de départ ; conserver la solution de test séparément.

La vérification n’est pas seulement « mon document est valide » ou « ma machine
complète fonctionne ». Il faut qu’une solution existe avec l’inventaire et les
actions réellement autorisés au destinataire. Cela ne garantit pas à lui seul
que le puzzle soit amusant, mais évite une première déception évitable.

La [feuille de route](feuille-de-route-luna.md) prévoit déjà U9 pour l’interface
auteur et U17 pour travailler sur une copie d’un niveau de campagne. Ce parcours
les prolonge ; il ne suppose pas qu’ils soient terminés. U16 fournit déjà la
sortie par fichier et lien.

### Un petit défi de conception, plutôt qu’une obligation de publier

Proposer des thèmes facultatifs : « prépare une surprise lisible », « invente
une réparation avec trois pièces », « transforme ce modèle pour un débutant ».
Quelques modèles conçus pour être adaptés suffisent au départ.

La récompense est de voir quelqu’un comprendre sa création. Un titre, une
miniature et une fiche « création personnelle » peuvent reconnaître ce travail.
Pas besoin de likes ou de classement des auteurs pour cette première boucle.

L’auteur doit pouvoir ajouter un indice et une solution à révéler volontairement.
Pour un remix, conserver une attribution simple au modèle d’origine. Le
pseudonyme est facultatif et ne vaut pas identité vérifiée.

### Une idée sociale à essayer ensuite : la chaîne de défis

Un ami résout mon puzzle, puis m’en renvoie une variante. Nous construisons un
petit échange : « j’ai compris ton idée ; voici ma réponse ». Un bouton « Créer
une variante » peut faciliter cela, toujours sur une copie.

Ce mécanisme pourrait donner une identité sociale au jeu sans chat, fil d’actualité
ou présence simultanée. Il demande toutefois un éditeur compréhensible et de bons
modèles ; ce n’est pas une priorité avant un partage de puzzle simple et fiable.

## 8. Ce que je garderais pour plus tard, ou que j’éviterais

| Proposition | Position | Pourquoi |
| --- | --- | --- |
| Galerie publique | Plus tard, si les échanges directs montrent un intérêt réel | Elle demande découverte, publication, modération et entretien du contenu |
| Classement mondial | Faible priorité | L’économie de pièces peut avoir beaucoup d’ex æquo ; la vérification des résultats ajoute un autre projet |
| Compétition entre amis | D’abord par échange volontaire de solutions | La comparaison a un contexte humain, sans infrastructure sociale obligatoire |
| Mode coopératif en temps réel | Hors du premier périmètre | Les documents l’excluent ; le partage asynchrone suffit pour une première expérience commune |
| Points d’expérience et niveaux de joueur | À éviter au début | Ils doublonnent les chapitres et récompensent facilement le volume plutôt que la découverte |
| Monnaie pour acheter des pièces utiles | À éviter | Elle peut transformer un problème de réflexion en problème de stock personnel |
| Vies limitées, énergie, attente avant de réessayer | À éviter | Tester librement est le cœur du jeu |
| Récompense de connexion et série quotidienne | À éviter | La présence n’est pas l’accomplissement que je souhaite valoriser |
| Bonus pour recruter des amis | À éviter | Je veux recommander une expérience, pas solliciter mes proches pour une récompense |
| Réussites secrètes nombreuses | Faible priorité | Elles peuvent pousser à manipuler au hasard et à jouer pour une liste invisible |
| Décorations fixes choisies par le joueur | Oui, en quantité modeste | Elles donnent une identité à l’atelier sans exiger d’animation complexe |

Une communauté publique peut être une bonne évolution. Elle est déjà envisagée
comme couche optionnelle dans le [cahier des charges](cahier-des-charges.md).
Elle change cependant le périmètre sans backend de la première version : la
proposer n’équivaut pas à la considérer autorisée ou nécessaire maintenant.

## 9. L’ordre dans lequel j’investirais

Les priorités ci-dessous sont une recommandation produit, pas un remplacement
automatique de la feuille de route. La charge relative concerne surtout le
périmètre fonctionnel et éditorial ; aucun coût de code n’a été évalué.

| Priorité | Lot cohérent | Effet recherché | Condition ou coût principal |
| --- | --- | --- | --- |
| **P0** | Résultat lisible, « Continuer », carte des chapitres, recommencer sans effacer | Enchaîner deux puzzles et comprendre sa progression | Terminer U4–U6 ; traiter les frictions de placement déjà documentées |
| **P0** | Petit ensemble de puzzles réellement plaisants et représentatifs | Donner une raison intrinsèque de continuer | Travail de conception et essais humains ; les prototypes ne suffisent pas |
| **P1** | Reprise d’une tentative et conservation de la solution gagnante | Revenir sans perdre son investissement | Nouvelle persistance et prise en compte des versions de contenu |
| **P1** | Partager un puzzle vierge et ouvrir directement une invitation | Donner envie de faire essayer le jeu | Séparer problème et solution ; soigner l’accueil du destinataire |
| **P1** | Aide progressive ; quelques missions au choix si la règle est adoptée | Réduire l’abandon sur un blocage | Indices écrits, prérequis pédagogiques et amendement de progression |
| **P2** | Carnet illustré, souvenirs de chapitres, favoris | Donner une forme personnelle au parcours | Petit budget d’images fixes ; archivage borné |
| **P2** | Création guidée depuis un modèle et réponse entre amis | Passer de consommateur à auteur | Interface auteur, préparation du puzzle et solution de test séparée |
| **P3** | Lots thématiques récurrents et contrats bonus | Renouveler l’expérience des joueurs intéressés | Capacité éditoriale démontrée ; variantes réellement testées |
| **P3** | Export vidéo, galerie publique, services sociaux | Amplifier une envie de montrer déjà observée | Chantier supplémentaire ; ne pas en faire un prérequis du jeu |

Si je devais choisir seulement **trois ajouts après le parcours de base**, ce
seraient : **reprendre mon chantier, conserver ma réussite, envoyer le puzzle
vierge à un ami**. Ils soutiennent respectivement le retour, l’attachement et le
partage ; ils exploitent ce qui rend le jeu particulier.

## 10. Un parcours cible concret

### Première visite

Le joueur arrive vite sur un puzzle lisible. Il peut essayer sans limite,
recommencer en conservant sa construction et demander un indice. À la réussite,
la machine reste visible et la prochaine mission est facile à lancer. On ne
l’interrompt pas par une inscription, une demande d’inviter des amis et une
proposition d’installation simultanées.

### Première fin de session

Après quelques missions, il voit ce qu’il a accompli et choisit éventuellement
un prochain chantier. S’il part, sa construction reste disponible. Une proposition
d’installation peut être présentée à un moment calme avec un bénéfice concret :
retrouver le jeu et jouer hors ligne. Elle n’est pas une condition de progression.

### Première envie de montrer

Il envoie un puzzle qui lui a plu. Son ami ouvre la mission sans spoiler et joue.
Après réussite, il peut lui répondre avec sa construction. La conversation porte
sur les idées trouvées, pas seulement sur un total de points.

### Après le premier chapitre

Le carnet a quelques fiches, l’atelier un souvenir, et le joueur a trois directions
claires : poursuivre les missions, améliorer une solution ou préparer un défi.
Ces voies restent facultatives ; le jeu n’exige pas de tout faire pour avancer.

## 11. Comment éprouver ces propositions sans construire tout le système

Organiser d’abord de petites séances d’observation. Les durées ci-dessous sont
des formats de séance, pas des durées cibles de résolution.

| Essai | Mise en situation | Ce que l’on cherche à apprendre |
| --- | --- | --- |
| Poursuite, environ 15 minutes | Trois bons puzzles, résultat clair et carte simple | Le joueur choisit-il de lancer le suivant ? Sait-il où aller ? |
| Retour sur deux séances | Interrompre un chantier, puis rouvrir plus tard | Retrouve-t-il sa construction et son intention sans tout réapprendre ? |
| Partage en binôme | Un joueur envoie un puzzle à un proche qui ne connaît pas le jeu | Le destinataire arrive-t-il au bon endroit, comprend-il et a-t-il envie de répondre ? |
| Création guidée, environ 20 minutes | Adapter un modèle puis le faire essayer | L’auteur arrive-t-il à préparer un puzzle jouable, sans envoyer involontairement la solution ? |

Demander « qu’aurais-tu envie de faire maintenant ? » avant de proposer une liste
de fonctionnalités. Noter aussi ce que les joueurs montrent spontanément : une
réussite spectaculaire, une économie astucieuse, un échec drôle ou leur création.
Cela dira quel partage mérite le plus d’attention.

Pour les premiers essais, une observation et des retours volontaires suffisent ;
ce document ne propose pas d’ajouter automatiquement de la télémétrie distante.
Si des mesures sont mises en place plus tard, définir des questions précises :

- Après une première victoire, combien de participants lancent un autre puzzle ?
- Après un blocage, l’aide ou le choix d’une autre mission permet-il de continuer ?
- Au retour, combien retrouvent leur travail sans perte ni confusion ?
- Parmi les invitations réellement reçues dans un essai en binôme, combien
  aboutissent à un lancement, une victoire ou une réponse ?
- Parmi les modèles adaptés, combien deviennent un puzzle que l’autre comprend ?

Ne pas confondre nombre d’essais et engagement, temps passé et plaisir, clic sur
« partager » et ami conquis. Une longue session peut signaler une frustration ;
une courte peut correspondre à une excellente expérience complète.

## 12. Arbitrages à consigner avant une éventuelle réalisation

| Sujet | Rapport aux décisions actuelles | Arbitrage proposé |
| --- | --- | --- |
| Missions au choix et niveaux laissés de côté | Modifie le déblocage linéaire de l’ADR 0010 | Garder un début guidé, puis ouvrir plusieurs chemins pédagogiquement viables |
| Libellés des paliers | Modifie la présentation décidée par l’ADR 0010 | Nommer l’économie de pièces sans la confondre avec toute forme d’élégance |
| Conservation des distinctions après mise à jour | Complète ou modifie le recalcul des paliers de l’ADR 0010 | Conserver le souvenir par version ; séparer comparaison actuelle et accomplissement passé |
| Accueil « Reprendre » | Peut modifier la destination de `/` dans l’ADR 0008 | Accès rapide au jeu à la première visite, reprise utile aux visites suivantes |
| Tentatives, carnet, favoris et sauvegarde exportable | Étend la persistance de l’ADR 0011 | Définir des données distinctes et leurs migrations ; stockage local borné |
| Partage de solution et réponse rejouable | N’est pas le partage de niveau actuel | Distinguer puzzle initial, construction de solution et résultat annoncé |
| Bibliothèque de défis reçus | Doit préserver le caractère éphémère d’une simple ouverture | Enregistrer uniquement sur action explicite, hors progression de campagne |
| Contrats bonus | Dépasse le défi actuel fondé uniquement sur le nombre d’objets | Concevoir peu de variantes, avec règles explicites et reconnaissance séparée |
| Communauté publique | Dépasse le périmètre initial sans backend | Réexaminer seulement après validation du partage direct |

La prochaine étape utile serait un petit parcours jouable qui relie **résoudre,
conserver et faire essayer**, avec quelques vrais bons puzzles. C’est là que l’on
pourra vérifier si TinkerBolt donne envie d’enchaîner, de revenir et d’en parler.
