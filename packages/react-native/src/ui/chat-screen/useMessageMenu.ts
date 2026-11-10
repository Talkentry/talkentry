import type { Message } from '@talkentry/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions } from 'react-native';

import {
  buildMessageActions,
  type MessageActionHandlers,
  type MessageActionItem,
} from '../message-bubble/actions/messageActions';
import { runMessageAction } from '../message-bubble/actions/runMessageAction';
import type { MenuRect, MenuSize } from '../message-menu/menuLayout';
import type { MessageAnchorMeasure } from '../shared/slots';
import type { ChatLocale } from '../shared/strings';

type OpenMenu = { readonly message: Message; readonly anchor: MenuRect };

/** Owns menu measurement, host bounds, and cancellation of stale measurements. */
export const useMessageMenu = (
  currentUserId: string,
  locale: ChatLocale,
  handlers: MessageActionHandlers,
) => {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [hostSize, setHostSize] = useState<MenuSize>(() => {
    const window = Dimensions.get('window');
    return { width: window.width, height: window.height };
  });
  const measurement = useRef(0);

  const closeMenu = useCallback(() => {
    measurement.current += 1;
    setMenu(null);
  }, []);
  const openMenu = useCallback((message: Message, measure: MessageAnchorMeasure) => {
    if (message.system || message.id === message.localId) {
      return;
    }
    const request = ++measurement.current;
    measure((x, y, width, height) => {
      if (request === measurement.current) {
        setMenu({ message, anchor: { x, y, width, height } });
      }
    });
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window }: { window: { width: number; height: number } }) => {
        setHostSize((current) =>
          current.width === window.width && current.height === window.height
            ? current
            : { width: window.width, height: window.height },
        );
      },
    );
    return () => {
      measurement.current += 1;
      subscription.remove();
    };
  }, []);

  const menuActions = menu
    ? buildMessageActions(menu.message, currentUserId, locale, handlers)
    : [];
  const runMenuAction = (action: MessageActionItem) => {
    if (!menu) {
      return;
    }
    closeMenu();
    runMessageAction(action, menu.message, handlers);
  };

  return { menu, hostSize, openMenu, closeMenu, menuActions, runMenuAction };
};
