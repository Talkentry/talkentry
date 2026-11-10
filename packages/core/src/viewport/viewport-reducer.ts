import { TimelineChangeKind } from '../timeline';
import { beginNavigation, cancelNavigation, matchesIntent } from './navigation-state';
import {
  NavigationStatus,
  ScrollIntentType,
  type ViewportAction,
  ViewportActionType,
  ViewportMode,
  type ViewportState,
} from './types';

export const DEFAULT_NEAR_BOTTOM_THRESHOLD_PX = 72;
export const DEFAULT_LATEST_SHOW_THRESHOLD_PX = 216;
/** Following resumes only at the actual end, not at the button hide threshold. */
export const END_POSITION_TOLERANCE_PX = 2;

export const initialViewportState = (): ViewportState => ({
  mode: ViewportMode.FollowingLatest,
  pendingIntent: { type: ScrollIntentType.None },
  nextIntentId: 1,
  buttonVisible: false,
  interacting: false,
  manualOverride: false,
  interruption: 0,
  distance: 0,
  hasMoreAfter: false,
  lastChange: 0,
  navigation: { status: NavigationStatus.Idle },
  active: true,
  layout: { content: 0, height: 0 },
});

const scroll = (state: ViewportState, animated: boolean, awaitingData = false): ViewportState =>
  beginNavigation(
    {
      ...state,
      mode: ViewportMode.FollowingLatest,
      manualOverride: false,
      interacting: false,
    },
    { type: ScrollIntentType.ScrollToEnd, animated },
    awaitingData,
  );

const reading = (state: ViewportState): ViewportState => ({
  ...cancelNavigation(state, 'superseded'),
  mode: ViewportMode.ReadingHistory,
  pendingIntent: { type: ScrollIntentType.None },
});

const atEnd = (state: ViewportState) =>
  !state.hasMoreAfter && state.distance <= END_POSITION_TOLERANCE_PX;

/** A local send from history. Near the tail stays animated; a far one does not. */
const tailJumpAnimated = (state: ViewportState) =>
  !(
    state.mode === ViewportMode.ReadingHistory &&
    state.layout.height > 0 &&
    state.distance > state.layout.height
  );

