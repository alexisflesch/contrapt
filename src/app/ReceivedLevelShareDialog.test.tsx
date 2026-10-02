// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { embeddedLevels } from '../content/embedded-levels';
import { encodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';

import { ReceivedLevelShareDialog } from './ReceivedLevelShareDialog';

const level = embeddedLevels[0];
if (level === undefined) throw new Error('Niveau embarqué introuvable.');

describe('partager un niveau reçu (M9, ADR 0015 § Page « Mes niveaux »)', () => {
  afterEach(cleanup);

  it('télécharge le document tel quel, sous son identifiant', () => {
    const downloadFile = vi.fn();
    render(
      <ReceivedLevelShareDialog
        document={level}
        onClose={() => undefined}
        downloadFile={downloadFile}
        writeClipboard={undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(downloadFile).toHaveBeenCalledWith(
      `${level.id}.json`,
      'application/json',
      encodeLevelFile(level),
    );
    expect(screen.getByRole('status')).toHaveTextContent(`Fichier ${level.id}.json téléchargé.`);
  });

  it('copie un lien `/shared` qui redonne le même document', async () => {
    const writeClipboard = vi.fn((text: string) => {
      void text;
      return Promise.resolve();
    });
    render(
      <ReceivedLevelShareDialog
        document={level}
        onClose={() => undefined}
        origin="https://exemple.test"
        basePath="/tinkerbolt/"
        writeClipboard={writeClipboard}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByText('Lien copié')).toBeVisible();
    const link = new URL(String(writeClipboard.mock.calls[0]?.[0]));
    expect(link.pathname).toBe('/tinkerbolt/shared');
    expect(await decodeShareFragment(link.hash)).toEqual({ status: 'ok', document: level });
  });

  it('affiche le lien à sélectionner, au tutoiement, quand la copie est refusée (V7)', async () => {
    render(
      <ReceivedLevelShareDialog
        document={level}
        onClose={() => undefined}
        origin="https://exemple.test"
        writeClipboard={() => Promise.reject(new Error('refusé'))}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByRole('textbox', { name: 'Lien de partage' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Copie impossible : sélectionne le lien ci-dessous pour le copier.',
    );
  });
});
