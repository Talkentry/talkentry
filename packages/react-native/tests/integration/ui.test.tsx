import { ChatEventType, type LocalSendAccepted, type NavigationState } from '@talkentry/core';
import { deferred, flush, message, mockAdapter, page } from '@test/chat-fixtures';
import type * as ReactTypes from 'react';
import type { ReactElement, ReactNode } from 'react';
import { AccessibilityInfo, Pressable, Text } from 'react-native';

import { TalkentryProvider } from '../../src/react/context';
import { useScrollToLatest } from '../../src/react/hooks';
import { mergeTheme, TalkentryThemeProvider } from '../../src/theme';
import { MessageSelectionBar } from '../../src/ui/chat-screen/MessageSelectionBar';
import { useMessageMenu } from '../../src/ui/chat-screen/useMessageMenu';
import { Composer } from '../../src/ui/composer/Composer';
import { ComposerView } from '../../src/ui/composer/view/ComposerView';
import { MessageBubble } from '../../src/ui/message-bubble';
import { MessageActionSheet } from '../../src/ui/message-bubble/actions/ActionSheet';
import { buildMessageActions } from '../../src/ui/message-bubble/actions/messageActions';
import { MaskedJumpOverlay } from '../../src/ui/message-list/MaskedJumpOverlay';
import { MessageList } from '../../src/ui/message-list/MessageList';
import { ScrollToLatestButton } from '../../src/ui/message-list/ScrollToLatestButton';
import { placeMenu } from '../../src/ui/message-menu/menuLayout';
import { MessageMenu } from '../../src/ui/message-menu/MessageMenu';
import type { RenderMessageMenuParams, RenderMessageParams } from '../../src/ui/shared/slots';
import { mockInputFocus } from '../support/input-mocks';
import { act, render, type TestInstance } from '../support/renderer';

const mockKeyboardListeners: Record<
  string,
  Set<(event: { endCoordinates: { height: number } }) => void>
> = {};
const mockAppStateListeners = new Set<(state: string) => void>();

jest.mock('react-native', () => {
  const React = require('react') as typeof ReactTypes;

  return {
    View: 'View',
    Text: 'Text',
    TextInput: React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      const { mockInputFocus: inputFocus, mockInputBlur } = require('../support/input-mocks') as {
        mockInputFocus: () => void;
        mockInputBlur: () => void;
      };

      React.useImperativeHandle(ref as never, () => ({
        focus: inputFocus,
        blur: mockInputBlur,
      }));

      return React.createElement('TextInput', props);
    }),
    Pressable: 'Pressable',
    Image: 'Image',
    Modal: 'Modal',
    ActivityIndicator: 'ActivityIndicator',
    AppState: {
      currentState: 'active',
      addEventListener: (_: string, listener: (state: string) => void) => {
        mockAppStateListeners.add(listener);

        return { remove: () => mockAppStateListeners.delete(listener) };
      },
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: async () => false,
      isScreenReaderEnabled: async () => false,
      addEventListener: () => ({ remove(): void {} }),
      setAccessibilityFocus(): void {},
    },
    findNodeHandle: () => 1,
    ScrollView: 'ScrollView',
    BackHandler: {
      addEventListener: () => ({
        remove(): void {},
      }),
    },
    Keyboard: {
      dismiss(): void {},
      addListener(
        event: string,
        listener: (payload: { endCoordinates: { height: number } }) => void,
      ) {
        const bucket = mockKeyboardListeners[event] ?? new Set();
        bucket.add(listener);
        mockKeyboardListeners[event] = bucket;

        return {
          remove(): void {
            bucket.delete(listener);
          },
        };
      },
    },
    Platform: { OS: 'ios' },
    Dimensions: {
      get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
      addEventListener: () => ({ remove(): void {} }),
    },
    StyleSheet: {
      create: (styles: unknown) => styles,
      hairlineWidth: 1,
      absoluteFill: {},
    },
    Animated: {
      Value: class AnimatedValue {
        setValue(): void {}
        interpolate(): { readonly kind: 'animated' } {
          return { kind: 'animated' };
        }
      },
      View: 'Animated.View',
      spring: () => ({ start(): void {} }),
      timing: (_value: unknown, options: { duration: number }) => {
        let timer: ReturnType<typeof setTimeout>;

        return {
          start: (done: (result: { finished: boolean }) => void) => {
            timer = setTimeout(() => done({ finished: true }), options.duration);
          },
          stop: () => clearTimeout(timer),
        };
      },
    },
    PanResponder: {
      create: () => ({ panHandlers: {} }),
    },
  };
});
jest.mock('react-native-keyboard-controller', () => {
  const React = require('react') as typeof ReactTypes;

  return {
    OverKeyboardView: (props: { visible?: boolean; children?: ReactNode }) =>
      React.createElement(
        'OverKeyboardView',
        props,
        props.visible === false ? null : props.children,
      ),
    useGenericKeyboardHandler: () => undefined,
    useReanimatedKeyboardAnimation: () => ({
      height: { value: 0 },
      progress: { value: 0 },
    }),
  };
});
jest.mock('../../src/react/hooks/useKeyboardBottomInset', () => ({
  useKeyboardBottomInset: () => 0,
}));
const mockScrollToEnd = jest.fn();
const mockScrollToIndex = jest.fn();
const mockScrollToOffset = jest.fn();
const mockGetLayout = jest.fn((index: number) => ({
  x: 0,
  y: index * 50,
  width: 100,
  height: 50,
  isHeightMeasured: true,
}));
jest.mock('@shopify/flash-list', () => {
  const React = require('react') as typeof ReactTypes;
  const List = React.forwardRef(
    (props: { children?: ReactNode; ListHeaderComponent?: ReactNode }, ref) => {
      React.useImperativeHandle(ref, () => ({
        scrollToEnd: mockScrollToEnd,
        scrollToIndex: mockScrollToIndex,
        scrollToOffset: mockScrollToOffset,
        getLayout: mockGetLayout,
        getFirstItemOffset: () => 0,
      }));

      return React.createElement('FlashList', props, props.ListHeaderComponent, props.children);
    },
  );
  List.displayName = 'MockFlashList';

  return { FlashList: List };
});
const call = (instance: TestInstance, name: string, ...args: unknown[]) =>
  (instance.props[name] as (...values: unknown[]) => unknown)(...args);

const flattenedStyle = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) {
    return Object.assign({}, ...value.map(flattenedStyle)) as Record<string, unknown>;
  }
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
};

describe('composer operation ownership', () => {
  it('serializes attachment, emoji, and send presses before a render commit', async () => {
    const pending = deferred<null>();
    const onAttach = jest.fn(() => pending.promise);
    const onPickEmoji = jest.fn(async () => 'hello');
    const onSend = jest.fn();
    const tree = await render(
      <ComposerView
        initialText="draft"
        onSend={onSend}
        onAttach={onAttach}
        onPickEmoji={onPickEmoji}
      />,
    );
    await act(async () => {
      call(pressableByLabel(tree.root, 'Attach image or file'), 'onPress');
      call(pressableByLabel(tree.root, 'Attach image or file'), 'onPress');
      call(pressableByLabel(tree.root, 'Open emoji or sticker picker'), 'onPress');
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
    });
    expect(onAttach).toHaveBeenCalledTimes(1);
    expect(onPickEmoji).not.toHaveBeenCalled();
    expect(onSend).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve(null);
      await flush();
    });
    await act(async () => call(pressableByLabel(tree.root, 'Send message'), 'onPress'));
    expect(onSend).toHaveBeenCalledWith({ text: 'draft' });
  });

  it('does not clear text typed while the submitted snapshot is pending', async () => {
    const pending = deferred<void>();
    const onSend = jest.fn(() => pending.promise);
    const tree = await render(<ComposerView initialText="first" onSend={onSend} />);
    await act(async () => call(pressableByLabel(tree.root, 'Send message'), 'onPress'));
    await act(async () => call(tree.root.findByType('TextInput'), 'onChangeText', 'next draft'));
    await act(async () => {
      pending.resolve();
      await flush();
    });
    expect(onSend).toHaveBeenCalledWith({ text: 'first' });
    expect(tree.root.findByType('TextInput').props.value).toBe('next draft');
  });

  it('ignores a pending media result after attachments are disabled', async () => {
    const pending = deferred<{ id: string; type: 'image'; url: string }>();
    const onAttach = () => pending.promise;
    const view = (allowAttachments: boolean) => (
      <ComposerView onSend={jest.fn()} onAttach={onAttach} allowAttachments={allowAttachments} />
    );
    const tree = await render(view(true));
    await act(async () => call(pressableByLabel(tree.root, 'Attach image or file'), 'onPress'));
    await act(async () => tree.update(view(false)));
    await act(async () => {
      pending.resolve({ id: 'late', type: 'image', url: 'file:///late.png' });
      await flush();
    });
    expect(tree.root.findAllByType('Image')).toHaveLength(0);
    expect(pressableByLabel(tree.root, 'Send message').props.disabled).toBe(true);
  });

  it('ignores a picker failure after unmount instead of invoking the host error callback', async () => {
    const pending = deferred<null>();
    const onError = jest.fn();
    const tree = await render(
      <ComposerView onSend={jest.fn()} onAttach={() => pending.promise} onError={onError} />,
    );
    await act(async () => call(pressableByLabel(tree.root, 'Attach image or file'), 'onPress'));
    await act(async () => tree.unmount());
    await act(async () => {
      pending.reject(new Error('late picker failure'));
      await flush();
    });
    expect(onError).not.toHaveBeenCalled();
  });

  it('retains a failed send for retry and releases the shared operation lock', async () => {
    const onSend = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    const onError = jest.fn();
    const tree = await render(
      <ComposerView initialText="retry" onSend={onSend} onError={onError} />,
    );
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
      await flush();
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(tree.root.findByType('TextInput').props.value).toBe('retry');
    expect(
      tree.root.findAllByType('Text').some((node) => node.props.accessibilityRole === 'alert'),
    ).toBe(true);
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
      await flush();
    });
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(tree.root.findByType('TextInput').props.value).toBe('');
    expect(
      tree.root.findAllByType('Text').some((node) => node.props.accessibilityRole === 'alert'),
    ).toBe(false);
  });
});

