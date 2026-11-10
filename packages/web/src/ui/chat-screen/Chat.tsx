import type { Message } from '@talkentry/core';
import {
  type CSSProperties,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTalkentrySession } from '../../react/context';
import { useSendMessage, useTyping } from '../../react/hooks';
import { useTalkentryTheme } from '../../theme';
import { Composer } from '../composer/Composer';
import { shouldFocusComposerOnReply } from '../composer/replyFocus';
import { type ComposerDraft, ComposerDraftType } from '../composer/types';
import { buildMessageActions } from '../message-bubble/actions/messageActions';
import { runMessageAction } from '../message-bubble/actions/runMessageAction';
import { MessageList } from '../message-list/MessageList';
import { MessageContextMenu } from '../message-menu/MessageContextMenu';
import { ownReactionEmoji } from '../message-menu/quickReactions';
import { EmojiGlyphWarmup } from '../shared/emoji/EmojiGlyphWarmup';
import { EMOJI_SIDEBAR_WIDTH, EmojiSidebar } from '../shared/emoji/EmojiSidebar';
import { chatStrings } from '../shared/strings';
import type { ChatProps } from './types';
import { typingLabel } from './typingLabel';

export type { ChatProps } from './types';

type OpenMenu = {
  readonly message: Message;
  readonly x: number;
  readonly y: number;
};

const copyText = (message: Message, onCopy?: (message: Message) => void) => {
  const text = message.text?.trim();
  if (!text) {
    return;
  }
  if (onCopy) {
    onCopy(message);

    return;
  }

  navigator.clipboard?.writeText(text).catch(() => undefined);
};

