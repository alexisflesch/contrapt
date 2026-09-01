/**
 * The state passed to a command is read-only by contract. Commands must return
 * a new state when they are accepted; the history never mutates a state that it
 * already contains.
 */
export type CommandState<State> = Readonly<State>;

const deepFreeze = <State>(state: State): State => {
  const seen = new WeakSet();

  const freezeValue = (value: unknown): void => {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
      return;
    }

    seen.add(value);
    Object.values(value).forEach(freezeValue);
    Object.freeze(value);
  };

  freezeValue(state);
  return state;
};

export type CommandOutcome<State> =
  | {
      readonly status: 'accepted';
      readonly state: State;
    }
  | {
      readonly status: 'rejected';
      readonly reason: string;
    };

export interface Command<State> {
  readonly execute: (state: CommandState<State>) => CommandOutcome<State>;
}

export interface HistoryEntry<State> {
  readonly before: State;
  readonly after: State;
}

export interface History<State> {
  readonly state: State;
  readonly past: readonly HistoryEntry<State>[];
  readonly future: readonly HistoryEntry<State>[];
}

export type ExecuteResult<State> =
  | {
      readonly status: 'accepted';
      readonly history: History<State>;
      /** False when a valid command did not change the state. */
      readonly recorded: boolean;
    }
  | {
      readonly status: 'rejected';
      readonly history: History<State>;
      readonly reason: string;
    };

export type NavigationResult<State> =
  | {
      readonly status: 'accepted';
      readonly history: History<State>;
    }
  | {
      readonly status: 'unavailable';
      readonly history: History<State>;
    };

/**
 * A command group is a temporary projection of a history. Applying previews
 * only changes this value; the base history remains untouched until commit.
 */
export interface CommandGroup<State> {
  readonly base: History<State>;
  readonly state: State;
  readonly changed: boolean;
}

export type PreviewResult<State> =
  | {
      readonly status: 'accepted';
      readonly group: CommandGroup<State>;
    }
  | {
      readonly status: 'rejected';
      readonly group: CommandGroup<State>;
      readonly reason: string;
    };

export type CommitResult<State> =
  | {
      readonly status: 'committed';
      readonly history: History<State>;
      /** False when the final projection equals the starting state. */
      readonly recorded: boolean;
    }
  | {
      readonly status: 'rejected';
      readonly history: History<State>;
      readonly reason: string;
    };

export interface CancelResult<State> {
  readonly status: 'cancelled';
  readonly history: History<State>;
}

const createEntry = <State>(before: State, after: State): HistoryEntry<State> =>
  Object.freeze({ before: deepFreeze(before), after: deepFreeze(after) });

const createHistoryValue = <State>(
  state: State,
  past: readonly HistoryEntry<State>[],
  future: readonly HistoryEntry<State>[],
): History<State> =>
  Object.freeze({
    state: deepFreeze(state),
    past: Object.freeze(past.map((entry) => createEntry(entry.before, entry.after))),
    future: Object.freeze(future.map((entry) => createEntry(entry.before, entry.after))),
  });

export const createHistory = <State>(initialState: State): History<State> =>
  createHistoryValue(initialState, [], []);

/**
 * Executes one complete command. The history is rebuilt only after an accepted
 * command has produced its next state, so rejection leaves the original value
 * and both stacks unchanged.
 */
export const executeCommand = <State>(
  history: History<State>,
  command: Command<State>,
): ExecuteResult<State> => {
  const outcome = command.execute(history.state);

  if (outcome.status === 'rejected') {
    return { status: 'rejected', history, reason: outcome.reason };
  }

  const nextState = deepFreeze(outcome.state);

  if (Object.is(nextState, history.state)) {
    return { status: 'accepted', history, recorded: false };
  }

  const entry = createEntry(history.state, nextState);
  const nextHistory = createHistoryValue(nextState, [...history.past, entry], []);
  return { status: 'accepted', history: nextHistory, recorded: true };
};

export const undo = <State>(history: History<State>): NavigationResult<State> => {
  const entry = history.past[history.past.length - 1];
  if (entry === undefined) {
    return { status: 'unavailable', history };
  }

  const past = history.past.slice(0, -1);
  const nextHistory = createHistoryValue(entry.before, past, [entry, ...history.future]);
  return { status: 'accepted', history: nextHistory };
};

export const redo = <State>(history: History<State>): NavigationResult<State> => {
  const entry = history.future[0];
  if (entry === undefined) {
    return { status: 'unavailable', history };
  }

  const future = history.future.slice(1);
  const nextHistory = createHistoryValue(entry.after, [...history.past, entry], future);
  return { status: 'accepted', history: nextHistory };
};

export const beginCommandGroup = <State>(history: History<State>): CommandGroup<State> =>
  Object.freeze({ base: history, state: history.state, changed: false });

/**
 * Applies a temporary command to a manipulation projection. A rejected preview
 * preserves the last valid projection and can therefore be cancelled safely.
 */
export const applyPreview = <State>(
  group: CommandGroup<State>,
  command: Command<State>,
): PreviewResult<State> => {
  const outcome = command.execute(group.state);

  if (outcome.status === 'rejected') {
    return { status: 'rejected', group, reason: outcome.reason };
  }

  const nextState = deepFreeze(outcome.state);

  if (Object.is(nextState, group.state)) {
    return { status: 'accepted', group };
  }

  const nextGroup = Object.freeze({
    base: group.base,
    state: nextState,
    changed: !Object.is(nextState, group.base.state),
  });
  return { status: 'accepted', group: nextGroup };
};

/**
 * Commits the final projection as one history entry. The intermediate previews
 * are deliberately absent from the history and redo is cleared on commit.
 */
export const commitCommandGroup = <State>(
  group: CommandGroup<State>,
  currentHistory: History<State>,
): CommitResult<State> => {
  if (!Object.is(currentHistory, group.base)) {
    return {
      status: 'rejected',
      history: currentHistory,
      reason: 'history-changed-during-command-group',
    };
  }

  if (!group.changed) {
    return { status: 'committed', history: currentHistory, recorded: false };
  }

  const entry = createEntry(currentHistory.state, group.state);
  const history = createHistoryValue(group.state, [...currentHistory.past, entry], []);
  return { status: 'committed', history, recorded: true };
};

export const cancelCommandGroup = <State>(group: CommandGroup<State>): CancelResult<State> => ({
  status: 'cancelled',
  history: group.base,
});
