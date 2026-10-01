import { createContext, useContext } from 'react';

import type { PreferencesRepository } from '../application/preferences/preferences-repository';

export const unavailablePreferencesRepository: PreferencesRepository = {
  load: () => ({ status: 'error', code: 'storage-unavailable' }),
  save: () => ({ status: 'error', code: 'storage-unavailable' }),
};

/** Local preferences (ADR 0011), provided by `App`; without a provider nothing is kept. */
export const PreferencesRepositoryContext = createContext<PreferencesRepository>(
  unavailablePreferencesRepository,
);

export const usePreferencesRepository = (): PreferencesRepository =>
  useContext(PreferencesRepositoryContext);
