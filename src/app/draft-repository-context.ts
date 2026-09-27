import { createContext, useContext } from 'react';

import type { DraftRepository } from '../application/drafts/draft-repository';

export const unavailableDraftRepository: DraftRepository = {
  list: () => ({ status: 'error', code: 'storage-unavailable' }),
  load: () => ({ status: 'error', code: 'storage-unavailable' }),
  save: () => ({ status: 'error', code: 'storage-unavailable' }),
  delete: () => ({ status: 'error', code: 'storage-unavailable' }),
};

/** L26 drafts, provided by `App`; without a provider nothing is stored. */
export const DraftRepositoryContext = createContext<DraftRepository>(unavailableDraftRepository);

export const useDraftRepository = (): DraftRepository => useContext(DraftRepositoryContext);
