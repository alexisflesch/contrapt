import { useState } from 'react';
import { Download, Link2 } from 'lucide-react';

import type { LevelDocument } from '../domain/level-document';
import type { PuzzleRunner } from '../application/puzzle/puzzle-workshop';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { createShareLink, nameExportedLevel, prepareLevelExport } from './level-export';

/** Mirrors the level title's length limit (`level-document.ts`). */
const MAX_LEVEL_NAME_LENGTH = 160;

type DownloadFile = (fileName: string, mimeType: string, fileText: string) => void;
type WriteClipboard = (text: string) => Promise<void>;

interface LevelExportDialogProps {
  /** The author's committed document: never a simulation snapshot or a gesture preview. */
  readonly document: LevelDocument;
  readonly onClose: () => void;
  readonly origin?: string;
  readonly basePath?: string;
  /** Injected for tests; defaults to a Blob download through a temporary link. */
  readonly downloadFile?: DownloadFile;
  /** Injected for tests; defaults to `navigator.clipboard.writeText` when it exists. */
  readonly writeClipboard?: WriteClipboard | undefined;
  readonly run?: PuzzleRunner;
}

type ShareState =
  | { readonly status: 'idle' }
  | { readonly status: 'working' }
  | { readonly status: 'copied'; readonly link: string }
  | { readonly status: 'manual'; readonly link: string }
  | { readonly status: 'failed' };

const downloadWithTemporaryLink: DownloadFile = (fileName, mimeType, fileText) => {
  const url = URL.createObjectURL(new Blob([fileText], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoke after the click has been handled by the browser.
  const revokeObjectUrl = URL.revokeObjectURL.bind(URL);
  window.setTimeout(() => {
    revokeObjectUrl(url);
  }, 0);
};

const browserClipboard = (): WriteClipboard | undefined => {
  // Absent outside secure contexts, even though the DOM typings declare it.
  if (typeof navigator === 'undefined' || !('clipboard' in navigator)) return undefined;
  const clipboard = navigator.clipboard;
  return (text) => clipboard.writeText(text);
};

/**
 * U16: « Exporter » from the author mode. Downloads the L22 file or copies
 * the L23 `/shared` link, and explains instead when the document is invalid.
 * Every action is a plain button, so it works by touch alone.
 */
export function LevelExportDialog({
  document: levelDocument,
  onClose,
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL,
  downloadFile = downloadWithTemporaryLink,
  writeClipboard = browserClipboard(),
  run,
}: LevelExportDialogProps) {
  const [preparation] = useState(() => prepareLevelExport(levelDocument, run));
  const [name, setName] = useState(levelDocument.metadata.title);
  const named = preparation.status === 'ready' ? nameExportedLevel(preparation.puzzle, name) : null;
  const [downloadedFileName, setDownloadedFileName] = useState<string | null>(null);
  const [share, setShare] = useState<ShareState>({ status: 'idle' });

  const copyShareLink = async (puzzle: LevelDocument): Promise<void> => {
    setShare({ status: 'working' });
    let link: string;
    try {
      link = await createShareLink(puzzle, origin, basePath);
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
      setShare({ status: 'copied', link });
    } catch {
      setShare({ status: 'manual', link });
    }
  };

  return (
    <Dialog
      label="Exporter le niveau"
      title="Exporter"
      closeLabel="Fermer l’export"
      onClose={onClose}
    >
      {preparation.status === 'invalid' ? (
        <div className="export-invalid" role="alert">
          <p className="dialog-text">Ce niveau ne peut pas encore être exporté :</p>
          <ul className="export-reasons">
            {preparation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="panel-note">
            Puzzle vérifié. Envoyez le fichier ou le lien : il ouvre le niveau avec les objets à
            placer dans le tiroir du joueur.
          </p>
          <label className="export-link">
            <span className="export-link-label">Nom du niveau</span>
            <input
              className="export-link-field export-name-field"
              type="text"
              maxLength={MAX_LEVEL_NAME_LENGTH}
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
              }}
            />
          </label>
          <Button
            disabled={named === null}
            onClick={() => {
              if (named === null) return;
              downloadFile(named.fileName, preparation.mimeType, named.fileText);
              setDownloadedFileName(named.fileName);
            }}
          >
            <Download size={18} aria-hidden="true" />
            Télécharger le fichier
          </Button>
          <Button
            tone="go"
            disabled={named === null || share.status === 'working'}
            onClick={() => {
              if (named !== null) void copyShareLink(named.puzzle);
            }}
          >
            <Link2 size={18} aria-hidden="true" />
            Copier le lien de partage
          </Button>
          <p className="export-status" role="status">
            {share.status === 'copied'
              ? 'Lien copié'
              : share.status === 'manual'
                ? 'Copie impossible : sélectionnez le lien ci-dessous pour le copier.'
                : share.status === 'failed'
                  ? 'Ce niveau est trop grand pour un lien : téléchargez le fichier.'
                  : downloadedFileName !== null
                    ? `Fichier ${downloadedFileName} téléchargé.`
                    : ''}
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
        </>
      )}
    </Dialog>
  );
}
