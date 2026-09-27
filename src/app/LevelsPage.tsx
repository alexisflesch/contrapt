import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { openCampaignDraft } from '../application/drafts/campaign-draft';
import { campaignChapters } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useDraftRepository } from './draft-repository-context';
import { useCampaignProgress } from './use-campaign-progress';

const tierLabels = {
  resolved: '✅ Résolu',
  elegant: '⭐ Élégant',
  minimal: '🏆 Minimal',
} as const;

/** Campaign chapters with their levels' global, 1-based campaign number. */
const numberedChapters = campaignChapters.reduce<
  readonly {
    readonly id: string;
    readonly title: string;
    readonly levels: readonly { readonly level: LevelDocument; readonly number: number }[];
  }[]
>((chapters, chapter) => {
  const firstNumber = chapters.reduce((count, { levels }) => count + levels.length, 0) + 1;
  return [
    ...chapters,
    {
      id: chapter.id,
      title: chapter.title,
      levels: chapter.levels.map((level, index) => ({ level, number: firstNumber + index })),
    },
  ];
}, []);

/**
 * `/levels` (ADR 0008): the campaign, chapter by chapter (U5). A locked level
 * stays visible but cannot be launched; a resolved one shows its tier
 * (ADR 0010). Editing a draft copy (U17) stays available for every level.
 */
export function LevelsPage() {
  const navigate = useNavigate();
  const drafts = useDraftRepository();
  const { levels: levelProgress, unlockAllLevels } = useCampaignProgress();
  const [draftErrorLevelId, setDraftErrorLevelId] = useState<string | null>(null);

  return (
    <AppFrame title="Campagne" subtitle="Sélection du niveau" variant="page">
      <div className="page-content">
        {unlockAllLevels && (
          <p className="panel-note dev-mode-note" role="status">
            Mode développement : niveaux débloqués
          </p>
        )}
        <section className="level-chapters" aria-label="Liste des niveaux">
          {numberedChapters.map((chapter, chapterIndex) => {
            const chapterName = `Chapitre ${String(chapterIndex + 1)} · ${chapter.title}`;
            return (
              <section key={chapter.id} className="level-chapter" aria-label={chapterName}>
                <h2 className="level-chapter-title">{chapterName}</h2>
                <div className="level-list">
                  {chapter.levels.map(({ level, number }) => {
                    const progress = levelProgress[level.id];
                    const unlocked = progress?.unlocked === true;
                    const tier = progress?.tier ?? null;
                    return (
                      <Panel
                        key={level.id}
                        className={`level-card${unlocked ? '' : ' level-card-locked'}`}
                        label={`Niveau ${String(number)}`}
                        title={`Niveau ${String(number)} · ${level.metadata.title}`}
                        {...(tier === null ? {} : { dataAttributes: { 'data-level-tier': tier } })}
                      >
                        {tier !== null && <p className="level-card-status">{tierLabels[tier]}</p>}
                        {!unlocked && (
                          <p className="level-card-status level-card-status-locked">
                            🔒 Verrouillé
                          </p>
                        )}
                        {level.metadata.description !== undefined && (
                          <p className="level-card-description">{level.metadata.description}</p>
                        )}
                        <Button
                          tone="go"
                          className="level-card-action"
                          disabled={!unlocked}
                          onClick={() => {
                            void navigate(`/levels/${level.id}/play`);
                          }}
                        >
                          <span aria-hidden="true">▶</span>
                          Lancer le niveau {number}
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
                          Éditer le niveau {number}
                        </Button>
                        {draftErrorLevelId === level.id && (
                          <p className="panel-note" role="alert">
                            Impossible de créer le brouillon : le stockage local est indisponible.
                          </p>
                        )}
                      </Panel>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </section>
      </div>
    </AppFrame>
  );
}
