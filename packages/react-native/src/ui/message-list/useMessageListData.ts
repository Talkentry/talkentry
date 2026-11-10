import {
  buildTimelineRows,
  insertUnreadSeparatorRow,
  type Message,
  type TimelineChange,
  TimelineChangeKind,
  TimelineRowType,
  TimelineStatus,
} from '@talkentry/core';
import { useMemo } from 'react';

import { useOptionalTalkentrySession, useOptionalTalkentryTimeline } from '../../react/context';
import { chatStrings } from '../shared/strings';
import type { MessageListProps } from './types';

const noChange: TimelineChange = { sequence: 0, kind: TimelineChangeKind.Initial };

/** Adapts controlled/session input without creating a second message store. */
export const useMessageListData = (props: MessageListProps) => {
  const session = useOptionalTalkentrySession();
  const timeline = useOptionalTalkentryTimeline();
  const connected = session !== null && props.messages === undefined;
  const currentUserId = props.currentUserId ?? session?.options.currentUserId;
  const messages = props.messages;
  const controlled = useMemo(() => {
    const keys: string[] = [];
    const byKey = new Map<string, Message>();
    const byId = new Map<string, Message>();

    for (const message of messages ?? []) {
      const key = message.localId ?? message.id;
      keys.push(key);
      byKey.set(key, message);
      byId.set(message.id, message);
      if (message.localId) {
        byId.set(message.localId, message);
      }
    }

    return { keys, byKey, byId };
  }, [messages]);

  // Key identity participates in navigation's React snapshot acknowledgement.
  const keys = connected ? timeline!.messageKeys : controlled.keys;
  const resolveMessage = (key: string) =>
    connected ? session!.messageStore.get(key) : controlled.byId.get(key);
  const rows = useMemo(() => {
    const resolve = (key: string) =>
      connected ? session!.messageStore.get(key) : controlled.byKey.get(key);
    const base = buildTimelineRows(
      connected ? timeline!.messageKeys : controlled.keys,
      connected ? timeline!.gaps : [],
      (key) => resolve(key)?.id,
      (key) => resolve(key)?.createdAt,
    );
    const withUnread = props.renderUnread
      ? insertUnreadSeparatorRow(base, props.firstUnreadId, (key) => resolve(key)?.id)
      : base;

    return props.showGapMarkers === false
      ? withUnread.filter((row) => row.type !== TimelineRowType.Gap)
      : withUnread;
  }, [
    connected,
    session,
    timeline,
    controlled,
    props.renderUnread,
    props.firstUnreadId,
    props.showGapMarkers,
  ]);
  const rowKeys = useMemo(() => rows.map((row) => row.key), [rows]);
  const rowIndexes = useMemo(() => new Map(rowKeys.map((key, index) => [key, index])), [rowKeys]);

  if (currentUserId === undefined || (!connected && !messages)) {
    throw new Error('MessageList requires messages/currentUserId or TalkentryProvider');
  }

  const moreAfter = props.hasMoreAfter ?? (connected && timeline!.hasMoreAfter);
  const moreBefore = props.hasMoreBefore ?? (connected && timeline!.hasMoreBefore);
  const loading =
    props.loading ??
    (connected &&
      timeline!.status !== TimelineStatus.Ready &&
      timeline!.status !== TimelineStatus.Idle);
  const locale = props.locale ?? 'en';
  const resolveKey = (id: string) => {
    const message = resolveMessage(id);
    const key = message?.localId ?? message?.id;

    return key && keys.includes(key) ? key : undefined;
  };

  return {
    session,
    timeline,
    connected,
    currentUserId,
    messages,
    keys,
    rows,
    rowKeys,
    rowIndexes,
    moreAfter,
    moreBefore,
    loading,
    locale,
    strings: chatStrings[locale],
    error: connected ? timeline!.error : null,
    loadOlder: props.onLoadOlder ?? (connected ? session!.loadOlder : undefined),
    change: props.change ?? (connected ? timeline!.change : noChange),
    resolveMessage,
    resolveKey,
    resolveSenderId: (key: string) => resolveMessage(key)?.senderId,
    resolveIsSystem: (key: string) => !!resolveMessage(key)?.system,
    resolveReplyParent: (key: string) => {
      const replyId = resolveMessage(key)?.replyToId;

      return replyId ? resolveMessage(replyId) : undefined;
    },
  };
};
