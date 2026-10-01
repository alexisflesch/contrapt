import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import type { DraftCreation } from '../application/drafts/draft-repository';
import { campaignDraftId } from '../application/drafts/campaign-draft';
import { puzzleFromWorkshop } from '../application/puzzle/puzzle-workshop';
import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';
import { useDevelopmentMode } from './development-mode-context';
import { useDraftRepository } from './draft-repository-context';
import { LockedLevelPage } from './LockedLevelPage';
import { useCampaignProgress } from './use-campaign-progress';

/**
 * `/editor` (ADR 0008): the free-creation workshop, or with `?draft=<id>` an
 * author draft (U17). The id comes from the URL and is untrusted: the draft
 * repository validates it and decodes the stored document with the L22 codec.
 */
export function EditorPage() {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');

  if (draftId === null) {
    return <Workshop initialDocument={embeddedWorkshopDocument} title="" />;
  }

  return <DraftEditor key={draftId} draftId={draftId} />;
}

interface WorkshopProps {
  readonly initialDocument: LevelDocument;
  readonly title: string;
  readonly onDocumentCommitted?: (document: LevelDocument) => void;
  readonly calibrationDocument?: LevelDocument;
  /** « Jouer » from « Mes niveaux » (M9): open on the puzzle when there is one. */
  readonly startPlaying?: boolean;
}

/** Navigation state is untrusted: only a literal `{ playPuzzle: true }` asks to play. */
const asksToPlayPuzzle = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && 'playPuzzle' in state && state.playPuzzle === true;

/**
 * U22: the workshop, and the author's puzzle played « comme un joueur » on
 * an ephemeral copy. Coming back remounts the workshop on its last committed
 * document; its undo history starts again from there.
 */
function Workshop({
  initialDocument,
  title,
  onDocumentCommitted,
  calibrationDocument,
  startPlaying = false,
}: WorkshopProps) {
  const [workshopDocument, setWorkshopDocument] = useState(initialDocument);
  const [playtest, setPlaytest] = useState<LevelDocument | null>(() => {
    if (!startPlaying) return null;
    const conversion = puzzleFromWorkshop(initialDocument);
    return conversion.status === 'ok' ? conversion.puzzle : null;
  });

  if (playtest !== null) {
    return (
      <BoardShell
        key="playtest"
        initialDocument={playtest}
        mode="resolution"
        title={`Test joueur · ${playtest.metadata.title}`}
        subtitle="Mode joueur"
        exit={{
          label: 'Retour à l’atelier',
          onExit: () => {
            setPlaytest(null);
          },
        }}
      />
    );
  }

  return (
    <BoardShell
      key="workshop"
      initialDocument={workshopDocument}
      resetDocument={initialDocument}
      mode="creation"
      title={title}
      subtitle="Mode éditeur"
      onDocumentCommitted={(document) => {
        setWorkshopDocument(document);
        onDocumentCommitted?.(document);
      }}
      onPlayAsPlayer={setPlaytest}
      {...(calibrationDocument === undefined ? {} : { calibrationDocument })}
    />
  );
}

/**
 * ADR 0015 § Un niveau de campagne verrouillé: the creation of a locked
 * campaign level is refused before it is even read (a read may rewrite an
 * old envelope), whatever is stored. The lock is recomputed from progress.
 */
function DraftEditor({ draftId }: { readonly draftId: string }) {
  const { levels: levelProgress } = useCampaignProgress();
  const levelIndex = embeddedLevels.findIndex((level) => campaignDraftId(level) === draftId);
  const campaignLevel = embeddedLevels[levelIndex];

  if (campaignLevel !== undefined && levelProgress[campaignLevel.id]?.unlocked !== true) {
    return (
      <LockedLevelPage
        title={`Niveau ${String(levelIndex + 1)} · ${campaignLevel.metadata.title}`}
      />
    );
  }

  return <StoredDraftEditor draftId={draftId} campaignLevel={campaignLevel} />;
}

interface StoredDraftEditorProps {
  readonly draftId: string;
  /** The campaign level a `<id>-brouillon` creation comes from, if any. */
  readonly campaignLevel: LevelDocument | undefined;
}

function StoredDraftEditor({ draftId, campaignLevel }: StoredDraftEditorProps) {
  const drafts = useDraftRepository();
  const developmentMode = useDevelopmentMode();
  // `location.state` is typed `any`: read it as `unknown` and narrow it.
  const navigationState: unknown = useLocation().state;
  const [draft] = useState<DraftCreation | null>(() => {
    const result = drafts.load(draftId);
    return result.status === 'ok' ? result.creation : null;
  });

  if (draft === null) {
    return (
      <AppFrame title="Brouillon" subtitle="Mode éditeur" variant="page">
        <div className="page-content">
          <Panel label="Brouillon" title="Brouillon introuvable">
            <p className="panel-note" role="alert">
              Ce brouillon est introuvable ou ne peut pas être lu sur cet appareil.
            </p>
            <Link className="btn btn-neutral" to="/levels">
              Liste des niveaux
            </Link>
          </Panel>
        </div>
      </AppFrame>
    );
  }

  // ADR 0015 § Révéler: the U28 calibration guide lists the solution; development only.
  const calibrationDocument = developmentMode ? campaignLevel : undefined;

  return (
    <Workshop
      initialDocument={draft.document}
      title=""
      startPlaying={asksToPlayPuzzle(navigationState)}
      {...(calibrationDocument === undefined ? {} : { calibrationDocument })}
      onDocumentCommitted={(document) => {
        // Best effort, like progress (ADR 0011): a failed save never blocks editing.
        // The creation's source (ADR 0015) is kept as loaded.
        drafts.save({
          document,
          ...(draft.source === undefined ? {} : { source: draft.source }),
        });
      }}
    />
  );
}