export const Chat = ({
  users,
  locale = 'en',
  showScrollToLatest,
  showGapMarkers,
  showEmoji = true,
  composerProps,
  onCopy,
  onForward,
  renderChat,
  renderMessage,
  renderMessageBody,
  renderGap,
  renderDay,
  renderTyping,
  renderComposer,
  renderEmpty,
  renderListHeader,
  renderMessageMenu,
}: ChatProps): ReactElement => {
  const theme = useTalkentryTheme();
  const session = useTalkentrySession();
  const { deleteMessage, toggleReaction } = useSendMessage();
  const typingUserIds = useTyping();
  const [draft, setDraft] = useState<ComposerDraft | null>(null);
  const [composerFocusKey, setComposerFocusKey] = useState(0);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const [emojiPinned, setEmojiPinned] = useState(false);
  const emojiInsertRef = useRef<((emoji: string) => void) | null>(null);
  const pickFromSidebar = useRef((emoji: string) => {
    emojiInsertRef.current?.(emoji);
  }).current;
  const label = typingLabel(typingUserIds, users, locale);
  const strings = chatStrings[locale];

  useEffect(() => {
    if (!emojiPinned || typeof window === 'undefined') {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setEmojiPinned(false);
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [emojiPinned]);

  const handlers = {
    onReply: (message: Message) => {
      if (shouldFocusComposerOnReply(draft)) {
        setComposerFocusKey((key) => key + 1);
      }

      setDraft({ type: ComposerDraftType.Reply, messageId: message.id });
    },
    onEdit: (message: Message) => {
      setComposerFocusKey((key) => key + 1);
      setDraft({
        type: ComposerDraftType.Edit,
        messageId: message.id,
        text: message.text ?? '',
      });
    },
    onDelete: (message: Message) => {
      deleteMessage(message.id).catch(() => undefined);
    },
    onCopy: (message: Message) => copyText(message, onCopy),
    ...(onForward ? { onForward } : {}),
  };
  const menuActions = menu
    ? buildMessageActions(menu.message, session.options.currentUserId, locale, handlers)
    : [];

  const reactionsEnabled = session.options.adapter.capabilities.reactions;
  const canReact = (message: Message) =>
    reactionsEnabled && !message.system && message.id !== message.localId;

  const react = (message: Message, emoji: string) => {
    toggleReaction(message.id, emoji).catch(() => undefined);
  };

  const openMenu = (event: MouseEvent, message: Message) => {
    event.preventDefault();
    const actions = buildMessageActions(message, session.options.currentUserId, locale, handlers);
    if (!actions.length && !canReact(message)) {
      return;
    }
    setMenu({ message, x: event.clientX, y: event.clientY });
  };

  const showMenu = Boolean(menu && (menuActions.length || canReact(menu.message)));
  const selectedReaction = menu
    ? ownReactionEmoji(menu.message, session.options.currentUserId)
    : null;
  const onMenuReact = (emoji: string) => {
    if (!menu || !canReact(menu.message)) {
      return;
    }
    const target = menu.message;
    setMenu(null);
    react(target, emoji);
  };
  const onMenuSelect = (action: (typeof menuActions)[number]) => {
    if (!menu) {
      return;
    }
    const target = menu.message;
    setMenu(null);
    runMessageAction(action, target, handlers);
  };
  const closeMenu = () => setMenu(null);

  const list = (
    <MessageList
      locale={locale}
      users={users}
      showScrollToLatest={showScrollToLatest}
      showGapMarkers={showGapMarkers}
      onContextMenu={openMenu}
      onReact={reactionsEnabled ? react : undefined}
      onReply={handlers.onReply}
      renderMessage={renderMessage}
      renderMessageBody={renderMessageBody}
      renderGap={renderGap}
      renderDay={renderDay}
      renderEmpty={renderEmpty}
      renderListHeader={renderListHeader}
    />
  );

  let typingNode: ReactNode = null;

  if (label) {
    if (renderTyping) {
      typingNode = renderTyping({ userIds: typingUserIds, label, locale });
    } else {
      typingNode = (
        <div
          style={{
            ...styles.typing,
            color: theme.colors.textMuted,
            background: theme.colors.surface,
          }}
        >
          {label}
        </div>
      );
    }
  }

  let composer: ReactNode;

  if (renderComposer) {
    composer = renderComposer({
      draft,
      onClearDraft: () => setDraft(null),
      locale,
      showEmoji,
      composerFocusKey,
      emojiPinned,
      onEmojiPinnedChange: setEmojiPinned,
      emojiInsertRef,
    });
  } else {
    composer = (
      <Composer
        {...composerProps}
        locale={locale}
        draft={draft}
        composerFocusKey={composerFocusKey}
        showEmoji={showEmoji}
        emojiPinned={emojiPinned}
        onEmojiPinnedChange={setEmojiPinned}
        emojiInsertRef={emojiInsertRef}
        onClearDraft={() => setDraft(null)}
      />
    );
  }

  const emojiSidebar = showEmoji ? (
    <EmojiSidebar open={emojiPinned} label={strings.emojiSidebarLabel} onPick={pickFromSidebar} />
  ) : null;

  let contextMenu: ReactNode = null;

  if (showMenu && menu) {
    const menuParams = {
      message: menu.message,
      x: menu.x,
      y: menu.y,
      actions: menuActions,
      selectedReaction: selectedReaction ?? undefined,
      locale,
      onReact: canReact(menu.message) ? onMenuReact : undefined,
      onSelect: onMenuSelect,
      onClose: closeMenu,
    };

    contextMenu = renderMessageMenu ? (
      renderMessageMenu(menuParams)
    ) : (
      <MessageContextMenu
        key={menu.message.id}
        locale={locale}
        x={menu.x}
        y={menu.y}
        actions={menuActions}
        selectedReaction={selectedReaction}
        onReact={menuParams.onReact}
        onClose={closeMenu}
        onSelect={onMenuSelect}
      />
    );
  }

  let shell: ReactNode;

  if (renderChat) {
    shell = renderChat({
      list,
      composer,
      typing: typingNode,
      emojiSidebar,
      contextMenu,
      emojiPinned,
    });
  } else {
    shell = (
      <div style={{ ...styles.frame, background: theme.colors.canvas }}>
        <div style={emojiPinned ? styles.mainPinned : styles.main}>
          {list}
          {typingNode}
          {composer}
        </div>
        {emojiSidebar}
        {contextMenu}
      </div>
    );
  }

  return (
    <>
      {showEmoji ? <EmojiGlyphWarmup /> : null}
      {shell}
    </>
  );
};

const styles: Record<string, CSSProperties> = {
  frame: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'visible',
  },
  mainPinned: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'visible',
    paddingRight: EMOJI_SIDEBAR_WIDTH,
  },
  typing: {
    flexShrink: 0,
    fontSize: 12,
    padding: '4px 12px',
  },
};
