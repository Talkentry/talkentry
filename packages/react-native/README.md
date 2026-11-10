# @talkentry/react-native

Customizable, backend-agnostic chat SDK for React Native. Session, store, timeline, and viewport live in `@talkentry/core` and are re-exported here with a ready `Chat` screen; your app keeps auth, transport, and persistence.

> Early release (`0.x`). The API can still change between minor versions. Production, native, and security acceptance are not complete.

## Install

```bash
npm install @talkentry/react-native
```

`@talkentry/core` is installed transitively. Host Chat screens import this package, not the core package directly.

Peer dependencies: `react`, `react-native`, `@shopify/flash-list`, `react-native-keyboard-controller`, `react-native-reanimated`, `react-native-worklets` (`0.13.x`), `react-native-safe-area-context`. This package does not depend on Socket.IO.

The keyboard dock calls `scheduleOnRN` from `react-native-worklets`. Install that package directly; `0.13.x` is the peer range required by `react-native-reanimated` 4.7. Add `react-native-reanimated/plugin` as the last Babel plugin. In Reanimated 4.7 that plugin is the Worklets transform, so do not add `react-native-worklets/plugin` as well.

## Quick start

```tsx
import { Chat, TalkentryProvider, type ChatAdapter } from '@talkentry/react-native';

declare const adapter: ChatAdapter;

export const ChatScreen = () => (
  <TalkentryProvider
    adapter={adapter}
    chatId="support"
    currentUserId="user-1"
    scopeKey="tenant-1:session-1"
  >
    <Chat locale="en" />
  </TalkentryProvider>
);
```

Wrap the screen in `KeyboardProvider` and `SafeAreaProvider`. `adapter` is your `ChatAdapter`. A client for the reference server lives in the `chat-example` repository under `adapter/native`.

## Customization

- `TalkentryThemeProvider` with `theme` / `themeOverride` for colors, radii, and typography.
- `Chat` slots: `renderMessageBody`, `renderComposer`, `renderSwipeHint`.
- `useMessages()` and `useMessage(key)` to build a fully custom list.

## Scrolling and reads

Manual gestures cancel automatic navigation. The latest button uses a 216/72 layout-unit
show/hide hysteresis; initial positioning is immediate, while following and explicit Latest
use animated measured offsets.

A newly accepted local send requests the current latest tail before server acknowledgement,
including from history. An active gesture or inactive screen still takes priority. ACKs,
own realtime echoes, and retries do not replay the acceptance event.

Connected lists subscribe automatically. Controlled lists can pass `scopeKey`,
`subscribeLocalSendAccepted`, and `onGoToLatest(signal)`; the source is synchronous,
scoped, monotonically sequenced, and must not replay old events. `ChatSession` exposes
`subscribeLocalSendAccepted`; headless `useViewport` provides `onLocalSendAccepted`.

`onNavigationChange` observes pending/executing/settled/cancelled/failed snapshots.
Bounded execution failures expose a retry control, separate from sending and history errors.
`isActive={false}` stops navigation and reading; `readEnabled={false}` pauses read dwell
only, allowing keyboard/layout following to continue.
Detached accepted messages use bounded in-memory key staging, not a durable outbox;
`maxPendingSends` independently caps in-flight and staged sends (default 16 each).
The scroll-to-latest button does not use a skeleton: it animates to the tail
across messages already in the window. If the tail is missing, the latest page
loads first and the list is placed there without flying across the gap. A locally
accepted send still animates only when near; a far one relocates immediately.
Quote jumps still use an opaque skeleton cover, non-animated relocation, real
destination layout admission, and a short reveal. `maskedJumps` controls the
provisional 50-message / 12-viewport thresholds for those quote jumps; set
`enabled: false` for comparison. Manual scrolling is unchanged, and Reduce Motion
is respected.

Tapping a quote navigates locally when possible or uses `loadAround` for a remote
original. Controlled hosts provide `onGoToMessage(id, signal)` and an around change.
Custom `renderMessage` slots forward `onQuotePress` and `onNavigationFocus` to
MessageBubble. Missing targets do not replace the old window, and hidden skeleton
cells never count as read. Native frame-time, memory, and accessibility acceptance
remain open despite the renderer-contract tests.

Connected lists send read receipts only for incoming messages observed in the foreground,
unobscured viewport for 250 ms. Pass navigation focus through `messageListProps.isActive`.
`onMessagesRead(ids)` reports local observation, not successful server acknowledgement.
Your app owns durable read state and must update a controlled `unreadCount` itself.

Without a host total/cursor, the badge tracks new incoming messages in the retained window,
not all server unread history. Controlled lists never send receipts through an ambient provider;
their `onGoToLatest(signal)` handler must honor cancellation before committing fetched data.
Headless hosts can explicitly call `useMessages().markReadMessages(ids)`.

## Links

- Source, docs, and example app: [github.com/talkentry/talkentry](https://github.com/talkentry/talkentry)
- Reference backend: [github.com/talkentry/talkentry-server](https://github.com/talkentry/talkentry-server)

## License

[MIT](LICENSE)
