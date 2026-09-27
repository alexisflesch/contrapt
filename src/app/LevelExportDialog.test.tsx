// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { embeddedLevels, embeddedWorkshopDocument } from '../content/embedded-levels';
import type { LevelDocument } from '../domain/level-document';
import { decodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';

import { App } from './App';
import { LevelExportDialog } from './LevelExportDialog';

const levelFour = embeddedLevels.find(({ id }) => id === 'level-4-moins-c-est-mieux');
if (levelFour === undefined) throw new Error('Niveau 4 embarqué introuvable.');

const boardCanvasRect: DOMRect = {
  x: 0,
  y: 0,
  left: 0,
  top: 0,
  right: 800,
  bottom: 450,
  width: 800,
  height: 450,
  toJSON() {
    return this;
  },
};

const renderDialog = (
  document: LevelDocument,
  overrides: Partial<Parameters<typeof LevelExportDialog>[0]> = {},
) => {
  const onClose = vi.fn();
  const downloadFile = vi.fn<(fileName: string, mimeType: string, fileText: string) => void>();
  const writeClipboard = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
  render(
    <LevelExportDialog
      document={document}
      onClose={onClose}
      origin="https://exemple.test"
      basePath="/"
      downloadFile={downloadFile}
      writeClipboard={writeClipboard}
      {...overrides}
    />,
  );
  return { onClose, downloadFile, writeClipboard };
};

describe('boîte « Exporter » de l’atelier (U16)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(boardCanvasRect);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('explique qu’un niveau invalide ne peut pas être exporté, sans proposer d’export', () => {
    renderDialog({
      ...levelFour,
      inventory: levelFour.inventory.map((entry) => ({ ...entry, quantity: 0 })),
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ce niveau ne peut pas encore être exporté',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le nombre minimal connu ne peut pas dépasser la quantité totale de l’inventaire.',
    );
    expect(screen.queryByRole('button', { name: 'Télécharger le fichier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copier le lien de partage' })).toBeNull();
  });

  it('télécharge le fichier du codec L22 et le confirme', () => {
    const { downloadFile } = renderDialog(embeddedWorkshopDocument);

    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [fileName, mimeType, fileText] = downloadFile.mock.calls[0] ?? [];
    expect(fileName).toBe('free-workshop.json');
    expect(mimeType).toBe('application/json');
    expect(decodeLevelFile(String(fileText))).toEqual({
      status: 'ok',
      document: embeddedWorkshopDocument,
    });
    expect(screen.getByRole('status')).toHaveTextContent('Fichier free-workshop.json téléchargé.');
  });

  it('copie le lien de partage et affiche « Lien copié »', async () => {
    const { writeClipboard } = renderDialog(embeddedWorkshopDocument);

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByText('Lien copié')).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledTimes(1);
    const link = String(writeClipboard.mock.calls[0]?.[0]);
    expect(link.startsWith('https://exemple.test/shared#level=1.')).toBe(true);
    await expect(decodeShareFragment(new URL(link).hash)).resolves.toEqual({
      status: 'ok',
      document: embeddedWorkshopDocument,
    });
  });

  it('affiche le lien sélectionnable quand le presse-papiers refuse la copie', async () => {
    renderDialog(embeddedWorkshopDocument, {
      writeClipboard: () => Promise.reject(new Error('refusé')),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    const field = await screen.findByRole('textbox', { name: 'Lien de partage' });
    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveDisplayValue(/^https:\/\/exemple\.test\/shared#level=1\./);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Copie impossible : sélectionnez le lien ci-dessous pour le copier.',
    );
    expect(screen.queryByText('Lien copié')).toBeNull();
  });

  it('se replie sur le lien affiché quand le presse-papiers est indisponible', async () => {
    // jsdom, like an insecure context, exposes no asynchronous clipboard.
    expect('clipboard' in navigator).toBe(false);
    renderDialog(embeddedWorkshopDocument, { writeClipboard: undefined });

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByRole('textbox', { name: 'Lien de partage' })).toBeVisible();
  });

  it('offre « Exporter » dans l’atelier seulement, et exporte le document de l’auteur', () => {
    window.history.replaceState(null, '', '/levels/level-2-le-pont/play');
    const { unmount } = render(<App />);
    expect(screen.queryByRole('button', { name: 'Exporter le niveau' })).toBeNull();
    unmount();

    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:tinkerbolt';
    });
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = createObjectURL;
        static override revokeObjectURL = vi.fn();
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    window.history.replaceState(null, '', '/editor');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Tester' }));
    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));
    expect(screen.getByRole('dialog', { name: 'Exporter le niveau' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0];
    expect(anchor).toBeInstanceOf(HTMLAnchorElement);
    if (!(anchor instanceof HTMLAnchorElement)) return;
    expect(anchor).toHaveAttribute('download', 'free-workshop.json');
  });
});
