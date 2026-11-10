import {
  buildTimelineRows,
  NavigationFailure,
  ScrollIntentType,
  TimelineRowType,
  TimelineStatus,
} from '@talkentry/core';
import {
  type CSSProperties,
  type UIEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTalkentrySession, useTalkentryTimeline } from '../../react/context';
import { useMessages, useViewport } from '../../react/hooks';
import { useLocalSendNavigation } from '../../react/hooks/useLocalSendNavigation';
import { useTalkentryTheme } from '../../theme';
import { isGroupedWithNext, isGroupedWithPrevious } from '../message-bubble/grouping';
import { chatStrings } from '../shared/strings';
import { formatDayLabel } from './dayLabel';
import { DaySeparator } from './DaySeparator';
import { GapMarker } from './GapMarker';
import { MessageRow } from './MessageRow';
import { ScrollToLatestButton } from './ScrollToLatestButton';
import type { MessageListProps } from './types';

export type { MessageListProps } from './types';

const isDomScroller = (el: HTMLDivElement | null): el is HTMLDivElement =>
  Boolean(el && typeof el.scrollHeight === 'number' && typeof el.scrollTo === 'function');

export const MessageList = ({
  locale = 'en',
  users,
  showScrollToLatest = true,
  showGapMarkers = true,
  isActive = true,
  onContextMenu,
  onReact,
  onReply,
  renderMessage,
  renderMessageBody,
  renderGap,
  renderDay,
  renderEmpty,
  renderListHeader,
}: MessageListProps) => {
  const theme = useTalkentryTheme();
  const session = useTalkentrySession();
  const timeline = useTalkentryTimeline();
  const {
    messageKeys,
    gaps,
    status,
    error,
    hasMoreBefore,
    hasMoreAfter,
    loadOlder,
    refresh,
    cancelNavigation,
  } = useMessages();
  const strings = chatStrings[locale];
  const scroller = useRef<HTMLDivElement>(null);
  const [latestInset, setLatestInset] = useState(28);
  const programmatic = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rows = useMemo(
    () =>
      buildTimelineRows(
        messageKeys,
        gaps,
        (key) => session.messageStore.get(key)?.id,
        (key) => session.messageStore.get(key)?.createdAt,
      ),
    [session, messageKeys, gaps],
  );
  const viewport = useViewport({
    change: timeline.change,
    hasMoreAfter,
    navigationPending:
      status === TimelineStatus.LoadingAround ||
      status === TimelineStatus.LoadingNewer ||
      status === TimelineStatus.Refreshing,
    scopeKey: String(session.id),
  });
  const latest = useRef({
    viewport,
    hasMoreAfter,
    refresh,
    loadOlder,
    hasMoreBefore,
    cancelNavigation,
    change: timeline.change,
  });

  latest.current = {
    viewport,
    hasMoreAfter,
    refresh,
    loadOlder,
    hasMoreBefore,
    cancelNavigation,
    change: timeline.change,
  };

  const jumpToLatest = (localSend = false, forceLoad = false): Promise<void> => {
    const current = latest.current;
    const needsData = forceLoad || current.hasMoreAfter;
    const intent = localSend
      ? current.viewport.onLocalSendAccepted(needsData)
      : current.viewport.prepareLatest(needsData);

    if (intent.type === ScrollIntentType.None) {
      return Promise.resolve();
    }

    return (async () => {
      if (needsData) {
        const loaded = await current.refresh();

        if (!loaded) {
          current.viewport.failIntent(intent.id, NavigationFailure.LoadFailed);

          return;
        }
      }

      current.viewport.latestReady(intent.id);
    })();
  };

  useLocalSendNavigation(
    String(session.id),
    session.getThreadId(),
    session.subscribeLocalSendAccepted,
    (requiresLatest) => jumpToLatest(true, requiresLatest),
  );

  useEffect(() => {
    latest.current.viewport.setActive(isActive);
  }, [isActive]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) {
      return;
    }

    const update = () => {
      const bar = Math.max(0, el.offsetWidth - el.clientWidth);
      setLatestInset(12 + Math.max(bar, 16));
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const current = latest.current.viewport;
    const intent = current.getState().pendingIntent;

    if (intent.type === ScrollIntentType.None) {
      return;
    }

    current.executionStarted(intent.id);

    const el = scroller.current;

    if (!isDomScroller(el)) {
      current.consumeIntent(intent.id);

      return;
    }

    programmatic.current = true;

    if (intent.type === ScrollIntentType.ScrollToEnd) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: intent.animated ? 'smooth' : 'auto',
      });
    } else if (intent.type === ScrollIntentType.ScrollToMessage) {
      const target = el.querySelector(`[data-message-key="${intent.key}"]`);

      if (target && 'scrollIntoView' in target) {
        target.scrollIntoView({
          block: 'center',
          behavior: intent.animated ? 'smooth' : 'auto',
        });
      }
    }

    current.consumeIntent(intent.id);
    current.onGeometryChanged(el.scrollHeight - el.clientHeight - el.scrollTop);
    current.onLayoutChanged(
      el.scrollHeight,
      el.clientHeight,
      el.scrollTop,
      latest.current.change.sequence,
    );
  }, [viewport.state.pendingIntent, messageKeys, timeline.change.sequence]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;

    if (typeof el.scrollHeight !== 'number') {
      return;
    }

    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;

    viewport.onGeometryChanged(distance);
    viewport.onLayoutChanged(
      el.scrollHeight,
      el.clientHeight,
      el.scrollTop,
      timeline.change.sequence,
    );

    if (programmatic.current) {
      programmatic.current = false;

      return;
    }

    viewport.onUserDrag();
    latest.current.cancelNavigation?.();

    if (idleTimer.current) {
      clearTimeout(idleTimer.current);
    }

    idleTimer.current = setTimeout(() => {
      viewport.onInteractionEnded();
    }, 120);

    if (el.scrollTop < el.clientHeight * 1.2 && hasMoreBefore) {
      void loadOlder();
    }
  };

  let body;

  switch (status) {
    case TimelineStatus.Loading:
      body = messageKeys.length ? null : (
        <div style={{ ...styles.status, color: theme.colors.textMuted }}>Loading…</div>
      );
      break;
    default:
      body = null;
  }

  if (!body && !messageKeys.length) {
    if (renderEmpty) {
      body = renderEmpty({ error, locale });
    } else {
      body = (
        <div style={{ ...styles.status, color: theme.colors.textMuted }}>
          {error ? strings.historyError : strings.empty}
          {error ? <div>{error.message}</div> : null}
        </div>
      );
    }
  }

  const header = renderListHeader
    ? renderListHeader({
        hasMoreBefore,
        loading: status === TimelineStatus.LoadingOlder,
        onLoadOlder: () => {
          loadOlder().catch(() => undefined);
        },
        locale,
      })
    : null;

  const getSenderId = (key: string) => session.messageStore.get(key)?.senderId;
  const getIsSystem = (key: string) => session.messageStore.get(key)?.system === true;

  return (
    <div style={{ ...styles.wrap, background: theme.colors.canvas }}>
      <div
        ref={scroller}
        onScroll={onScroll}
        style={styles.scroller}
        data-testid="talkentry-message-list"
      >
        {error ? (
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            style={{ ...styles.retry, color: theme.colors.accent }}
          >
            {strings.retryHistory}
          </button>
        ) : null}
        {header}
        {body}
        {rows.map((row, index) => {
          switch (row.type) {
            case TimelineRowType.Message:
              return (
                <MessageRow
                  key={row.key}
                  messageKey={row.key}
                  index={index}
                  currentUserId={session.options.currentUserId}
                  locale={locale}
                  users={users}
                  groupedWithPrevious={isGroupedWithPrevious(rows, index, getSenderId, getIsSystem)}
                  groupedWithNext={isGroupedWithNext(rows, index, getSenderId, getIsSystem)}
                  onContextMenu={onContextMenu}
                  onReact={onReact}
                  onReply={onReply}
                  renderMessage={renderMessage}
                  renderMessageBody={renderMessageBody}
                />
              );
            case TimelineRowType.Gap: {
              if (renderGap) {
                return <div key={row.key}>{renderGap({ gap: row.gap, locale })}</div>;
              }

              if (!showGapMarkers) {
                return null;
              }

              return <GapMarker key={row.key} label={strings.gap} />;
            }
            case TimelineRowType.Day: {
              const label = formatDayLabel(row.createdAt, locale);

              if (renderDay) {
                return (
                  <div key={row.key}>
                    {renderDay({
                      dayKey: row.dayKey,
                      createdAt: row.createdAt,
                      label,
                      locale,
                    })}
                  </div>
                );
              }

              return <DaySeparator key={row.key} label={label} />;
            }
            default:
              return null;
          }
        })}
      </div>
      {showScrollToLatest && viewport.state.buttonVisible ? (
        <ScrollToLatestButton
          label={strings.latestLabel}
          inset={latestInset}
          onClick={() => {
            jumpToLatest().catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  scroller: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    padding: '8px 0 12px',
  },
  status: { textAlign: 'center', padding: 24 },
  retry: {
    display: 'block',
    margin: '8px auto',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};