describe('component design tokens', () => {
  it('updates composer spacing and control metrics when the provider changes', async () => {
    const view = (height: number) => (
      <TalkentryThemeProvider
        themeOverride={{
          spacing: { xs: 9 },
          components: { composer: { controlHeight: height, iconSize: 31, rowPadding: 19 } },
        }}
      >
        <ComposerView onSend={jest.fn()} />
      </TalkentryThemeProvider>
    );
    const tree = await render(view(58));
    expect(flattenedStyle(pressableByLabel(tree.root, 'Send message').props.style).height).toBe(58);
    expect(
      tree.root
        .findAllByType('View')
        .some((node) => flattenedStyle(node.props.style).paddingVertical === 19),
    ).toBe(true);
    await act(async () => tree.update(view(62)));
    expect(flattenedStyle(pressableByLabel(tree.root, 'Send message').props.style).height).toBe(62);
  });

  it('themes selection, latest, and action sheet instead of freezing design literals', async () => {
    const tree = await render(
      <TalkentryThemeProvider
        themeOverride={{
          spacing: { md: 25 },
          components: {
            selection: { buttonHeight: 70 },
            latest: { size: 56 },
            actionSheet: { emojiSize: 35, rowPadding: 23 },
            effects: { shadowColor: '#123123', scrim: '#101010' },
          },
        }}
      >
        <MessageSelectionBar locale="en" onReply={jest.fn()} onForward={jest.fn()} />
        <ScrollToLatestButton label="Latest" count={1} countNoun="unread" onPress={jest.fn()} />
        <MessageActionSheet
          visible
          message={message('m')}
          actions={[]}
          onClose={jest.fn()}
          onAction={jest.fn()}
          onReact={jest.fn()}
        />
      </TalkentryThemeProvider>,
    );
    const reply = flattenedStyle(pressableByLabel(tree.root, 'Reply to message').props.style);
    expect(reply.minHeight).toBe(70);
    expect(reply.shadowColor).toBe('#123123');
    expect(flattenedStyle(pressableByLabel(tree.root, 'Latest').props.style).width).toBe(56);
    expect(
      tree.root
        .findAllByType('Pressable')
        .some((node) => flattenedStyle(node.props.style).backgroundColor === '#101010'),
    ).toBe(true);
    expect(
      tree.root
        .findAllByType('Text')
        .some((node) => flattenedStyle(node.props.style).fontSize === 35),
    ).toBe(true);
  });
});

describe('message menu measurement ownership', () => {
  it('rejects measurements superseded by close, another message, or unmount', async () => {
    let menu!: ReturnType<typeof useMessageMenu>;
    const Probe = () => {
      menu = useMessageMenu('me', 'en', {});
      return null;
    };
    const tree = await render(<Probe />);
    let first!: (x: number, y: number, width: number, height: number) => void;
    let second!: typeof first;
    await act(async () =>
      menu.openMenu(message('first'), (callback) => {
        first = callback;
      }),
    );
    await act(async () => menu.closeMenu());
    await act(async () => first(0, 0, 100, 50));
    expect(menu.menu).toBeNull();
    await act(async () => {
      menu.openMenu(message('first'), (callback) => {
        first = callback;
      });
      menu.openMenu(message('second'), (callback) => {
        second = callback;
      });
      second(10, 20, 100, 50);
      first(0, 0, 100, 50);
    });
    expect(menu.menu?.message.id).toBe('second');
    await act(async () => tree.unmount());
    await act(async () => second(0, 0, 100, 50));
  });
});

const pressableByLabel = (root: { findAllByType(type: string): TestInstance[] }, label: string) => {
  const node = root
    .findAllByType('Pressable')
    .find((item) => item.props.accessibilityLabel === label);
  if (!node) {
    throw new Error(`Missing pressable: ${label}`);
  }

  return node;
};
const scrollEvent = (offset: number, content = 1000, height = 100) => ({
  nativeEvent: {
    contentOffset: { y: offset },
    contentSize: { height: content },
    layoutMeasurement: { height },
  },
});
const measureList = (list: TestInstance, content = 1000, height = 100) => {
  call(list, 'onLayout', { nativeEvent: { layout: { height } } });
  call(list, 'onContentSizeChange', 100, content);
};
const viewKeys = (list: TestInstance, keys: readonly string[]) => {
  call(list, 'onViewableItemsChanged', {
    viewableItems: keys.map((item) => ({ item, isViewable: true })),
  });
};
const hasLatest = (root: TestInstance) =>
  root
    .findAllByType('Pressable')
    .some((item) => item.props.accessibilityLabel === 'Jump to latest messages');
const hasUnread = (root: TestInstance, count: number) =>
  root.findAllByType('View').some((item) => item.props.accessibilityLabel === `${count} unread`);

afterEach(() => jest.useRealTimers());

const localSendSource = () => {
  let current: ((event: LocalSendAccepted) => void) | undefined;

  return {
    subscribe: (listener: (event: LocalSendAccepted) => void) => {
      current = listener;

      return () => {
        if (current === listener) {
          current = undefined;
        }
      };
    },
    emit: (sequence = 1, requiresLatest = false) =>
      current?.({ sequence, localId: `local-${sequence}`, threadId: null, requiresLatest }),
    get listener() {
      return current;
    },
  };
};

const drawCell = (list: TestInstance, item: string) => {
  const data = list.props.data as string[];

  return (list.props.renderItem as (info: object) => ReactNode)({
    item,
    index: data.indexOf(item),
    target: 'Cell',
    extraData: list.props.extraData,
  });
};
const maskPhase = (tree: { root: TestInstance }) =>
  tree.root
    .findAllByType(MaskedJumpOverlay)
    .map((node) => (node.props.state as { phase: string }).phase)[0];
const advance = async (ms = 1) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
const paintCover = async (tree: { root: TestInstance }) => {
  const cover = tree.root
    .findAllByType('Animated.View')
    .find((node) => node.props.testID === 'masked-jump-overlay');
  if (!cover) {
    throw new Error('Missing masked jump overlay');
  }
  await act(async () => {
    call(cover, 'onLayout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 700 } },
    });
  });
  await advance();
};

