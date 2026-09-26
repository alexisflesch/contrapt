---
name: orchestrate
description: Découper une tranche de travail Contrapt! en sous-tâches, déléguer chacune à un agent Codex avec le modèle et l'effort adaptés, puis intégrer les résultats derrière la gate du dépôt. Utiliser quand la demande couvre plusieurs couches, plusieurs fichiers indépendants, ou une tranche entière de docs/backlog.md. Ne pas utiliser pour un changement tenant dans un seul fichier ou une seule couche.
metadata:
  short-description: Déléguer une tranche Contrapt! à des agents Codex, un modèle par job
---

# Orchestration Contrapt!

Tu ne codes pas. Tu découpes, tu délègues, tu vérifies, tu intègres.

Écrire toi-même une sous-tâche que tu viens de définir est un échec
d'orchestration : soit la tranche ne méritait pas ce skill, soit tu court-circuites
la revue croisée.

## 1. Cadrer

1. Lire `AGENTS.md` et `docs/index.md`.
2. Identifier la tranche dans `docs/backlog.md`. Si la demande n'y correspond pas,
   la formuler dans le même format avant de continuer.
3. Vérifier les dépendances de la tranche. Une tranche dont les dépendances ne sont
   pas intégrées ne démarre pas : le dire et proposer la tranche débloquante.
4. Établir l'état de départ : `git status --short` et `pnpm typecheck` doivent être
   propres. Un dépôt sale se règle avec l'utilisateur avant toute délégation.

## 2. Découper

Une sous-tâche valide respecte les quatre conditions suivantes :

- **un seul propriétaire d'écriture** : aucun autre agent n'écrit dans ses fichiers ;
- **une sortie vérifiable** : un test qui échoue puis passe, pas « améliorer X » ;
- **une liste de lecture close** : issue du routage de `docs/index.md` ;
- **elle tient dans un contexte** : au-delà, elle se redécoupe.

L'axe de découpage par défaut est la couche d'architecture, parce que c'est celui
que le lint et `src/architecture/layer-boundaries.test.ts` font déjà respecter :
`domain`, `application`, `simulation`, `presentation`, `infrastructure`, `ui`,
`content`, `e2e`.

Le TDD impose un ordre, pas un parallélisme naïf. Dans une même couche, le test
rouge et son implémentation verte sont **deux sous-tâches séquentielles confiées à
deux agents différents** : celui qui écrit le test ne doit pas être celui qui le
fait passer. C'est la seule protection réelle contre un test écrit pour arranger
une implémentation.

## 3. Choisir le modèle

Lire `references/routing.md`. Règles qui ne se négocient pas :

- **Jamais `ultra` pour un sous-agent.** Cet effort délègue lui-même ; imbriquer
  une orchestration dans une orchestration rend le résultat non traçable.
- **Descendre d'un cran par rapport à l'instinct**, puis escalader avec les preuves
  de l'échec. Une escalade documentée coûte moins qu'un `astra max` systématique.
- **Le modèle suit la difficulté du raisonnement, pas la taille du diff.** Un
  adaptateur physique de 40 lignes est plus dur qu'un composant React de 300.

## 4. Déléguer

Une sous-tâche par processus, en fond, worktree dédié dès qu'il y a parallélisme.

```bash
git worktree add ../contrapt-<tache> -b <tache>

codex exec \
  --cd ../contrapt-<tache> \
  -m <modèle> \
  -c model_reasoning_effort=<effort> \
  --output-last-message /tmp/<tache>.report.md \
  "$(cat /tmp/<tache>.brief.md)"
```

`<modèle>` est l'identifiant complet (`gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra`),
pas le nom court de la table de routage.

Le brief est un fichier, jamais une chaîne inline : il doit être relisible quand le
rapport surprend. Sa forme est imposée par `references/protocol.md`.

Ne jamais passer `--dangerously-bypass-approvals-and-sandbox`. Un sous-agent qui a
besoin de plus de droits remonte le blocage ; c'est à toi de trancher.

## 5. Intégrer

1. Lire chaque rapport. Un rapport qui n'établit pas sa sortie vérifiable est un
   échec, quelle que soit la qualité du diff.
2. Relire le diff toi-même : `git diff main...<tache>`. Chercher d'abord les
   violations d'invariants d'`AGENTS.md`, pas les préférences de style.
3. Déléguer une revue croisée des tranches à risque à un agent qui n'a pas écrit le
   code, ou à `$review-agent`.
4. Intégrer dans l'ordre des dépendances, une branche à la fois.
5. Lancer `pnpm check` **une fois, sur l'intégration complète**. Les sous-agents
   lancent `pnpm check:fast` ; ils ne lancent ni le build ni Playwright, qui
   coûtent trop cher en parallèle et ne prouvent rien sur une branche isolée.
6. Nettoyer : `git worktree remove`.

Un échec de `pnpm check` à l'intégration se rejoue comme une sous-tâche, avec la
sortie d'erreur dans le brief. Ne le corrige pas à la main pour « débloquer » :
c'est le moment où l'orchestration produit sa vraie valeur.

## 6. Rendre compte

Une seule sortie pour l'utilisateur :

- ce qui est intégré et prouvé par quel test ;
- ce qui a été délégué à quel modèle et à quel effort, et ce que ça a coûté en
  escalades ;
- ce qui reste ouvert, avec la tranche qui le portera ;
- toute contradiction trouvée entre deux documents, avec le document à corriger.

Ne jamais annoncer une tranche terminée sans `pnpm check` vert sur l'intégration.

## Références

- `references/routing.md` — table modèle × effort, règles d'escalade.
- `references/roles.md` — rôles délégables, périmètre d'écriture, liste de lecture.
- `references/protocol.md` — format imposé du brief et du rapport.
