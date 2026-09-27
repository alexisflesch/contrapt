// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createConstructionAttempt } from '../application/construction';
import { createEditorSession } from '../application/editor-session';
import { embeddedWorkshopDocument } from '../content/embedded-levels';
import { ObjectDrawer } from './ObjectDrawer';

const renderDrawer = (mode: 'resolution' | 'creation'): HTMLElement => {
  render(
    <ObjectDrawer
      session={createEditorSession(mode, createConstructionAttempt(embeddedWorkshopDocument))}
      selectedObject={undefined}
      selectedEntryKey={undefined}
      isDrawerOpen
      isSideLayout={false}
      isPlacementActive={false}
      onToggleDrawer={() => undefined}
      onCloseDrawer={() => undefined}
      onSelectKind={() => undefined}
    />,
  );
  return screen.getByRole('region', { name: 'Objets disponibles' });
};

const thumbnailOf = (card: HTMLElement): string =>
  card.querySelector('img')?.getAttribute('src') ?? '';

describe('ObjectDrawer', () => {
  afterEach(cleanup);

  it('montre en bleu la balle de l’inventaire du joueur : elle n’est jamais l’objectif', () => {
    const drawer = renderDrawer('resolution');

    const ball = within(drawer).getByRole('button', { name: /^Balle, quantité/ });
    expect(thumbnailOf(ball)).toMatch(/\/thumbs\/second-ball\.png$/);
  });

  it('propose à l’auteur une balle rouge pour l’objectif et une balle bleue', () => {
    const drawer = renderDrawer('creation');

    const red = within(drawer).getByRole('button', { name: 'Balle rouge (objectif)' });
    const blue = within(drawer).getByRole('button', { name: 'Balle bleue' });
    expect(thumbnailOf(red)).toMatch(/\/thumbs\/ball\.png$/);
    expect(thumbnailOf(blue)).toMatch(/\/thumbs\/second-ball\.png$/);
    expect(within(drawer).queryByRole('button', { name: 'Balle' })).toBeNull();
    expect(within(drawer).getByText('12 objets')).toBeTruthy();
  });
});
