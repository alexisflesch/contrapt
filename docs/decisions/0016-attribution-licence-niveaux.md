# ADR 0016 - Attribution et licence des niveaux

Statut : accepté

Date : 2026-10-01

## Contexte

Avec « Mes niveaux » (ADR 0015), un niveau circule, se remixe et peut être
proposé, via un formulaire Grist de la forge edu, pour entrer dans la campagne
officielle. Intégrer un niveau suppose deux choses : savoir qui l'a fait, et
avoir le droit de le reprendre. Le code est sous AGPL-3.0-or-later ; un niveau
est du contenu, pas du code, et n'avait aucune licence déclarée. Le public
visé peut compter des élèves mineurs.

Décisions de l'auteur du 1er octobre 2026 : niveaux sous CC BY 4.0 ; un pseudo
d'auteur et la liste des sources dans le format ; l'attribution est
déclarative, et celui qui publie en porte la responsabilité.

## Décision

### Licence

Tout niveau de TinkerBolt (campagne embarquée comme niveau partagé depuis
l'application) est sous **Creative Commons Attribution 4.0 International
(CC BY 4.0)**. La licence n'est pas un champ du document : elle est celle du
projet pour le contenu de niveau, déclarée dans le README et rappelée au moment
de partager. La boîte d'export (U16) affiche : « En partageant ce niveau, tu le
places sous licence CC BY 4.0 : d'autres pourront le modifier et le republier
en te citant. » Les sprites et illustrations de `art/` et `public/assets/` ne
sont pas couverts par cette décision.

### Champs du format

Deux champs facultatifs dans `metadata`, compatibles avec la v2 : un document
qui ne les porte pas reste valide et se relit à l'identique, donc **pas de
nouvelle version ni de migration** (même régime que `challenge`, ADR 0010).

```ts
metadata: {
  title: string;
  description?: string;
  author?: string;                                  // pseudo
  basedOn?: { title: string; author?: string }[];  // sources, la plus récente d'abord
}
```

- `author` : 1 à 40 caractères après suppression des espaces de bord, sans
  caractère de contrôle ni saut de ligne.
- `basedOn` : au plus 16 entrées ; `title` suit la règle de `metadata.title`,
  `author` celle de `metadata.author`.
- Ces textes sont toujours affichés comme du texte brut, jamais comme un lien
  ni du HTML (invariant « ni code exécutable, ni URL d'asset distante »).

Le schéma `metadata` étant strict, une version ancienne de l'application refuse
un fichier qui porte ces champs ; la mise à jour de la PWA (ADR 0012) le règle.

### Remplissage automatique

À la création d'une création depuis un niveau (ADR 0015) :

- `basedOn` = `{ title, author }` du niveau d'origine, suivi de son propre
  `basedOn`, tronqué à 16 entrées (les plus anciennes tombent) ;
- `author` est retiré : le remixeur n'est pas l'auteur de l'original ;
- le titre devient « <titre d'origine> (remix) », tronqué à la longueur
  maximale du titre.

L'interface n'édite pas `basedOn` : il se transmet tel quel d'export en export.
Un fichier modifié à la main peut le falsifier ; c'est la responsabilité de
celui qui publie, l'application ne prétend pas l'authentifier.

### Pseudo

La boîte d'export propose de renseigner le titre et un pseudo facultatif, avec
l'aide « Un pseudo, pas ton vrai nom ». Le dernier pseudo saisi est retenu
localement (`tinkerbolt:preferences`, ADR 0011) pour préremplir les exports
suivants. Aucune autre donnée personnelle n'est demandée ni stockée.

### Affichage

Un niveau reçu affiche « par <auteur> » si `author` est présent, et « d'après
<titre> (par <auteur>) » pour la première source si `basedOn` est présent, sur sa
carte de « Mes niveaux » et dans l'en-tête de jeu.

## Conséquences

- Tests du schéma : ancien document sans les champs relu à l'identique ;
  nouveau document relu à l'identique par le codec de fichier et le codec URL ;
  bornes et caractères refusés.
- Le formulaire Grist peut s'appuyer sur le fichier exporté : il est vérifié
  (ADR 0013), porte son attribution et sa chaîne de sources. Le formulaire
  recueille lui-même le consentement et relève de son responsable, hors de
  l'application.
- Le README déclare la licence CC BY 4.0 du contenu de niveau, à côté de
  l'AGPL du code.
