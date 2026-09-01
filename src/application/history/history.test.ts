import { describe, expect, it } from 'vitest';

import {
  applyPreview,
  beginCommandGroup,
  cancelCommandGroup,
  commitCommandGroup,
  createHistory,
  executeCommand,
  redo,
  undo,
  type Command,
  type CommandState,
} from './history';

interface CounterState {
  readonly value: number;
}

interface NestedState {
  items: Array<{ label: string }>;
  settings: { enabled: boolean };
}

const changeBy = (amount: number): Command<CounterState> => ({
  execute: (state: CommandState<CounterState>) => ({
    status: 'accepted',
    state: { value: state.value + amount },
  }),
});

const reject = (reason: string): Command<CounterState> => ({
  execute: () => ({ status: 'rejected', reason }),
});

describe('history', () => {
  it('executes atomically and restores immutable snapshots with undo and redo', () => {
    const initial: CounterState = { value: 0 };
    const history = createHistory(initial);

    const execution = executeCommand(history, changeBy(3));

    expect(execution.status).toBe('accepted');
    if (execution.status !== 'accepted') return;

    expect(execution.recorded).toBe(true);
    expect(execution.history.state).toEqual({ value: 3 });
    expect(execution.history.past).toHaveLength(1);
    expect(execution.history.future).toHaveLength(0);
    expect(history.state).toBe(initial);
    expect(initial).toEqual({ value: 0 });

    const undone = undo(execution.history);
    expect(undone.status).toBe('accepted');
    if (undone.status !== 'accepted') return;
    expect(undone.history.state).toBe(initial);
    expect(undone.history.past).toHaveLength(0);
    expect(undone.history.future).toHaveLength(1);

    const redone = redo(undone.history);
    expect(redone.status).toBe('accepted');
    if (redone.status !== 'accepted') return;
    expect(redone.history.state).toEqual({ value: 3 });
    expect(redone.history.past).toHaveLength(1);
    expect(redone.history.future).toHaveLength(0);
  });

  it('rejects a command without changing state or history', () => {
    const history = createHistory<CounterState>({ value: 4 });

    const result = executeCommand(history, reject('locked'));

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') return;
    expect(result.reason).toBe('locked');
    expect(result.history).toBe(history);
    expect(result.history.state).toEqual({ value: 4 });
    expect(result.history.past).toHaveLength(0);
    expect(result.history.future).toHaveLength(0);
  });

  it('clears the redo branch after a new accepted command', () => {
    const first = executeCommand(createHistory<CounterState>({ value: 0 }), changeBy(1));
    if (first.status !== 'accepted') throw new Error('expected first command to be accepted');

    const undone = undo(first.history);
    if (undone.status !== 'accepted') throw new Error('expected undo to be available');

    const branched = executeCommand(undone.history, changeBy(10));
    expect(branched.status).toBe('accepted');
    if (branched.status !== 'accepted') return;
    expect(branched.history.state).toEqual({ value: 10 });
    expect(branched.history.future).toHaveLength(0);

    const unavailable = redo(branched.history);
    expect(unavailable.status).toBe('unavailable');
    expect(unavailable.history).toBe(branched.history);
  });

  it('keeps a continuous manipulation out of history until it is committed', () => {
    const history = createHistory<CounterState>({ value: 0 });
    const group = beginCommandGroup(history);

    const firstPreview = applyPreview(group, changeBy(1));
    expect(firstPreview.status).toBe('accepted');
    if (firstPreview.status !== 'accepted') return;

    const secondPreview = applyPreview(firstPreview.group, changeBy(2));
    expect(secondPreview.status).toBe('accepted');
    if (secondPreview.status !== 'accepted') return;

    expect(history.state).toEqual({ value: 0 });
    expect(history.past).toHaveLength(0);
    expect(secondPreview.group.state).toEqual({ value: 3 });

    const committed = commitCommandGroup(secondPreview.group, history);
    expect(committed.status).toBe('committed');
    if (committed.status !== 'committed') return;
    expect(committed.recorded).toBe(true);
    expect(committed.history.state).toEqual({ value: 3 });
    expect(committed.history.past).toHaveLength(1);

    const undone = undo(committed.history);
    expect(undone.status).toBe('accepted');
    if (undone.status !== 'accepted') return;
    expect(undone.history.state).toEqual({ value: 0 });
  });

  it('does not commit a rejected projection and can cancel a group atomically', () => {
    const history = createHistory<CounterState>({ value: 0 });
    const group = beginCommandGroup(history);
    const preview = applyPreview(group, changeBy(5));
    if (preview.status !== 'accepted') throw new Error('expected preview to be accepted');

    const rejectedPreview = applyPreview(preview.group, reject('outside-build-zone'));
    expect(rejectedPreview.status).toBe('rejected');
    if (rejectedPreview.status !== 'rejected') return;
    expect(rejectedPreview.group.state).toEqual({ value: 5 });
    expect(rejectedPreview.group.changed).toBe(true);

    const cancelled = cancelCommandGroup(rejectedPreview.group);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.history).toBe(history);
    expect(cancelled.history.state).toEqual({ value: 0 });
    expect(cancelled.history.past).toHaveLength(0);
  });

  it('does not add an entry for an accepted no-op', () => {
    const history = createHistory<CounterState>({ value: 2 });
    const noOp: Command<CounterState> = {
      execute: (state) => ({ status: 'accepted', state }),
    };

    const result = executeCommand(history, noOp);

    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;
    expect(result.recorded).toBe(false);
    expect(result.history).toBe(history);
  });

  it('reports unavailable undo and redo without allocating a new history', () => {
    const history = createHistory<CounterState>({ value: 0 });

    const noUndo = undo(history);
    expect(noUndo.status).toBe('unavailable');
    expect(noUndo.history).toBe(history);

    const noRedo = redo(history);
    expect(noRedo.status).toBe('unavailable');
    expect(noRedo.history).toBe(history);
  });

  it('deep-freezes state snapshots before commands can mutate them', () => {
    const initial: NestedState = {
      items: [{ label: 'ball' }],
      settings: { enabled: true },
    };
    const history = createHistory(initial);

    expect(Object.isFrozen(history.state)).toBe(true);
    expect(Object.isFrozen(history.state.items)).toBe(true);
    expect(Object.isFrozen(history.state.items[0])).toBe(true);
    expect(Object.isFrozen(history.state.settings)).toBe(true);

    const mutatingCommand: Command<NestedState> = {
      execute: (state) => {
        state.items.push({ label: 'beam' });
        return { status: 'accepted', state };
      },
    };

    expect(() => executeCommand(history, mutatingCommand)).toThrow(TypeError);
    expect(history.state).toEqual({
      items: [{ label: 'ball' }],
      settings: { enabled: true },
    });
  });

  it('deep-freezes newly returned snapshots and their history entries', () => {
    const history = createHistory<NestedState>({
      items: [{ label: 'ball' }],
      settings: { enabled: true },
    });
    const command: Command<NestedState> = {
      execute: (state) => ({
        status: 'accepted',
        state: {
          items: [...state.items, { label: 'beam' }],
          settings: { enabled: false },
        },
      }),
    };

    const result = executeCommand(history, command);
    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') return;

    expect(Object.isFrozen(result.history.state)).toBe(true);
    expect(Object.isFrozen(result.history.state.items)).toBe(true);
    expect(Object.isFrozen(result.history.state.items[1])).toBe(true);
    expect(Object.isFrozen(result.history.state.settings)).toBe(true);
    expect(Object.isFrozen(result.history.past[0])).toBe(true);
    expect(Object.isFrozen(result.history.past)).toBe(true);
    expect(() => result.history.state.items.push({ label: 'basket' })).toThrow(TypeError);
    const firstEntry = result.history.past[0];
    if (firstEntry === undefined) throw new Error('expected a history entry');
    expect(() => {
      firstEntry.before.settings.enabled = false;
    }).toThrow(TypeError);
  });

  it('rejects committing a command group after the current history diverged', () => {
    const history = createHistory<CounterState>({ value: 0 });
    const group = beginCommandGroup(history);
    const preview = applyPreview(group, changeBy(1));
    if (preview.status !== 'accepted') throw new Error('expected preview to be accepted');

    const currentExecution = executeCommand(history, changeBy(10));
    if (currentExecution.status !== 'accepted') {
      throw new Error('expected current command to be accepted');
    }

    const result = commitCommandGroup(preview.group, currentExecution.history);

    expect(result.status).toBe('rejected');
    if (result.status !== 'rejected') return;
    expect(result.reason).toBe('history-changed-during-command-group');
    expect(result.history).toBe(currentExecution.history);
    expect(result.history.state).toEqual({ value: 10 });
    expect(result.history.past).toHaveLength(1);
  });
});
