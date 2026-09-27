import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { embeddedWorkshopDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { AppFrame } from '../ui/AppFrame';
import { Panel } from '../ui/Panel';
import { BoardShell } from './BoardShell';
import { useDraftRepository } from './draft-repository-context';

/**
 * `/editor` (ADR 0008): the free-creation workshop, or with `?draft=<id>` an
 * author draft (U17). The id comes from the URL and is untrusted: the draft
 * repository validates it and decodes the stored document with the L22 codec.
 */
export function EditorPage() {
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft');

  if (draftId === null) {
    return <Workshop initialDocument={embeddedWorkshopDocument} title="Éditeur de niveaux" />;
  }

  return <DraftEditor key={draftId} draftId={draftId} />;
}

interface WorkshopProps {
  readonly initialDocument: LevelDocument;
  readonly title: string;
  readonly onDocumentCommitted?: (document: LevelDocument) => void;
}

/**
 * U22: the workshop, and the author's puzzle played « comme un joueur » on
 * an ephemeral copy. Coming back remounts the workshop on its last committed
 * document; its undo history starts again from there.
 */
function Workshop({ initialDocument, title, onDocumentCommitted }: WorkshopProps) {
  const [workshopDocument, setWorkshopDocument] = useState(initialDocument);
  const [playtest, setPlaytest] = useState<LevelDocument | null>(null);

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
    />
  );
}

function DraftEditor({ draftId }: { readonly draftId: string }) {
  const drafts = useDraftRepository();
  const [draft] = useState<LevelDocument | null>(() => {
    const result = drafts.load(draftId);
    return result.status === 'ok' ? result.document : null;
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

  return (
    <Workshop
      initialDocument={draft}
      title={`Éditeur · ${draft.metadata.title}`}
      onDocumentCommitted={(document) => {
        // Best effort, like progress (ADR 0011): a failed save never blocks editing.
        drafts.save(document);
      }}
    />
  );
}
