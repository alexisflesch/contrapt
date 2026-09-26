# ADR 0008 - Routage côté client

Statut : accepté

Date : 2026-09-25

## Contexte

`src/app/App.tsx` pilotait toute la navigation (menu, liste des niveaux,
atelier, résultat) avec une poignée de `useState` booléens locaux
(`isMenuOpen`, `isLevelListOpen`) et des fonctions impératives
(`loadLevelOne`, `loadWorkshop`, `returnToLevels`) qui recréaient directement
la session. Aucune de ces destinations n'avait d'URL propre : ni retour
navigateur, ni lien partageable, ni rechargement fidèle à l'écran courant.

L'auteur du produit a demandé l'installation de routes pour simplifier ce
code et parce que d'autres destinations évidentes arrivent à court terme :
réglages, éditeur de niveaux, liste de niveaux, un niveau joué. ADR 0003 §
Politique de dépendances liste explicitement le routeur parmi les dépendances
non décidées et exige qu'une dépendance structurante passe par une ADR — la
présente décision comble ce point ouvert.

`cahier-des-charges.md` § Persistance, partage et évolution communautaire et
`architecture.md` § Stockage et partage réservent déjà le fragment d'URL
(`#...`) au codec de partage de niveau versionné et protégé par somme de
contrôle. Un routeur basé sur le hash (`#/route`) entrerait donc en collision
avec ce contrat existant : il est exclu d'office, indépendamment du choix de
bibliothèque.

## Décision

- Router côté client par chemin (History API), jamais par fragment : le
  fragment reste entièrement disponible pour le codec de partage de niveau.
- Bibliothèque retenue : `react-router-dom`, épinglée exactement à `7.18.4`
  dans `dependencies` (compatible React 19, sans avertissement de peer
  dependency propre à ce paquet). Alternative écartée : un routeur maison
  minimal, qui aurait évité une dépendance mais reporté sur le dépôt la
  gestion de `popstate`, du focus et des cas limites d'historique qu'une
  bibliothèque mature couvre déjà et teste en dehors de ce projet.
- Schéma d'URL, en anglais comme demandé par l'auteur :
  - `/` — redirige immédiatement vers `/levels/:id/play` du premier niveau
    embarqué (conserve le comportement « démarre sur le niveau 1 » déjà
    décidé) ;
  - `/levels` — liste des niveaux de la campagne ;
  - `/levels/:levelId/play` — un niveau joué ; `levelId` est l'`id` du
    `LevelDocument`, jamais un identifiant inventé séparément ;
  - `/editor` — l'atelier de création libre (`embeddedWorkshopDocument`) ;
  - `/settings` — réglages ; page provisoire tant qu'aucun réglage réel
    n'existe ;
  - toute autre route redirige vers `/levels`.
- `<BrowserRouter>` est monté par `App.tsx`, qui ne contient plus que la
  déclaration des routes. Chaque route mène à une page de `src/app/`
  (`LevelsPage`, `PlayLevelPage`, `EditorPage`, `SettingsPage`) qui initialise
  la session d'édition depuis le document approprié ; la construction de
  l'écran plateau partagé (`BoardShell`) reste un composant unique factorisé
  entre `PlayLevelPage` et `EditorPage`.
- Le menu ☰ (`AppHeader`) devient un vrai déclencheur de navigation
  (`useNavigate`) vers ces routes plutôt qu'un état local dupliquant ce que
  l'URL sait déjà représenter.

## Conséquences

- Les quatre écrans sont désormais adressables individuellement : lien
  partageable, retour/avant navigateur fonctionnels, rechargement fidèle.
- Cette tranche a corrigé un bug latent révélé par elle :
  `spriteAssetPath` (`src/presentation/sprite-loader.ts`) construisait un
  chemin relatif (`./assets/sprites/...`), qui ne se résolvait correctement
  que parce que l'application ne vivait auparavant qu'à `/`. Une route
  imbriquée comme `/levels/level-1-laisser-tomber/play` le résout contre le
  mauvais préfixe et les sprites échouent silencieusement à charger. Corrigé
  en chemin absolu (`/assets/sprites/...`), cohérent avec le fond CSS qui
  utilisait déjà cette convention ; couvert par un test dédié dans
  `sprite-loader.test.ts`.
- Un hébergement de fichiers statique sans réécriture (« hébergement de
  fichiers » au sens large de `cahier-des-charges.md`) doit servir
  `index.html` pour toute URL inconnue, sous peine de 404 au rechargement
  d'une route profonde. Le serveur de développement et `vite preview`
  (`appType` par défaut de Vite) le font déjà sans configuration
  supplémentaire ; l'hébergement de production choisi devra être configuré en
  conséquence (réécriture générique ou `404.html` de secours). Ce point reste
  ouvert au choix d'hébergement, pas à cette ADR.
- `react-router-dom` rejoint la liste des dépendances sensibles à faire
  passer par les suites complètes lors d'une mise à jour (même statut que
  React, Vite, Zod dans ADR 0003).
- `docs/decisions/0003-project-bootstrap.md` § Ce qui reste non décidé est mis
  à jour pour retirer le routeur de la liste ouverte et renvoyer ici.

## Amendement du 26 septembre 2026

- Routes ajoutées, absentes des menus : `/bench` et `/bench/play`, la page de
  mesure de performance de la porte de l'ADR 0002 ; `/shared` est prévue par
  l'ADR 0011.
- **Chemin de base.** L'application peut être servie sous un sous-chemin
  (GitHub Pages : `/contrapt/`). Le build lit `CONTRAPT_BASE_PATH` (défaut `/`) ;
  Vite préfixe alors JS, CSS et `url()` des feuilles de style, `BrowserRouter`
  reçoit `basename={import.meta.env.BASE_URL}`, et les chemins d'assets publics
  passent par `publicAssetUrl` (`src/presentation/sprite-loader.ts`).
- **Hébergement.** GitHub Pages, par `.github/workflows/deploy-pages.yml`, avec
  `404.html` copié d'`index.html` comme repli des routes profondes. Cela tranche
  le repli 404 laissé ouvert ci-dessous.

## Ce qui reste non décidé

- Le contenu réel de `/settings` : cette ADR pose seulement la route et une
  page provisoire, sans inventer de réglage.
- La stratégie exacte de repli 404 → `index.html` pour l'hébergement de
  production final.
- Le routage imbriqué (sous-routes de l'éditeur, par exemple) : aucun besoin
  concret ne le justifie encore.

## Références officielles consultées

- [Documentation react-router-dom (v7)](https://reactrouter.com/)