export const viewportReducer = (state: ViewportState, action: ViewportAction): ViewportState => {
  switch (action.type) {
    case ViewportActionType.Reset:
      // A scope reset must not recycle IDs accepted by old asynchronous callbacks.
      return {
        ...initialViewportState(),
        nextIntentId: state.nextIntentId,
        interruption: state.interruption + 1,
      };
    case ViewportActionType.UserDrag:
      return {
        ...reading(cancelNavigation(state, 'gesture')),
        interacting: true,
        manualOverride: true,
        interruption: state.interruption + 1,
      };
    case ViewportActionType.InteractionEnded:
      // Native momentum-end also fires for programmatic animations.
      if (!state.interacting) {
        return state;
      }

      return {
        ...state,
        interacting: false,
        manualOverride: !atEnd(state),
        mode: atEnd(state) ? ViewportMode.FollowingLatest : ViewportMode.ReadingHistory,
      };
    case ViewportActionType.PrepareLatest: {
      if (!state.active) {
        return state;
      }
      // The down button glides across messages already in the window.
      // A missing tail is loaded first, then placed, without flying across the gap.
      const awaitingData = action.awaitingData === true;

      return scroll(state, !awaitingData, awaitingData);
    }
    case ViewportActionType.PrepareMessage:
      if (!state.active || state.interacting) {
        return state;
      }

      return beginNavigation(
        { ...reading(state), manualOverride: false },
        { type: ScrollIntentType.ScrollToMessage, key: action.key, animated: true },
        action.awaitingData,
      );
    case ViewportActionType.LocalSendAccepted:
      if (!state.active || state.interacting) {
        return state;
      }
      if (
        state.pendingIntent.type === ScrollIntentType.ScrollToEnd &&
        ((state.navigation.status === NavigationStatus.Pending && state.navigation.awaitingData) ||
          !action.awaitingData)
      ) {
        return state;
      }

      return scroll(state, tailJumpAnimated(state), action.awaitingData);
    case ViewportActionType.LatestReady:
      if (
        !matchesIntent(state, action.id) ||
        (state.navigation.status !== NavigationStatus.Pending &&
          state.navigation.status !== NavigationStatus.Executing)
      ) {
        return state;
      }

      return { ...state, navigation: { ...state.navigation, awaitingData: false } };
    case ViewportActionType.ExecutionStarted:
      if (
        !matchesIntent(state, action.id) ||
        state.navigation.status !== NavigationStatus.Pending
      ) {
        return state;
      }

      return { ...state, navigation: { ...state.navigation, status: NavigationStatus.Executing } };
    case ViewportActionType.ExecutionFailed:
      if (!matchesIntent(state, action.id) || state.pendingIntent.type === ScrollIntentType.None) {
        return state;
      }

      return {
        ...state,
        navigation: {
          status: NavigationStatus.Failed,
          id: action.id,
          reason: action.reason,
          intent: state.pendingIntent,
        },
        pendingIntent: { type: ScrollIntentType.None },
        mode: ViewportMode.ReadingHistory,
        manualOverride: false,
        buttonVisible: true,
      };
    case ViewportActionType.RetryNavigation: {
      if (
        !state.active ||
        state.interacting ||
        state.navigation.status !== NavigationStatus.Failed
      ) {
        return state;
      }
      const intent = state.navigation.intent;
      if (intent.type === ScrollIntentType.ScrollToEnd) {
        return scroll(state, intent.animated, state.hasMoreAfter);
      }

      return beginNavigation(
        { ...state, manualOverride: false },
        { type: intent.type, key: intent.key, animated: true },
      );
    }
    case ViewportActionType.ActivationChanged:
      if (state.active === action.active) {
        return state;
      }
      if (!action.active) {
        return {
          ...reading(cancelNavigation(state, 'inactive')),
          active: false,
          interacting: false,
          manualOverride: true,
          interruption: state.interruption + 1,
        };
      }

      return {
        ...state,
        active: true,
        mode: atEnd(state) ? ViewportMode.FollowingLatest : ViewportMode.ReadingHistory,
        manualOverride: !atEnd(state),
      };
    case ViewportActionType.FollowLatest:
      if (!state.active || state.interacting) {
        return state;
      }

      return scroll(state, action.animated !== false);
    case ViewportActionType.IntentConsumed:
      if (
        state.pendingIntent.type === ScrollIntentType.None ||
        state.pendingIntent.id !== action.id
      ) {
        return state;
      }

      return {
        ...state,
        navigation: { status: NavigationStatus.Settled, id: action.id },
        pendingIntent: { type: ScrollIntentType.None },
        buttonVisible:
          state.hasMoreAfter ||
          (state.distance > DEFAULT_NEAR_BOTTOM_THRESHOLD_PX &&
            (state.buttonVisible || state.distance >= DEFAULT_LATEST_SHOW_THRESHOLD_PX)),
      };
    case ViewportActionType.GeometryChanged: {
      const distance = Math.max(0, action.distance);
      let buttonVisible = state.buttonVisible;
      if (action.hasMoreAfter) {
        buttonVisible = true;
      } else if (distance <= DEFAULT_NEAR_BOTTOM_THRESHOLD_PX) {
        buttonVisible = false;
      } else if (state.pendingIntent.type === ScrollIntentType.None) {
        if (distance >= DEFAULT_LATEST_SHOW_THRESHOLD_PX) {
          buttonVisible = true;
        }
      }
      let mode = state.mode;
      let manualOverride = state.manualOverride;
      if (
        state.active &&
        !state.interacting &&
        state.pendingIntent.type === ScrollIntentType.None &&
        !action.hasMoreAfter &&
        distance <= END_POSITION_TOLERANCE_PX
      ) {
        mode = ViewportMode.FollowingLatest;
        manualOverride = false;
      }
      if (
        distance === state.distance &&
        buttonVisible === state.buttonVisible &&
        mode === state.mode &&
        manualOverride === state.manualOverride &&
        action.hasMoreAfter === state.hasMoreAfter
      ) {
        return state;
      }

      return {
        ...state,
        distance,
        buttonVisible,
        mode,
        manualOverride,
        hasMoreAfter: action.hasMoreAfter,
      };
    }
    case ViewportActionType.LayoutChanged: {
      const content = Math.max(0, action.content);
      const height = Math.max(0, action.height);
      const changed = content !== state.layout.content || height !== state.layout.height;
      let next: ViewportState = { ...state, layout: { content, height } };
      if (
        changed &&
        content > 0 &&
        height > 0 &&
        state.active &&
        state.mode === ViewportMode.FollowingLatest &&
        !state.interacting &&
        !state.manualOverride &&
        !action.hasMoreAfter &&
        state.pendingIntent.type === ScrollIntentType.None &&
        state.lastChange === action.sequence
      ) {
        next = scroll(next, state.layout.content > 0);
      }

      return viewportReducer(next, {
        type: ViewportActionType.GeometryChanged,
        distance: content - height - action.offset,
        hasMoreAfter: action.hasMoreAfter,
      });
    }
    case ViewportActionType.NearBottomChanged:
      // Compatibility for headless hosts. Native UI supplies exact geometry instead.
      if (action.hasMoreAfter) {
        return reading({ ...state, hasMoreAfter: true, buttonVisible: true });
      }
      if (
        state.interacting ||
        state.manualOverride ||
        state.pendingIntent.type !== ScrollIntentType.None
      ) {
        return state;
      }
      if (action.nearBottom) {
        return { ...state, mode: ViewportMode.FollowingLatest };
      }

      return reading(state);
    case ViewportActionType.WindowChanged: {
      const next = {
        ...state,
        hasMoreAfter: action.hasMoreAfter,
        buttonVisible: action.hasMoreAfter || state.buttonVisible,
      };
      // A status/render update must not replay an already consumed navigation.
      if (action.change.sequence <= state.lastChange) {
        return next;
      }
      next.lastChange = action.change.sequence;
      const { kind, focusKey } = action.change;

      if (action.cancelled || state.interacting || !state.active) {
        return reading(next);
      }
      // An optimistic commit or a receipt must not cancel an explicit tail load.
      if (
        state.pendingIntent.type === ScrollIntentType.ScrollToEnd &&
        state.navigation.status === NavigationStatus.Pending &&
        state.navigation.awaitingData &&
        kind !== TimelineChangeKind.Around &&
        kind !== TimelineChangeKind.Older
      ) {
        return next;
      }
      // Reconciliation may move the target, but must not abandon an explicit jump.
      // The renderer detects a removed target and reports failure after layout.
      if (
        state.pendingIntent.type === ScrollIntentType.ScrollToMessage &&
        kind !== TimelineChangeKind.Around &&
        kind !== TimelineChangeKind.Older &&
        kind !== TimelineChangeKind.Latest &&
        kind !== TimelineChangeKind.Initial
      ) {
        return next;
      }
      if (kind === TimelineChangeKind.Around && focusKey) {
        if (
          state.pendingIntent.type === ScrollIntentType.ScrollToMessage &&
          state.navigation.status === NavigationStatus.Pending &&
          state.navigation.awaitingData
        ) {
          return { ...next, pendingIntent: { ...state.pendingIntent, key: focusKey } };
        }

        return beginNavigation(
          {
            ...reading(next),
            manualOverride: false,
          },
          {
            type: ScrollIntentType.ScrollToMessage,
            key: focusKey,
            animated: true,
          },
        );
      }
      if (kind === TimelineChangeKind.Older || action.hasMoreAfter) {
        return reading(next);
      }
      if (state.manualOverride) {
        return reading(next);
      }
      if (kind === TimelineChangeKind.Initial || kind === TimelineChangeKind.Latest) {
        if (state.pendingIntent.type === ScrollIntentType.ScrollToEnd) {
          return next;
        }

        return scroll(next, kind !== TimelineChangeKind.Initial);
      }
      if (
        state.mode === ViewportMode.FollowingLatest &&
        (kind === TimelineChangeKind.Append ||
          kind === TimelineChangeKind.Newer ||
          kind === TimelineChangeKind.OwnSend ||
          kind === TimelineChangeKind.Reconcile ||
          kind === TimelineChangeKind.Remove)
      ) {
        // A follow intent targets the moving tail, not one append's snapshot.
        if (state.pendingIntent.type === ScrollIntentType.ScrollToEnd) {
          return next;
        }

        return scroll(next, true);
      }

      return next;
    }
  }
};

export const isNearBottom = (
  offset: number,
  content: number,
  height: number,
  threshold = DEFAULT_NEAR_BOTTOM_THRESHOLD_PX,
): boolean => content <= height || content - height - offset <= threshold;
