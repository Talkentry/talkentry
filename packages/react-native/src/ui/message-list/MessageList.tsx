import { FlashList } from '@shopify/flash-list';
import { NavigationStatus, ScrollIntentType, TimelineStatus, ViewportMode } from '@talkentry/core';
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native';

import { useScrollToLatestStore } from '../../react/context/ScrollToLatestProvider';
import { useTalkentryTheme } from '../../theme';
import type { MessageFocusHandler } from '../shared/slots';
import { createListRowRenderer } from './createListRowRenderer';
import { isBlankListTap, movedPastTap } from './listTap';
import { MaskedJumpOverlay } from './MaskedJumpOverlay';
import { createListStyles } from './MessageList.styles';
import { readListLayout } from './readListLayout';
import { ScrollToLatestButton } from './ScrollToLatestButton';
import type { MessageListProps } from './types';
import { useListNavigation } from './useListNavigation';
import { useMessageListData } from './useMessageListData';
import { useMessageVisibility } from './useMessageVisibility';

export type { MessageListProps } from './types';

/** Start older pagination this many viewports before the list top to avoid tip stall. */
const OLDER_PREFETCH_VIEWPORTS = 1.2;
const CANDIDATE_VIEWABILITY = { minimumViewTime: 0, itemVisiblePercentThreshold: 1 };

