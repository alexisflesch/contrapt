# Protocole de brief et de rapport

## Brief

Un fichier Markdown, écrit dans un chemin temporaire, passé à `codex exec` par
`"$(cat …)"`. Toujours ces sept sections, dans cet ordre, sans en ajouter.

```markdown
# <identifiant de sous-tâche>

## Objectif
Une phrase. Le comportement observable visé, pas l'activité.

## Sortie vérifiable
La commande exacte qui doit passer, et son état actuel.
Exemple : `pnpm vitest run src/simulation/fixed-step.test.ts` échoue
actuellement sur « expected 3 steps, received 0 ».

## À lire, et rien d'autre
- AGENTS.md
- <fichiers issus du routage de docs/index.md>

## Périmètre d'écriture
Tu écris uniquement dans : <chemins>.
Tout autre fichier est la propriété d'un autre agent. Si ton travail exige de le
modifier, arrête-toi et remonte-le.

## Contraintes non négociables
<les invariants d'AGENTS.md réellement en jeu, pas leur totalité>

## Gate
`pnpm check:fast`
Ne lance ni `pnpm build`, ni Playwright, ni `pnpm check`.

## Rapport attendu
Le format imposé ci-dessous.
```

Deux erreurs de brief qui coûtent une itération complète :

- **liste de lecture trop large** : l'agent lit 2 000 lignes, dilue le contrat et
  invente un compromis entre deux documents ;
- **objectif formulé en activité** (« améliorer la validation ») : rien ne permet
  de dire si c'est fini.

## Rapport

Le sous-agent termine par ces sections. `--output-last-message` les récupère.

```markdown
## Résultat
Fait / partiel / bloqué.

## Preuve
La commande lancée et sa sortie utile. Pour un test, l'échec initial puis le
succès final.

## Fichiers touchés
Un par ligne. Tout fichier hors périmètre est signalé ici et justifié.

## Écarts
Ce que le brief demandait et qui n'a pas été fait, avec la raison.

## Contradictions rencontrées
Divergence entre deux documents, ou entre un document et le code. Ne rien
arbitrer : décrire, citer, laisser trancher.

## Ce que je n'ai pas vérifié
Les zones d'ombre. Un rapport sans cette section est suspect.
```

## Lecture d'un rapport par l'orchestrateur

Refuser et rejouer si :

- la preuve est absente, ou reformulée au lieu d'être citée ;
- un test a été modifié alors que le périmètre ne le prévoyait pas ;
- « Écarts » est vide alors que le diff ne couvre pas tout l'objectif ;
- une contradiction a été résolue par le sous-agent au lieu d'être remontée.

Accepter un rapport partiel qui dit clairement ce qui manque : c'est un meilleur
signal qu'un rapport complet non prouvé.

## Isolation

Un worktree par sous-tâche dès qu'il y a plus d'un agent en vol :

```bash
git worktree add ../contrapt-<tache> -b <tache>
# …
git worktree remove ../contrapt-<tache>
```

`node_modules` n'est pas partagé entre worktrees : prévoir `pnpm install` dans
chacun, ou limiter le parallélisme aux sous-tâches qui n'ont pas besoin de la gate
complète.

Sans worktree, deux agents qui écrivent dans le même arbre produisent un diff que
personne ne peut attribuer.
