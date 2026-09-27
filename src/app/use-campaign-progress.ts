import { useContext } from 'react';

import { CampaignProgressContext } from './campaign-progress-context';

/** Current campaign records and derived unlock/tier/hint state for app consumers. */
export function useCampaignProgress() {
  const context = useContext(CampaignProgressContext);
  if (context === null) {
    throw new Error('useCampaignProgress doit être utilisé dans CampaignProgressProvider.');
  }
  return context;
}