describe('masked navigation and quote taps', () => {
  it('positions a quote inside the readable viewport rather than beneath host occlusion', async () => {
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const tree = await render(
      <MessageList
        messages={['a', 'b', 'c', 'd'].map((id) => message(id))}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        renderMessage={row}
        viewportTopInset={30}
        contentBottomInset={50}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onLayout', { nativeEvent: { layout: { height: 300 } } });
      call(list, 'onContentSizeChange', 100, 1000);
    });
    drawCell(list, 'a');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('d'));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 85, animated: true });
  });
  it('waits for a fast around response to enter React and preserves the canonical target identity', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('reply', { replyToId: 'server-original' })]));
    mock.loadAround.mockResolvedValue(
      page([message('server-original', { localId: 'local-original' })]),
    );
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const status = jest.fn();
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList renderMessage={row} onNavigationChange={status} />
      </TalkentryProvider>,
    );
    await act(async () => measureList(tree.root.findByType('FlashList'), 100));
    drawCell(tree.root.findByType('FlashList'), 'reply');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('server-original'));
    await paintCover(tree);
    expect(mock.loadAround).toHaveBeenCalledWith(
      expect.objectContaining({ aroundId: 'server-original' }),
    );
    const list = tree.root.findByType('FlashList');
    expect(list.props.data).toContain('local-original');
    await act(async () => {
      measureList(list, 300);
      call(list, 'onCommitLayoutEffect');
    });
    await advance();
    await act(async () => {
      viewKeys(list, ['local-original']);
      call(list, 'onScroll', scrollEvent(25, 300));
    });
    expect(maskPhase(tree)).toBe('preparing');
    drawCell(tree.root.findByType('FlashList'), 'local-original');
    await act(async () => call(tree.root.findByType('FlashList'), 'onCommitLayoutEffect'));
    await advance();
    await advance(181);
    expect(maskPhase(tree)).toBeUndefined();
    expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'settled' }));
    expect(status.mock.calls.some(([state]) => state.status === 'failed')).toBe(false);
  });

  it('follows the newest tail after an unmasked jump to latest', async () => {
    const source = localSendSource();
    const a = message('a');
    const b = message('b');
    const view = (extra: boolean) => (
      <MessageList
        messages={extra ? [a, b] : [a]}
        currentUserId="me"
        change={{ sequence: extra ? 2 : 1, kind: extra ? 'append' : 'older' }}
        maskedJumps={{ viewportThreshold: 2 }}
        subscribeLocalSendAccepted={source.subscribe}
      />
    );
    const tree = await render(view(false));
    let list = tree.root.findByType('FlashList');
    await act(async () => measureList(list));
    await act(async () => source.emit());
    expect(maskPhase(tree)).toBeUndefined();
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 900, animated: false });
    await act(async () => {
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    await act(async () => tree.update(view(true)));
    list = tree.root.findByType('FlashList');
    await act(async () => call(list, 'onContentSizeChange', 100, 1200));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1100, animated: true });
    await act(async () => {
      viewKeys(list, ['b']);
      call(list, 'onScroll', scrollEvent(1100, 1200));
    });
    expect(maskPhase(tree)).toBeUndefined();
  });

  it('never replaces an unmeasured quote cell with an invented fixed-height skeleton', async () => {
    jest.useFakeTimers();
    const messages = Array.from({ length: 60 }, (_, index) =>
      message(`m${index}`, { createdAt: index + 1 }),
    );
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const tree = await render(
      <MessageList
        messages={messages}
        currentUserId="me"
        renderMessage={row}
        change={{ sequence: 1, kind: 'older' }}
      />,
    );
    const content = (messages.length + 1) * 50;
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onLayout', { nativeEvent: { layout: { height: 300 } } });
      call(list, 'onContentSizeChange', 100, content);
      call(list, 'onScroll', scrollEvent(content - 300, content, 300));
      viewKeys(list, ['m59']);
    });
    drawCell(list, 'm59');
    const openOriginal = row.mock.calls.at(-1)![0].onQuotePress!;
    row.mockClear();
    await act(async () => openOriginal('m0'));
    await paintCover(tree);
    mockGetLayout.mockReturnValueOnce({
      x: 0,
      y: 0,
      height: 120,
      width: 100,
      isHeightMeasured: false,
    });
    drawCell(tree.root.findByType('FlashList'), 'm0');
    expect(row).toHaveBeenCalledTimes(1);
  });

  it('discards an old quote request and its mask when the controlled scope changes', async () => {
    jest.useFakeTimers();
    const pending = deferred<boolean>();
    const load = jest.fn((_id: string, _signal: AbortSignal) => pending.promise);
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const view = (scopeKey: string) => (
      <MessageList
        scopeKey={scopeKey}
        messages={[message('a')]}
        currentUserId="me"
        renderMessage={row}
        onGoToMessage={load}
        change={{ sequence: 1, kind: 'older' }}
      />
    );
    const tree = await render(view('old'));
    drawCell(tree.root.findByType('FlashList'), 'a');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('remote'));
    await paintCover(tree);
    await act(async () => tree.update(view('new')));
    expect(load.mock.calls[0]![1].aborted).toBe(true);
    await act(async () => {
      pending.resolve(true);
      await flush();
    });
    await advance(6000);
    expect(maskPhase(tree)).toBeUndefined();
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('a quote has its own press action and stops bubble-menu propagation, even without its parent cached', async () => {
    const quote = jest.fn();
    const menu = jest.fn();
    const tree = await render(
      <MessageBubble
        message={message('reply', { replyToId: 'original' })}
        currentUserId="me"
        onQuotePress={quote}
        onPress={menu}
      />,
    );
    const stopPropagation = jest.fn();
    await act(async () =>
      call(pressableByLabel(tree.root, 'Go to original message'), 'onPress', { stopPropagation }),
    );
    expect(quote).toHaveBeenCalledWith('original');
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(menu).not.toHaveBeenCalled();
  });

  it.each([100, 500])(
    'skips heavy rendering for %i measured transit cells and reveals only after real-layout commit',
    async (count) => {
      jest.useFakeTimers();
      const messages = Array.from({ length: count }, (_, i) =>
        message(`m${i}`, { createdAt: i + 1 }),
      );
      const row = jest.fn((_params: RenderMessageParams) => <Text>heavy-row</Text>);
      const read = jest.fn();
      const tree = await render(
        <MessageList
          messages={messages}
          currentUserId="me"
          renderMessage={row}
          change={{ sequence: 1, kind: 'older' }}
          onMessagesRead={read}
        />,
      );
      let list = tree.root.findByType('FlashList');
      const content = (count + 1) * 50;
      await act(async () => {
        call(list, 'onLayout', { nativeEvent: { layout: { height: 300 } } });
        call(list, 'onContentSizeChange', 100, content);
        call(list, 'onScroll', scrollEvent(content - 300, content, 300));
        viewKeys(list, [`m${count - 1}`]);
      });
      drawCell(list, `m${count - 1}`);
      const press = row.mock.calls.at(-1)![0].onQuotePress!;
      row.mockClear();
      await act(async () => {
        press('m0');
      });
      expect(maskPhase(tree)).toBe('covering');
      expect(mockScrollToOffset).not.toHaveBeenCalled();
      await paintCover(tree);
      expect(maskPhase(tree)).toBe('relocating');
      expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 0, animated: false });
      list = tree.root.findByType('FlashList');
      for (const item of messages) {
        drawCell(list, item.id);
      }
      expect(row).not.toHaveBeenCalled();
      expect(list.props.importantForAccessibility).toBe('no-hide-descendants');
      await act(async () => {
        viewKeys(list, ['m0']);
        call(list, 'onScroll', scrollEvent(0, content, 300));
      });
      expect(maskPhase(tree)).toBe('preparing');
      list = tree.root.findByType('FlashList');
      drawCell(list, 'm0');
      expect(row).toHaveBeenCalledTimes(1);
      await advance(100);
      expect(maskPhase(tree)).toBe('preparing');
      expect(read).not.toHaveBeenCalled();
      await act(async () => call(tree.root.findByType('FlashList'), 'onCommitLayoutEffect'));
      await advance();
      expect(maskPhase(tree)).toBe('revealing');
      await advance(181);
      expect(maskPhase(tree)).toBeUndefined();
      expect(mockScrollToOffset.mock.calls.every(([command]) => !command.animated)).toBe(true);
      expect(row.mock.calls.length).toBeLessThan(5);
    },
  );

  it('jumps the down button onto the real tail without a skeleton cover', async () => {
    const messages = Array.from({ length: 60 }, (_, index) =>
      message(`m${index}`, { createdAt: index + 1 }),
    );
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const tree = await render(
      <MessageList
        messages={messages}
        currentUserId="me"
        renderMessage={row}
        change={{ sequence: 1, kind: 'older' }}
      />,
    );
    const content = (messages.length + 1) * 50;
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onLayout', { nativeEvent: { layout: { height: 300 } } });
      call(list, 'onContentSizeChange', 100, content);
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(0, content, 300));
      call(list, 'onMomentumScrollEnd', scrollEvent(0, content, 300));
      viewKeys(list, ['m0']);
    });
    row.mockClear();
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Jump to latest messages'), 'onPress');
    });
    expect(maskPhase(tree)).toBeUndefined();
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({
      offset: content - 300,
      animated: true,
    });
    drawCell(tree.root.findByType('FlashList'), 'm59');
    expect(row).toHaveBeenCalledTimes(1);
  });

  it('uses ordinary animation for a nearby cached quote without a backend request', async () => {
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const load = jest.fn();
    const messages = [message('a'), message('b'), message('c')];
    const tree = await render(
      <MessageList
        messages={messages}
        currentUserId="me"
        renderMessage={row}
        change={{ sequence: 1, kind: 'older' }}
        onGoToMessage={load}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => measureList(list, 300));
    drawCell(list, 'c');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('b'));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 75, animated: true });
    expect(maskPhase(tree)).toBeUndefined();
    expect(load).not.toHaveBeenCalled();
  });

  it('cancels a mask on a manual gesture and never reissues the pending command', async () => {
    jest.useFakeTimers();
    const messages = Array.from({ length: 60 }, (_, index) =>
      message(`m${index}`, { createdAt: index + 1 }),
    );
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const tree = await render(
      <MessageList
        messages={messages}
        currentUserId="me"
        renderMessage={row}
        change={{ sequence: 1, kind: 'older' }}
      />,
    );
    const content = (messages.length + 1) * 50;
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onLayout', { nativeEvent: { layout: { height: 300 } } });
      call(list, 'onContentSizeChange', 100, content);
      call(list, 'onScroll', scrollEvent(content - 300, content, 300));
      viewKeys(list, ['m59']);
    });
    drawCell(list, 'm59');
    mockScrollToOffset.mockClear();
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('m0'));
    expect(maskPhase(tree)).toBe('covering');
    await act(async () => call(list, 'onScrollBeginDrag'));
    await advance(6000);
    expect(maskPhase(tree)).toBeUndefined();
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('loads an uncached original under the mask and reports failure without pretending arrival', async () => {
    jest.useFakeTimers();
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const pending = deferred<boolean>();
    const load = jest.fn((_id: string, _signal: AbortSignal) => pending.promise);
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('reply')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        renderMessage={row}
        onGoToMessage={load}
        onNavigationChange={status}
      />,
    );
    drawCell(tree.root.findByType('FlashList'), 'reply');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('remote'));
    expect(load).not.toHaveBeenCalled();
    await paintCover(tree);
    expect(load).toHaveBeenCalledWith('remote', expect.any(AbortSignal));
    await act(async () => {
      pending.resolve(false);
      await flush();
    });
    expect(maskPhase(tree)).toBeUndefined();
    expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('respects Reduce Motion for nearby programmatic navigation', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const row = jest.fn((_params: RenderMessageParams) => <Text>row</Text>);
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        renderMessage={row}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => measureList(list, 300));
    drawCell(list, 'a');
    await act(async () => row.mock.calls.at(-1)![0].onQuotePress!('b'));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 75, animated: false });
  });
});