export const MessageList = (props: MessageListProps) => {
  const theme = useTalkentryTheme();
  const styles = useMemo(() => createListStyles(theme), [theme]);
  const data = useMessageListData(props);
  const {
    session,
    timeline,
    connected,
    currentUserId,
    messages,
    keys,
    rowKeys,
    rowIndexes,
    moreAfter,
    moreBefore,
    loading,
    error,
    locale,
    strings,
    loadOlder,
    change,
    resolveMessage,
    resolveKey,
  } = data;
  const olderRequest = useRef({ busy: false, cursor: undefined as string | undefined });
  const [olderFailed, setOlderFailed] = useState(false);
  const requestOlder = () => {
    const state = navigation.viewport.getState();
    if (
      !moreBefore ||
      loading ||
      !loadOlder ||
      olderRequest.current.busy ||
      navigation.mask.getState() !== null ||
      state.pendingIntent.type !== ScrollIntentType.None
    ) {
      return;
    }
    const cursor = keys[0];
    if (cursor === olderRequest.current.cursor) {
      return;
    }
    olderRequest.current = { busy: true, cursor };
    setOlderFailed(false);
    // Call on a microtask so synchronous host exceptions follow the same error path.
    Promise.resolve()
      .then(loadOlder)
      .then((ok) => {
        if (ok === false) {
          setOlderFailed(true);
        }
      })
      .catch(() => setOlderFailed(true))
      .finally(() => {
        olderRequest.current.busy = false;
      });
  };
  const navigation = useListNavigation({
    scopeKey: JSON.stringify([
      connected ? session!.id : (props.scopeKey ?? messages?.[0]?.chatId ?? 'controlled'),
      currentUserId,
      connected ? session!.getThreadId() : null,
    ]),
    isActive: props.isActive,
    subscribeLocalSendAccepted: connected
      ? session!.subscribeLocalSendAccepted
      : props.subscribeLocalSendAccepted,
    threadId: connected ? session!.getThreadId() : undefined,
    keys,
    rowKeys,
    change,
    hasMoreAfter: !!moreAfter,
    navigationPending:
      connected &&
      (timeline!.status === TimelineStatus.Refreshing ||
        timeline!.status === TimelineStatus.LoadingAround),
    cancelNavigation: connected ? session!.cancelNavigation : undefined,
    loadLatest: connected ? () => session!.loadLatest() : props.onGoToLatest,
    maskedJumps: props.maskedJumps,
    readingTopInset: props.viewportTopInset,
    readingBottomInset: props.contentBottomInset,
    resolveKey,
    loadAround:
      connected && session!.options.adapter.capabilities.loadAround
        ? (id) => session!.loadAround(id)
        : props.onGoToMessage,
  });
  const { ref, geometry, viewport } = navigation;
  const target = navigation.targetReached;
  const focusSnapshot = useRef({ keys, token: target?.token });
  focusSnapshot.current = { keys, token: target?.token };
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const focusedToken = useRef<number | null>(null);
  useEffect(() => {
    if (!target) {
      setHighlighted(null);

      return;
    }
    setHighlighted(target.key);
    const timer = setTimeout(() => setHighlighted(null), 1400);

    return () => clearTimeout(timer);
  }, [target]);
  const focusTarget: MessageFocusHandler = (node) => {
    if (!node || !target || focusedToken.current === target.token) {
      return;
    }
    focusedToken.current = target.token;
    AccessibilityInfo.isScreenReaderEnabled?.()
      .then((enabled) => {
        const state = viewport.getState();
        if (
          !enabled ||
          focusSnapshot.current.token !== target.token ||
          !focusSnapshot.current.keys.includes(target.key) ||
          !state.active ||
          state.interacting ||
          state.manualOverride ||
          state.navigation.status !== NavigationStatus.Settled ||
          state.navigation.id !== target.token ||
          navigation.mask.getState()
        ) {
          return;
        }
        const handle = findNodeHandle(node);
        if (handle != null) {
          AccessibilityInfo.setAccessibilityFocus(handle);
        }
      })
      .catch(() => undefined);
  };
  const onQuotePress = (id: string) => {
    navigation.jumpToMessage(id).catch(() => undefined);
  };
  const navigationObserver = useRef(props.onNavigationChange);
  navigationObserver.current = props.onNavigationChange;
  useEffect(() => {
    navigationObserver.current?.(viewport.state.navigation);
  }, [viewport.state.navigation]);
  const contentBottomInset = props.contentBottomInset ?? 0;
  const viewportTopInset = props.viewportTopInset ?? 0;
  const visibility = useMessageVisibility({
    scope: `${connected ? session!.id : messages?.[0]?.chatId}:${currentUserId}:${connected ? session!.getThreadId() : ''}`,
    keys,
    change,
    currentUserId,
    firstUnreadId: props.firstUnreadId,
    session: connected ? session! : undefined,
    isActive: props.isActive !== false && props.readEnabled !== false && !navigation.mask.state,
    onMessagesRead: props.onMessagesRead,
    resolve: resolveMessage,
    topInset: viewportTopInset,
    bottomInset: contentBottomInset,
    isReadable: (key) => {
      if (navigation.mask.getState()) {
        return false;
      }
      const index = rowIndexes.get(key) ?? -1;
      const layout = readListLayout(ref.current, index);
      if (!layout || layout.height <= 0) {
        return false;
      }
      const { offset, height } = geometry.current;
      const top = offset + Math.max(0, viewportTopInset);
      const bottom = offset + height - Math.max(0, contentBottomInset);
      const rowTop = layout.y + (ref.current?.getFirstItemOffset() ?? 0);
      const overlap = Math.max(0, Math.min(bottom, rowTop + layout.height) - Math.max(top, rowTop));

      return bottom > top && overlap >= Math.min(layout.height, bottom - top) * 0.5;
    },
  });
  const refreshVisibility = useRef(visibility.onGeometryChanged);
  refreshVisibility.current = visibility.onGeometryChanged;
  useEffect(() => {
    refreshVisibility.current();
  }, [navigation.mask.state]);
  const listTouchStartedAt = useRef(0);
  const listTouchOffset = useRef(0);
  const listTouchPoint = useRef({ x: 0, y: 0 });
  const listFingerDown = useRef(false);
  const listDragged = useRef(false);
  const listTapConsumed = useRef(false);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    if (listFingerDown.current && Math.abs(contentOffset.y - listTouchOffset.current) > 1) {
      listDragged.current = true;
    }
    navigation.onScroll(event);
    visibility.onGeometryChanged();
    if (
      layoutMeasurement.height > 0 &&
      contentOffset.y < layoutMeasurement.height * OLDER_PREFETCH_VIEWPORTS
    ) {
      requestOlder();
    }
  };

  const defaultHeader = (): ReactNode => {
    if (moreBefore) {
      return (
        <View style={styles.loadingHeader}>
          {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
        </View>
      );
    }

    return loading ? <ActivityIndicator color={theme.colors.accent} /> : null;
  };

  const headerParams = {
    hasMoreBefore: !!moreBefore,
    loading: !!loading,
    onLoadOlder: requestOlder,
    locale,
  };
  const listHeader = props.renderListHeader
    ? props.renderListHeader(headerParams)
    : defaultHeader();

  const defaultEmpty = (): ReactNode =>
    !loading ? (
      <Text style={styles.control}>{error ? strings.historyError : strings.empty}</Text>
    ) : null;

  const empty = props.renderEmpty?.({ error, locale }) ?? defaultEmpty();

  const renderRow = createListRowRenderer({
    props,
    data,
    styles,
    navigation,
    highlighted,
    focusTarget,
    onQuotePress,
    consumeListTap: () => {
      listTapConsumed.current = true;
    },
  });

  const unreadBadge = props.unreadCount ?? visibility.unreadCount;
  const goToLatest = navigation.jumpToLatest;

  const scrollToLatestStore = useScrollToLatestStore();
  const scrollVisible = viewport.state.buttonVisible || !!moreAfter;
  const jumpRef = useRef(goToLatest);
  jumpRef.current = goToLatest;
  scrollToLatestStore?.setJump(() => jumpRef.current());

  useLayoutEffect(() => {
    scrollToLatestStore?.publish({
      visible: scrollVisible,
      unreadCount: unreadBadge,
      jumpToLatest: () => jumpRef.current(),
    });
  }, [scrollToLatestStore, scrollVisible, unreadBadge]);

  useLayoutEffect(() => {
    return () => {
      scrollToLatestStore?.clear();
    };
  }, [scrollToLatestStore]);

  return (
    <View style={styles.container}>
      <FlashList
        ref={ref}
        data={rowKeys as string[]}
        keyExtractor={(key) => key}
        renderItem={renderRow}
        extraData={`${navigation.mask.state?.id}:${navigation.mask.state?.phase}:${highlighted}:${target?.token}`}
        accessibilityElementsHidden={!!navigation.mask.state}
        importantForAccessibility={navigation.mask.state ? 'no-hide-descendants' : 'auto'}
        onLayout={(event) => {
          navigation.onLayout(event.nativeEvent.layout.height);
          visibility.onGeometryChanged();
        }}
        onContentSizeChange={(_width, height) => {
          navigation.onContentSizeChange(height);
          visibility.onGeometryChanged();
        }}
        onCommitLayoutEffect={() => {
          navigation.onCommitLayoutEffect();
          visibility.onGeometryChanged();
        }}
        onViewableItemsChanged={({ viewableItems }) => {
          const visibleKeys = viewableItems
            .filter((item) => item.isViewable)
            .map((item) => item.item);
          navigation.onViewableKeys(visibleKeys);
          visibility.onViewableKeys(visibleKeys);
        }}
        viewabilityConfig={CANDIDATE_VIEWABILITY}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          listDragged.current = true;
          navigation.interrupt();
        }}
        onScrollEndDrag={navigation.onScrollEndDrag}
        onMomentumScrollEnd={(event) => {
          navigation.onMomentumScrollEnd(event);
          visibility.onGeometryChanged();
        }}
        onTouchStart={(event) => {
          const masked = !!navigation.mask.getState();
          if (masked) {
            navigation.interrupt();
          }
          listTouchStartedAt.current = Date.now();
          listTouchOffset.current = geometry.current.offset;
          listTouchPoint.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          };
          listFingerDown.current = true;
          listDragged.current = masked;
          listTapConsumed.current = false;
        }}
        onTouchMove={(event) => {
          if (
            movedPastTap(
              listTouchPoint.current.x,
              listTouchPoint.current.y,
              event.nativeEvent.pageX,
              event.nativeEvent.pageY,
            )
          ) {
            listDragged.current = true;
            navigation.interrupt();
          }
        }}
        onTouchEnd={(event) => {
          listFingerDown.current = false;
          if (listDragged.current) {
            navigation.onScrollEndDrag();
          }
          if (!props.onListTap) {
            return;
          }
          if (
            !isBlankListTap({
              dragged: listDragged.current,
              startedAt: listTouchStartedAt.current,
              endedAt: Date.now(),
              startOffset: listTouchOffset.current,
              endOffset: geometry.current.offset,
              fromX: listTouchPoint.current.x,
              fromY: listTouchPoint.current.y,
              toX: event.nativeEvent.pageX,
              toY: event.nativeEvent.pageY,
              consumed: listTapConsumed.current,
            })
          ) {
            return;
          }
          props.onListTap();
        }}
        onTouchCancel={() => {
          listFingerDown.current = false;
          navigation.onScrollEndDrag();
        }}
        onStartReached={requestOlder}
        onStartReachedThreshold={OLDER_PREFETCH_VIEWPORTS}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets={false}
        maintainVisibleContentPosition={{
          startRenderingFromBottom: true,
          disabled:
            viewport.mode === ViewportMode.FollowingLatest ||
            viewport.state.pendingIntent.type !== ScrollIntentType.None,
        }}
        ListHeaderComponent={listHeader as ReactElement | null}
        ListFooterComponent={
          contentBottomInset > 0 ? <View style={{ height: contentBottomInset }} /> : null
        }
        ListEmptyComponent={empty as ReactElement | null}
      />
      {navigation.mask.state ? (
        <MaskedJumpOverlay
          key={navigation.mask.state.id}
          state={navigation.mask.state}
          reducedMotion={navigation.reducedMotion}
          label={strings.movingToMessage}
          onCovered={navigation.mask.covered}
          onFinished={navigation.mask.finished}
        />
      ) : null}
      {error && keys.length > 0 ? (
        <Text accessibilityRole="alert" style={styles.control}>
          {strings.historyError}
        </Text>
      ) : null}
      {olderFailed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.retryHistory}
          onPress={() => {
            olderRequest.current.cursor = undefined;
            requestOlder();
          }}
        >
          <Text style={styles.control}>{strings.retryHistory}</Text>
        </Pressable>
      ) : null}
      {viewport.state.navigation.status === NavigationStatus.Failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.retryNavigation}
          onPress={() => {
            navigation.retryNavigation().catch(() => undefined);
          }}
        >
          <Text accessibilityRole="alert" style={styles.control}>
            {strings.navigationError}
          </Text>
        </Pressable>
      ) : null}
      {props.showScrollToLatest !== false && scrollVisible ? (
        <ScrollToLatestButton
          label={strings.latestLabel}
          count={unreadBadge}
          countNoun={strings.unreadCount}
          bottomOffset={contentBottomInset}
          onPress={() => {
            goToLatest().catch(() => undefined);
          }}
        />
      ) : null}
    </View>
  );
};
