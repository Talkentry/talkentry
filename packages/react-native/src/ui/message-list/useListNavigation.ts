import type { FlashListRef } from '@shopify/flash-list';
import {
  END_POSITION_TOLERANCE_PX,
  type MaskedJumpOptions,
  NavigationFailure,
  NavigationStatus,
  ScrollIntentType,
  shouldMaskJump,
  type SubscribeLocalSendAccepted,
  type TimelineChange,
} from '@talkentry/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { useViewport } from '../../react/hooks/useViewport';
import { loadLatestTask } from './loadLatestTask';
import { useReducedMotion } from './MaskedJumpOverlay';
import { getNavigationTargetOffset, shouldCoverNavigation } from './navigationGeometry';
import { readListLayout } from './readListLayout';
import { createScrollCommand } from './scrollCommand';
import { useLocalSendNavigation } from './useLocalSendNavigation';
import { useMaskedTransition } from './useMaskedTransition';

/** Recovery for missing native completion/progress events, not an animation duration. */
const SCROLL_IDLE_MS = 250;
const POSITION_DEADLINE_MS = 5000;

type Params = {
  readonly keys: readonly string[];
  readonly rowKeys: readonly string[];
  readonly change: TimelineChange;
  readonly hasMoreAfter: boolean;
  readonly navigationPending: boolean;
  readonly cancelNavigation?: () => void;
  readonly loadLatest?: (signal: AbortSignal) => Promise<boolean>;
  readonly scopeKey?: string;
  readonly isActive?: boolean;
  readonly subscribeLocalSendAccepted?: SubscribeLocalSendAccepted;
  readonly threadId?: string | null;
  readonly loadAround?: (id: string, signal: AbortSignal) => Promise<boolean>;
  readonly resolveKey?: (id: string) => string | undefined;
  readonly maskedJumps?: MaskedJumpOptions;
  readonly readingTopInset?: number;
  readonly readingBottomInset?: number;
};

/** Only this renderer bridge issues scroll commands. FlashList's asynchronous
 * index/end helpers are deliberately avoided: their retries are not cancellable. */
