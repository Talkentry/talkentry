import {
  LOAD_STATUS,
  type TimelineAction,
  TimelineActionType,
  type TimelineReducerOptions,
} from './actions';
import { commitWindow } from './internal/commit-window';
import { TimelineStatus, type TimelineWindow } from './types';

export {
  type TimelineAction,
  TimelineActionType,
  TimelineLoadMode,
  type TimelineReducerOptions,
} from './actions';
export { initialTimelineWindow } from './window';

const DEFAULT_MAX_MESSAGES = 500;

/**
 * Pure owner of `TimelineWindow`: sort, trim, gaps retention, change sequence.
 * Does not touch MessageStore entities.
 *
 * Heavy work lives in `./internal/*`; this file only switches on action type.
 */
export const createTimelineReducer = ({
  maxMessages = DEFAULT_MAX_MESSAGES,
}: TimelineReducerOptions = {}) => {
  if (!Number.isSafeInteger(maxMessages) || maxMessages < 1) {
    throw new Error('Invalid maxMessages');
  }

  return (state: TimelineWindow, action: TimelineAction): TimelineWindow => {
    switch (action.type) {
      case TimelineActionType.LoadStart:
        return { ...state, status: LOAD_STATUS[action.mode], error: null };

      case TimelineActionType.LoadError:
        return {
          ...state,
          status: state.items.length ? TimelineStatus.Ready : TimelineStatus.Idle,
          error: action.error,
        };

      case TimelineActionType.LoadCancelled:
        return {
          ...state,
          status: state.items.length ? TimelineStatus.Ready : TimelineStatus.Idle,
          error: null,
        };

      case TimelineActionType.Commit:
        return commitWindow(state, action, maxMessages);

      default:
        return state;
    }
  };
};

export const timelineReducer = createTimelineReducer();
