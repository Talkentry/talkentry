import { useEffect, useRef, useState } from 'react';

import type { ComposerViewProps } from '../types';
import { useComposerTyping } from './useComposerTyping';

type Selection = { readonly start: number; readonly end: number };

/** Draft text, caret, and typing notifications have one owner. */
export const useComposerText = (
  initialText: string,
  onTextActivity: ComposerViewProps['onTextActivity'],
) => {
  const [text, setText] = useState(initialText);
  const currentText = useRef(initialText);
  const cursor = useRef<Selection>({ start: 0, end: 0 });
  const { noteTextActivity, stopTyping } = useComposerTyping(onTextActivity);

  useEffect(() => {
    currentText.current = initialText;
    setText(initialText);
  }, [initialText]);

  const changeText = (value: string) => {
    currentText.current = value;
    setText(value);
    noteTextActivity(value);
  };
  const changeSelection = (selection: Selection) => {
    cursor.current = selection;
  };
  const insertEmoji = (emoji: string) => {
    const current = currentText.current;
    const start = Math.max(0, Math.min(cursor.current.start, current.length));
    const end = Math.min(Math.max(cursor.current.end, start), current.length);
    const next = `${current.slice(0, start)}${emoji}${current.slice(end)}`;
    const caret = start + emoji.length;
    cursor.current = { start: caret, end: caret };
    changeText(next);
  };
  const appendEmoji = (emoji: string) => {
    changeText(`${currentText.current}${emoji}`);
  };
  const clearSubmitted = (submitted: string) => {
    stopTyping();
    if (currentText.current === submitted) {
      currentText.current = '';
      setText('');
    }
  };

  return { text, changeText, changeSelection, insertEmoji, appendEmoji, clearSubmitted };
};

export type ComposerText = ReturnType<typeof useComposerText>;
