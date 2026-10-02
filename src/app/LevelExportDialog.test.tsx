// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createConstructionAttempt, type ConstructionAttempt } from '../application/construction';
import type { Command } from '../application/history';
import type {
  Preferences,
  PreferencesRepository,
} from '../application/preferences/preferences-repository';
import { sketchLevels as embeddedLevels } from '../../test/fixtures/sketch-campaign';
import type { LevelDocument } from '../domain/level-document';
import { decodeLevelFile } from '../infrastructure/level-file/level-file-codec';
import { decodeShareFragment } from '../infrastructure/level-share/level-share-codec';

import { App } from './App';
import { LevelExportDialog } from './LevelExportDialog';
import { nameExportedLevel, prepareLevelExport } from './level-export';
import { PreferencesRepositoryContext } from './preferences-repository-context';

const levelFour = embeddedLevels.find(({ id }) => id === 'campaign-04-retour-a-l-expediteur');
if (levelFour === undefined) throw new Error('Niveau 4 embarqué introuvable.');
const levelOne = embeddedLevels.find(({ id }) => id === 'campaign-01-la-bille-de-service');
if (levelOne === undefined) throw new Error('Niveau 1 embarqué introuvable.');

/** Level 1 as its author would build it: the reference beam in place, marked to place. */
const { solution: ignoredSolution, ...levelOneWithoutSolution } = levelOne;
void ignoredSolution;

const levelOneWorkshop: LevelDocument = {
  ...levelOneWithoutSolution,
  objects: [
    ...levelOneWithoutSolution.objects,
    {
      id: 'placement-1',
      type: 'beam',
      props: { size: 'short' },
      transform: { position: { x: 5, y: 2.15 }, rotation: 0 },
      permissions: { move: false, rotate: false, remove: false },
      toPlace: true,
    },
  ],
};

const successfulExportRun = (document: LevelDocument): 'won' | 'lost' =>
  document.objects.length > levelOne.objects.length ? 'won' : 'lost';

/** The verified puzzle, named as the dialog proposes by default: after its title. */
const levelOnePuzzle = (name = 'La bille de service'): LevelDocument => {
  const preparation = prepareLevelExport(levelOneWorkshop, successfulExportRun);
  if (preparation.status !== 'ready') throw new Error('Le puzzle du niveau 1 est refusé.');
  const named = nameExportedLevel(preparation.puzzle, name);
  if (named === null) throw new Error('Nom d’export refusé.');
  return named.puzzle;
};

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

/** An in-memory `PreferencesRepository` that records what it is asked to keep. */
const memoryPreferences = (initial: Preferences = {}) => {
  let stored = initial;
  const saved: Preferences[] = [];
  const repository: PreferencesRepository = {
    load: () => ({ status: 'ok', preferences: stored }),
    save: (preferences) => {
      saved.push(preferences);
      stored = preferences;
      return { status: 'ok' };
    },
  };
  return { repository, saved };
};

const renderDialog = (
  document: LevelDocument,
  overrides: Partial<Parameters<typeof LevelExportDialog>[0]> = {},
  preferences: PreferencesRepository = memoryPreferences().repository,
) => {
  const onClose = vi.fn();
  const downloadFile = vi.fn<(fileName: string, mimeType: string, fileText: string) => void>();
  const writeClipboard = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
  render(
    <PreferencesRepositoryContext value={preferences}>
      <LevelExportDialog
        document={document}
        run={successfulExportRun}
        onClose={onClose}
        origin="https://exemple.test"
        basePath="/"
        downloadFile={downloadFile}
        writeClipboard={writeClipboard}
        {...overrides}
      />
    </PreferencesRepositoryContext>,
  );
  return { onClose, downloadFile, writeClipboard };
};

const downloadedDocument = (
  downloadFile: ReturnType<typeof renderDialog>['downloadFile'],
): LevelDocument => {
  const fileText = downloadFile.mock.calls.at(-1)?.[2];
  const decoded = decodeLevelFile(String(fileText));
  if (decoded.status !== 'ok') throw new Error('Fichier exporté illisible.');
  return decoded.document;
};

const licenceNotice =
  'En partageant ce niveau, tu le places sous licence CC BY 4.0 : d’autres pourront le modifier et le republier en te citant.';

