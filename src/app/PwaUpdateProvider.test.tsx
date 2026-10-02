// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createConstructionAttempt } from '../application/construction/construction-attempt';
import {
  beginEditorManipulation,
  createEditorSession,
  type EditorSession,
} from '../application/editor-session/editor-session';
import { embeddedLevels } from '../content/embedded-levels';
import { PwaUpdateProvider, type RegisterServiceWorker } from './PwaUpdateProvider';
import { usePwa } from './use-pwa';
import { usePwaUpdateStatus } from './use-pwa-update-status';

type Phase = Pick<EditorSession, 'phase' | 'manipulation'>;

const safePhase: Phase = { phase: 'construction', manipulation: null };

/** A real gesture in progress, as `canPromptUpdate`'s own tests build it. */
const duringGesture = (): Phase => {
  const document = embeddedLevels[0];
  if (document === undefined) throw new Error('Le niveau embarqué de test est indisponible.');
  const session = createEditorSession('creation', createConstructionAttempt(document));
  const begun = beginEditorManipulation(session, { kind: 'placement', placementId: 'preview' });
  if (begun.status !== 'accepted') throw new Error('La manipulation de test devrait démarrer.');
  return begun.session;
};
const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <PwaUpdateProvider>{children}</PwaUpdateProvider>
);

/** A service worker port whose new version is already waiting (U10). */
const waitingUpdate = () => {
  const applyUpdate = vi.fn(() => Promise.resolve());
  const register: RegisterServiceWorker = (onNeedRefresh) => {
    onNeedRefresh();
    return Promise.resolve(applyUpdate);
  };
  const withUpdate = ({ children }: { readonly children: ReactNode }) => (
    <PwaUpdateProvider registerServiceWorker={register}>{children}</PwaUpdateProvider>
  );
  return { applyUpdate, wrapper: withUpdate };
};

/** A fake `beforeinstallprompt`, as Chrome on Android fires it (U10). */
const installPromptEvent = (outcome: 'accepted' | 'dismissed') => {
  const prompt = vi.fn(() => Promise.resolve());
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  });
  return { event, prompt };
};

describe('état de mise à jour PWA', () => {
  it('expose false tant qu’aucune mise à jour en attente n’a été signalée', () => {
    const { result } = renderHook(() => usePwaUpdateStatus(safePhase), { wrapper });

    expect(result.current).toBe(false);
  });

  it('expose la mise à jour en attente en phase sûre, et la tait en simulation ou pendant un geste (U10)', async () => {
    const { wrapper: withUpdate } = waitingUpdate();
    const { result, rerender } = renderHook(
      ({ phase }: { phase: Phase }) => usePwaUpdateStatus(phase),
      {
        wrapper: withUpdate,
        initialProps: { phase: safePhase },
      },
    );
    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    rerender({ phase: { phase: 'running', manipulation: null } });
    expect(result.current).toBe(false);
    rerender({ phase: { phase: 'paused', manipulation: null } });
    expect(result.current).toBe(false);
    rerender({ phase: duringGesture() });
    expect(result.current).toBe(false);
    rerender({ phase: { phase: 'result', manipulation: null } });
    expect(result.current).toBe(true);
  });

  it('n’applique la mise à jour que sur demande (U10)', async () => {
    const { applyUpdate, wrapper: withUpdate } = waitingUpdate();
    const { result } = renderHook(() => usePwa(), { wrapper: withUpdate });
    await waitFor(() => {
      expect(result.current.isUpdateWaiting).toBe(true);
    });
    expect(applyUpdate).not.toHaveBeenCalled();

    act(() => {
      result.current.applyUpdate();
    });
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it('oublie l’invitation de mise à jour le temps de la visite quand on la remet à plus tard (U10)', async () => {
    const { applyUpdate, wrapper: withUpdate } = waitingUpdate();
    const { result } = renderHook(() => usePwa(), { wrapper: withUpdate });
    await waitFor(() => {
      expect(result.current.isUpdateWaiting).toBe(true);
    });

    act(() => {
      result.current.dismissUpdate();
    });
    expect(result.current.isUpdateDismissed).toBe(true);
    expect(applyUpdate).not.toHaveBeenCalled();
  });
});

describe('invitation d’installation PWA (U10)', () => {
  it('ne propose rien tant que le navigateur n’a pas émis beforeinstallprompt', () => {
    const { result } = renderHook(() => usePwa(), { wrapper });

    expect(result.current.isInstallAvailable).toBe(false);
  });

  it('garde l’événement du navigateur, puis ouvre sa demande d’installation sur demande', async () => {
    const { result } = renderHook(() => usePwa(), { wrapper });
    const { event, prompt } = installPromptEvent('accepted');

    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.isInstallAvailable).toBe(true);
    expect(prompt).not.toHaveBeenCalled();

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('accepted');
    // Un événement ne sert qu'une fois.
    expect(result.current.isInstallAvailable).toBe(false);
  });

  it('rapporte le refus donné dans la demande du navigateur', async () => {
    const { result } = renderHook(() => usePwa(), { wrapper });
    const { event } = installPromptEvent('dismissed');
    act(() => {
      window.dispatchEvent(event);
    });

    let outcome: string | undefined;
    await act(async () => {
      outcome = await result.current.install();
    });
    expect(outcome).toBe('dismissed');
    expect(result.current.isInstallAvailable).toBe(false);
  });

  it('ignore un événement sans demande d’installation et se tait une fois l’application installée', () => {
    const { result } = renderHook(() => usePwa(), { wrapper });

    act(() => {
      window.dispatchEvent(new Event('beforeinstallprompt', { cancelable: true }));
    });
    expect(result.current.isInstallAvailable).toBe(false);

    act(() => {
      window.dispatchEvent(installPromptEvent('accepted').event);
    });
    expect(result.current.isInstallAvailable).toBe(true);
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.isInstallAvailable).toBe(false);
  });
});
