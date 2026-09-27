import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import type { DraftRepository } from '../application/drafts/draft-repository';
import type { ProgressRepository } from '../application/progression/progress-repository';
import { createLocalStorageDraftRepository } from '../infrastructure/storage/local-storage-draft-repository';
import { createLocalStorageProgressRepository } from '../infrastructure/storage/local-storage-progress-repository';

import { embeddedLevels } from '../content/embedded-levels';
import { BenchPage } from './BenchPage';
import { BenchPlayPage } from './BenchPlayPage';
import { DemoPage } from './DemoPage';
import { EditorPage } from './EditorPage';
import { LevelsPage } from './LevelsPage';
import { PlayLevelPage } from './PlayLevelPage';
import { SettingsPage } from './SettingsPage';
import { SharedLevelPage } from './SharedLevelPage';
import { CampaignProgressProvider } from './CampaignProgressProvider';
import { DraftRepositoryContext, unavailableDraftRepository } from './draft-repository-context';
import { PwaUpdateProvider } from './PwaUpdateProvider';

/**
 * B1 (plan-remise-en-jeu.md § 4): the app opens directly on the first
 * campaign level, not the free-creation workshop. `embedded-levels.ts`
 * structurally never allows `embeddedLevels` to be empty, but
 * `noUncheckedIndexedAccess` still requires handling the empty case
 * explicitly rather than asserting it away.
 */
const defaultLevelId = embeddedLevels[0]?.id ?? null;

/** Route declarations only (ADR 0008); each route's screen lives in its own page module. */
interface AppProps {
  /** Injectable local progress port, primarily used by application tests. */
  readonly progressRepository?: ProgressRepository;
  /** Injectable local draft port (L26); defaults to `localStorage`. */
  readonly draftRepository?: DraftRepository;
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
    return createLocalStorageDraftRepository(window.localStorage);
  } catch {
    return unavailableDraftRepository;
  }
};

export function App({ progressRepository, draftRepository }: AppProps = {}) {
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
      <CampaignProgressProvider repository={repository}>
        <DraftRepositoryContext value={draftRepository ?? browserDraftRepository}>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route
                path="/"
                element={
                  <Navigate
                    to={defaultLevelId === null ? '/levels' : `/levels/${defaultLevelId}/play`}
                    replace
                  />
                }
              />
              <Route path="/levels" element={<LevelsPage />} />
              <Route path="/levels/:levelId/play" element={<PlayLevelPage />} />
              <Route path="/editor" element={<EditorPage />} />
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