describe('boîte « Exporter » de l’atelier (U16, U22)', () => {
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
      'La solution pose plus d’objets « inventory-short-beam » que l’inventaire n’en contient.',
    );
    expect(screen.queryByRole('button', { name: 'Télécharger le fichier' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copier le lien de partage' })).toBeNull();
  });

  it('télécharge le fichier du codec L22 et le confirme', () => {
    const { downloadFile } = renderDialog(levelOneWorkshop);

    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(downloadFile).toHaveBeenCalledTimes(1);
    const [fileName, mimeType, fileText] = downloadFile.mock.calls[0] ?? [];
    expect(fileName).toBe('la-bille-de-service.json');
    expect(mimeType).toBe('application/json');
    expect(decodeLevelFile(String(fileText))).toEqual({
      status: 'ok',
      document: levelOnePuzzle(),
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fichier la-bille-de-service.json téléchargé.',
    );
  });

  it('nomme le niveau avant de télécharger, et refuse un nom vide', () => {
    const { downloadFile } = renderDialog(levelOneWorkshop);
    const name = screen.getByRole('textbox', { name: 'Nom du niveau' });
    expect(name).toHaveValue('La bille de service');

    fireEvent.change(name, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Télécharger le fichier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copier le lien de partage' })).toBeDisabled();

    fireEvent.change(name, { target: { value: 'Ma machine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    const [fileName, , fileText] = downloadFile.mock.calls[0] ?? [];
    expect(fileName).toBe('ma-machine.json');
    expect(decodeLevelFile(String(fileText))).toEqual({
      status: 'ok',
      document: levelOnePuzzle('Ma machine'),
    });
  });

  it('copie le lien de partage et affiche « Lien copié »', async () => {
    const { writeClipboard } = renderDialog(levelOneWorkshop);

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByText('Lien copié')).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledTimes(1);
    const link = String(writeClipboard.mock.calls[0]?.[0]);
    expect(link.startsWith('https://exemple.test/shared#level=1.')).toBe(true);
    await expect(decodeShareFragment(new URL(link).hash)).resolves.toEqual({
      status: 'ok',
      document: levelOnePuzzle(),
    });
  });

  it('affiche le lien sélectionnable quand le presse-papiers refuse la copie', async () => {
    renderDialog(levelOneWorkshop, {
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
    renderDialog(levelOneWorkshop, { writeClipboard: undefined });

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));

    expect(await screen.findByRole('textbox', { name: 'Lien de partage' })).toBeVisible();
  });

  it('offre « Exporter » dans l’atelier seulement, et refuse un atelier sans objet à placer', () => {
    // Le niveau 2 est verrouillé sans progression (U5b) ; `unlockAllLevels`
    // ouvre son mode joueur directement pour ce test, qui ne porte pas sur le
    // déblocage mais sur la présence d’« Exporter » selon le mode.
    window.history.replaceState(null, '', '/levels/campaign-02-par-dessus-le-mur/play');
    const { unmount } = render(<App unlockAllLevels />);
    expect(screen.queryByRole('button', { name: 'Exporter le niveau' })).toBeNull();
    unmount();

    window.history.replaceState(null, '', '/editor');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Exporter le niveau' }));

    expect(screen.getByRole('dialog', { name: 'Exporter le niveau' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Aucun objet n’est à placer');
    expect(screen.queryByRole('button', { name: 'Télécharger le fichier' })).toBeNull();
  });
});

describe('titre, pseudo et licence dans la boîte d’export (M14, ADR 0016)', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('propose un pseudo facultatif avec son aide, et rappelle la licence CC BY 4.0', () => {
    renderDialog(levelOneWorkshop);

    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });
    expect(pseudo).toHaveValue('');
    expect(pseudo).toHaveAccessibleDescription('Un pseudo, pas ton vrai nom');
    expect(screen.getByText(licenceNotice)).toBeVisible();
  });

  it('met le pseudo saisi, sans ses espaces de bord, dans le fichier et dans le lien', async () => {
    const { downloadFile, writeClipboard } = renderDialog(levelOneWorkshop);

    fireEvent.change(screen.getByRole('textbox', { name: 'Pseudo (facultatif)' }), {
      target: { value: '  Lili  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(downloadedDocument(downloadFile).metadata.author).toBe('Lili');

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));
    expect(await screen.findByText('Lien copié')).toBeVisible();
    const link = new URL(String(writeClipboard.mock.calls[0]?.[0]));
    const decoded = await decodeShareFragment(link.hash);
    expect(decoded.status === 'ok' && decoded.document.metadata.author).toBe('Lili');
  });

  it('refuse un pseudo invalide avec un message, sans rien exporter', () => {
    const { downloadFile } = renderDialog(levelOneWorkshop);
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });

    fireEvent.change(pseudo, { target: { value: 'Li\tli' } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Le pseudo ne doit contenir ni saut de ligne ni caractère de contrôle.',
    );
    expect(pseudo).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Télécharger le fichier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copier le lien de partage' })).toBeDisabled();
    expect(downloadFile).not.toHaveBeenCalled();

    fireEvent.change(pseudo, { target: { value: 'Lili' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Télécharger le fichier' })).toBeEnabled();
  });

  it('garde le pseudo du niveau plutôt que celui retenu, et un champ vidé retire l’auteur', () => {
    const { downloadFile } = renderDialog(
      { ...levelOneWorkshop, metadata: { ...levelOneWorkshop.metadata, author: 'Max' } },
      {},
      memoryPreferences({ author: 'Lili' }).repository,
    );
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });
    expect(pseudo).toHaveValue('Max');

    fireEvent.change(pseudo, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(downloadedDocument(downloadFile).metadata).not.toHaveProperty('author');
  });

  it('préremplit le dernier pseudo retenu quand le niveau n’a pas d’auteur, et retient celui exporté', () => {
    const preferences = memoryPreferences({ author: 'Lili' });
    const { downloadFile } = renderDialog(levelOneWorkshop, {}, preferences.repository);
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });
    expect(pseudo).toHaveValue('Lili');

    fireEvent.change(pseudo, { target: { value: ' Noé ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(downloadedDocument(downloadFile).metadata.author).toBe('Noé');
    expect(preferences.saved).toEqual([{ author: 'Noé' }]);

    fireEvent.change(pseudo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(preferences.saved).toEqual([{ author: 'Noé' }, {}]);
  });

  it('retient le pseudo sans oublier que l’aide du niveau 1 est terminée (U8)', () => {
    const preferences = memoryPreferences({ author: 'Lili', firstLevelHintDone: true });
    renderDialog(levelOneWorkshop, {}, preferences.repository);
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });

    fireEvent.change(pseudo, { target: { value: 'Noé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    fireEvent.change(pseudo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(preferences.saved).toEqual([
      { author: 'Noé', firstLevelHintDone: true },
      { firstLevelHintDone: true },
    ]);
  });

  it('retient le pseudo sans oublier le refus de l’invitation d’installation (U10)', () => {
    const preferences = memoryPreferences({
      firstLevelHintDone: true,
      installInvitationDeclined: true,
    });
    renderDialog(levelOneWorkshop, {}, preferences.repository);
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });

    fireEvent.change(pseudo, { target: { value: 'Noé' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(preferences.saved).toEqual([
      { author: 'Noé', firstLevelHintDone: true, installInvitationDeclined: true },
    ]);
  });

  it.each<[string, PreferencesRepository]>([
    [
      'renvoie une erreur',
      {
        load: () => ({ status: 'error', code: 'storage-unavailable' }),
        save: () => ({ status: 'error', code: 'quota-exceeded' }),
      },
    ],
    [
      'lève une exception',
      {
        load: () => {
          throw new Error('stockage bloqué');
        },
        save: () => {
          throw new Error('stockage bloqué');
        },
      },
    ],
  ])('exporte quand le stockage des préférences %s', async (_description, preferences) => {
    const { downloadFile, writeClipboard } = renderDialog(levelOneWorkshop, {}, preferences);
    const pseudo = screen.getByRole('textbox', { name: 'Pseudo (facultatif)' });
    expect(pseudo).toHaveValue('');

    fireEvent.change(pseudo, { target: { value: 'Lili' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(downloadedDocument(downloadFile).metadata.author).toBe('Lili');

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));
    expect(await screen.findByText('Lien copié')).toBeVisible();
    expect(writeClipboard).toHaveBeenCalledTimes(1);
  });

  it('applique à l’export le titre et le pseudo saisis par des commandes d’auteur', () => {
    const applied: (readonly Command<ConstructionAttempt>[])[] = [];
    renderDialog(levelOneWorkshop, {
      onApplyAttribution: (commands) => {
        applied.push(commands);
      },
    });

    fireEvent.change(screen.getByRole('textbox', { name: 'Nom du niveau' }), {
      target: { value: '  Ma machine ' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Pseudo (facultatif)' }), {
      target: { value: ' Lili ' },
    });
    expect(applied).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(applied).toHaveLength(1);
    const document = (applied[0] ?? []).reduce<ConstructionAttempt>((attempt, command) => {
      const outcome = command.execute(attempt);
      if (outcome.status !== 'accepted') throw new Error(`refusé : ${outcome.reason}`);
      return outcome.state;
    }, createConstructionAttempt(levelOneWorkshop)).document;
    // The workshop keeps its identifier: only the exported puzzle is renamed.
    expect(document).toEqual({
      ...levelOneWorkshop,
      metadata: { ...levelOneWorkshop.metadata, title: 'Ma machine', author: 'Lili' },
    });
  });
});

describe('description dans la boîte d’export (M14b, ADR 0016)', () => {
  /** Level 1 as a remix: its own description, an author and a source to keep. */
  const attributedWorkshop: LevelDocument = {
    ...levelOneWorkshop,
    metadata: {
      ...levelOneWorkshop.metadata,
      description: 'Une rampe et un panier.',
      author: 'Max',
      basedOn: [{ title: 'Origine', author: 'Zoé' }],
    },
  };

  const descriptionField = (): HTMLElement =>
    screen.getByRole('textbox', { name: 'Description (facultatif)' });

  /** Runs the commands handed to `onApplyAttribution`, one by one, on the workshop. */
  const applyAll = (
    document: LevelDocument,
    commands: readonly Command<ConstructionAttempt>[],
  ): { readonly attempt: ConstructionAttempt; readonly changes: number } =>
    commands.reduce<{ readonly attempt: ConstructionAttempt; readonly changes: number }>(
      ({ attempt, changes }, command) => {
        const outcome = command.execute(attempt);
        if (outcome.status !== 'accepted') throw new Error(`refusé : ${outcome.reason}`);
        return {
          attempt: outcome.state,
          changes: changes + (outcome.state === attempt ? 0 : 1),
        };
      },
      { attempt: createConstructionAttempt(document), changes: 0 },
    );

  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('propose une description facultative, préremplie avec celle du niveau', () => {
    renderDialog(attributedWorkshop);

    const description = descriptionField();
    expect(description.tagName).toBe('TEXTAREA');
    expect(description).toHaveValue('Une rampe et un panier.');
    expect(description).toHaveAttribute('maxlength', '2000');
  });

  it('met la description saisie, sans ses espaces de bord, dans le fichier et dans le lien', async () => {
    const { downloadFile, writeClipboard } = renderDialog(attributedWorkshop);

    fireEvent.change(descriptionField(), { target: { value: '  Fais rouler la bille.\n ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));
    expect(downloadedDocument(downloadFile).metadata.description).toBe('Fais rouler la bille.');

    fireEvent.click(screen.getByRole('button', { name: 'Copier le lien de partage' }));
    expect(await screen.findByText('Lien copié')).toBeVisible();
    const decoded = await decodeShareFragment(
      new URL(String(writeClipboard.mock.calls[0]?.[0])).hash,
    );
    expect(decoded.status === 'ok' && decoded.document.metadata.description).toBe(
      'Fais rouler la bille.',
    );
  });

  it('retire la description vidée, en gardant titre, pseudo et sources', () => {
    const { downloadFile } = renderDialog(attributedWorkshop);

    fireEvent.change(descriptionField(), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(downloadedDocument(downloadFile).metadata).toEqual({
      title: 'La bille de service',
      author: 'Max',
      basedOn: [{ title: 'Origine', author: 'Zoé' }],
    });
  });

  it('accepte une description de 2000 caractères', () => {
    const { downloadFile } = renderDialog(attributedWorkshop);
    const longest = 'a'.repeat(2000);

    fireEvent.change(descriptionField(), { target: { value: longest } });
    const download = screen.getByRole('button', { name: 'Télécharger le fichier' });
    expect(download).toBeEnabled();
    fireEvent.click(download);

    expect(downloadedDocument(downloadFile).metadata.description).toBe(longest);
  });

  it('applique à l’export la description saisie par une commande d’auteur', () => {
    const applied: (readonly Command<ConstructionAttempt>[])[] = [];
    renderDialog(attributedWorkshop, {
      onApplyAttribution: (commands) => {
        applied.push(commands);
      },
    });

    fireEvent.change(descriptionField(), { target: { value: ' Fais rouler la bille. ' } });
    expect(applied).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(applied).toHaveLength(1);
    const { attempt, changes } = applyAll(attributedWorkshop, applied[0] ?? []);
    expect(changes).toBe(1);
    expect(attempt.document.metadata).toEqual({
      ...attributedWorkshop.metadata,
      description: 'Fais rouler la bille.',
    });
  });

  it('retire la description de la création par une commande quand le champ est vidé', () => {
    const applied: (readonly Command<ConstructionAttempt>[])[] = [];
    renderDialog(attributedWorkshop, {
      onApplyAttribution: (commands) => {
        applied.push(commands);
      },
    });

    fireEvent.change(descriptionField(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    const { attempt, changes } = applyAll(attributedWorkshop, applied[0] ?? []);
    expect(changes).toBe(1);
    expect(attempt.document.metadata).not.toHaveProperty('description');
    expect(attempt.document.metadata).toEqual({
      title: 'La bille de service',
      author: 'Max',
      basedOn: [{ title: 'Origine', author: 'Zoé' }],
    });
  });

  it('ne change rien à la création quand titre, pseudo et description sont inchangés', () => {
    const applied: (readonly Command<ConstructionAttempt>[])[] = [];
    renderDialog(attributedWorkshop, {
      onApplyAttribution: (commands) => {
        applied.push(commands);
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le fichier' }));

    expect(applied[0]).toHaveLength(3);
    expect(applyAll(attributedWorkshop, applied[0] ?? []).changes).toBe(0);
  });
});
