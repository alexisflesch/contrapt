import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { openCampaignDraft } from '../application/drafts/campaign-draft';
import { embeddedLevels } from '../content/embedded-levels';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useDraftRepository } from './draft-repository-context';

/** `/levels` (ADR 0008): the ordered campaign level list. */
export function LevelsPage() {
  const navigate = useNavigate();
  const drafts = useDraftRepository();
  const [draftErrorLevelId, setDraftErrorLevelId] = useState<string | null>(null);

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
              {/* U17: the author edits a draft copy; the embedded level and progress stay untouched. */}
              <Button
                className="level-card-edit"
                onClick={() => {
                  const result = openCampaignDraft(drafts, level);
                  if (result.status === 'error') {
                    setDraftErrorLevelId(level.id);
                    return;
                  }
                  void navigate(`/editor?draft=${encodeURIComponent(result.draftId)}`);
                }}
              >
                <span aria-hidden="true">✎</span>
                Éditer le niveau {index + 1}
              </Button>
              {draftErrorLevelId === level.id && (
                <p className="panel-note" role="alert">
                  Impossible de créer le brouillon : le stockage local est indisponible.
                </p>
              )}
            </Panel>
          ))}
        </section>
      </div>
    </AppFrame>
  );
}
