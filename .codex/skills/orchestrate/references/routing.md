# Routage modèle × effort

## Le roster

Relevé du catalogue Codex local le 26 septembre 2026
(`~/.codex/models_cache.json`). Les trois modèles ont une fenêtre de contexte de
272 000 jetons : **le contexte n'est pas un critère de choix entre eux**. Seule
la profondeur de raisonnement l'est.

| Nom court | Modèle          | Rôle                                 | Efforts disponibles                  |
| --------- | --------------- | ------------------------------------ | ------------------------------------ |
| `luna`    | `gpt-6-luna`    | rapide et économique, tâches simples | low, medium, high, xhigh, max        |
| `terra`   | `gpt-5.6-terra` | équilibré, travail quotidien         | low, medium, high, xhigh, max, ultra |
| `sol`     | `gpt-6-sol`     | le plus capable autorisé             | low, medium, high, xhigh, max, ultra |

`gpt-6-astra` n'est **jamais** utilisé : trop cher (décision de l'auteur,
26 septembre 2026).

Conséquences utiles :

- `luna` n'a pas `ultra`, et c'est sans importance : `ultra` est interdit aux
  sous-agents (voir plus bas).
- `luna` ne reçoit pas de travail d'interface visuelle (mise en page, style,
  direction artistique) : ses résultats n'y ont pas été fiables. Il reste
  pertinent pour la logique non visuelle derrière l'interface et pour les tests.
- **Une session conduite par `gpt-6-luna` qui suit `docs/feuille-de-route-luna.md`
  ne délègue qu'à `luna`**, quelle que soit la ligne de la table ci-dessous. Une
  tâche qui exigerait `terra` ou `sol` est déclarée bloquée dans le journal de la
  feuille de route, pas escaladée.

## Interdiction de `ultra`

`ultra` est décrit par le catalogue comme « raisonnement maximal avec délégation
automatique des tâches ». Un sous-agent en `ultra` ouvre sa propre arborescence
d'agents sous la tienne. Le budget devient imprévisible et le rapport ne
correspond plus à un périmètre d'écriture unique.

`ultra` reste réservé à la session d'orchestration elle-même, si l'utilisateur le
choisit.

## Table de routage

| Nature du travail                                          | Modèle  | Effort   |
| ---------------------------------------------------------- | ------- | -------- |
| Extraire, résumer, inventorier, lister des fichiers        | `luna`  | `low`    |
| Renommage mécanique, formatage, mise à jour de doc         | `luna`  | `medium` |
| Écrire un JSON de niveau depuis une géométrie déjà mesurée | `luna`  | `high`   |
| Concevoir un niveau au banc d'essai physique               | `terra` | `high`   |
| Écrire un test rouge depuis un contrat déjà écrit          | `luna`  | `high`   |
| Composant React, câblage d'UI, style                       | `terra` | `medium` |
| Faire passer au vert un test existant, dans une couche     | `terra` | `medium` |
| Parcours Playwright tactile                                | `terra` | `medium` |
| Schéma Zod, validation sémantique, migration               | `terra` | `high`   |
| Nouvelle commande, invariant d'historique, permissions     | `terra` | `high`   |
| Revue croisée avant intégration                            | `terra` | `high`   |
| Adaptateur physique, boucle à pas fixe, déterminisme       | `sol`   | `high`   |
| Scène de conformité physique, tolérances numériques        | `sol`   | `high`   |
| Nouvelle famille d'objet composite de bout en bout         | `sol`   | `high`   |
| Arbitrage entre deux moteurs, mesures contradictoires      | `sol`   | `xhigh`  |
| Rédaction ou révision d'ADR, déplacement de frontière      | `sol`   | `max`    |

## Escalade

Choisir la ligne, puis **descendre d'un cran d'effort** et lancer. Escalader
seulement sur échec, en joignant au nouveau brief :

- la sortie d'erreur exacte ;
- ce que la tentative précédente a essayé ;
- pourquoi c'était insuffisant.

Escalade dans l'ordre : effort d'abord, modèle ensuite. `terra high` avant
`sol medium`. Un problème mal posé ne se résout pas en montant de modèle ; deux
échecs au même endroit signifient que le découpage est mauvais, pas le modèle.

Après deux escalades sur la même sous-tâche, arrêter et redécouper.

## Signaux qui justifient de monter

- l'invariant en jeu est irréversible une fois persisté (schéma, migration) ;
- le résultat est numérique et sensible aux tolérances ;
- la tâche exige de tenir plusieurs contrats simultanément ;
- une erreur ne serait pas rattrapée par la gate (déterminisme, fuite de handle).

## Signaux qui justifient de descendre

- la spec est déjà écrite, il ne reste qu'à la transcrire ;
- la sortie est vérifiée mécaniquement dans la minute ;
- le fichier est isolé et son échec n'a aucun effet de bord.
