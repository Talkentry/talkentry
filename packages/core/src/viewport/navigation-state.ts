import {
  type ActiveScrollIntent,
  type NavigationCancellation,
  NavigationStatus,
  ScrollIntentType,
  type ViewportState,
} from './types';

/** Allocate a fresh identity even when retrying the same destination. */
export const beginNavigation = (
  state: ViewportState,
  intent:
    | Omit<Extract<ActiveScrollIntent, { type: 'scrollToEnd' }>, 'id'>
    | Omit<Extract<ActiveScrollIntent, { type: 'scrollToMessage' }>, 'id'>,
  awaitingData = false,
): ViewportState => ({
  ...state,
  pendingIntent: { ...intent, id: state.nextIntentId },
  nextIntentId: state.nextIntentId + 1,
  navigation: { status: NavigationStatus.Pending, id: state.nextIntentId, awaitingData },
});

export const cancelNavigation = (
  state: ViewportState,
  reason: NavigationCancellation,
): ViewportState => {
  let id: number | undefined;
  if (state.pendingIntent.type !== ScrollIntentType.None) {
    id = state.pendingIntent.id;
  } else if (state.navigation.status === NavigationStatus.Failed && reason !== 'superseded') {
    id = state.navigation.id;
  }

  return {
    ...state,
    pendingIntent: { type: ScrollIntentType.None },
    navigation:
      id === undefined ? state.navigation : { status: NavigationStatus.Cancelled, id, reason },
  };
};

export const matchesIntent = (state: ViewportState, id: number): boolean =>
  state.pendingIntent.type !== ScrollIntentType.None && state.pendingIntent.id === id;
