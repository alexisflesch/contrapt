# ADR 0012 - PWA : manifeste, service worker et mises à jour

Statut : accepté

Date : 2026-09-26

## Contexte

Le cahier des charges fait de TinkerBolt une PWA statique, installable et jouable
hors ligne. `architecture.md` exige qu'une nouvelle version ne prenne pas le
contrôle au milieu d'une session d'édition sans prévenir. Rien n'est implémenté.

## Décision

- **`vite-plugin-pwa`** en dépendance de développement, stratégie
  `generateSW` (Workbox), `registerType: 'prompt'`. Écrire un service worker à la
  main demanderait de maintenir soi-même la liste de précache et son versionnage,
  ce que le plugin fait à partir du build. Version exacte épinglée comme les
  autres dépendances (ADR 0003). Vérifié le 26 septembre 2026 : la 1.3.0 déclare
  `vite: ^8.0.0` dans ses `peerDependencies`, avec `workbox-window` et
  `workbox-build` ^7.4.1 en pairs. Si une version installée ne déclare plus Vite
  8, ne pas forcer l'installation : la décision revient à l'auteur.
- **Précache** : l'app shell, le JS et le CSS du build, `public/assets/**` (sprites,
  vignettes, fonds). Les niveaux embarqués sont dans le bundle. Aucune ressource
  distante.
- **Navigation** : repli sur `index.html` pour toutes les routes de l'ADR 0008,
  y compris `/shared`.
- **Mises à jour** : un nouveau service worker attend. L'application affiche une
  invitation non bloquante « Nouvelle version disponible » avec une action
  « Mettre à jour ». Pendant une simulation ou une manipulation en cours,
  l'invitation attend la fin. Les brouillons étant enregistrés en continu
  (ADR 0011), recharger ne perd rien.
- **Manifeste** : nom « TinkerBolt », `display: standalone`, orientation libre,
  couleurs de la coque, icônes 192, 512 et 512 masquable. Les icônes sont fournies
  ou validées par l'auteur ; en attendant, un visuel provisoire tiré des sprites
  existants est accepté et signalé comme tel.
- L'enregistrement du service worker vit dans `src/app/` ; la logique « peut-on
  proposer la mise à jour maintenant » est une fonction pure testée.

## Conséquences

- Nouveau test E2E : après un premier chargement, `context.setOffline(true)`,
  recharger, le niveau 1 s'affiche et se joue.
- En développement (`pnpm dev`), le service worker est désactivé pour ne pas
  masquer les modifications.
- Le build produit `sw.js` et `manifest.webmanifest` ; la gate le vérifie par un
  test sur `dist/` ou par l'E2E hors ligne.

## Amendement du 2 octobre 2026 — invitations visibles (U10)

Précise la décision « Mises à jour » et ajoute l’installation ; le service
worker, sa stratégie (`registerType: 'prompt'`) et son précache sont inchangés.

- **Mise à jour.** L’invitation « Nouvelle version disponible. » porte l’action
  « Mettre à jour » et une croix « Plus tard ». Elle se montre en tête de
  l’accueil et, sur un plateau, dans l’emplacement réservé (`.status-slot`),
  jamais par-dessus le plateau ni la barre d’actions. Sur un plateau, outre la
  phase sûre (`usePwaUpdateStatus`, ni simulation ni manipulation), elle
  attend que le rechargement ne perde rien : aucune commande validée sur ce
  plateau depuis son ouverture. Raison : la phrase « recharger ne perd rien »
  ne vaut que pour les brouillons ; la tentative d’un niveau de campagne, d’un
  niveau reçu ou partagé vit dans la session et serait perdue. Rien ne recharge
  sans le toucher « Mettre à jour » (le rechargement suit l’activation du
  nouveau service worker, `registerSW`). « Plus tard » vaut pour la visite ;
  rien n’est enregistré.
- **Installation.** Elle ne s’appuie que sur l’événement `beforeinstallprompt`
  (Chrome, Android) : l’application le retient (`preventDefault`) et, à
  l’accueil seulement, montre « Installe TinkerBolt pour le retrouver comme une
  application, même hors ligne. » avec « Installer » (qui ouvre la demande du
  navigateur, une seule fois par événement) et une croix « Ne pas installer ».
  Sans cet événement (Safari, iOS, Firefox, application déjà installée), rien
  n’est montré : pas d’invitation ni d’instructions de substitution.
  `appinstalled` la retire.
- **Refus mémorisé.** La croix « Ne pas installer » ou un refus dans la demande
  du navigateur écrit `installInvitationDeclined: true` dans
  `tinkerbolt:preferences` (champ facultatif de l’enveloppe version 1, comme
  `firstLevelHintDone`, ADR 0011, amendement du 2 octobre 2026) ; l’invitation
  ne revient plus. Les autres préférences sont conservées.
- **Priorité.** Une seule invitation à la fois : la mise à jour passe avant
  l’installation. La décision est la fonction pure `pwaInvitation`
  (`src/app/pwa-invitation.ts`).

## Amendement du 2 octobre 2026 — liste des routes du repli hors ligne

Le motif du repli (`navigateFallbackAllowlist`) est extrait dans
`scripts/navigate-fallback-allowlist.ts` et testé : il respecte le sous-répertoire
de déploiement et sert hors ligne `/`, `/levels`, `/levels/:levelId/play`,
`/my-levels`, `/my-levels/:id/play`, `/import` (redirection vers `/my-levels`, ajoutée
par V3), `/editor`, `/settings`, `/shared`, `/bench` et `/bench/play`. `/my-levels` en était absent depuis M9, malgré la phrase « toutes
les routes de l'ADR 0008 » ci-dessus ; `/demo` est retirée avec la route (ADR 0008).
Un test E2E recharge « Mes niveaux » hors ligne.
