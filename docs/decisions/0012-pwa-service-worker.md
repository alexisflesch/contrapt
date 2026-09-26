# ADR 0012 - PWA : manifeste, service worker et mises à jour

Statut : accepté

Date : 2026-09-26

## Contexte

Le cahier des charges fait de Contrapt! une PWA statique, installable et jouable
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
- **Manifeste** : nom « Contrapt! », `display: standalone`, orientation libre,
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
