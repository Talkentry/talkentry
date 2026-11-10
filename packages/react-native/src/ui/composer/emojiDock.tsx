import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BackHandler, Keyboard, type TextInputInstance } from 'react-native';

import { useLastKeyboardHeight } from '../../react/hooks';

/** Runtime TextInput has focus/blur. The published instance type omits them. */
type TextField = TextInputInstance & {
  focus: () => void;
  blur: () => void;
};

export type EmojiDock = {
  /**
   * Hold the message list and composer so the emoji sheet can take the
   * keyboard's place. Returns the height actually used.
   */
  hold: (height: number) => number;
  /** Last keyboard-controller height in px. `0` until the keyboard has opened. */
  readonly slotHeight: number;
  /** Hand the lift back to the software keyboard. */
  release: () => void;
  /**
   * Animate the dock shut and then run `onDone`.
   * The sheet stays mounted until then so the list does not jump.
   */
  lower: (onDone: () => void) => void;
  /** Keep the current lift until the keyboard animation finishes opening. */
  handoffToKeyboard: () => void;
  /** Stop a keyboard handoff so the emoji sheet can take over immediately. */
  cancelHandoff: () => void;
  /** Fires once that opening animation has finished. */
  onKeyboardSettled: (listener: () => void) => () => void;
  /** Ask the open emoji sheet to close without showing the keyboard. */
  requestDismiss: () => void;
  /** The sheet subscribes and closes itself. */
  onDismissRequest: (listener: () => void) => () => void;
};

const EmojiDockContext = createContext<EmojiDock | null>(null);

type EmojiSheetSlot = {
  /** Renders the hanging sheet as a sibling of the composer, not inside it. */
  readonly setSheet: (node: ReactNode) => void;
};

const EmojiSheetSlotContext = createContext<EmojiSheetSlot | null>(null);

export const EmojiDockProvider = ({
  value,
  children,
}: {
  readonly value: EmojiDock;
  readonly children: ReactNode;
}) => {
  const [sheet, setSheet] = useState<ReactNode>(null);
  const slot = useMemo<EmojiSheetSlot>(() => ({ setSheet }), []);

  return (
    <EmojiDockContext.Provider value={value}>
      <EmojiSheetSlotContext.Provider value={slot}>
        {children}
        {sheet}
      </EmojiSheetSlotContext.Provider>
    </EmojiDockContext.Provider>
  );
};

/** Null outside `Chat`. The sheet then stays in normal layout flow. */
export const useEmojiDock = (): EmojiDock | null => useContext(EmojiDockContext);

/** Null outside `EmojiDockProvider`. The sheet then stays in normal layout flow. */
export const useEmojiSheetSlot = (): EmojiSheetSlot | null => useContext(EmojiSheetSlotContext);

export type EmojiPanelController = {
  /** Sheet is on screen, including while the keyboard is sliding up over it. */
  readonly open: boolean;
  /** Button target. Flips on press, before the keyboard animation finishes. */
  readonly emojiMode: boolean;
  readonly keyboardHeight: number;
  readonly inputRef: RefObject<TextInputInstance | null>;
  readonly toggle: () => void;
  /** Keep the sheet up until the keyboard animation has finished opening. */
  readonly onInputFocus: () => void;
};

/**
 * Telegram-style handoff.
 * Opening mounts the sheet and holds the dock before the keyboard is dismissed.
 * Closing keeps the sheet until the keyboard animation has finished.
 */
export const useEmojiPanel = (enabled: boolean): EmojiPanelController => {
  const dock = useEmojiDock();
  const rememberedKeyboardHeight = useLastKeyboardHeight();
  const keyboardHeight =
    dock !== null && dock.slotHeight > 0 ? dock.slotHeight : rememberedKeyboardHeight;
  const inputRef = useRef<TextInputInstance>(null);
  const awaitingKeyboard = useRef(false);
  const generation = useRef(0);
  const [open, setOpen] = useState(false);
  const [emojiMode, setEmojiMode] = useState(false);
  const [pinnedHeight, setPinnedHeight] = useState<number | null>(null);
  const emojiModeRef = useRef(emojiMode);
  emojiModeRef.current = emojiMode;

  useEffect(() => {
    if (!dock) {
      return;
    }

    return dock.onKeyboardSettled(() => {
      if (!awaitingKeyboard.current) {
        return;
      }
      awaitingKeyboard.current = false;
      setPinnedHeight(null);
      setOpen(false);
    });
  }, [dock]);

  useEffect(() => {
    if (!enabled) {
      awaitingKeyboard.current = false;
      emojiModeRef.current = false;
      setEmojiMode(false);
      setPinnedHeight(null);
      setOpen(false);
      dock?.release();
    }
  }, [dock, enabled]);

  useEffect(() => {
    if (!open || awaitingKeyboard.current) {
      return;
    }
    const field = inputRef.current as TextField | null;
    field?.blur();
    Keyboard.dismiss();
  }, [open]);

  const showEmojiSheet = () => {
    generation.current += 1;
    awaitingKeyboard.current = false;
    emojiModeRef.current = true;
    setEmojiMode(true);
    dock?.cancelHandoff();
    setPinnedHeight(dock ? dock.hold(keyboardHeight) : keyboardHeight);
    setOpen(true);
    const field = inputRef.current as TextField | null;
    field?.blur();
    Keyboard.dismiss();
  };

  const showTextKeyboard = () => {
    generation.current += 1;
    awaitingKeyboard.current = true;
    emojiModeRef.current = false;
    setEmojiMode(false);
    dock?.handoffToKeyboard();
    (inputRef.current as TextField | null)?.focus();
  };

  const toggle = () => {
    if (!enabled) {
      return;
    }
    if (emojiModeRef.current) {
      showTextKeyboard();
    } else {
      showEmojiSheet();
    }
  };

  const onInputFocus = () => {
    if (!emojiModeRef.current) {
      return;
    }
    showTextKeyboard();
  };

  const openRef = useRef(open);
  openRef.current = open;
  const close = useCallback(() => {
    if (!openRef.current && !emojiModeRef.current) {
      return;
    }
    const ticket = ++generation.current;
    awaitingKeyboard.current = false;
    emojiModeRef.current = false;
    setEmojiMode(false);
    dock?.cancelHandoff();

    if (!dock) {
      setPinnedHeight(null);
      setOpen(false);

      return;
    }

    dock.lower(() => {
      if (ticket !== generation.current) {
        return;
      }
      setPinnedHeight(null);
      setOpen(false);
    });
  }, [dock]);

  useEffect(() => {
    if (!dock) {
      return undefined;
    }

    return dock.onDismissRequest(close);
  }, [close, dock]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();

      return true;
    });

    return () => subscription.remove();
  }, [close, open]);

  return {
    open,
    emojiMode,
    keyboardHeight: pinnedHeight ?? keyboardHeight,
    inputRef,
    toggle,
    onInputFocus,
  };
};