describe('navigation outcomes and accepted sends', () => {
  it('keeps layout following while read dwell is temporarily paused', async () => {
    const messages = [message('a')];
    const view = (readEnabled: boolean) => (
      <MessageList
        messages={messages}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        readEnabled={readEnabled}
      />
    );
    const tree = await render(view(true));
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();
    await act(async () => tree.update(view(false)));
    await act(async () =>
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1200),
    );
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1100, animated: true });
  });

  it('does not report reads during a read-only pause and restarts dwell after it', async () => {
    jest.useFakeTimers();
    const read = jest.fn();
    const messages = [message('a')];
    const view = (readEnabled: boolean) => (
      <MessageList
        messages={messages}
        currentUserId="me"
        readEnabled={readEnabled}
        onMessagesRead={read}
      />
    );
    const tree = await render(view(false));
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 100);
      viewKeys(list, ['a']);
      await jest.advanceTimersByTimeAsync(500);
    });
    expect(read).not.toHaveBeenCalled();
    await act(async () => tree.update(view(true)));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(251);
    });
    expect(read).toHaveBeenCalledWith(['a']);
  });

  it('exposes a bounded failure and explicitly retries with a fresh identity', async () => {
    jest.useFakeTimers();
    const status = jest.fn<void, [NavigationState]>();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        onNavigationChange={status}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(3);
    const failed = status.mock.calls.at(-1)![0];
    expect(failed).toMatchObject({ status: 'failed', reason: 'retryExhausted' });
    await act(async () => call(pressableByLabel(tree.root, 'Retry navigation'), 'onPress'));
    await act(async () => {
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    const settled = status.mock.calls.at(-1)![0];
    expect(settled.status).toBe('settled');
    if (settled.status !== 'settled' || failed.status !== 'failed') {
      throw new Error('Expected outcomes');
    }
    expect(settled.id).toBeGreaterThan(failed.id);
  });

  it('fails missing layout instead of keeping an intent pending forever', async () => {
    jest.useFakeTimers();
    const status = jest.fn();
    await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        onNavigationChange={status}
      />,
    );
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5001);
    });
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', reason: 'layoutUnavailable' }),
    );
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('reports a native executor exception as failure rather than acknowledging it', async () => {
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        onNavigationChange={status}
      />,
    );
    mockScrollToOffset.mockImplementationOnce(() => {
      throw new Error('native unavailable');
    });
    await act(async () => measureList(tree.root.findByType('FlashList')));
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', reason: 'executionFailed' }),
    );
  });

  it('reports an around target absent from the committed window', async () => {
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'around', focusKey: 'missing' }}
        onNavigationChange={status}
      />,
    );
    await act(async () => measureList(tree.root.findByType('FlashList')));
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', reason: 'targetUnavailable' }),
    );
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('times out a host load that ignores cancellation, without accepting a late result', async () => {
    jest.useFakeTimers();
    const pending = deferred<boolean>();
    const load = jest.fn((_signal: AbortSignal) => pending.promise);
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        hasMoreAfter
        onGoToLatest={load}
        onNavigationChange={status}
      />,
    );
    await act(async () => {
      call(pressableByLabel(tree.root, 'Jump to latest messages'), 'onPress');
      await flush();
    });
    await advance(30001);
    expect(load.mock.calls[0]![0].aborted).toBe(true);
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'failed', reason: 'loadFailed' }),
    );
    await act(async () => {
      pending.resolve(true);
      await flush();
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('does not time out a healthy moving burst lasting more than five seconds', async () => {
    jest.useFakeTimers();
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        onNavigationChange={status}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 10000);
      for (let i = 1; i <= 70; i += 1) {
        call(list, 'onContentSizeChange', 100, 10000 + i * 100);
        call(list, 'onScroll', scrollEvent(i * 100, 10000 + i * 100));
        await jest.advanceTimersByTimeAsync(100);
      }
    });
    expect(status.mock.calls.some(([state]) => state.status === 'failed')).toBe(false);
    await act(async () => {
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(16900, 17000));
    });
    expect(status).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'settled' }));
  });

  it('navigates from manual history on acceptance and ignores a replay after a later gesture', async () => {
    const source = localSendSource();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        subscribeLocalSendAccepted={source.subscribe}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => measureList(list));
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => source.emit());
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 900, animated: false });
    await act(async () => {
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(200));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd');
    });
    mockScrollToOffset.mockClear();
    await act(async () => source.emit());
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('does not navigate for a local acceptance during an active manual gesture', async () => {
    const source = localSendSource();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        subscribeLocalSendAccepted={source.subscribe}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      call(list, 'onScrollBeginDrag');
      source.emit();
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd');
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('cancels an accepted-send tail load on touch and rejects its late completion', async () => {
    jest.useFakeTimers();
    const source = localSendSource();
    const pending = deferred<boolean>();
    const load = jest.fn((_signal: AbortSignal) => pending.promise);
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        hasMoreAfter
        change={{ sequence: 1, kind: 'older' }}
        onGoToLatest={load}
        subscribeLocalSendAccepted={source.subscribe}
        onNavigationChange={status}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      source.emit(1, true);
      await flush();
    });
    await act(async () => {
      call(list, 'onScrollBeginDrag');
      await flush();
    });
    expect(load.mock.calls[0]![0].aborted).toBe(true);
    await act(async () => {
      pending.resolve(true);
      await flush();
    });
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'cancelled', reason: 'gesture' }),
    );
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('discards old scope listeners and keeps the new scope inactive', async () => {
    const source = localSendSource();
    const view = (scopeKey: string) => (
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'older' }}
        scopeKey={scopeKey}
        isActive={false}
        subscribeLocalSendAccepted={source.subscribe}
      />
    );
    const tree = await render(view('old'));
    const stale = source.listener!;
    await act(async () => tree.update(view('new')));
    await act(async () => {
      measureList(tree.root.findByType('FlashList'));
      stale({ sequence: 100, localId: 'old', threadId: null, requiresLatest: false });
      source.emit();
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('cancels native execution when the app is backgrounded', async () => {
    jest.useFakeTimers();
    const status = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
        onNavigationChange={status}
      />,
    );
    await act(async () => measureList(tree.root.findByType('FlashList')));
    mockScrollToOffset.mockClear();
    await act(async () => {
      for (const listener of mockAppStateListeners) {
        listener('background');
      }
      await jest.advanceTimersByTimeAsync(10000);
    });
    expect(status).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'cancelled', reason: 'inactive' }),
    );
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('connects Composer acceptance to Latest before a delayed server ACK', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const ack = deferred<ReturnType<typeof message>>();
    mock.send.mockReturnValue(ack.promise);
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
        <Composer />
      </TalkentryProvider>,
    );
    let list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(100));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd');
      call(tree.root.findByType('TextInput'), 'onChangeText', 'new local message');
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
      await flush();
    });
    list = tree.root.findByType('FlashList');
    await act(async () => call(list, 'onContentSizeChange', 100, 1200));
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 900, animated: false });
    const command = mock.send.mock.calls[0]![0];
    expect(list.props.data).toEqual(expect.arrayContaining([command.localId]));
    await act(async () => {
      ack.resolve(
        message('server', { senderId: 'me', localId: command.localId, createdAt: Date.now() }),
      );
      await flush();
    });
  });

  it('retains the local intent when acceptance and a fast ACK share one React batch', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
        <Composer />
      </TalkentryProvider>,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(100));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd');
      call(tree.root.findByType('TextInput'), 'onChangeText', 'fast ACK');
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
      await flush();
    });
    await act(async () =>
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1200),
    );
    expect(mock.send).toHaveBeenCalledTimes(1);
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 900, animated: false });
  });
});

