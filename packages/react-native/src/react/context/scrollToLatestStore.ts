export type ScrollToLatestSnapshot = {
  /** True when the reader is away from the latest edge. */
  readonly visible: boolean;
  /** Resolved unread total. `0` means the badge is hidden. */
  readonly unreadCount: number;
  /**
   * Load the latest window when it is detached, then scroll to the end.
   * The function stays current across renders.
   */
  readonly jumpToLatest: () => Promise<void>;
};

export type ScrollToLatestPublication = {
  readonly visible: boolean;
  readonly unreadCount: number;
  readonly jumpToLatest: () => Promise<void>;
};

type Listener = () => void;

export type ScrollToLatestStore = {
  readonly subscribe: (listener: Listener) => () => void;
  readonly getSnapshot: () => ScrollToLatestSnapshot;
  /** Keep the jump handler fresh without notifying subscribers. */
  readonly setJump: (jumpToLatest: () => Promise<void>) => void;
  readonly publish: (next: ScrollToLatestPublication) => void;
  readonly clear: () => void;
};

const noopJump = async (): Promise<void> => undefined;

/** Stable snapshot used before a list publishes and after it unmounts. */
export const hiddenScrollToLatest: ScrollToLatestSnapshot = {
  visible: false,
  unreadCount: 0,
  jumpToLatest: noopJump,
};

const normalizeUnreadCount = (count: number): number => {
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  return Math.floor(count);
};

export const createScrollToLatestStore = (): ScrollToLatestStore => {
  let snapshot: ScrollToLatestSnapshot = hiddenScrollToLatest;
  let jump: () => Promise<void> = noopJump;
  const listeners = new Set<Listener>();

  const stableJump = (): Promise<void> => jump();

  const emit = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setJump: (jumpToLatest) => {
      jump = jumpToLatest;
    },
    publish: (next) => {
      jump = next.jumpToLatest;
      const unreadCount = normalizeUnreadCount(next.unreadCount);
      const unchanged =
        snapshot !== hiddenScrollToLatest &&
        snapshot.visible === next.visible &&
        snapshot.unreadCount === unreadCount;

      if (unchanged) {
        return;
      }

      snapshot = {
        visible: next.visible,
        unreadCount,
        jumpToLatest: stableJump,
      };
      emit();
    },
    clear: () => {
      jump = noopJump;

      if (snapshot === hiddenScrollToLatest) {
        return;
      }

      snapshot = hiddenScrollToLatest;
      emit();
    },
  };
};