export const useListNavigation = (params: Params) => {
  const viewport = useViewport(params);
  const ref = useRef<FlashListRef<string>>(null);
  const geometry = useRef({ height: 0, content: 0, offset: 0 });
  const measured = useRef({ content: false, height: false });
  const committedKeys = useRef<readonly string[] | null>(null);
  const measuredKeys = useRef<readonly string[] | null>(null);
  const cancelLayoutFrame = useRef<(() => void) | undefined>(undefined);
  const visible = useRef(new Set<string>());
  const executorRef = useRef<ReturnType<typeof createScrollCommand> | null>(null);
  if (!executorRef.current) {
    executorRef.current = createScrollCommand();
  }
  const executor = executorRef.current;
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const jumpTask = useRef<Promise<void> | null>(null);
  const jumpController = useRef<AbortController | null>(null);
  const interactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dragging = useRef(false);
  const alive = useRef(true);
  const latest = useRef({ params, viewport });
  const executionScope = useRef(params.scopeKey);
  const progress = useRef({ id: -1, at: 0 });
  const targetReached = useRef<{ key: string; token: number } | null>(null);
  const readyWindow = useRef<{ id: number; keys: readonly string[]; sequence: number } | null>(
    null,
  );
  const [dataVersion, setDataVersion] = useState(0);
  const awaitWindowCommit = (id: number, keys: readonly string[], sequence: number) => {
    readyWindow.current = { id, keys, sequence };
    setDataVersion((value) => value + 1);
  };
  latest.current = { params, viewport };
  const resume = useRef<() => void>(() => undefined);
  const mask = useMaskedTransition(() => resume.current());
  const reducedMotion = useReducedMotion();
  const maskChoice = useRef<number | null>(null);
  const realDrawn = useRef<number | null>(null);
  const preparingCommit = useRef<number | null>(null);
  const cancelReveal = useRef<(() => void) | undefined>(undefined);
  const scheduleFrame = (fn: () => void) => {
    if (typeof requestAnimationFrame === 'function') {
      const handle = requestAnimationFrame(fn);

      return () => cancelAnimationFrame(handle);
    }
    const handle = setTimeout(fn, 0);

    return () => clearTimeout(handle);
  };
  const revealPrepared = (id: number) => {
    if (mask.getState()?.id !== id || mask.getState()?.phase !== 'preparing') {
      return;
    }
    if (realDrawn.current !== id) {
      return;
    }
    mask.realCommit(mask.getState());
    applyRef.current();
  };
  const previousWindow = useRef(params.keys);
  const replacedWindow = useRef<readonly string[]>(params.keys);
  if (previousWindow.current !== params.keys) {
    replacedWindow.current = previousWindow.current;
    previousWindow.current = params.keys;
  }

  const targetOffset = () => {
    const input = latest.current.params;
    return getNavigationTargetOffset({
      intent: latest.current.viewport.getState().pendingIntent,
      geometry: geometry.current,
      keys: input.keys,
      rowKeys: input.rowKeys,
      readLayout: (index) => readListLayout(ref.current, index),
      firstItemOffset: () => ref.current?.getFirstItemOffset() ?? 0,
      readingTopInset: input.readingTopInset,
      readingBottomInset: input.readingBottomInset,
    });
  };

  const acknowledge = () => {
    const { viewport: current, params: input } = latest.current;
    const intent = current.getState().pendingIntent;
    if (
      intent.type === ScrollIntentType.None ||
      executor.applied?.id !== intent.id ||
      executor.applied.keys !== input.keys ||
      committedKeys.current !== input.keys ||
      measuredKeys.current !== input.keys ||
      current.getState().lastChange !== input.change.sequence
    ) {
      return;
    }
    const target = targetOffset();
    if (
      target === undefined ||
      Math.abs(geometry.current.offset - target) > END_POSITION_TOLERANCE_PX
    ) {
      return;
    }
    const key = intent.type === ScrollIntentType.ScrollToEnd ? input.keys.at(-1) : intent.key;
    const shortContent = geometry.current.content <= geometry.current.height;
    if (shortContent || (key && visible.current.has(key))) {
      if (mask.reached(intent.id)) {
        clearTimeout(settleTimer.current);

        return;
      }
      clearTimeout(settleTimer.current);
      executor.cancel();
      if (intent.type === ScrollIntentType.ScrollToMessage) {
        targetReached.current = { key: intent.key, token: intent.id };
      }
      current.consumeIntent(intent.id);
    }
  };

  const armSettleCheck = () => {
    clearTimeout(settleTimer.current);
    const { interruption, pendingIntent } = latest.current.viewport.getState();
    if (!executor.applied || pendingIntent.type === ScrollIntentType.None) {
      return;
    }
    settleTimer.current = setTimeout(() => {
      const state = latest.current.viewport.getState();
      if (
        !alive.current ||
        state.interacting ||
        state.interruption !== interruption ||
        state.pendingIntent.type === ScrollIntentType.None ||
        state.pendingIntent.id !== pendingIntent.id
      ) {
        return;
      }
      executor.release();
      applyRef.current(true);
    }, SCROLL_IDLE_MS);
  };

  const apply = (retry = false) => {
    if (!alive.current) {
      return;
    }
    const { viewport: current, params: input } = latest.current;
    const state = current.getState();
    const intent = state.pendingIntent;
    if (intent.type === ScrollIntentType.None) {
      executor.cancel();
      clearTimeout(settleTimer.current);

      return;
    }
    if (
      !state.active ||
      state.interacting ||
      ((state.navigation.status === NavigationStatus.Pending ||
        state.navigation.status === NavigationStatus.Executing) &&
        state.navigation.awaitingData) ||
      (intent.type === ScrollIntentType.ScrollToEnd && input.hasMoreAfter) ||
      !ref.current ||
      committedKeys.current !== input.keys ||
      measuredKeys.current !== input.keys ||
      state.lastChange !== input.change.sequence
    ) {
      return;
    }
    const offset = targetOffset();
    if (offset === undefined) {
      if (intent.type === ScrollIntentType.ScrollToMessage && !input.rowKeys.includes(intent.key)) {
        current.failIntent(intent.id, NavigationFailure.TargetUnavailable);
      }

      return;
    }
    const cover = shouldCoverNavigation({
      intent,
      offset,
      geometry: geometry.current,
      keys: input.keys,
      visibleKeys: visible.current,
      previousKeys: replacedWindow.current,
      around: input.change.kind === 'around',
      maskedJumps: input.maskedJumps,
    });
    if (maskChoice.current !== intent.id) {
      maskChoice.current = intent.id;
      if (cover) {
        mask.ensure(intent.id);
      }
    }
    const phase = mask.getState()?.phase;
    if (phase === 'covering' || phase === 'revealing') {
      return;
    }
    const animated = intent.animated && !mask.getState() && !reducedMotion;
    const command = { id: intent.id, offset, keys: input.keys, animated };
    if (executor.request(command, geometry.current.offset, retry)) {
      current.executionStarted(intent.id);
      try {
        ref.current.scrollToOffset({ offset, animated });
      } catch {
        executor.cancel();
        current.failIntent(intent.id, NavigationFailure.ExecutionFailed);

        return;
      }
      armSettleCheck();
    }
    if (executor.exhausted) {
      executor.cancel();
      clearTimeout(settleTimer.current);
      current.failIntent(intent.id, NavigationFailure.RetryExhausted);

      return;
    }
    acknowledge();
  };
  const applyRef = useRef(apply);
  applyRef.current = apply;
  resume.current = () => applyRef.current();
  const cancelWork = () => {
    clearTimeout(interactionTimer.current);
    clearTimeout(settleTimer.current);
    executor.cancel();
    cancelLayoutFrame.current?.();
    jumpController.current?.abort();
    jumpTask.current = null;
    readyWindow.current = null;
    cancelReveal.current?.();
    cancelReveal.current = undefined;
    realDrawn.current = null;
    preparingCommit.current = null;
    mask.cancel();
  };
  const cancelWorkRef = useRef(cancelWork);
  cancelWorkRef.current = cancelWork;

  useLayoutEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
      cancelWorkRef.current();
    };
  }, []);
  useLayoutEffect(() => {
    const phase = mask.state?.phase;
    if (phase === 'covering' || phase === 'relocating' || !mask.state) {
      realDrawn.current = null;
      preparingCommit.current = null;
    }
  }, [mask.state]);
  useLayoutEffect(() => {
    if (executionScope.current === params.scopeKey) {
      return;
    }
    executionScope.current = params.scopeKey;
    targetReached.current = null;
    cancelWorkRef.current();
    dragging.current = false;
    committedKeys.current = null;
    measuredKeys.current = null;
    visible.current.clear();
  }, [params.scopeKey]);

  useLayoutEffect(() => {
    const update = (appState: string) => {
      const active = latest.current.params.isActive !== false && appState === 'active';
      latest.current.viewport.setActive(active);
      if (!active) {
        cancelWorkRef.current();
        latest.current.params.cancelNavigation?.();
      }
    };
    update(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', update);

    return () => subscription.remove();
  }, [params.isActive, params.scopeKey]);

  const intentId =
    viewport.state.pendingIntent.type === ScrollIntentType.None
      ? undefined
      : viewport.state.pendingIntent.id;
  const awaitingData =
    (viewport.state.navigation.status === NavigationStatus.Pending ||
      viewport.state.navigation.status === NavigationStatus.Executing) &&
    viewport.state.navigation.awaitingData;
  useLayoutEffect(() => {
    const ready = readyWindow.current;
    if (!ready) {
      return;
    }
    const current = latest.current.viewport;
    const intent = current.getState().pendingIntent;
    if (intent.type === ScrollIntentType.None || intent.id !== ready.id) {
      readyWindow.current = null;

      return;
    }
    const changed =
      params.keys !== ready.keys ||
      params.change.sequence > ready.sequence ||
      (intent.type === ScrollIntentType.ScrollToEnd && !params.hasMoreAfter);
    if (!changed) {
      return;
    }
    readyWindow.current = null;
    if (intent.type === ScrollIntentType.ScrollToMessage && !params.keys.includes(intent.key)) {
      current.failIntent(intent.id, NavigationFailure.TargetUnavailable);

      return;
    }
    current.latestReady(intent.id);
  }, [dataVersion, params.keys, params.change.sequence, params.hasMoreAfter]);
  useLayoutEffect(() => {
    const active = mask.getState();
    if (active && active.id !== intentId) {
      mask.cancel();
    }
  });
  useEffect(() => {
    if (intentId === undefined || (awaitingData && readyWindow.current?.id !== intentId)) {
      return;
    }
    progress.current = { id: intentId, at: Date.now() };
    let timer: ReturnType<typeof setTimeout>;
    const checkProgress = () => {
      const pending = latest.current.viewport.getState().pendingIntent;
      if (!alive.current || pending.type === ScrollIntentType.None || pending.id !== intentId) {
        return;
      }
      const remaining = POSITION_DEADLINE_MS - (Date.now() - progress.current.at);
      if (remaining > 0) {
        timer = setTimeout(checkProgress, remaining);

        return;
      }
      cancelWorkRef.current();
      latest.current.viewport.failIntent(intentId, NavigationFailure.LayoutUnavailable);
    };
    timer = setTimeout(checkProgress, POSITION_DEADLINE_MS);

    return () => clearTimeout(timer);
  }, [intentId, awaitingData, dataVersion]);
  // Restore lifecycle state before replaying execution effects in StrictMode.
  useEffect(() => {
    applyRef.current();
  }, [
    viewport.state.pendingIntent,
    awaitingData,
    params.change.sequence,
    params.readingTopInset,
    params.readingBottomInset,
  ]);

  const reportGeometry = () => {
    const { content, height, offset } = geometry.current;
    latest.current.viewport.onGeometryChanged(content - height - offset);
  };

  const interrupt = () => {
    const current = latest.current.viewport;
    dragging.current = true;
    cancelWork();
    if (current.getState().interacting) {
      return;
    }
    current.onUserDrag();
    latest.current.params.cancelNavigation?.();
    // Native touch interrupts the native animation. Do not pin a potentially
    // stale JS offset here: that would itself fight the finger.
  };

  const jumpToLatest = (localSend = false, forceLoad = false): Promise<void> => {
    const current = latest.current.viewport;
    if (
      jumpTask.current &&
      current.getState().pendingIntent.type === ScrollIntentType.ScrollToEnd
    ) {
      return jumpTask.current;
    }
    if (!current.getState().active) {
      return Promise.resolve();
    }
    const previous = current.getState().pendingIntent;
    if (previous.type === ScrollIntentType.ScrollToMessage) {
      latest.current.params.cancelNavigation?.();
    }
    const needsData = forceLoad || latest.current.params.hasMoreAfter;
    const originKeys = latest.current.params.keys;
    const originSequence = latest.current.params.change.sequence;
    const intent = localSend
      ? current.onLocalSendAccepted(needsData)
      : current.prepareLatest(needsData);
    if (intent.type === ScrollIntentType.None) {
      return Promise.resolve();
    }
    if (previous.type !== ScrollIntentType.None && previous.id === intent.id) {
      return Promise.resolve();
    }
    cancelWork();
    dragging.current = false;
    const controller = new AbortController();
    jumpController.current = controller;
    const interruption = current.getState().interruption;
    const task = (async () => {
      try {
        const loaded =
          !needsData || (await loadLatestTask(latest.current.params.loadLatest, controller));
        if (!alive.current || current.getState().interruption !== interruption) {
          return;
        }
        if (!loaded) {
          current.failIntent(intent.id, NavigationFailure.LoadFailed);

          return;
        }
        if (controller.signal.aborted) {
          return;
        }
        if (needsData) {
          awaitWindowCommit(intent.id, originKeys, originSequence);

          return;
        }
        current.latestReady(intent.id);
        applyRef.current();
      } catch {
        if (alive.current && current.getState().interruption === interruption) {
          current.failIntent(intent.id, NavigationFailure.LoadFailed);
        }
      }
    })();
    jumpTask.current = task;
    task
      .finally(() => {
        if (jumpTask.current === task) {
          jumpTask.current = null;
        }
      })
      .catch(() => undefined);

    return task;
  };
  const jumpToMessage = (messageId: string): Promise<void> => {
    const { viewport: current, params: input } = latest.current;
    if (!current.getState().active || current.getState().interacting) {
      return Promise.resolve();
    }
    const key = input.resolveKey?.(messageId);
    cancelWork();
    input.cancelNavigation?.();
    const intent = current.prepareMessage(key ?? messageId, !key);
    if (intent.type === ScrollIntentType.None) {
      return Promise.resolve();
    }
    const controller = new AbortController();
    jumpController.current = controller;
    const interruption = current.getState().interruption;
    const task = (async () => {
      try {
        if (!key) {
          if (shouldMaskJump(0, 0, 0, true, input.maskedJumps)) {
            mask.ensure(intent.id);
            maskChoice.current = intent.id;
            await mask.waitCovered(intent.id, controller.signal);
          }
          if (controller.signal.aborted) {
            return;
          }
          const loaded = await loadLatestTask(
            input.loadAround ? (signal) => input.loadAround!(messageId, signal) : undefined,
            controller,
          );
          if (
            !alive.current ||
            controller.signal.aborted ||
            current.getState().interruption !== interruption
          ) {
            return;
          }
          if (!loaded) {
            current.failIntent(intent.id, NavigationFailure.LoadFailed);

            return;
          }
          awaitWindowCommit(intent.id, input.keys, input.change.sequence);

          return;
        }
        current.latestReady(intent.id);
        applyRef.current();
      } catch {
        if (alive.current && current.getState().interruption === interruption) {
          current.failIntent(intent.id, NavigationFailure.LoadFailed);
        }
      }
    })();
    jumpTask.current = task;
    task
      .finally(() => {
        if (jumpTask.current === task) {
          jumpTask.current = null;
        }
      })
      .catch(() => undefined);

    return task;
  };
  useLocalSendNavigation(
    params.scopeKey,
    params.threadId,
    params.subscribeLocalSendAccepted,
    (requiresLatest) => jumpToLatest(true, requiresLatest),
  );

  const finishAfterIdle = () => {
    if (!latest.current.viewport.getState().interacting) {
      return;
    }
    clearTimeout(interactionTimer.current);
    interactionTimer.current = setTimeout(() => {
      if (alive.current && !dragging.current) {
        latest.current.viewport.onInteractionEnded();
      }
    }, 120);
  };

  const reportLayout = () => {
    // Unknown content is not an empty list. Partial layout must not admit
    // an artificial distance of zero and resume following from history.
    if (!measured.current.content || !measured.current.height) {
      return;
    }
    const { content, height, offset } = geometry.current;
    latest.current.viewport.onLayoutChanged(
      content,
      height,
      offset,
      latest.current.params.change.sequence,
    );
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const previousOffset = geometry.current.offset;
    // Destination growth alone is not progress. A healthy long-running burst
    // must not time out while native position samples keep advancing.
    if (Math.abs(contentOffset.y - previousOffset) > END_POSITION_TOLERANCE_PX) {
      progress.current.at = Date.now();
    }
    // Layout callbacks are authoritative. Queued native scroll events may still
    // carry the content dimensions from the preceding animation/window.
    geometry.current = {
      offset: contentOffset.y,
      content: measured.current.content ? geometry.current.content : contentSize.height,
      height: measured.current.height ? geometry.current.height : layoutMeasurement.height,
    };
    executor.observe(contentOffset.y);
    reportGeometry();
    acknowledge();
    apply();
    if (contentOffset.y !== previousOffset) {
      armSettleCheck();
    }
    if (latest.current.viewport.getState().interacting && !dragging.current) {
      finishAfterIdle();
    }
  };

  return {
    ref,
    geometry,
    viewport,
    jumpToLatest,
    jumpToMessage,
    mask,
    reducedMotion,
    targetReached: targetReached.current,
    placeholderHeight: (index: number): number | undefined => {
      if (
        mask.getState()?.phase !== 'relocating' ||
        measuredKeys.current !== latest.current.params.keys
      ) {
        return;
      }
      const layout = readListLayout(ref.current, index);
      if (layout?.isHeightMeasured && Number.isFinite(layout.height) && layout.height > 0) {
        return layout.height;
      }

      return undefined;
    },
    retryNavigation: () => {
      const navigation = latest.current.viewport.getState().navigation;
      if (navigation.status !== NavigationStatus.Failed) {
        return Promise.resolve();
      }
      if (navigation.intent.type === ScrollIntentType.ScrollToEnd) {
        return jumpToLatest();
      }

      return jumpToMessage(navigation.intent.key);
    },
    interrupt,
    onLayout: (height: number) => {
      measured.current.height = true;
      geometry.current.height = height;
      reportLayout();
      apply();
    },
    onContentSizeChange: (height: number) => {
      measured.current.content = true;
      geometry.current.content = height;
      committedKeys.current = latest.current.params.keys;
      measuredKeys.current = latest.current.params.keys;
      reportLayout();
      apply();
    },
    noteRealTarget: (key: string) => {
      const presentation = mask.getState();
      if (presentation?.phase !== 'preparing') {
        return;
      }
      const intent = latest.current.viewport.getState().pendingIntent;
      let target: string | undefined;
      if (intent.type === ScrollIntentType.ScrollToEnd) {
        target = latest.current.params.keys.at(-1);
      } else if (intent.type === ScrollIntentType.ScrollToMessage) {
        target = intent.key;
      }
      if (!target || key !== target || realDrawn.current === presentation.id) {
        return;
      }
      realDrawn.current = presentation.id;
      // A layout commit can land before FlashList draws the destination row.
      // That commit must not open the cover onto an empty tail.
      if (preparingCommit.current !== presentation.id) {
        return;
      }
      cancelReveal.current?.();
      const id = presentation.id;
      cancelReveal.current = scheduleFrame(() => revealPrepared(id));
    },
    onCommitLayoutEffect: () => {
      const presentation = mask.state;
      const keys = latest.current.params.keys;
      committedKeys.current = keys;
      cancelLayoutFrame.current?.();
      const interruption = latest.current.viewport.getState().interruption;
      const afterLayout = () => {
        if (
          !alive.current ||
          latest.current.params.keys !== keys ||
          latest.current.viewport.getState().interruption !== interruption
        ) {
          return;
        }
        // A same-height replacement may emit no content-size event. The next
        // frame admits it without using the previous window during pre-commit.
        measuredKeys.current = keys;
        if (presentation?.phase === 'preparing') {
          preparingCommit.current = presentation.id;
        }
        reportLayout();
        if (presentation?.phase === 'preparing' && realDrawn.current === presentation.id) {
          mask.realCommit(presentation);
        }
        applyRef.current();
      };
      if (typeof requestAnimationFrame === 'function') {
        const frame = requestAnimationFrame(afterLayout);
        cancelLayoutFrame.current = () => cancelAnimationFrame(frame);
      } else {
        const frame = setTimeout(afterLayout, 0);
        cancelLayoutFrame.current = () => clearTimeout(frame);
      }
    },
    onViewableKeys: (keys: readonly string[]) => {
      visible.current = new Set(keys);
      acknowledge();
    },
    onScroll,
    onScrollEndDrag: () => {
      dragging.current = false;
      finishAfterIdle();
    },
    onMomentumScrollEnd: (event?: NativeSyntheticEvent<NativeScrollEvent>) => {
      // An old animation may finish after a new finger gesture has started.
      if (dragging.current) {
        return;
      }
      const state = latest.current.viewport.getState();
      // Once manually interrupted, only actual scroll samples may update the
      // user's position. A queued programmatic completion must not restore it.
      if (event && !state.interacting && !state.manualOverride) {
        onScroll(event);
      }
      clearTimeout(interactionTimer.current);
      if (latest.current.viewport.getState().interacting) {
        latest.current.viewport.onInteractionEnded();
      }
      acknowledge();
      apply();
    },
  };
};
