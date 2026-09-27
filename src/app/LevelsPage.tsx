import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CircleCheck,
  LockKeyhole,
  Pencil,
  Play,
  Star,
  Trophy,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { openCampaignDraft } from '../application/drafts/campaign-draft';
import { campaignChapters } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { AppFrame } from '../ui/AppFrame';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { useDraftRepository } from './draft-repository-context';
import { useCampaignProgress } from './use-campaign-progress';

const tierLabels: Readonly<
  Record<'resolved' | 'elegant' | 'minimal', { readonly icon: LucideIcon; readonly label: string }>
> = {
  resolved: { icon: CircleCheck, label: 'Résolu' },
  elegant: { icon: Star, label: 'Élégant' },
  minimal: { icon: Trophy, label: 'Minimal' },
};

type Tier = keyof typeof tierLabels;

function TierStatus({ tier }: { readonly tier: Tier }) {
  const { icon: Icon, label } = tierLabels[tier];
  return (
    <p className={`level-card-status level-card-status-${tier}`}>
      <Icon size={18} aria-hidden="true" /> {label}
    </p>
  );
}

function LevelDescription({ description }: { readonly description: string }) {
  const sketchNote = 'Esquisse non calibrée.';
  if (!description.startsWith(sketchNote)) {
    return <p className="level-card-description">{description}</p>;
  }

  return (
    <p className="level-card-description">
      <span className="level-card-sketch-note">{sketchNote}</span>
      {description.slice(sketchNote.length).trim()}
    </p>
  );
}

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

const totalLevelCount = numberedChapters.reduce(
  (count, chapter) => count + chapter.levels.length,
  0,
);

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
      <div className="page-content page-content-levels">
        {unlockAllLevels && (
          <p className="panel-note dev-mode-note" role="status">
            Mode développement : niveaux débloqués
          </p>
        )}
        <section className="level-chapters" aria-label="Liste des niveaux">
          <header className="campaign-hero">
            <span className="campaign-hero-icon" aria-hidden="true">
              <Wrench size={30} strokeWidth={2.5} />
            </span>
            <div className="campaign-hero-copy">
              <p className="campaign-hero-kicker">Le carnet de l’atelier</p>
              <h2>Choisis ton prochain défi</h2>
              <p>Observe la machine, trouve l’astuce et remets chaque invention en mouvement.</p>
            </div>
            <dl className="campaign-stats" aria-label="Contenu de la campagne">
              <div>
                <dt>Niveaux</dt>
                <dd>{totalLevelCount}</dd>
              </div>
              <div>
                <dt>Chapitres</dt>
                <dd>{numberedChapters.length}</dd>
              </div>
            </dl>
          </header>
          {numberedChapters.map((chapter, chapterIndex) => {
            const chapterName = `Chapitre ${String(chapterIndex + 1)} · ${chapter.title}`;
            return (
              <section key={chapter.id} className="level-chapter" aria-label={chapterName}>
                <div className="level-chapter-heading">
                  <span className="level-chapter-index" aria-hidden="true">
                    {String(chapterIndex + 1).padStart(2, '0')}
                  </span>
                  <div className="level-chapter-copy">
                    <p>Chapitre {chapterIndex + 1}</p>
                    <h2 className="level-chapter-title">{chapter.title}</h2>
                  </div>
                  <p className="level-chapter-count">
                    {chapter.levels.length} niveau{chapter.levels.length > 1 ? 'x' : ''}
                  </p>
                </div>
                <div className="level-list">
                  {chapter.levels.map(({ level, number }) => {
                    const progress = levelProgress[level.id];
                    const unlocked = progress?.unlocked === true;
                    const tier = progress?.tier ?? null;
                    return (
                      <Panel
                        key={level.id}
                        className={`level-card ${unlocked ? 'level-card-unlocked' : 'level-card-locked'}`}
                        label={`Niveau ${String(number)}`}
                        title={level.metadata.title}
                        dataAttributes={{
                          'data-level-number': String(number).padStart(2, '0'),
                          ...(tier === null ? {} : { 'data-level-tier': tier }),
                        }}
                      >
                        {tier !== null && <TierStatus tier={tier} />}
                        {!unlocked && (
                          <p className="level-card-status level-card-status-locked">
                            <LockKeyhole size={18} aria-hidden="true" /> Verrouillé
                          </p>
                        )}
                        {level.metadata.description !== undefined && (
                          <LevelDescription description={level.metadata.description} />
                        )}
                        <Button
                          tone="go"
                          className="level-card-action"
                          disabled={!unlocked}
                          onClick={() => {
                            void navigate(`/levels/${level.id}/play`);
                          }}
                        >
                          <Play size={18} aria-hidden="true" />
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
                          <Pencil size={18} aria-hidden="true" />
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
