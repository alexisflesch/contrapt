import { useState } from 'react';
import { Download, Link2 } from 'lucide-react';

import type { LevelDocument } from '../domain/level-document';
import { encodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import {
  browserClipboard,
  downloadWithTemporaryLink,
  type DownloadFile,
  type WriteClipboard,
} from './browser-share';
import { createShareLink } from './level-export';

interface ReceivedLevelShareDialogProps {
  /** The received level, shared as it was received. */
  readonly document: LevelDocument;
  readonly onClose: () => void;
  readonly origin?: string;
  readonly basePath?: string;
  /** Injected for tests; defaults to a Blob download through a temporary link. */
  readonly downloadFile?: DownloadFile;
  /** Injected for tests; defaults to `navigator.clipboard.writeText` when it exists. */
  readonly writeClipboard?: WriteClipboard | undefined;
}

type ShareState =
  | { readonly status: 'idle' }
  | { readonly status: 'working' }
  | { readonly status: 'downloaded'; readonly fileName: string }
  | { readonly status: 'copied' }
  | { readonly status: 'manual'; readonly link: string }
  | { readonly status: 'failed' };

const shareMessage = (share: ShareState): string => {
  switch (share.status) {
    case 'downloaded':
      return `Fichier ${share.fileName} téléchargé.`;
    case 'copied':
      return 'Lien copié';
    case 'manual':
      return 'Copie impossible : sélectionne le lien ci-dessous pour le copier.';
    case 'failed':
      return 'Ce niveau est trop grand pour un lien : télécharge le fichier.';
    case 'idle':
    case 'working':
      return '';
  }
};

/**
 * ADR 0015 § Page « Mes niveaux »: a received level is frozen, so « Partager »
 * sends the same document (L22 file or L23 link), without renaming it nor
 * verifying it again — it was already a puzzle when it arrived.
 */
export function ReceivedLevelShareDialog({
  document: levelDocument,
  onClose,
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL,
  downloadFile = downloadWithTemporaryLink,
  writeClipboard = browserClipboard(),
}: ReceivedLevelShareDialogProps) {
  const [share, setShare] = useState<ShareState>({ status: 'idle' });

  const copyShareLink = async (): Promise<void> => {
    setShare({ status: 'working' });
    let link: string;
    try {
      link = await createShareLink(levelDocument, origin, basePath);
    } catch {
      setShare({ status: 'failed' });
      return;
    }
    if (writeClipboard === undefined) {
      setShare({ status: 'manual', link });
      return;
    }
    try {
      await writeClipboard(link);
      setShare({ status: 'copied' });
    } catch {
      setShare({ status: 'manual', link });
    }
  };

  return (
    <Dialog
      label="Partager le niveau"
      title="Partager"
      closeLabel="Fermer le partage"
      onClose={onClose}
    >
      <p className="panel-note">
        Envoie le fichier ou le lien de « {levelDocument.metadata.title} » tel que tu l’as reçu.
      </p>
      <Button
        onClick={() => {
          const fileName = `${levelDocument.id}.json`;
          downloadFile(fileName, 'application/json', encodeLevelFile(levelDocument));
          setShare({ status: 'downloaded', fileName });
        }}
      >
        <Download size={18} aria-hidden="true" />
        Télécharger le fichier
      </Button>
      <Button
        tone="go"
        disabled={share.status === 'working'}
        onClick={() => {
          void copyShareLink();
        }}
      >
        <Link2 size={18} aria-hidden="true" />
        Copier le lien de partage
      </Button>
      <p className="export-status" role="status">
        {shareMessage(share)}
      </p>
      {share.status === 'manual' && (
        <label className="export-link">
          <span className="export-link-label">Lien de partage</span>
          <textarea
            className="export-link-field"
            readOnly
            rows={4}
            value={share.link}
            onFocus={(event) => {
              event.currentTarget.select();
            }}
          />
        </label>
      )}
    </Dialog>
  );
}
