import {
  initialViewportState,
  type NavigationFailure,
  type TimelineChange,
  type ViewportAction,
  ViewportActionType,
  viewportReducer,
} from '@talkentry/core';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type UseViewportParams = {
  readonly change: TimelineChange;
  readonly hasMoreAfter: boolean;
  /** True while an around/latest history request is outstanding. */
  readonly navigationPending?: boolean;
  readonly scopeKey?: string;
};

/** The ref and React snapshot represent one coordinator, not independent scroll policies. */
export const useViewport = ({
  change,
  hasMoreAfter,
  navigationPending = false,
  scopeKey,
}: UseViewportParams) => {
  const [state, setState] = useState(initialViewportState);
  const current = useRef(state);
  const navigation = useRef({ pending: false, interruption: 0 });
  const scope = useRef(scopeKey);

  // Stable dispatch is required by layout effects and renderer callbacks.
  // Cancellation takes effect synchronously, before React commits the next snapshot.
  const dispatch = useCallback((action: ViewportAction) => {
    const previous = current.current;
    const next = viewportReducer(previous, action);

    if (next === previous) {
      return;
    }

    current.current = next;

    if (
      next.mode !== previous.mode ||
      next.pendingIntent !== previous.pendingIntent ||
      next.buttonVisible !== previous.buttonVisible ||
      next.interacting !== previous.interacting ||
      next.manualOverride !== previous.manualOverride ||
      next.navigation !== previous.navigation ||
      next.active !== previous.active ||
      next.hasMoreAfter !== previous.hasMoreAfter
    ) {
      setState(next);
    }
  }, []);

  const getState = useCallback(() => current.current, []);

  useLayoutEffect(() => {
    if (scope.current !== scopeKey) {
      scope.current = scopeKey;
      navigation.current.pending = false;
      dispatch({ type: ViewportActionType.Reset });
    }

    if (navigationPending && !navigation.current.pending) {
      navigation.current.interruption = current.current.interruption;
    }

    if (change.sequence > 0) {
      dispatch({
        type: ViewportActionType.WindowChanged,
        change,
        hasMoreAfter,
        cancelled:
          navigation.current.pending &&
          navigation.current.interruption !== current.current.interruption,
      });
    }

    navigation.current.pending = navigationPending;
  }, [change, hasMoreAfter, navigationPending, scopeKey, dispatch]);

  return {
    mode: state.mode,
    state,
    getState,
    onGeometryChanged: (distance: number) =>
      dispatch({ type: ViewportActionType.GeometryChanged, distance, hasMoreAfter }),
    onNearBottomChanged: (nearBottom: boolean) =>
      dispatch({ type: ViewportActionType.NearBottomChanged, nearBottom, hasMoreAfter }),
    onUserDrag: () => dispatch({ type: ViewportActionType.UserDrag }),
    onInteractionEnded: () => dispatch({ type: ViewportActionType.InteractionEnded }),
    prepareLatest: (awaitingData = false) => {
      dispatch({ type: ViewportActionType.PrepareLatest, awaitingData });

      return current.current.pendingIntent;
    },
    prepareMessage: (key: string, awaitingData: boolean) => {
      dispatch({ type: ViewportActionType.PrepareMessage, key, awaitingData });

      return current.current.pendingIntent;
    },
    onLocalSendAccepted: (awaitingData: boolean) => {
      dispatch({ type: ViewportActionType.LocalSendAccepted, awaitingData });

      return current.current.pendingIntent;
    },
    latestReady: (id: number) => dispatch({ type: ViewportActionType.LatestReady, id }),
    executionStarted: (id: number) => dispatch({ type: ViewportActionType.ExecutionStarted, id }),
    failIntent: (id: number, reason: NavigationFailure) =>
      dispatch({ type: ViewportActionType.ExecutionFailed, id, reason }),
    retryNavigation: () => dispatch({ type: ViewportActionType.RetryNavigation }),
    setActive: (active: boolean) =>
      dispatch({ type: ViewportActionType.ActivationChanged, active }),
    onLayoutChanged: (content: number, height: number, offset: number, sequence: number) =>
      dispatch({
        type: ViewportActionType.LayoutChanged,
        content,
        height,
        offset,
        sequence,
        hasMoreAfter,
      }),
    followLatest: (animated = true) =>
      dispatch({ type: ViewportActionType.FollowLatest, animated }),
    consumeIntent: (id: number) => dispatch({ type: ViewportActionType.IntentConsumed, id }),
  };
};

export type UseViewportResult = ReturnType<typeof useViewport>;
