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
    return (
      <BoardShell
        initialDocument={embeddedWorkshopDocument}
        mode="creation"
        title="Éditeur de niveaux"
        subtitle="Mode éditeur"
      />
    );
  }

  return <DraftEditor key={draftId} draftId={draftId} />;
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
    <BoardShell
      initialDocument={draft}
      mode="creation"
      title={`Éditeur · ${draft.metadata.title}`}
      subtitle="Mode éditeur"
      onDocumentCommitted={(document) => {
        // Best effort, like progress (ADR 0011): a failed save never blocks editing.
        drafts.save(document);
      }}
    />
  );
}
