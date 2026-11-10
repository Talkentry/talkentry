import {
  initialViewportState,
  NavigationFailure,
  NavigationStatus,
  ScrollIntentType,
  ViewportActionType as Action,
  viewportReducer as reduce,
  type ViewportState,
} from '@talkentry/core';

const latest = (state = initialViewportState(), awaitingData = false) =>
  reduce(state, { type: Action.PrepareLatest, awaitingData });
const idOf = (state: ViewportState) => {
  if (state.pendingIntent.type === ScrollIntentType.None) {
    throw new Error('Expected intent');
  }

  return state.pendingIntent.id;
};
const layout = (state: ViewportState, content = 1000, offset = 0) =>
  reduce(state, {
    type: Action.LayoutChanged,
    content,
    height: 100,
    offset,
    sequence: state.lastChange,
    hasMoreAfter: false,
  });

describe('viewport navigation lifecycle', () => {
  it.each(['pending', 'executing'] as const)(
    'preserves a %s message target across detached-window updates',
    (status) => {
      let state = reduce(initialViewportState(), {
        type: Action.PrepareMessage,
        key: 'original',
        awaitingData: false,
      });
      const id = idOf(state);
      if (status === 'executing') {
        state = reduce(state, { type: Action.ExecutionStarted, id });
      }

      for (const kind of ['append', 'newer', 'own-send', 'reconcile', 'remove'] as const) {
        state = reduce(state, {
          type: Action.WindowChanged,
          change: { sequence: state.lastChange + 1, kind },
          hasMoreAfter: true,
        });
        expect(state.pendingIntent).toMatchObject({
          type: 'scrollToMessage',
          key: 'original',
          id,
        });
        expect(state.navigation).toMatchObject({ id, status });
      }
    },
  );

  it('owns initial layout positioning and later animated layout following', () => {
    let state = layout(initialViewportState());
    expect(state.pendingIntent).toMatchObject({ type: 'scrollToEnd', animated: false });
    state = reduce(state, { type: Action.GeometryChanged, distance: 0, hasMoreAfter: false });
    state = reduce(state, { type: Action.IntentConsumed, id: idOf(state) });
    state = layout(state, 1400);
    expect(state.pendingIntent).toMatchObject({ type: 'scrollToEnd', animated: true });
    expect(state.buttonVisible).toBe(false);
  });

  it('does not follow layout changes during manual history reading', () => {
    let state = reduce(initialViewportState(), { type: Action.UserDrag });
    state = layout(state);
    state = reduce(state, { type: Action.InteractionEnded });
    state = layout(state, 1500);
    expect(state.pendingIntent.type).toBe('none');
    expect(state.mode).toBe('readingHistory');
  });

  it('moves pending to executing to settled only for the current identity', () => {
    let state = latest();
    const id = idOf(state);
    expect(state.navigation.status).toBe(NavigationStatus.Pending);
    expect(reduce(state, { type: Action.ExecutionStarted, id: id + 1 })).toBe(state);
    state = reduce(state, { type: Action.ExecutionStarted, id });
    expect(state.navigation.status).toBe(NavigationStatus.Executing);
    expect(reduce(state, { type: Action.ExecutionStarted, id })).toBe(state);
    state = reduce(state, { type: Action.IntentConsumed, id });
    expect(state.navigation).toEqual({ status: 'settled', id });
    expect(state.pendingIntent.type).toBe('none');
  });

  it('records failure without an ACK and requires a new identity for retry', () => {
    let state = latest();
    const id = idOf(state);
    state = reduce(state, {
      type: Action.ExecutionFailed,
      id,
      reason: NavigationFailure.RetryExhausted,
    });
    expect(state.navigation).toMatchObject({ status: 'failed', id, reason: 'retryExhausted' });
    expect(state.pendingIntent.type).toBe('none');
    expect(state.buttonVisible).toBe(true);
    state = reduce(state, { type: Action.RetryNavigation });
    expect(idOf(state)).toBeGreaterThan(id);
    expect(reduce(state, { type: Action.IntentConsumed, id })).toBe(state);
    expect(
      reduce(state, { type: Action.ExecutionFailed, id, reason: NavigationFailure.LoadFailed }),
    ).toBe(state);
  });

  it('cancels loading and rejects late readiness after a gesture', () => {
    let state = latest(initialViewportState(), true);
    const id = idOf(state);
    expect(state.navigation).toMatchObject({ awaitingData: true });
    state = reduce(state, { type: Action.UserDrag });
    expect(state.navigation).toMatchObject({ status: 'cancelled', reason: 'gesture' });
    expect(reduce(state, { type: Action.LatestReady, id })).toBe(state);
    expect(reduce(state, { type: Action.FollowLatest })).toBe(state);
  });

  it('does not recycle identities after scope reset', () => {
    const first = latest();
    const oldId = idOf(first);
    const state = latest(reduce(first, { type: Action.Reset }));
    expect(idOf(state)).toBeGreaterThan(oldId);
    expect(state.interruption).toBeGreaterThan(first.interruption);
    expect(reduce(state, { type: Action.IntentConsumed, id: oldId })).toBe(state);
  });

  it('cancels on inactivity and does not issue commands while inactive', () => {
    let state = reduce(latest(), { type: Action.ActivationChanged, active: false });
    expect(state.navigation).toMatchObject({ status: 'cancelled', reason: 'inactive' });
    state = layout(state, 1500);
    expect(reduce(state, { type: Action.FollowLatest })).toBe(state);
    expect(reduce(state, { type: Action.PrepareLatest })).toBe(state);
    state = reduce(state, { type: Action.ActivationChanged, active: true });
    expect(state.mode).toBe('readingHistory');
    expect(state.pendingIntent.type).toBe('none');
  });

  it('retries a message target without converting it to Latest', () => {
    let state = reduce(initialViewportState(), {
      type: Action.WindowChanged,
      change: { sequence: 1, kind: 'around', focusKey: 'message' },
      hasMoreAfter: true,
    });
    const id = idOf(state);
    state = reduce(state, {
      type: Action.ExecutionFailed,
      id,
      reason: NavigationFailure.LayoutUnavailable,
    });
    state = reduce(state, { type: Action.RetryNavigation });
    expect(state.pendingIntent).toMatchObject({ type: 'scrollToMessage', key: 'message' });
    expect(idOf(state)).toBeGreaterThan(id);
  });

  it('does not replay the failed intent when unrelated layout changes', () => {
    let state = latest();
    state = reduce(state, {
      type: Action.ExecutionFailed,
      id: idOf(state),
      reason: NavigationFailure.RetryExhausted,
    });
    state = layout(state, 1500);
    expect(state.pendingIntent.type).toBe('none');
    expect(state.navigation.status).toBe('failed');
    state = reduce(state, {
      type: Action.WindowChanged,
      change: { sequence: 1, kind: 'reconcile' },
      hasMoreAfter: true,
    });
    expect(state.navigation.status).toBe('failed');
  });

  it('animates the down button across loaded history and keeps a far send instant', () => {
    const history = (offset: number) => {
      let state = reduce(initialViewportState(), { type: Action.UserDrag });
      state = layout(state, 1000, offset);

      return reduce(state, { type: Action.InteractionEnded });
    };
    const far = history(0);
    expect(latest(far).pendingIntent).toMatchObject({
      type: ScrollIntentType.ScrollToEnd,
      animated: true,
    });
    expect(latest(far, true).pendingIntent).toMatchObject({
      type: ScrollIntentType.ScrollToEnd,
      animated: false,
    });
    expect(
      reduce(far, { type: Action.LocalSendAccepted, awaitingData: false }).pendingIntent,
    ).toMatchObject({
      type: ScrollIntentType.ScrollToEnd,
      animated: false,
    });
    expect(latest(history(850)).pendingIntent).toMatchObject({
      type: ScrollIntentType.ScrollToEnd,
      animated: true,
    });
  });

  it('accepts a new local send from history but never interrupts an active gesture', () => {
    let state = reduce(initialViewportState(), { type: Action.UserDrag });
    state = layout(state);
    expect(reduce(state, { type: Action.LocalSendAccepted, awaitingData: true })).toBe(state);
    state = reduce(state, { type: Action.InteractionEnded });
    state = reduce(state, { type: Action.LocalSendAccepted, awaitingData: true });
    const id = idOf(state);
    expect(state.manualOverride).toBe(false);
    expect(state.navigation).toMatchObject({ status: 'pending', awaitingData: true });
    state = reduce(state, {
      type: Action.WindowChanged,
      change: { sequence: 1, kind: 'own-send' },
      hasMoreAfter: true,
    });
    expect(idOf(state)).toBe(id);
    state = reduce(state, { type: Action.LocalSendAccepted, awaitingData: true });
    expect(idOf(state)).toBe(id);
  });
});
