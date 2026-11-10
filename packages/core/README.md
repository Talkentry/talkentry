# @talkentry/core

Headless chat session for a host app. It keeps one canonical message store, a bounded history window, and the viewport decisions (follow the tail, jump to a quote, cancel when the user scrolls). It does not render anything and it does not talk to your backend by itself.

If you want a screen, install `@talkentry/react-native` or `@talkentry/web`. Those packages already depend on this one. Use `@talkentry/core` directly when you are writing a `ChatAdapter`, or when you need a `ChatSession` without React.

This is a `0.x` release. Names and fields can still change.

## Install

```bash
npm install @talkentry/core
```

The package ships JavaScript, TypeScript declarations, and the original sources. There is no React peer dependency.

The current JavaScript output is consumed through a bundler. Direct native Node.js ESM imports fail because the output contains extensionless relative imports and directory imports; see the [current limitations](../../README.md#current-limitations) before using it in a Node.js host or SSR integration.

## Open a session

`start()` loads the latest page and subscribes to live events. `stop()` drops that subscription. One session belongs to one chat, one user, and one `scopeKey`. Change `scopeKey` when the tenant or auth session changes, and construct a new `ChatSession`.

```ts
import { ChatSession } from '@talkentry/core';

const session = new ChatSession({
  adapter,
  chatId: 'support',
  currentUserId: 'user-1',
  scopeKey: 'tenant-1:auth-session-1',
});

const unsubscribe = session.subscribe(() => {
  const snapshot = session.getSnapshot();
  // snapshot.window is the timeline the UI should render
});

session.start();

await session.send({ text: 'Hello', localId: 'local-1' });

session.stop();
unsubscribe();
```

`send()` accepts the message locally before the server answers. The returned promise settles when the adapter finishes, not when the row first appears. `getSnapshot()` is the state to render. `messageStore` is the same data if you need a single message by key.

## Write an adapter

`ChatAdapter` is the only backend boundary. You own auth, HTTP or sockets, persistence, and the durable outbox. The session will not invent those.

`capabilities` must match what you actually implement. A `true` flag with a missing method, or a fake empty page for an operation you cannot do, will desync the window. Pages are oldest to newest. `subscribe` returns a function that stops delivery for that listener. `fetchLatest`, `fetchOlder`, and `postMessage` below are your functions.

```ts
import {
  type ChatAdapter,
  type ChatEvent,
  ChatEventType,
  type Message,
  MessageStatus,
} from '@talkentry/core';

const listeners = new Set<(event: ChatEvent) => void>();

const adapter: ChatAdapter = {
  capabilities: {
    loadBefore: true,
    loadAfter: false,
    loadAround: false,
    deliveryReceipts: false,
    readReceipts: false,
    editMessage: false,
    deleteMessage: false,
    uploadAttachment: false,
    reactions: false,
    threads: false,
    reconcileMessages: false,
    typingIndicators: false,
    loadEvents: false,
  },

  async loadLatest({ chatId, limit = 30 }) {
    const messages = await fetchLatest(chatId, limit);
    return {
      messages,
      hasMoreBefore: messages.length === limit,
      hasMoreAfter: false,
    };
  },

  async loadBefore({ chatId, beforeId, limit = 30 }) {
    const messages = await fetchOlder(chatId, beforeId, limit);
    return {
      messages,
      hasMoreBefore: messages.length === limit,
      hasMoreAfter: false,
    };
  },

  async send(command) {
    const saved = await postMessage(command);
    emit({
      type: ChatEventType.MessageAdded,
      chatId: command.chatId,
      message: saved,
    });
    return saved;
  },

  subscribe(_chatId, listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

const emit = (event: ChatEvent) => {
  for (const listener of listeners) listener(event);
};
```

A stored row needs `id`, `chatId`, `senderId`, and `createdAt` in Unix milliseconds. `revision` and `sequence` are how the session orders and updates that row later. `localId` is the stable id for an optimistic send. Status, when you have it, is `sending | sent | delivered | read | failed`.

Live updates use `ChatEventType`: `message.added`, `message.updated`, `message.removed`, `message.status`, `typing.updated`, and `history.invalidated` when the stream lost continuity.

## What stays in your app

Auth headers, tenancy, retries that must survive a process restart, and unread totals across chats are not in this package. The session only remembers the open window, pending sends, and deletions it has seen. If the deletion log overflows, it will not silently allow a removed message to come back.

## License

[MIT](LICENSE).
