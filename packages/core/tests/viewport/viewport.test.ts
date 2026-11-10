import {
  initialViewportState,
  isNearBottom,
  ScrollIntentType,
  TimelineChangeKind,
  ViewportActionType,
  ViewportMode,
  viewportReducer,
  type ViewportState,
} from '@talkentry/core';

const geometry = (state: ViewportState, distance: number, hasMoreAfter = false) =>
  viewportReducer(state, { type: ViewportActionType.GeometryChanged, distance, hasMoreAfter });

describe('explicit viewport intents', () => {
  it('ignores programmatic animation completion while following a moving tail', () => {
    let state = viewportReducer(initialViewportState(), {
      type: ViewportActionType.FollowLatest,
    });
    state = geometry(state, 300);
    const completed = viewportReducer(state, {
      type: ViewportActionType.InteractionEnded,
    });
    expect(completed).toBe(state);
    expect(completed.manualOverride).toBe(false);
  });

  it('keeps one pending follow intent throughout a burst', () => {
    let state = viewportReducer(initialViewportState(), {
      type: ViewportActionType.FollowLatest,
    });
    const intent = state.pendingIntent;
    for (let sequence = 1; sequence <= 100; sequence += 1) {
      state = viewportReducer(state, {
        type: ViewportActionType.WindowChanged,
        change: { sequence, kind: TimelineChangeKind.Append },
        hasMoreAfter: false,
      });
      expect(state.pendingIntent).toBe(intent);
    }
    expect(state.nextIntentId).toBe(2);
  });

  it.each([TimelineChangeKind.Reconcile, TimelineChangeKind.Remove])(
    'keeps following a structural %s after batched timeline updates',
    (kind) => {
      const action = {
        type: ViewportActionType.WindowChanged,
        change: { sequence: 4, kind },
        hasMoreAfter: false,
      } as const;
      expect(viewportReducer(initialViewportState(), action).pendingIntent).toMatchObject({
        type: ScrollIntentType.ScrollToEnd,
        animated: true,
      });
      const manual = viewportReducer(initialViewportState(), {
        type: ViewportActionType.UserDrag,
      });
      expect(viewportReducer(manual, action).pendingIntent.type).toBe(ScrollIntentType.None);
    },
  );

  it('does not bypass the show threshold when an around intent is acknowledged', () => {
    let state = viewportReducer(initialViewportState(), {
      type: ViewportActionType.WindowChanged,
      change: { sequence: 1, kind: TimelineChangeKind.Around, focusKey: 'a' },
      hasMoreAfter: false,
    });
    state = geometry(state, 100);
    state = viewportReducer(state, { type: ViewportActionType.IntentConsumed, id: 1 });
    expect(state.buttonVisible).toBe(false);
  });
  it('starts without imperative scrolling', () => {
    expect(initialViewportState().pendingIntent.type).toBe(ScrollIntentType.None);
  });

  it('prepend with a trimmed tail never becomes an own-send event', () => {
    const state = viewportReducer(initialViewportState(), {
      type: ViewportActionType.WindowChanged,
      change: { sequence: 1, kind: TimelineChangeKind.Older },
      hasMoreAfter: true,
    });

    expect(state.mode).toBe(ViewportMode.ReadingHistory);
    expect(state.pendingIntent.type).toBe(ScrollIntentType.None);
  });

  it('does not follow a remote append while reading', () => {
    const reading = viewportReducer(initialViewportState(), {
      type: ViewportActionType.UserDrag,
    });

    expect(
      viewportReducer(reading, {
        type: ViewportActionType.WindowChanged,
        change: { sequence: 1, kind: TimelineChangeKind.Append },
        hasMoreAfter: false,
      }).pendingIntent.type,
    ).toBe(ScrollIntentType.None);
  });

  it('does not allow own-send to take control from a manual gesture', () => {
    const state = viewportReducer(
      viewportReducer(initialViewportState(), { type: ViewportActionType.UserDrag }),
      {
        type: ViewportActionType.WindowChanged,
        change: { sequence: 1, kind: TimelineChangeKind.OwnSend },
        hasMoreAfter: false,
      },
    );

    expect(state.pendingIntent.type).toBe(ScrollIntentType.None);
  });

  it('only acknowledges the matching intent and does not cancel it on intermediate scroll events', () => {
    const first = viewportReducer(initialViewportState(), {
      type: ViewportActionType.FollowLatest,
    });
    const second = viewportReducer(first, { type: ViewportActionType.FollowLatest });

    expect(viewportReducer(second, { type: ViewportActionType.IntentConsumed, id: 1 })).toBe(
      second,
    );
    expect(
      viewportReducer(second, {
        type: ViewportActionType.NearBottomChanged,
        nearBottom: false,
      }),
    ).toBe(second);
    expect(
      viewportReducer(second, { type: ViewportActionType.IntentConsumed, id: 2 }).pendingIntent
        .type,
    ).toBe(ScrollIntentType.None);
  });

  it('the end of a detached window is not the latest edge', () => {
    expect(
      viewportReducer(initialViewportState(), {
        type: ViewportActionType.NearBottomChanged,
        nearBottom: true,
        hasMoreAfter: true,
      }).mode,
    ).toBe(ViewportMode.ReadingHistory);
  });

  it('calculates geometry including content smaller than the viewport', () => {
    expect(isNearBottom(0, 50, 100)).toBe(true);
    expect(isNearBottom(800, 1000, 100)).toBe(false);
    expect(isNearBottom(900, 1000, 100)).toBe(true);
  });

  it('does not show the button on drag and uses 216/72 hysteresis', () => {
    let state = viewportReducer(initialViewportState(), { type: ViewportActionType.UserDrag });
    expect(state.buttonVisible).toBe(false);
    for (const distance of [1, 40, 71, 74, 100, 215]) {
      state = geometry(state, distance);
      expect(state.buttonVisible).toBe(false);
    }
    state = geometry(state, 216);
    expect(state.buttonVisible).toBe(true);
    for (const distance of [215, 210, 80, 73]) {
      state = geometry(state, distance);
      expect(state.buttonVisible).toBe(true);
    }
    expect(geometry(state, 72).buttonVisible).toBe(false);
  });

  it.each([TimelineChangeKind.Latest, TimelineChangeKind.Append, TimelineChangeKind.OwnSend])(
    'keeps manual control through %s while near but not at the end',
    (kind) => {
      let state = viewportReducer(initialViewportState(), { type: ViewportActionType.UserDrag });
      state = geometry(state, 40);
      state = viewportReducer(state, { type: ViewportActionType.InteractionEnded });
      state = viewportReducer(state, {
        type: ViewportActionType.WindowChanged,
        change: { sequence: 1, kind },
        hasMoreAfter: false,
      });
      expect(state.pendingIntent.type).toBe(ScrollIntentType.None);
      expect(state.manualOverride).toBe(true);
      expect(state.buttonVisible).toBe(false);
    },
  );

  it('resumes following only after reaching the true end and ending interaction', () => {
    let state = viewportReducer(initialViewportState(), { type: ViewportActionType.UserDrag });
    state = geometry(state, 0);
    expect(state.manualOverride).toBe(true);
    state = viewportReducer(state, { type: ViewportActionType.InteractionEnded });
    expect(state.mode).toBe(ViewportMode.FollowingLatest);
    state = viewportReducer(state, {
      type: ViewportActionType.WindowChanged,
      change: { sequence: 1, kind: TimelineChangeKind.Append },
      hasMoreAfter: false,
    });
    expect(state.pendingIntent).toMatchObject({
      type: ScrollIntentType.ScrollToEnd,
      animated: true,
    });
  });

  it('keeps the detached-window button even at its local end', () => {
    const state = geometry(initialViewportState(), 0, true);
    expect(state.buttonVisible).toBe(true);
  });

  it('does not replay an around intent after cancellation or a row-only render', () => {
    const action = {
      type: ViewportActionType.WindowChanged,
      change: { sequence: 2, kind: TimelineChangeKind.Around, focusKey: 'a' },
      hasMoreAfter: true,
    } as const;
    let state = viewportReducer(initialViewportState(), action);
    expect(state.pendingIntent.type).toBe(ScrollIntentType.ScrollToMessage);
    state = viewportReducer(state, { type: ViewportActionType.UserDrag });
    state = viewportReducer(state, action);
    expect(state.pendingIntent.type).toBe(ScrollIntentType.None);
  });

  it('rejects a navigation completed after its interaction generation was cancelled', () => {
    const state = viewportReducer(initialViewportState(), {
      type: ViewportActionType.WindowChanged,
      change: { sequence: 1, kind: TimelineChangeKind.Around, focusKey: 'a' },
      hasMoreAfter: true,
      cancelled: true,
    });
    expect(state.pendingIntent.type).toBe(ScrollIntentType.None);
  });
});
