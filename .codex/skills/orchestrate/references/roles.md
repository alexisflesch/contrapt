# Rôles délégables

Un rôle est un périmètre d'écriture plus une liste de lecture close. L'orchestrateur
compose son brief à partir de ces lignes ; il ne les recopie pas intégralement.

Les listes de lecture viennent de `docs/index.md` et ne s'élargissent pas sans que
le rapport dise pourquoi.

## `spec-reader` — `luna low`

Écrit : rien (lecture seule).
Lit : ce qu'on lui indique.

Extrait d'un ou plusieurs documents le contrat exact d'une future sous-tâche :
invariants applicables, sources de vérité exécutables, contradictions repérées.
Sortie : un brief prêt à déléguer. Utile quand la tranche touche plus de trois
documents — il évite de payer cette lecture au tarif de l'agent qui code.

## `test-author` — `luna high`

Écrit : le fichier `*.test.ts` visé, rien d'autre.
Lit : ADR ou doc du contrat visé, plus le module existant s'il existe.

Écrit le test rouge et **vérifie qu'il échoue pour la bonne raison**, en citant le
message d'échec dans son rapport. N'écrit aucune ligne de production. Interdiction
explicite de créer un stub pour rendre le test compilable autrement qu'en déclarant
la signature manquante.

## `domain-dev` — `terra high`

Écrit : `src/domain/`.
Lit : ADR 0004, `architecture.md` § Enveloppe de niveau et § Modèle d'objet.

Schémas Zod stricts, validation sémantique, registre de familles, migrations. Ne
peut importer ni React, ni un moteur, ni IndexedDB. Types inférés du schéma,
jamais redéclarés.

## `app-dev` — `terra medium`

Écrit : `src/application/`.
Lit : ADR 0005, `architecture.md` § Commandes et historique.

Commandes atomiques, historique, tentative de construction, ports abstraits. Une
commande refusée ne mute rien et retourne un code d'erreur stable.

## `sim-dev` — `sol high`

Écrit : `src/simulation/`, `test/conformance/`.
Lit : ADR 0002, `architecture.md` § Simulation, `qualite.md` § Déterminisme,
`catalogue-initial.md` § Tests contractuels.

Port physique, boucle à pas fixe, capteurs, instances éphémères. Aucun type propre
à Planck ou Rapier ne traverse le port. Aucune lecture de `Date.now()`,
`performance.now()` ou `Math.random()` : horloge et aléatoire sont injectés.
Détruire une instance détruit tous ses composants internes.

## `render-dev` — `terra high`

Écrit : `src/presentation/`.
Lit : `architecture.md` § Rendu et interface.

Projection du domaine vers la scène, interpolation. Ne porte ni règle de victoire,
ni sérialisation. Unités du monde en entrée, pixels seulement en sortie.

## `ui-dev` — `terra medium`

Écrit : `src/ui/`, `src/app/`.
Lit : `mobile-editor-interactions.md`, `cahier-des-charges.md` § Interaction mobile.

Coque DOM React, tiroir, formulaires, dialogues. Cibles tactiles ≥ 44 × 44 px CSS.
Aucune action essentielle dépendante du survol, du clic droit, du clavier, d'un
appui long ou du multi-touch. Ne contient aucune règle de domaine.

## `content-dev` — `luna high`

Écrit : `src/content/levels/`.
Lit : la section du niveau dans `levels/initial-progression.md`,
`catalogue-initial.md`.

Un niveau JSON par sous-tâche, validé par `pnpm content:check`. Fournit la solution
de référence exécutable. Ne modifie jamais un schéma pour faire passer son niveau :
un niveau que le schéma refuse est un niveau à corriger, ou une contradiction à
remonter.

## `e2e-dev` — `terra medium`

Écrit : `e2e/`.
Lit : `mobile-editor-interactions.md` § Scénarios d'acceptation, `qualite.md`
§ Tests end-to-end.

Parcours sur le build de production. Au moins un viewport téléphone. Un test
instable est corrigé ou le changement reste bloqué ; il n'est jamais retenté en
boucle ni marqué à ignorer.

## `infra-dev` — `terra high`

Écrit : `src/infrastructure/`.
Lit : `architecture.md` § Stockage et partage, `cahier-des-charges.md`
§ Persistance.

IndexedDB, fichiers, codec URL. Toute entrée commence en `unknown`, passe une
limite de taille, puis Zod. Une importation invalide n'écrase jamais un brouillon.

## `reviewer` — `terra high`

Écrit : rien.
Lit : le diff, `AGENTS.md`, la liste de lecture de l'agent revu.

Cherche dans cet ordre : violation d'invariant d'`AGENTS.md`, test affaibli ou
contourné, `any` / `@ts-ignore` / désactivation ESLint non commentée, frontière de
couche franchie, comportement non déterministe, exemple de doc devenu faux. Ne
signale pas de préférence de style. `$review-agent` couvre le même besoin si la
tranche est ordinaire.

## `arbiter` — `sol xhigh` ou `sol max`

Écrit : `docs/decisions/`.
Lit : l'ADR concernée, les mesures produites, les documents en conflit.

Tranche une décision structurante à partir de mesures existantes, jamais d'une
préférence. Sortie : ADR mise à jour avec statut, décision, conséquences, et ce qui
est explicitement retiré du dépôt. `max` seulement si la décision est irréversible
une fois du contenu persistant produit.
