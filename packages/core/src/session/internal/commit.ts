import type { TimelineAction, TimelineChangeKind, TimelineGap, TimelineItem } from '../../timeline';
import { retainGaps, TimelineActionType } from '../../timeline';
import type { SessionHandle } from './session-handle';

export type CommitFlags = {
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
  ready?: boolean;
  focusKey?: string;
  gaps?: readonly TimelineGap[];
};

export const notify = (session: SessionHandle): void => {
  for (const listener of session.listeners) {
    listener();
  }
};

export const notifyIfChanged = (session: SessionHandle): void => {
  if (session.notifiedState === session.state) {
    return;
  }
  session.notifiedState = session.state;
  notify(session);
};

export const dispatch = (
  session: SessionHandle,
  action: TimelineAction,
  shouldNotify = true,
): void => {
  session.state = session.reducer(session.state, action);
  if (shouldNotify) {
    notifyIfChanged(session);
  }
};

export const commit = (
  session: SessionHandle,
  keys: readonly string[],
  kind: TimelineChangeKind,
  flags: CommitFlags = {},
): void => {
  const items: TimelineItem[] = [];

  for (const candidate of keys) {
    const key = session.messageStore.resolve(candidate);
    const message = session.messageStore.get(key);

    if (message) {
      items.push({
        key,
        id: message.id,
        createdAt: message.createdAt,
        sequence: message.sequence,
        pending: message.id === message.localId,
      });
    }
  }

  const gaps = flags.gaps ?? retainGaps(session.state.gaps, new Set(items.map((item) => item.id)));

  dispatch(session, { type: TimelineActionType.Commit, items, kind, ...flags, gaps }, false);

  for (const key of session.localTailKeys) {
    if (!session.messageStore.get(key)) {
      session.localTailKeys.delete(key);
    }
  }
  const retained = new Set([
    ...session.state.messageKeys,
    ...session.pending.keys(),
    ...session.localTailKeys,
  ]);
  session.messageStore.retain(retained);
  notifyIfChanged(session);
};
