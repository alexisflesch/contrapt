// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CampaignProgress } from '../application/progression';
import type { ProgressRepository } from '../application/progression/progress-repository';
import { CampaignProgressProvider } from './CampaignProgressProvider';
import { useCampaignProgress } from './use-campaign-progress';

const createRepository = (
  progress: CampaignProgress = {},
): ProgressRepository & { readonly save: ReturnType<typeof vi.fn> } => ({
  load: () => ({ status: 'ok', progress }),
  save: vi.fn(() => ({ status: 'ok' as const })),
  clear: () => ({ status: 'ok' }),
});

function ProgressProbe() {
  const { levels, recordCampaignSuccess, unlockAllLevels } = useCampaignProgress();
  const first = levels['campaign-01-la-bille-de-service'];
  const second = levels['campaign-02-par-dessus-le-mur'];
  const challenged = levels['campaign-04-retour-a-l-expediteur'];

  return (
    <>
      <output data-testid="first-level">{JSON.stringify(first)}</output>
      <output data-testid="second-level">{JSON.stringify(second)}</output>
      <output data-testid="challenged-level">{JSON.stringify(challenged)}</output>
      <output data-testid="unlock-all-levels">{String(unlockAllLevels)}</output>
      <button
        type="button"
        onClick={() => {
          recordCampaignSuccess('campaign-01-la-bille-de-service', 0);
        }}
      >
        Enregistrer la victoire
      </button>
    </>
  );
}

describe('useCampaignProgress', () => {
  it('expose les déblocages et persiste une réussite injectée, puis persiste une réussite injectée', () => {
    const repository = createRepository({
      'campaign-04-retour-a-l-expediteur': { resolved: true, bestObjectCount: 3 },
    });

    const originalStorageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'storage');
    const persist = vi.fn(() => Promise.resolve(false));
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist },
    });

    const { unmount } = render(
      <CampaignProgressProvider repository={repository}>
        <ProgressProbe />
      </CampaignProgressProvider>,
    );

    expect(screen.getByTestId('unlock-all-levels')).toHaveTextContent('false');
    expect(JSON.parse(screen.getByTestId('first-level').textContent)).toMatchObject({
      unlocked: true,
      resolved: false,
      tier: null,
      nextChallengeHint: null,
    });
    expect(JSON.parse(screen.getByTestId('second-level').textContent)).toMatchObject({
      unlocked: false,
      resolved: false,
    });
    expect(JSON.parse(screen.getByTestId('challenged-level').textContent)).toMatchObject({
      unlocked: false,
      resolved: true,
      bestObjectCount: 3,
      tier: 'resolved',
      nextChallengeHint: null,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victoire' }));

    expect(repository.save).toHaveBeenCalledWith({
      'campaign-01-la-bille-de-service': { resolved: true, bestObjectCount: 0 },
      'campaign-04-retour-a-l-expediteur': { resolved: true, bestObjectCount: 3 },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victoire' }));
    expect(persist).toHaveBeenCalledTimes(1);
    expect(JSON.parse(screen.getByTestId('second-level').textContent)).toMatchObject({
      unlocked: true,
      resolved: false,
    });

    unmount();
    if (originalStorageDescriptor === undefined) {
      Reflect.deleteProperty(navigator, 'storage');
    } else {
      Object.defineProperty(navigator, 'storage', originalStorageDescriptor);
    }
  });

  it('force le déblocage de tous les niveaux quand unlockAllLevels est vrai (mode développement)', () => {
    const repository = createRepository();

    const { unmount } = render(
      <CampaignProgressProvider repository={repository} unlockAllLevels>
        <ProgressProbe />
      </CampaignProgressProvider>,
    );

    expect(screen.getByTestId('unlock-all-levels')).toHaveTextContent('true');
    expect(JSON.parse(screen.getByTestId('second-level').textContent)).toMatchObject({
      unlocked: true,
      resolved: false,
    });
    expect(JSON.parse(screen.getByTestId('challenged-level').textContent)).toMatchObject({
      unlocked: true,
      resolved: false,
    });

    unmount();
  });
});
