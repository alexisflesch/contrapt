# Routage modèle × effort

## Le roster

Relevé du catalogue Codex local le 26 septembre 2026 (`~/.codex/models_cache.json`).
Les trois modèles ont une fenêtre de contexte de 272 000 jetons : **le contexte
n'est pas un critère de choix entre eux**. Seule la profondeur de raisonnement
l'est. Dans ce skill, `luna`, `sol` et `astra` désignent les modèles ci-dessous.

| Nom court | Modèle        | Rôle annoncé                         | Effort par défaut | Efforts disponibles                  |
| --------- | ------------- | ------------------------------------ | ----------------- | ------------------------------------ |
| `luna`    | `gpt-6-luna`  | rapide et économique, tâches simples | `medium`          | low, medium, high, xhigh, max        |
| `sol`     | `gpt-6-sol`   | cheval de trait, code quotidien      | `medium`          | low, medium, high, xhigh, max, ultra |
| `astra`   | `gpt-6-astra` | frontière, travail le plus exigeant  | `low`             | low, medium, high, xhigh, max, ultra |

Ne pas confondre `sol` (GPT-6, milieu de gamme) avec l'ancien `gpt-5.6-sol`
(frontière) cité par les documents antérieurs au 26 septembre 2026 : l'ancienne
échelle `luna` / `terra` / `sol` correspond à la nouvelle `luna` / `sol` /
`astra`.

Conséquences utiles :

- `astra` a `low` comme défaut parce qu'il est déjà bon à effort réduit. `astra low`
  est un point de fonctionnement légitime, pas un réglage dégradé.
- `luna` n'a pas `ultra`, et c'est sans importance : `ultra` est interdit aux
  sous-agents (voir plus bas).
- `luna` ne reçoit pas de travail d'interface visuelle (mise en page, style,
  direction artistique) : ses résultats n'y ont pas été fiables. Il reste
  pertinent pour la logique non visuelle derrière l'interface et pour les tests.

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
| Concevoir un niveau au banc d'essai physique               | `sol`   | `high`   |
| Écrire un test rouge depuis un contrat déjà écrit          | `luna`  | `high`   |
| Composant React, câblage d'UI, style                       | `sol`   | `medium` |
| Faire passer au vert un test existant, dans une couche     | `sol`   | `medium` |
| Parcours Playwright tactile                                | `sol`   | `medium` |
| Schéma Zod, validation sémantique, migration               | `sol`   | `high`   |
| Nouvelle commande, invariant d'historique, permissions     | `sol`   | `high`   |
| Revue croisée avant intégration                            | `sol`   | `high`   |
| Adaptateur physique, boucle à pas fixe, déterminisme       | `astra` | `high`   |
| Scène de conformité physique, tolérances numériques        | `astra` | `high`   |
| Nouvelle famille d'objet composite de bout en bout         | `astra` | `high`   |
| Arbitrage entre deux moteurs, mesures contradictoires      | `astra` | `xhigh`  |
| Rédaction ou révision d'ADR, déplacement de frontière      | `astra` | `max`    |

## Escalade

Choisir la ligne, puis **descendre d'un cran d'effort** et lancer. Escalader
seulement sur échec, en joignant au nouveau brief :

- la sortie d'erreur exacte ;
- ce que la tentative précédente a essayé ;
- pourquoi c'était insuffisant.

Escalade dans l'ordre : effort d'abord, modèle ensuite. `sol high` avant
`astra medium`. Un problème mal posé ne se résout pas en montant de modèle ; deux
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
