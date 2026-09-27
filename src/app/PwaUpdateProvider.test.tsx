// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { PwaUpdateProvider } from './PwaUpdateProvider';
import { usePwaUpdateStatus } from './use-pwa-update-status';

const safePhase = { phase: 'construction', manipulation: null } as const;
const wrapper = ({ children }: { readonly children: ReactNode }) => (
  <PwaUpdateProvider>{children}</PwaUpdateProvider>
);

describe('état de mise à jour PWA', () => {
  it('expose false tant qu’aucune mise à jour en attente n’a été signalée', () => {
    const { result } = renderHook(() => usePwaUpdateStatus(safePhase), { wrapper });

    expect(result.current).toBe(false);
  });
});
