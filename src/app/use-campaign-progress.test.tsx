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
});

function ProgressProbe() {
  const { levels, recordCampaignSuccess } = useCampaignProgress();
  const first = levels['level-1-prolonger-la-pente'];
  const second = levels['level-2-le-pont'];
  const challenged = levels['level-4-moins-c-est-mieux'];

  return (
    <>
      <output data-testid="first-level">{JSON.stringify(first)}</output>
      <output data-testid="second-level">{JSON.stringify(second)}</output>
      <output data-testid="challenged-level">{JSON.stringify(challenged)}</output>
      <button
        type="button"
        onClick={() => {
          recordCampaignSuccess('level-1-prolonger-la-pente', 0);
        }}
      >
        Enregistrer la victoire
      </button>
    </>
  );
}

describe('useCampaignProgress', () => {
  it('expose les déblocages, paliers et indices, puis persiste une réussite injectée', () => {
    const repository = createRepository({
      'level-4-moins-c-est-mieux': { resolved: true, bestObjectCount: 3 },
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
      nextChallengeHint: { nextTier: 'elegant', objectCount: 2 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la victoire' }));

    expect(repository.save).toHaveBeenCalledWith({
      'level-1-prolonger-la-pente': { resolved: true, bestObjectCount: 0 },
      'level-4-moins-c-est-mieux': { resolved: true, bestObjectCount: 3 },
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
});
