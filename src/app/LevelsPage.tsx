import { useNavigate } from 'react-router-dom';

import { embeddedLevels } from '../content/embedded-levels';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

/** `/levels` (ADR 0008): the campaign level list. Only level 1 is embedded so far. */
export function LevelsPage() {
  const navigate = useNavigate();

  return (
    <AppFrame title="Campagne" subtitle="Sélection du niveau" variant="page">
      <div className="page-content">
        <section className="level-list" aria-label="Liste des niveaux">
          {embeddedLevels.map((level, index) => (
            <Panel
              key={level.id}
              className="level-card"
              label={`Niveau ${String(index + 1)}`}
              title={`Niveau ${String(index + 1)} · ${level.metadata.title}`}
            >
              {level.metadata.description !== undefined && (
                <p className="level-card-description">{level.metadata.description}</p>
              )}
              <Button
                tone="go"
                className="level-card-action"
                onClick={() => {
                  void navigate(`/levels/${level.id}/play`);
                }}
              >
                <span aria-hidden="true">▶</span>
                Lancer le niveau {index + 1}
              </Button>
            </Panel>
          ))}
        </section>
      </div>
    </AppFrame>
  );
}