describe('scroll and visibility regressions', () => {
  it('follows connected realtime bursts while delivery receipts update the same session', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { deliveryReceipts: true, readReceipts: true });
    mock.updateReceipts.mockImplementation(async (command) =>
      (command.messageIds ?? []).map((id) => message(id, { status: command.status, revision: 2 })),
    );
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
      </TalkentryProvider>,
    );
    let list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();
    for (let count = 1; count <= 6; count += 1) {
      await act(async () => {
        mock.emit({ type: ChatEventType.MessageAdded, message: message(`b${count}`) });
        await flush();
      });
      list = tree.root.findByType('FlashList');
      await act(async () => {
        call(list, 'onContentSizeChange', 100, 1000 + count * 100);
        call(list, 'onScroll', scrollEvent(900 + count * 10, 1000 + count * 100));
        await jest.advanceTimersByTimeAsync(50);
      });
    }
    expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
    await act(async () => call(list, 'onMomentumScrollEnd', scrollEvent(1000, 1600)));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1500, animated: true });
    await act(async () => {
      viewKeys(list, ['b6']);
      call(list, 'onMomentumScrollEnd', scrollEvent(1500, 1600));
    });
    expect(hasLatest(tree.root)).toBe(false);
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered', messageIds: expect.arrayContaining(['b6']) }),
    );
    expect(list.props.maintainVisibleContentPosition).toMatchObject({ disabled: true });
  });

  it('admits a same-height rolling window only after its layout commit', async () => {
    jest.useFakeTimers();
    const view = (key: string) => (
      <MessageList
        messages={[message(key)]}
        currentUserId="me"
        change={{ sequence: key === 'a' ? 1 : 2, kind: key === 'a' ? 'initial' : 'append' }}
      />
    );
    const tree = await render(view('a'));
    let list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();
    await act(async () => tree.update(view('b')));
    list = tree.root.findByType('FlashList');
    await act(async () => {
      viewKeys(list, ['b']);
      call(list, 'onScroll', scrollEvent(900));
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => {
      call(list, 'onCommitLayoutEffect');
      await jest.advanceTimersByTimeAsync(1);
      call(list, 'onContentSizeChange', 100, 1200);
    });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1100, animated: true });
  });

  it('continues an explicit Latest jump when another message arrives mid-animation', async () => {
    const view = (append: boolean) => (
      <MessageList
        messages={append ? [message('a'), message('b')] : [message('a')]}
        currentUserId="me"
        change={{ sequence: append ? 2 : 1, kind: append ? 'append' : 'initial' }}
      />
    );
    const tree = await render(view(false));
    let list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 1000, 400);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(600, 1000, 400));
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(300, 1000, 400));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd', scrollEvent(300, 1000, 400));
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      await call(pressableByLabel(tree.root, 'Jump to latest messages'), 'onPress');
    });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 600, animated: true });
    await act(async () => tree.update(view(true)));
    list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 1200);
      // A queued completion still carries the preceding content height.
      call(list, 'onMomentumScrollEnd', scrollEvent(600, 1000, 400));
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(2);
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 800, animated: true });
    expect(list.props.maintainVisibleContentPosition).toMatchObject({ disabled: true });
    await act(async () => {
      viewKeys(list, ['b']);
      call(list, 'onScroll', scrollEvent(1100, 1200));
    });
    expect(hasLatest(tree.root)).toBe(false);
  });

  it('does not let an old momentum-end release a new manual gesture', async () => {
    jest.useFakeTimers();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
      call(list, 'onContentSizeChange', 100, 1200);
      call(list, 'onScrollBeginDrag');
      call(list, 'onMomentumScrollEnd', scrollEvent(1100, 1200));
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 1400);
      call(list, 'onCommitLayoutEffect');
      await jest.advanceTimersByTimeAsync(2000);
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => {
      call(list, 'onScroll', scrollEvent(600, 1400));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd', scrollEvent(600, 1400));
      call(list, 'onContentSizeChange', 100, 1500);
      // Even after release, an old animation cannot replace the manual position.
      call(list, 'onMomentumScrollEnd', scrollEvent(1400, 1500));
      call(list, 'onContentSizeChange', 100, 1550);
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => {
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(1450, 1550));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd', scrollEvent(1450, 1550));
      call(list, 'onContentSizeChange', 100, 1600);
    });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1500, animated: true });
  });

  it('bounds idle recovery and cancels scheduled work on unmount', async () => {
    jest.useFakeTimers();
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 1200);
      await jest.advanceTimersByTimeAsync(10000);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(3);
    await act(async () => {
      call(list, 'onScroll', scrollEvent(1100, 1200));
      call(list, 'onContentSizeChange', 100, 1300);
    });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1200, animated: true });
    mockScrollToOffset.mockClear();
    await act(async () => {
      tree.unmount();
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10000);
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('continues through resized content and viewport without treating them as user intent', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 1300);
      call(list, 'onContentSizeChange', 100, 1600);
      call(list, 'onLayout', { nativeEvent: { layout: { height: 200 } } });
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
    await act(async () => call(list, 'onScroll', scrollEvent(1200, 1300, 100)));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1400, animated: true });
    await act(async () => {
      call(list, 'onScroll', scrollEvent(1400, 1600, 200));
      call(list, 'onContentSizeChange', 100, 1200);
    });
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1000, animated: true });
  });

  it('drains burst arrivals to the newest measured tail without restarting each animation', async () => {
    const view = (count: number) => (
      <MessageList
        messages={Array.from({ length: count }, (_, index) => message(`burst-${index}`))}
        currentUserId="me"
        change={{ sequence: count, kind: count === 1 ? 'initial' : 'append' }}
      />
    );
    const tree = await render(view(1));
    let list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 1000);
      viewKeys(list, ['burst-0']);
      call(list, 'onScroll', scrollEvent(900));
    });
    mockScrollToOffset.mockClear();

    for (let count = 2; count <= 20; count += 1) {
      await act(async () => tree.update(view(count)));
      list = tree.root.findByType('FlashList');
      await act(async () => call(list, 'onContentSizeChange', 100, 900 + count * 100));
    }
    expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 1000, animated: true }),
    );

    await act(async () => {
      // The first animation finishes while nineteen newer targets already exist.
      call(list, 'onScroll', scrollEvent(1000, 2900));
      call(list, 'onMomentumScrollEnd', scrollEvent(1000, 2900));
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(2);
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 2800, animated: true }),
    );
    await act(async () => tree.update(view(21)));
    list = tree.root.findByType('FlashList');
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 3000);
      call(list, 'onScroll', scrollEvent(2800, 3000));
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(3);
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 2900, animated: true }),
    );
    await act(async () => {
      viewKeys(list, ['burst-20']);
      call(list, 'onScroll', scrollEvent(2900, 3000));
      call(list, 'onMomentumScrollEnd', scrollEvent(2900, 3000));
    });
    expect(hasLatest(tree.root)).toBe(false);
    await act(async () => tree.update(view(22)));
    list = tree.root.findByType('FlashList');
    await act(async () => call(list, 'onContentSizeChange', 100, 3100));
    expect(mockScrollToOffset).toHaveBeenLastCalledWith(
      expect.objectContaining({ offset: 3000, animated: true }),
    );
  });

  it('shows Latest when content grows past the threshold while the reader is stationary', async () => {
    const tree = await render(<MessageList messages={[message('a')]} currentUserId="me" />);
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      call(list, 'onScrollBeginDrag');
      call(list, 'onScroll', scrollEvent(800));
      call(list, 'onScrollEndDrag');
      call(list, 'onMomentumScrollEnd');
    });
    expect(hasLatest(tree.root)).toBe(false);
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onContentSizeChange', 100, 1200);
    });
    expect(hasLatest(tree.root)).toBe(true);
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('uses visible connected IDs for receipts and counts new incoming rows without a fake cursor', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
      </TalkentryProvider>,
    );
    await act(async () => {
      const list = tree.root.findByType('FlashList');
      measureList(list, 100);
      viewKeys(list, ['a']);
      await jest.advanceTimersByTimeAsync(250);
      call(list, 'onScrollBeginDrag');
      call(list, 'onContentSizeChange', 100, 1000);
      call(list, 'onScroll', scrollEvent(0));
      mock.emit({ type: ChatEventType.MessageAdded, message: message('b') });
    });
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({ messageIds: ['a'], status: 'read' }),
    );
    expect(hasUnread(tree.root, 1)).toBe(true);
    await act(async () => {
      const list = tree.root.findByType('FlashList');
      call(list, 'onContentSizeChange', 100, 300);
      call(list, 'onScroll', scrollEvent(75, 300));
      viewKeys(list, ['b']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(mock.updateReceipts).toHaveBeenLastCalledWith(
      expect.objectContaining({ messageIds: ['b'], status: 'read' }),
    );
    expect(hasUnread(tree.root, 1)).toBe(false);
  });

  it('keeps local observation after a failed ACK and retries when visibility returns', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    mock.updateReceipts.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const read = jest.fn();
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList onMessagesRead={read} />
      </TalkentryProvider>,
    );
    await act(async () => {
      const list = tree.root.findByType('FlashList');
      measureList(list, 100);
      viewKeys(list, ['a']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(mock.updateReceipts).toHaveBeenCalledTimes(1);
    await act(async () => {
      const list = tree.root.findByType('FlashList');
      viewKeys(list, []);
      await jest.advanceTimersByTimeAsync(1000);
      viewKeys(list, ['a']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(mock.updateReceipts).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('honors a host cursor advance without preserving the previous derived total', async () => {
    const messages = [message('a'), message('b'), message('c')];
    const view = (cursor: string) => (
      <MessageList messages={messages} currentUserId="me" firstUnreadId={cursor} hasMoreAfter />
    );
    const tree = await render(view('b'));
    expect(hasUnread(tree.root, 2)).toBe(true);
    await act(async () => {
      tree.update(view('c'));
    });
    expect(hasUnread(tree.root, 1)).toBe(true);
  });

  it('does not replay an around target on layout callbacks after manual cancellation', async () => {
    jest.useFakeTimers();
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'around', focusKey: 'b' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 300);
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onScrollBeginDrag');
      call(list, 'onCommitLayoutEffect');
      call(list, 'onContentSizeChange', 100, 400);
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('does not flicker when starting an upward drag near the end', async () => {
    const tree = await render(<MessageList messages={[message('a')]} currentUserId="me" />);
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
      call(list, 'onScroll', scrollEvent(900));
      call(list, 'onScrollBeginDrag');
    });
    expect(hasLatest(tree.root)).toBe(false);
    for (const offset of [899, 870, 825, 700, 685]) {
      await act(async () => {
        call(list, 'onScroll', scrollEvent(offset));
      });
      expect(hasLatest(tree.root)).toBe(false);
    }
    await act(async () => {
      call(list, 'onScroll', scrollEvent(684));
    });
    expect(hasLatest(tree.root)).toBe(true);
    await act(async () => {
      call(list, 'onScroll', scrollEvent(700));
    });
    expect(hasLatest(tree.root)).toBe(true);
    await act(async () => {
      call(list, 'onScroll', scrollEvent(828));
    });
    expect(hasLatest(tree.root)).toBe(false);
  });

  it('cancels synchronously before content and viewability callbacks in the same event turn', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list);
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      call(list, 'onScrollBeginDrag');
      call(list, 'onContentSizeChange', 100, 1200);
      call(list, 'onCommitLayoutEffect');
      viewKeys(list, ['a']);
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('uses one smooth measured command for append, without FlashList index/end helpers', async () => {
    const view = (append: boolean) => (
      <MessageList
        messages={append ? [message('a'), message('b')] : [message('a')]}
        currentUserId="me"
        change={{ sequence: append ? 2 : 1, kind: append ? 'append' : 'initial' }}
      />
    );
    const tree = await render(view(false));
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 200);
      viewKeys(list, ['a']);
      call(list, 'onScroll', scrollEvent(100, 200));
    });
    mockScrollToOffset.mockClear();
    await act(async () => {
      tree.update(view(true));
    });
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 300);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 200, animated: true });
    expect(mockScrollToIndex).not.toHaveBeenCalled();
    expect(mockScrollToEnd).not.toHaveBeenCalled();
  });

  it('aborts a delayed Latest reload and keeps the old window after a drag', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValueOnce(page([message('a')], { hasMoreAfter: true }));
    const pending = deferred<ReturnType<typeof page>>();
    mock.loadLatest.mockReturnValueOnce(pending.promise);
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
      </TalkentryProvider>,
    );
    await act(async () => {
      call(pressableByLabel(tree.root, 'Jump to latest messages'), 'onPress');
      await flush();
    });
    const command = mock.loadLatest.mock.calls[1]![0] as { signal: AbortSignal };
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onScrollBeginDrag');
      await flush();
    });
    expect(command.signal.aborted).toBe(true);
    await act(async () => {
      pending.resolve(page([message('z')]));
      await flush();
    });
    expect(tree.root.findByType('FlashList').props.data).toEqual(expect.arrayContaining(['a']));
    expect(tree.root.findByType('FlashList').props.data).not.toEqual(expect.arrayContaining(['z']));
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('deduplicates Latest taps and sends controlled hosts an abort signal', async () => {
    jest.useFakeTimers();
    const pending = deferred<boolean>();
    const load = jest.fn((_signal: AbortSignal) => pending.promise);
    const tree = await render(
      <MessageList messages={[message('a')]} currentUserId="me" hasMoreAfter onGoToLatest={load} />,
    );
    await act(async () => {
      const button = pressableByLabel(tree.root, 'Jump to latest messages');
      call(button, 'onPress');
      call(button, 'onPress');
      await flush();
    });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onScrollBeginDrag');
    });
    expect(load.mock.calls[0]![0].aborted).toBe(true);
    await act(async () => {
      pending.resolve(true);
      await flush();
    });
    expect(mockScrollToOffset).not.toHaveBeenCalled();
  });

  it('automatically requests an older cursor once and never renders Load earlier', async () => {
    const pending = deferred<boolean>();
    const load = jest.fn(() => pending.promise);
    const tree = await render(
      <MessageList messages={[message('a')]} currentUserId="me" hasMoreBefore onLoadOlder={load} />,
    );
    const list = tree.root.findByType('FlashList');
    expect(
      tree.root
        .findAllByType('Pressable')
        .some((item) => item.props.accessibilityLabel === 'Load older messages'),
    ).toBe(false);
    await act(async () => {
      call(list, 'onStartReached');
      call(list, 'onStartReached');
      await flush();
    });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(true);
      await flush();
      call(list, 'onStartReached');
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('offers explicit error retry without an automatic retry storm', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true);
    const tree = await render(
      <MessageList messages={[message('a')]} currentUserId="me" hasMoreBefore onLoadOlder={load} />,
    );
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onStartReached');
      await flush();
    });
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onStartReached');
      await flush();
    });
    expect(load).toHaveBeenCalledTimes(1);
    await act(async () => {
      call(pressableByLabel(tree.root, 'Retry loading history'), 'onPress');
      await flush();
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('honors a custom null header instead of bringing back a fallback control', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        hasMoreBefore
        loading
        renderListHeader={() => null}
      />,
    );
    expect(tree.root.findByType('FlashList').props.ListHeaderComponent).toBeNull();
  });

  it('decrements unread by observed IDs and does not restore them on scrolling back', async () => {
    jest.useFakeTimers();
    const read = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b'), message('c')]}
        currentUserId="me"
        hasMoreAfter
        firstUnreadId="b"
        onMessagesRead={read}
      />,
    );
    const list = tree.root.findByType('FlashList');
    expect(hasUnread(tree.root, 2)).toBe(true);
    await act(async () => {
      measureList(list, 300);
      call(list, 'onScroll', scrollEvent(75, 300));
      viewKeys(list, ['b']);
      await jest.advanceTimersByTimeAsync(249);
    });
    expect(read).not.toHaveBeenCalled();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(read).toHaveBeenLastCalledWith(['b']);
    expect(hasUnread(tree.root, 1)).toBe(true);
    await act(async () => {
      call(list, 'onScroll', scrollEvent(125, 300));
      viewKeys(list, ['c']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(read).toHaveBeenLastCalledWith(['c']);
    expect(hasUnread(tree.root, 1)).toBe(false);
    await act(async () => {
      call(list, 'onScroll', scrollEvent(75, 300));
      viewKeys(list, ['b']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(read).toHaveBeenCalledTimes(2);
    expect(hasUnread(tree.root, 2)).toBe(false);
  });

  it('requires continuous dwell and excludes own/system rows', async () => {
    jest.useFakeTimers();
    const read = jest.fn();
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b', { senderId: 'me' }), message('c', { system: true })]}
        currentUserId="me"
        onMessagesRead={read}
      />,
    );
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 300, 300);
      viewKeys(list, ['a', 'b', 'c']);
      await jest.advanceTimersByTimeAsync(200);
      viewKeys(list, []);
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(read).not.toHaveBeenCalled();
    await act(async () => {
      viewKeys(list, ['a', 'b', 'c']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(['a']);
  });

  it('does not read covered rows, inactive screens, or backgrounded apps', async () => {
    jest.useFakeTimers();
    const read = jest.fn();
    const messages = [message('a'), message('b'), message('c')];
    const view = (isActive: boolean) => (
      <MessageList
        messages={messages}
        currentUserId="me"
        isActive={isActive}
        viewportTopInset={100}
        contentBottomInset={100}
        onMessagesRead={read}
      />
    );
    const tree = await render(view(false));
    const list = tree.root.findByType('FlashList');
    await act(async () => {
      measureList(list, 300, 300);
      viewKeys(list, ['a', 'b', 'c']);
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(read).not.toHaveBeenCalled();
    await act(async () => {
      mockAppStateListeners.forEach((listener) => listener('background'));
      tree.update(view(true));
      await jest.advanceTimersByTimeAsync(300);
    });
    expect(read).not.toHaveBeenCalled();
    await act(async () => {
      mockAppStateListeners.forEach((listener) => listener('active'));
      await jest.advanceTimersByTimeAsync(250);
    });
    // a lies in the clipped top strip; b and c remain in the reading area.
    expect(read).toHaveBeenCalledWith(['b', 'c']);
  });

  it('never writes provider receipts from a controlled list and leaves a controlled total to its host', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    const read = jest.fn();
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList
          messages={[message('a')]}
          currentUserId="me"
          hasMoreAfter
          unreadCount={7}
          onMessagesRead={read}
        />
      </TalkentryProvider>,
    );
    await act(async () => {
      const list = tree.root.findByType('FlashList');
      measureList(list, 100);
      viewKeys(list, ['a']);
      await jest.advanceTimersByTimeAsync(250);
    });
    expect(read).toHaveBeenCalledWith(['a']);
    expect(mock.updateReceipts).not.toHaveBeenCalled();
    expect(hasUnread(tree.root, 7)).toBe(true);
  });
});

describe('UI contracts with explicit native doubles', () => {
  it('waits for measured tail acknowledgement and follows later height growth smoothly', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onLayout', {
        nativeEvent: { layout: { height: 100 } },
      });
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1000);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
    const scroll = (offset: number, height: number) => ({
      nativeEvent: {
        contentOffset: { y: offset },
        contentSize: { height },
        layoutMeasurement: { height: 100 },
      },
    });
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onScroll', scroll(900, 1000));
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1200);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(2);
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onViewableItemsChanged', {
        viewableItems: [{ item: 'a', isViewable: true }],
      });
      call(tree.root.findByType('FlashList'), 'onScroll', scroll(1100, 1200));
    });
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1300);
    });
    expect(mockScrollToOffset).toHaveBeenCalledTimes(3);
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 1200, animated: true });
  });
  it('does not publish an old send error callback after a scope change', async () => {
    const mock = mockAdapter();
    const pending = deferred<ReturnType<typeof message>>();
    mock.send.mockReturnValue(pending.promise);
    const error = jest.fn();
    const view = (chatId: string) => (
      <TalkentryProvider adapter={mock.adapter} chatId={chatId} currentUserId="me">
        <Composer onError={error} />
      </TalkentryProvider>
    );
    const tree = await render(view('A'));
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'old');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
    });
    await act(async () => {
      tree.update(view('B'));
      await flush();
    });
    pending.reject(new Error('old error'));
    await act(async () => {
      await flush();
    });
    expect(error).not.toHaveBeenCalled();
  });
  it('resets a connected draft on chat change', async () => {
    const mock = mockAdapter();
    const view = (chatId: string) => (
      <TalkentryProvider adapter={mock.adapter} chatId={chatId} currentUserId="me">
        <Composer />
      </TalkentryProvider>
    );
    const tree = await render(view('A'));
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'private draft');
    });
    expect(tree.root.findByType('TextInput').props.value).toBe('private draft');
    await act(async () => {
      tree.update(view('B'));
    });
    expect(tree.root.findByType('TextInput').props.value).toBe('');
  });
  it('keeps input editable during send and does not clear newly typed text', async () => {
    const task = deferred<void>();
    const tree = await render(<Composer onSend={() => task.promise} />);
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'first');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
    });
    expect(tree.root.findByType('TextInput').props.editable).toBe(true);
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'next');
    });
    await act(async () => {
      task.resolve();
      await flush();
    });
    expect(tree.root.findByType('TextInput').props.value).toBe('next');
  });
  it('keeps the failed draft and exposes a localized retry error', async () => {
    const onError = jest.fn();
    const tree = await render(
      <Composer
        locale="en"
        onError={onError}
        onSend={async () => {
          throw new Error('secret');
        }}
      />,
    );
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'draft text');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, 'Send message'), 'onPress');
      await flush();
    });
    expect(tree.root.findByType('TextInput').props.value).toBe('draft text');
    expect(onError).toHaveBeenCalledTimes(1);
    const alerts = tree.root
      .findAllByType('Text')
      .filter((n) => n.props.accessibilityRole === 'alert');
    expect(alerts[0]?.props.children).toBe('Could not send. Try again.');
  });
  it('loads the latest window before issuing its scroll intent', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    const result = deferred<ReturnType<typeof page>>();
    mock.loadLatest
      .mockResolvedValueOnce(page([message('a')], { hasMoreAfter: true }))
      .mockReturnValue(result.promise);
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList />
      </TalkentryProvider>,
    );
    const button = tree.root
      .findAllByType('Pressable')
      .find((p) => p.props.accessibilityLabel === 'Jump to latest messages')!;
    await act(async () => {
      call(button, 'onPress');
      await flush();
    });
    expect(tree.root.findByType('FlashList').props.data).toEqual(expect.arrayContaining(['a']));
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => {
      result.resolve(page([message('z')]));
      await flush();
    });
    expect(tree.root.findByType('FlashList').props.data).toEqual(expect.arrayContaining(['z']));
    expect(mockScrollToEnd).not.toHaveBeenCalled();
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onLayout', {
        nativeEvent: { layout: { height: 100 } },
      });
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 1000);
    });
    expect(mockScrollToOffset).toHaveBeenCalled();
  });
  it('controlled mode never falls through to a provider-owned load handler', async () => {
    const mock = mockAdapter();
    const own = jest.fn();
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList messages={[message('a')]} currentUserId="me" hasMoreBefore onLoadOlder={own} />
      </TalkentryProvider>,
    );
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onStartReached');
    });
    expect(own).toHaveBeenCalledTimes(1);
    expect(mock.loadBefore).not.toHaveBeenCalled();
  });
  it('uses renderMessage slot instead of the default bubble', async () => {
    const renderMessage = jest.fn(({ message: row }) => <Text>{`slot:${row?.id}`}</Text>);
    const tree = await render(
      <MessageList
        messages={[message('a')]}
        currentUserId="me"
        renderMessage={renderMessage}
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    const renderItem = list.props.renderItem as (info: { item: string; index: number }) => {
      props: { children: [{ props: { children: string } }] };
    };
    // Index 0 is the day separator; message `a` follows.
    const row = renderItem({ item: 'a', index: 1 });
    expect(renderMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.objectContaining({ id: 'a' }),
        currentUserId: 'me',
        index: 1,
      }),
    );
    expect(row.props.children[0].props.children).toBe('slot:a');
  });
  it('draws a host bubble body inside long-press and a host swipe hint', async () => {
    const renderMessageBody = jest.fn(() => <Text>custom-body</Text>);
    const renderSwipeHint = jest.fn(() => <Text>custom-hint</Text>);
    const tree = await render(
      <MessageList
        messages={[message('a', { text: 'hello' })]}
        currentUserId="me"
        renderMessageBody={renderMessageBody}
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const list = tree.root.findByType('FlashList');
    const renderItem = list.props.renderItem as (info: {
      item: string;
      index: number;
    }) => ReactElement;
    const row = await render(renderItem({ item: 'a', index: 1 }));
    expect(renderMessageBody).toHaveBeenCalledWith(
      expect.objectContaining({
        isMine: false,
        timeLabel: expect.any(String),
        status: 'sent',
        groupedWithPrevious: false,
        showSenderHeader: true,
        message: expect.objectContaining({ id: 'a', text: 'hello' }),
      }),
    );
    const bodyText = row.root.findAllByType('Text').map((node) => node.props.children);
    expect(bodyText).toContain('custom-body');
    expect(bodyText).not.toContain('hello');
    const pressable = row.root.findByType('Pressable');
    expect(typeof pressable.props.onLongPress).toBe('function');
    expect(pressable.props.style).toEqual(expect.objectContaining({ maxWidth: '80%' }));
    expect(pressable.props.style).not.toEqual(
      expect.objectContaining({ backgroundColor: expect.any(String) }),
    );

    const hintTree = await render(
      <MessageBubble
        message={message('b')}
        currentUserId="other"
        onReply={() => undefined}
        renderSwipeHint={renderSwipeHint}
      />,
    );
    expect(renderSwipeHint).toHaveBeenCalledWith(
      expect.objectContaining({ progress: { kind: 'animated' } }),
    );
    const hintText = hintTree.root.findAllByType('Text').map((node) => node.props.children);
    expect(hintText).toContain('custom-hint');
    expect(hintText).not.toContain('↩');
  });
  it('calls a host long-press handler instead of opening the built-in sheet', async () => {
    const onLongPress = jest.fn();
    const tree = await render(
      <MessageBubble
        message={message('a', { text: 'hello' })}
        currentUserId="me"
        onReply={() => undefined}
        onLongPress={onLongPress}
      />,
    );
    await act(async () => {
      call(tree.root.findByType('Pressable'), 'onLongPress');
    });
    expect(onLongPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', text: 'hello' }));
  });
  it('reports a tap with a bubble measure for the menu anchor', async () => {
    const onPress = jest.fn();
    const tree = await render(
      <MessageBubble
        message={message('a', { text: 'hello' })}
        currentUserId="me"
        onPress={onPress}
      />,
    );
    await act(async () => {
      call(tree.root.findByType('Pressable'), 'onPress');
    });
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a' }),
      expect.any(Function),
    );
  });
  it('toggles the viewer reaction from its chip under the bubble', async () => {
    const onReact = jest.fn();
    const onPress = jest.fn();
    const tree = await render(
      <MessageBubble
        message={message('a', { text: 'hello', reactions: [{ emoji: '❤️', userIds: ['me'] }] })}
        currentUserId="me"
        onReact={onReact}
        onPress={onPress}
      />,
    );
    await act(async () => {
      call(pressableByLabel(tree.root, '❤️ 1'), 'onPress');
    });
    expect(onReact).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), '❤️');
    expect(onPress).not.toHaveBeenCalled();
  });
  it('scrolls to focusKey after an around navigation change', async () => {
    mockScrollToIndex.mockClear();
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b'), message('c')]}
        currentUserId="me"
        change={{ sequence: 2, kind: 'around', focusKey: 'b' }}
      />,
    );
    expect(mockScrollToOffset).not.toHaveBeenCalled();
    await act(async () => {
      call(tree.root.findByType('FlashList'), 'onLayout', {
        nativeEvent: { layout: { height: 100 } },
      });
      call(tree.root.findByType('FlashList'), 'onContentSizeChange', 100, 300);
    });
    // Day separator occupies index 0; b is centered using its measured layout.
    expect(mockScrollToOffset).toHaveBeenLastCalledWith({ offset: 75, animated: true });
    expect(mockScrollToIndex).not.toHaveBeenCalled();
  });

  it('focuses the input when a reply starts and not when the quote is swapped', async () => {
    mockInputFocus.mockClear();
    const send = async () => undefined;
    const tree = await render(<Composer onSend={send} composerFocusKey={0} />);

    expect(mockInputFocus).not.toHaveBeenCalled();

    await act(async () => {
      tree.update(<Composer onSend={send} composerFocusKey={1} />);
    });
    expect(mockInputFocus).toHaveBeenCalledTimes(1);

    mockInputFocus.mockClear();
    await act(async () => {
      tree.update(<Composer onSend={send} composerFocusKey={1} />);
    });
    expect(mockInputFocus).not.toHaveBeenCalled();
  });

  it('applies theme tokens to the composer send control', async () => {
    const theme = mergeTheme({ colors: { accent: '#123456', textOnAccent: '#abcdef' } });
    const tree = await render(
      <TalkentryThemeProvider theme={theme}>
        <Composer onSend={async () => undefined} />
      </TalkentryThemeProvider>,
    );
    const send = pressableByLabel(tree.root, 'Send message');
    expect(send.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#123456' })]),
    );
  });

  it('appends host emoji picks into the composer draft text', async () => {
    const onPickEmoji = jest.fn(async () => '🔥');
    const tree = await render(
      <Composer onSend={async () => undefined} onPickEmoji={onPickEmoji} />,
    );
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'hi');
    });
    const emoji = tree.root
      .findAllByType('Pressable')
      .find((node) => node.props.accessibilityLabel === 'Open emoji or sticker picker')!;
    await act(async () => {
      call(emoji, 'onPress');
      await flush();
    });
    expect(onPickEmoji).toHaveBeenCalledTimes(1);
    expect(tree.root.findByType('TextInput').props.value).toBe('hi🔥');
  });

  it('inserts a built-in emoji at the caret and hides the control when showEmoji is false', async () => {
    const tree = await render(<Composer onSend={async () => undefined} />);
    await act(async () => {
      call(tree.root.findByType('TextInput'), 'onChangeText', 'hi');
      call(tree.root.findByType('TextInput'), 'onSelectionChange', {
        nativeEvent: { selection: { start: 1, end: 1 } },
      });
    });
    await act(async () => {
      call(pressableByLabel(tree.root, 'Open emoji or sticker picker'), 'onPress');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, '😀'), 'onPress');
    });
    expect(tree.root.findByType('TextInput').props.value).toBe('h😀i');

    mockKeyboardListeners.keyboardDidShow?.clear();
    const handoff = await render(<Composer onSend={async () => undefined} />);
    await act(async () => {
      call(pressableByLabel(handoff.root, 'Open emoji or sticker picker'), 'onPress');
    });
    await act(async () => {
      call(pressableByLabel(handoff.root, 'Show keyboard'), 'onPress');
    });
    expect(
      handoff.root
        .findAllByType('Pressable')
        .some((node) => node.props.accessibilityLabel === '😀'),
    ).toBe(true);
    await act(async () => {
      mockKeyboardListeners.keyboardDidShow?.forEach((listener) => {
        listener({ endCoordinates: { height: 320 } });
      });
    });
    expect(
      handoff.root
        .findAllByType('Pressable')
        .some((node) => node.props.accessibilityLabel === '😀'),
    ).toBe(true);

    const hidden = await render(<Composer onSend={async () => undefined} showEmoji={false} />);
    expect(
      hidden.root
        .findAllByType('Pressable')
        .some((node) => node.props.accessibilityLabel === 'Open emoji or sticker picker'),
    ).toBe(false);
  });

  it('shows an unread count on the jump-to-latest button', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b'), message('c')]}
        currentUserId="me"
        firstUnreadId="b"
        hasMoreAfter
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    expect(tree.root.findByType('FlashList').props.data).not.toEqual(
      expect.arrayContaining(['unread']),
    );
    const badge = tree.root.findAllByType('Text').find((node) => node.props.children === '2');
    expect(badge).toBeDefined();
    expect(
      tree.root.findAllByType('View').some((node) => node.props.accessibilityLabel === '2 unread'),
    ).toBe(true);
  });

  it('uses the host unread total instead of the in-window cursor', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b'), message('c')]}
        currentUserId="me"
        firstUnreadId="b"
        unreadCount={12}
        hasMoreAfter
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const badge = tree.root.findAllByType('Text').find((node) => node.props.children === '12');
    expect(badge).toBeDefined();
  });

  it('inserts an unread separator only when the host supplies renderUnread', async () => {
    const tree = await render(
      <MessageList
        messages={[message('a'), message('b'), message('c')]}
        currentUserId="me"
        firstUnreadId="b"
        renderUnread={({ label }) => <Text>{label}</Text>}
        change={{ sequence: 1, kind: 'initial' }}
      />,
    );
    const data = tree.root.findByType('FlashList').props.data as string[];
    const unreadIndex = data.indexOf('unread');
    expect(unreadIndex).toBeGreaterThanOrEqual(0);
    expect(data[unreadIndex + 1]).toBe('b');
  });

  it('publishes scroll-to-latest state for a host button and hides the built-in arrow', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(
      page([message('a'), message('b'), message('c')], { hasMoreAfter: true }),
    );
    let jump: (() => Promise<void>) | undefined;
    const Probe = () => {
      const scroll = useScrollToLatest();
      jump = scroll.jumpToLatest;

      return <Text>{`${scroll.visible}:${scroll.unreadCount}`}</Text>;
    };
    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <MessageList firstUnreadId="b" showScrollToLatest={false} />
        <Probe />
      </TalkentryProvider>,
    );
    await act(async () => {
      await flush();
    });
    expect(
      tree.root
        .findAllByType('Pressable')
        .some((node) => node.props.accessibilityLabel === 'Jump to latest messages'),
    ).toBe(false);
    expect(tree.root.findAllByType('Text').some((node) => node.props.children === 'true:2')).toBe(
      true,
    );
    let task: Promise<void> | undefined;
    await act(async () => {
      task = jump?.();
      await flush();
    });
    await act(async () => {
      await task;
      await flush();
    });
    expect(mock.loadLatest).toHaveBeenCalledTimes(2);
  });

  it('keeps a reply swipe from counting as a list tap', async () => {
    const onListTap = jest.fn();
    const tree = await render(
      <MessageList messages={[message('a')]} currentUserId="me" onListTap={onListTap} />,
    );
    const list = tree.root.findByType('FlashList');
    const touch = (x: number, y: number) => ({ nativeEvent: { pageX: x, pageY: y } });

    await act(async () => {
      call(list, 'onTouchStart', touch(120, 200));
      call(list, 'onTouchMove', touch(40, 200));
      call(list, 'onTouchEnd', touch(40, 200));
    });
    expect(onListTap).not.toHaveBeenCalled();

    await act(async () => {
      call(list, 'onTouchStart', touch(120, 200));
      call(list, 'onTouchEnd', touch(122, 201));
    });
    expect(onListTap).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss chrome for a tap that a bubble already handled', async () => {
    const onListTap = jest.fn();
    const tree = await render(
      <MessageList messages={[message('a')]} currentUserId="me" onListTap={onListTap} />,
    );
    const list = tree.root.findByType('FlashList');
    const touch = (x: number, y: number) => ({ nativeEvent: { pageX: x, pageY: y } });
    const cell = drawCell(list, 'a') as ReactElement;
    const bubble = await render(cell);
    await act(async () => {
      call(list, 'onTouchStart', touch(120, 200));
      call(bubble.root.findByType('Pressable'), 'onPressIn');
      call(list, 'onTouchEnd', touch(122, 201));
    });
    expect(onListTap).not.toHaveBeenCalled();
  });
});

