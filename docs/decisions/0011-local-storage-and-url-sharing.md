# ADR 0011 - Persistance locale et partage par URL

Statut : accepté

Date : 2026-09-26

## Contexte

`architecture.md` prévoyait IndexedDB pour les brouillons, la progression et les
préférences, et un codec de fragment URL « avec version, algorithme, taille
attendue et checksum ». Le cahier des charges laissait ouvert l'adaptateur
IndexedDB et les paramètres du codec. La progression de l'ADR 0010 a besoin d'un
stockage ; le partage de niveaux créés en a besoin d'un format.

## Décision

### `localStorage`, derrière des ports

La persistance locale utilise `localStorage`, pas IndexedDB.

- Les volumes sont petits : une progression tient en quelques kilo-octets, un
  niveau en quelques kilo-octets (plafond du codec : 256 Kio). Quelques dizaines
  de brouillons tiennent dans le quota habituel de 5 Mo.
- L'API est synchrone, testable avec un faux `Storage` en mémoire, sans
  dépendance (`fake-indexeddb` aurait été nécessaire).
- Les ports de `src/application/` (`ProgressRepository`, `DraftRepository`,
  `PreferencesRepository`) gardent la décision réversible : un adaptateur
  IndexedDB pourra les implémenter sans toucher au domaine.

Règles :

- clés préfixées `contrapt:` (`contrapt:progress`, `contrapt:preferences`,
  `contrapt:drafts` pour l'index, `contrapt:draft:<id>` par brouillon) ;
- chaque valeur est une enveloppe JSON `{ "kind": "...", "version": 1, "data": ... }`
  validée par Zod à la lecture ; les documents de niveau d'un brouillon passent
  par le codec de fichier (migrations incluses) ;
- une valeur illisible ou invalide n'est **jamais écrasée silencieusement** : elle
  est copiée sous `contrapt:backup:<clé>` avant la première écriture, et la
  lecture renvoie un état vide accompagné d'un avertissement ;
- une erreur de quota ou un stockage indisponible (navigation privée, stockage
  bloqué) est un résultat d'erreur, jamais une exception qui remonte à l'écran ;
  le jeu reste jouable sans persistance ;
- `navigator.storage.persist()` est demandé une fois après la première réussite
  d'un niveau, sans bloquer si refusé.

### Codec de fichier de niveau

`src/infrastructure/level-file/` : texte JSON indenté de 2 espaces, plafond de
256 Kio **avant** parsing, `JSON.parse` protégé, migrations v1 → v2 puis schéma
courant, codes d'erreur stables (`too-large`, `invalid-json`,
`unsupported-version`, `invalid-document`). C'est l'unique entrée et sortie JSON
d'un niveau, pour l'import/export comme pour les brouillons et le partage.

### Partage par fragment URL

Forme : `/shared#level=<charge>`, avec

```text
<charge> = 1.<crc32>.<taille>.<données>
```

- `1` : version du format de charge (le seul algorithme de v1 est `deflate-raw`) ;
- `<crc32>` : CRC-32 (polynôme IEEE) des octets UTF-8 du JSON, 8 chiffres hexa
  minuscules ;
- `<taille>` : longueur en octets du JSON, décimale ;
- `<données>` : `deflate-raw` du JSON (`CompressionStream`, natif, sans
  dépendance), encodé en base64url sans remplissage.

Le JSON est la sortie du codec de fichier. Le CRC-32 est une détection de
corruption, pas une signature : il n'apporte aucune authenticité.

Décodage, dans cet ordre, chaque étape ayant son code d'erreur :

1. charge ≤ 16 384 caractères, sinon `too-large` ;
2. forme `1.x.y.z` et version `1`, sinon `unsupported-version` ;
3. `<taille>` ≤ 262 144 (256 Kio), sinon `too-large` ;
4. base64url valide, sinon `invalid-encoding` ;
5. décompression en flux **interrompue dès que** le total dépasse `<taille>`,
   puis total égal à `<taille>`, sinon `size-mismatch` ;
6. CRC-32 égal, sinon `checksum-mismatch` ;
7. codec de fichier (validation et migrations).

Le fragment n'est jamais envoyé au serveur. Un niveau partagé s'ouvre en mode
joueur comme niveau éphémère : il n'entre pas dans la campagne, ne compte pas
dans la progression, et n'écrase ni ne crée de brouillon sans action explicite
de l'utilisateur. Un fragment invalide affiche une erreur et n'altère rien.

`/shared` étend le schéma d'URL de l'ADR 0008.

## Conséquences

- `architecture.md` § Stockage et partage est mis à jour : `localStorage` au lieu
  d'IndexedDB.
- `CompressionStream` impose des navigateurs récents (Chrome 103, Firefox 113,
  Safari 16.4) : c'est déjà la cible de la PWA. Node 24 le fournit pour les tests.
- Le codec URL est asynchrone ; le codec de fichier reste synchrone.
- Un niveau de 3 Ko de JSON donne une charge d'environ 1 à 1,5 Ko : l'URL reste
  partageable par messagerie.
