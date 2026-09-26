import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { embeddedLevels } from '../content/embedded-levels';
import { BenchPage } from './BenchPage';
import { BenchPlayPage } from './BenchPlayPage';
import { DemoPage } from './DemoPage';
import { EditorPage } from './EditorPage';
import { LevelsPage } from './LevelsPage';
import { PlayLevelPage } from './PlayLevelPage';
import { SettingsPage } from './SettingsPage';

/**
 * B1 (plan-remise-en-jeu.md § 4): the app opens directly on the first
 * campaign level, not the free-creation workshop. `embedded-levels.ts`
 * structurally never allows `embeddedLevels` to be empty, but
 * `noUncheckedIndexedAccess` still requires handling the empty case
 * explicitly rather than asserting it away.
 */
const defaultLevelId = embeddedLevels[0]?.id ?? null;

/** Route declarations only (ADR 0008); each route's screen lives in its own page module. */
export function App() {
  return (
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
        <Route path="/bench" element={<BenchPage />} />
        <Route path="/bench/play" element={<BenchPlayPage />} />
        <Route path="*" element={<Navigate to="/levels" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