describe('message tap menu', () => {
  const noop = () => undefined;
  const anchor = { x: 10, y: 100, width: 200, height: 40 };
  const host = { width: 390, height: 700 };
  const target = message('m', {
    text: 'hello',
    senderId: 'peer',
    reactions: [{ emoji: '❤️', userIds: ['me'] }],
  });
  const renderMenu = async () => {
    const onReact = jest.fn();
    const onAction = jest.fn();
    const onClose = jest.fn();
    const tree = await render(
      <MessageMenu
        message={target}
        anchor={anchor}
        host={host}
        currentUserId="me"
        locale="en"
        actions={buildMessageActions(target, 'me', 'en', {
          onReply: noop,
          onCopy: noop,
          onForward: noop,
        })}
        quickReactions={['👍', '❤️', '🔥']}
        onReact={onReact}
        onAction={onAction}
        onClose={onClose}
      />,
    );

    return { tree, onReact, onAction, onClose };
  };
  const hasPressable = (root: TestInstance, label: string) =>
    root.findAllByType('Pressable').some((item) => item.props.accessibilityLabel === label);

  it('covers the software keyboard without dismissing it', async () => {
    const { tree } = await renderMenu();
    expect(tree.root.findByType('OverKeyboardView').props.visible).toBe(true);
  });

  it('shows quick reactions over the actions and marks the viewer reaction', async () => {
    const { tree } = await renderMenu();
    expect(pressableByLabel(tree.root, 'Add reaction ❤️').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(pressableByLabel(tree.root, 'Add reaction 👍').props.accessibilityState).toEqual({
      selected: false,
    });
    const items = tree.root
      .findAllByType('Pressable')
      .filter((item) => item.props.accessibilityRole === 'menuitem')
      .map((item) => item.props.accessibilityLabel);
    expect(items).toEqual(['Reply to message', 'Copy message text', 'Forward message']);
  });

  it('reacts from the strip and closes', async () => {
    const { tree, onReact, onClose } = await renderMenu();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Add reaction 👍'), 'onPress');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReact).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }), '👍');
  });

  it('runs an action row', async () => {
    const { tree, onAction } = await renderMenu();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Forward message'), 'onPress');
    });
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'forward' }));
  });

  it('runs an action row from an overlay touch', async () => {
    const { tree, onAction } = await renderMenu();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Forward message'), 'onTouchEnd', {
        stopPropagation() {},
      });
    });
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'forward' }));
  });

  it('returns from the full picker on an outside tap and closes from the menu', async () => {
    const { tree, onReact, onClose } = await renderMenu();
    await act(async () => {
      call(pressableByLabel(tree.root, 'More reactions'), 'onPress');
    });
    expect(hasPressable(tree.root, '😀')).toBe(true);
    expect(hasPressable(tree.root, 'Forward message')).toBe(false);

    await act(async () => {
      call(pressableByLabel(tree.root, 'Back to message actions'), 'onPress');
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(hasPressable(tree.root, 'Forward message')).toBe(true);

    await act(async () => {
      call(pressableByLabel(tree.root, 'More reactions'), 'onPress');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, '😀'), 'onPress');
    });
    expect(onReact).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }), '😀');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop tap from the menu', async () => {
    const { tree, onClose } = await renderMenu();
    await act(async () => {
      call(pressableByLabel(tree.root, 'Cancel'), 'onPress');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays hidden until measured, then anchors next to the bubble', async () => {
    const { tree } = await renderMenu();
    const menuView = () =>
      tree.root
        .findAllByType('View')
        .find((item) => item.props.accessibilityRole === 'menu') as TestInstance;
    const flat = () => Object.assign({}, ...(menuView().props.style as object[]).filter(Boolean));
    expect(flat()).toEqual(expect.objectContaining({ opacity: 0 }));

    await act(async () => {
      call(menuView(), 'onLayout', { nativeEvent: { layout: { width: 240, height: 200 } } });
    });
    expect(flat()).toEqual(
      expect.objectContaining(placeMenu(anchor, { width: 240, height: 200 }, host, false)),
    );
    expect(flat()).not.toEqual(expect.objectContaining({ opacity: 0 }));
  });

  it('lets the host paint the card while the shell keeps the picker and backdrop', async () => {
    const onReact = jest.fn();
    const onClose = jest.fn();
    const renderContent = jest.fn((params: RenderMessageMenuParams) => (
      <Pressable accessibilityLabel="host react" onPress={() => params.onReact('🔥')}>
        <Text>{params.selectedReaction}</Text>
      </Pressable>
    ));
    const tree = await render(
      <MessageMenu
        message={target}
        anchor={anchor}
        host={host}
        currentUserId="me"
        locale="en"
        actions={[]}
        quickReactions={['👍', '🔥']}
        onReact={onReact}
        onAction={noop}
        onClose={onClose}
        renderContent={renderContent}
      />,
    );
    const params = renderContent.mock.calls[0]![0];

    expect(params).toEqual(
      expect.objectContaining({
        isMine: false,
        quickReactions: ['👍', '🔥'],
        selectedReaction: '❤️',
      }),
    );
    expect(hasPressable(tree.root, 'More reactions')).toBe(false);

    await act(async () => {
      params.onExpandReactions();
    });
    expect(hasPressable(tree.root, '😀')).toBe(true);
    expect(hasPressable(tree.root, 'host react')).toBe(false);

    await act(async () => {
      call(pressableByLabel(tree.root, 'Back to message actions'), 'onPress');
    });
    await act(async () => {
      call(pressableByLabel(tree.root, 'host react'), 'onPress');
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReact).toHaveBeenCalledWith(expect.objectContaining({ id: 'm' }), '🔥');
  });
});
