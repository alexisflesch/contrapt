import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import type { DraftRepository } from '../application/drafts/draft-repository';
import type { ProgressRepository } from '../application/progression/progress-repository';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';
import { createLocalStorageProgressRepository } from '../infrastructure/storage/local-storage-progress-repository';

import { BenchPage } from './BenchPage';
import { BenchPlayPage } from './BenchPlayPage';
import { DemoPage } from './DemoPage';
import { EditorPage } from './EditorPage';
import { HomePage } from './HomePage';
import { LevelImportPage } from './LevelImportPage';
import { LevelsPage } from './LevelsPage';
import { PlayLevelPage } from './PlayLevelPage';
import { SettingsPage } from './SettingsPage';
import { SharedLevelPage } from './SharedLevelPage';
import { CampaignProgressProvider } from './CampaignProgressProvider';
import { DraftRepositoryContext, unavailableDraftRepository } from './draft-repository-context';
import { PwaUpdateProvider } from './PwaUpdateProvider';

/** Route declarations only (ADR 0008); each route's screen lives in its own page module. */
interface AppProps {
  /** Injectable local progress port, primarily used by application tests. */
  readonly progressRepository?: ProgressRepository;
  /** Injectable local draft port (L26); defaults to `localStorage`. */
  readonly draftRepository?: DraftRepository;
  /**
   * Dev-mode override (U5b): `main.tsx` passes `import.meta.env.DEV` here so
   * every level is unlocked under `pnpm dev`, in the list and by direct URL.
   * Defaults to `false`, which is what a production build (and Playwright)
   * always gets.
   */
  readonly unlockAllLevels?: boolean;
}

const unavailableProgressRepository: ProgressRepository = {
  load: () => ({ status: 'error', code: 'storage-unavailable' }),
  save: () => ({ status: 'error', code: 'storage-unavailable' }),
};

const createBrowserProgressRepository = (): ProgressRepository => {
  try {
    if (typeof window === 'undefined') return unavailableProgressRepository;
    return createLocalStorageProgressRepository(window.localStorage);
  } catch {
    return unavailableProgressRepository;
  }
};

const createBrowserDraftRepository = (): DraftRepository => {
  try {
    if (typeof window === 'undefined') return unavailableDraftRepository;
    // Composition point: the real clock is injected here, like `BenchPage`'s default `now`.
    return createLocalStorageDraftRepository(window.localStorage, () => new Date());
  } catch {
    return unavailableDraftRepository;
  }
};

export function App({
  progressRepository,
  draftRepository,
  unlockAllLevels = false,
}: AppProps = {}) {
  const [browserDraftRepository] = useState(() =>
    draftRepository === undefined ? createBrowserDraftRepository() : unavailableDraftRepository,
  );
  const [browserProgressRepository] = useState(() =>
    progressRepository === undefined
      ? createBrowserProgressRepository()
      : unavailableProgressRepository,
  );
  const repository = progressRepository ?? browserProgressRepository;

  return (
    <PwaUpdateProvider>
      <CampaignProgressProvider repository={repository} unlockAllLevels={unlockAllLevels}>
        <DraftRepositoryContext value={draftRepository ?? browserDraftRepository}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/levels" element={<LevelsPage />} />
              <Route path="/levels/:levelId/play" element={<PlayLevelPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/import" element={<LevelImportPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/shared" element={<SharedLevelPage />} />
              <Route path="/bench" element={<BenchPage />} />
              <Route path="/bench/play" element={<BenchPlayPage />} />
              <Route path="*" element={<Navigate to="/levels" replace />} />
            </Routes>
          </BrowserRouter>
        </DraftRepositoryContext>
      </CampaignProgressProvider>
    </PwaUpdateProvider>
  );
}
