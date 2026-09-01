# Découpage des tranches

Ce fichier fait autorité sur le découpage du travail restant. Il ne redéfinit
aucune stratégie : il rend exécutable par un orchestrateur ce que le cahier des
charges décrit en intention et ce que `etat.md` constate.

Chaque tranche est verticale, commence par ses tests observables et se termine par
`pnpm check`. Une tranche n'est pas déclarée terminée par l'agent qui l'a écrite.

## Convention

- **Dépend de** : tranches qui doivent être intégrées avant de démarrer.
- **Parallèle avec** : tranches sans intersection de fichiers, délégables en même
  temps dans des worktrees distincts.
- **Sortie** : l'artefact vérifiable, pas une intention.
- **Difficulté** : entrée de la table de routage de `.codex/skills/orchestrate`.

---

## T1 — Validation de Planck et suite de conformité

Dépend de : rien. Parallèle avec : T4a.
Écrit dans : `test/conformance/`.
Difficulté : haute sur les deux scènes de validation, moyenne sur le reste.

Le moteur est tranché par l'ADR 0002 : Planck.js, décidé avant mesure. Cette
tranche ne choisit donc plus, elle vérifie et outille.

**Porte de validation, à faire en premier.** Les scènes 6 (création, reset et
destruction répétés) et 7 (scène dense au budget maximal provisoire), mesurées
sur Planck **et** sur Rapier pour rester comparables. Ce sont les deux seules
mesures comparatives. Un échec de l'une rouvre l'ADR 0002 ; le reste de la
tranche s'arrête tant que la porte n'est pas franchie.

**Puis la régression permanente.** Les scènes 1 à 5 et 8, écrites une fois contre
Planck seul. Sortie : suite de conformité verte, dépendance Rapier retirée du
dépôt, résultats des scènes 6 et 7 consignés dans l'ADR 0002.

Sous-tâches délégables : le protocole d'assertion commun d'abord, seul et
partagé ; ensuite une scène par agent. Les scènes 6 et 7 ne se délèguent pas en
même temps que les autres — elles conditionnent leur existence.

## T2 — Port physique, constantes des familles, boucle à pas fixe

Dépend de : T1. Parallèle avec : T4a.
Écrit dans : `src/simulation/`, `src/domain/`.
Difficulté : haute, pièges de déterminisme.

Port physique minimal dérivé des besoins des scènes de conformité, jamais de l'API
d'un candidat. Dimensions, masses, frictions et rebonds des quatre familles
centralisés. Boucle à pas fixe sans horloge murale. Capteur de panier et évaluation
réelle de `goal.type === 'basket'`.

## T3 — Plateau Canvas 2D et niveau 1 jouable

Dépend de : T2.
Écrit dans : `src/presentation/`, `src/app/`.
Difficulté : moyenne.

Le renderer est tranché par l'ADR 0006 : Canvas 2D natif, sans bibliothèque. Il
n'y a plus de décision d'outil dans cette tranche.

Projection du niveau 1 « Laisser tomber » sur le plateau partagé, lancement,
reset exact, régression de simulation. Sortie : le niveau 1 est réellement
jouable.

Cette tranche porte aussi le pipeline d'assets, qui n'existe nulle part encore :
dimensions de référence des sprites, convention de nommage, chargement explicite
avant la première frame via `createImageBitmap`, mise à l'échelle par
`devicePixelRatio`. Les chemins de sprites appartiennent à la projection visuelle
de chaque famille, jamais au `LevelDocument`.

## T4a — Câblage tiroir ↔ tentative ↔ historique

Dépend de : rien (l'état applicatif existe déjà). Parallèle avec : T1, T2.
Écrit dans : `src/ui/`, `src/app/`.
Difficulté : moyenne.

Relier les cartes du bottom sheet à `ConstructionAttempt`, l'historique aux
boutons annuler/rétablir, et faire remonter les refus de commande en retour
utilisateur visible. Ne dépend pas de la physique : la scène peut rester non
simulée.

## T4b — Placement, déplacement, rotation au tactile

Dépend de : T3, T4a.
Écrit dans : `src/ui/`, `src/presentation/`, `e2e/`.
Difficulté : moyenne, forte densité de scénarios.

Gestes du plateau conformes à `mobile-editor-interactions.md`, y compris
l'annulation atomique sur `pointercancel`. Le niveau 2 est le premier parcours
d'inventaire complet.

## T5 — Niveaux 2 à 8

Dépend de : T4b, et des constantes physiques stabilisées par T2.
Écrit dans : `src/content/levels/`, `test/`.
Difficulté : basse par niveau, mais un niveau à la fois.

Un niveau par tranche, avec son JSON validé, sa solution de référence exécutable
et sa validation tactile. Ne pas écrire toute la campagne avant que les constantes
physiques soient figées.

## T6 — Mode auteur, persistance, partage, PWA

Dépend de : T4b.
Écrit dans : `src/ui/`, `src/infrastructure/`, `src/app/`.
Difficulté : moyenne à haute selon le sous-lot.

Sous-lots indépendants et délégables séparément : mode auteur sur le même plateau ;
dépôts IndexedDB (brouillons, progression, préférences) ; import/export JSON ;
codec URL borné avec checksum ; service worker et stratégie de mise à jour
protégeant les brouillons.

---

## Dettes transverses

Rattachables à la tranche qui les rencontre, jamais traitées en refactoring isolé.

- Le test de zone utilise le centre du placement ; le confinement par forme
  complète attend les dimensions de T2.
- Aucune CI distante n'est configurée.
- Aucune matrice de téléphones physiques n'est validée.
- La coque affiche encore un atelier statique (résorbée par T3 et T4a).
