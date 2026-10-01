import { useRef, useState } from 'react';

import type { ConstructionAttempt } from '../application/construction';
import { countObjectsUsed } from '../application/progression';
import { recordReceivedVictory } from '../application/received/record-received-victory';
import type { LevelDocument } from '../domain/level-document';
import type { CampaignVictory } from '../ui/CampaignVictoryDialog';
import { BoardShell } from './BoardShell';
import { attributionLine } from './level-attribution';
import { useReceivedLevelRepository } from './received-level-repository-context';

interface ReceivedLevelBoardProps {
  readonly document: LevelDocument;
  readonly title: string;
  /** The stored entry a victory updates; `null` for a level not kept: nothing is recorded. */
  readonly entryId: string | null;
  readonly notice?: string | undefined;
  readonly exit?: {
    readonly label: string;
    readonly shortLabel: string;
    readonly onExit: () => void;
  };
}

/**
 * A received level, played (ADR 0015 § Victoire sur un niveau reçu): the
 * attempt snapshot taken at launch records a victory on the stored entry,
 * as `PlayLevelPage` does for the campaign, which it never touches. A
 * storage failure is ignored: the game goes on. The result only shows ✅,
 * like an exported puzzle (U24). The header carries the attribution
 * (ADR 0016 § Affichage).
 */
export function ReceivedLevelBoard({
  document,
  title,
  entryId,
  notice,
  exit,
}: ReceivedLevelBoardProps) {
  const repository = useReceivedLevelRepository();
  const launchedAttemptRef = useRef<ConstructionAttempt | null>(null);
  const [wonObjectCount, setWonObjectCount] = useState<number | null>(null);
  const victory: CampaignVictory | null =
    wonObjectCount === null
      ? null
      : {
          tier: 'resolved',
          objectsUsed: wonObjectCount,
          hasChallenge: false,
          hint: null,
          isNewRecord: false,
          onNextLevel: null,
        };

  return (
    <BoardShell
      initialDocument={document}
      mode="resolution"
      title={title}
      subtitle="Mode joueur"
      attribution={attributionLine(document.metadata)}
      campaignVictory={victory}
      onSimulationLaunched={(attempt) => {
        launchedAttemptRef.current = attempt;
        setWonObjectCount(null);
      }}
      onSimulationCompleted={(outcome) => {
        const attempt = launchedAttemptRef.current;
        launchedAttemptRef.current = null;
        if (outcome.outcome !== 'won' || attempt === null) return;
        if (entryId !== null) recordReceivedVictory(repository, entryId, attempt);
        setWonObjectCount(countObjectsUsed(attempt));
      }}
      {...(notice === undefined ? {} : { notice })}
      {...(exit === undefined ? {} : { exit })}
    />
  );
}
