import type { LevelDocument } from '../domain/level-document';

interface CalibrationGuideProps {
  readonly level: LevelDocument;
}

const familyLabels: Readonly<Record<LevelDocument['objects'][number]['type'], string>> = {
  ball: 'Balle',
  basket: 'Panier',
  beam: 'Poutre',
  seesaw: 'Bascule',
  mass: 'Masse',
  lever: 'Levier',
  conveyor: 'Convoyeur',
  button: 'Bouton',
  fan: 'Ventilateur',
  barrier: 'Barrière',
  springboard: 'Tremplin',
};

const beamSizeLabels = { short: 'courte', medium: 'moyenne', long: 'longue' } as const;

type InventoryEntry = LevelDocument['inventory'][number];

const inventoryLabel = (entry: InventoryEntry): string => {
  if (entry.type === 'beam') return `Poutre ${beamSizeLabels[entry.props.size]}`;
  if (entry.type === 'wire') return 'Fil de commande';
  return familyLabels[entry.type];
};

const formatWorld = (value: number): string =>
  value.toFixed(2).replace(/\.00$/u, '').replace('.', ',');

const formatRotation = (radians: number): string => `${formatWorld((radians * 180) / Math.PI)}°`;

const descriptionWithoutSketchPrefix = (description: string | undefined): string =>
  description?.replace(/^Esquisse non calibrée\.\s*/u, '') ??
  'Aucune intention n’est encore documentée pour cette esquisse.';

const solutionObjectLabel = (level: LevelDocument, inventoryId: string): string => {
  const entry = level.inventory.find(({ id }) => id === inventoryId);
  return entry === undefined ? inventoryId : inventoryLabel(entry);
};

const objectLabelById = (level: LevelDocument): ReadonlyMap<string, string> => {
  const labels = new Map(level.objects.map(({ id, type }) => [id, familyLabels[type]]));
  level.solution?.placements.forEach((placement) => {
    if (placement.placementId !== undefined) {
      labels.set(placement.placementId, solutionObjectLabel(level, placement.inventoryId));
    }
  });
  return labels;
};

/** The temporary author-facing calibration brief for an approximate campaign level. */
export function CalibrationGuide({ level }: CalibrationGuideProps) {
  const solution = level.solution;
  const objectLabels = objectLabelById(level);

  return (
    <div className="calibration-guide">
      <p className="dialog-text">
        Cette fiche décrit l’esquisse embarquée. Les positions et la solution sont encore
        approximatives.
      </p>

      <section className="calibration-section" aria-label="Intention de l’esquisse">
        <h3>Ce que j’ai essayé de faire</h3>
        <p>{descriptionWithoutSketchPrefix(level.metadata.description)}</p>
      </section>

      <section className="calibration-section" aria-label="Objets autorisés">
        <h3>Objets autorisés pour la solution</h3>
        <p className="calibration-note">
          Le catalogue auteur reste complet pour expérimenter ; cette liste est l’inventaire à
          respecter côté joueur.
        </p>
        <ul className="calibration-list">
          {level.inventory.map((entry) => (
            <li key={entry.id}>
              <strong>{inventoryLabel(entry)}</strong>
              <span>
                {entry.quantity} {entry.quantity === 1 ? 'exemplaire' : 'exemplaires'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="calibration-section" aria-label="Solution approximative à viser">
        <h3>Solution approximative à viser</h3>
        {solution === undefined ? (
          <p>Aucune solution de référence n’est encore renseignée.</p>
        ) : (
          <>
            <ol className="calibration-list calibration-solution-list">
              {solution.placements.map((placement, index) => (
                <li key={`${placement.inventoryId}-${String(index)}`}>
                  <strong>{solutionObjectLabel(level, placement.inventoryId)}</strong>
                  <span>
                    position ({formatWorld(placement.transform.position.x)} ;{' '}
                    {formatWorld(placement.transform.position.y)}), rotation{' '}
                    {formatRotation(placement.transform.rotation)}
                  </span>
                </li>
              ))}
            </ol>
            {solution.wires !== undefined && solution.wires.length > 0 && (
              <ul className="calibration-list calibration-wire-list">
                {solution.wires.map((wire) => (
                  <li key={wire.id}>
                    <strong>Fil de commande</strong>
                    <span>
                      {objectLabels.get(wire.sourceId) ?? wire.sourceId} →{' '}
                      {objectLabels.get(wire.targetId) ?? wire.targetId}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="calibration-section" aria-label="Décor fixe">
        <h3>Décor fixe à préserver</h3>
        <p className="calibration-note">
          Ces objets sont déjà dans la scène et ne font pas partie de l’inventaire.
        </p>
        <ul className="calibration-list">
          {level.objects.map((object) => (
            <li key={object.id}>
              <strong>{familyLabels[object.type]}</strong>
              <span>{object.id}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
