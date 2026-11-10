# @talkentry/web

A DOM chat screen for React. It is the same session model as `@talkentry/core`, with a list, a composer, and a right-click message menu. It does not use React Native or `react-native-web`. Do not put this package and `@talkentry/react-native` in one bundle.

This is a `0.x` release. The `Chat` screen is a working prototype: the API can still change, and it has not been accepted inside a production webpack host.

## Install

```bash
npm install @talkentry/web
```

Peer dependencies are `react` and `react-dom`. `@talkentry/core` is a normal dependency and will be installed with the package.

This package does not include a backend client or transport implementation. Pass your application's `ChatAdapter`; see the [adapter guide](../core/README.md#write-an-adapter).

The current JavaScript output requires a browser bundler. Direct native Node.js ESM imports fail because the package output contains unresolved relative imports; see the [current limitations](../../README.md#current-limitations) before using SSR.

## Show a chat

`scopeKey` is part of the session. Change it when the login or tenant changes, even if the chat id stays the same.

```tsx
import type { ChatAdapter } from '@talkentry/core';
import { Chat, TalkentryProvider, TalkentryThemeProvider } from '@talkentry/web';

declare const adapter: ChatAdapter;

export const App = () => (
  <TalkentryProvider
    adapter={adapter}
    chatId="support"
    currentUserId="user-1"
    scopeKey="tenant-1:auth-session-1"
  >
    <TalkentryThemeProvider>
      <Chat locale="en" />
    </TalkentryThemeProvider>
  </TalkentryProvider>
);
```

`declare const adapter` is a type placeholder, not a runtime implementation. Replace it with an import or initialization of your application's stable adapter instance. Its contract is `ChatAdapter` from `@talkentry/core`.

`TalkentryThemeProvider` is optional. Without it, `Chat` uses the built-in theme: a cool-gray canvas and blue outgoing bubbles, the same defaults as the React Native package. `themeOverride` patches those tokens.

Give the containing element a definite height, such as `height: 100dvh` for a full-page chat. The screen fills its container; a flex parent should also allow it to shrink with `min-height: 0`.

## What this screen includes

The composer sits under the list. The emoji control is on the right: hover opens a popover, click pins a sidebar. `showEmoji={false}` hides it.

Right-click a message for the menu, including quick reactions. There is no swipe-to-reply, no keyboard-height emoji dock, and no masked jump when you follow a quote. Those belong to `@talkentry/react-native`.

`locale` is `en`.

## Your own list

`useMessages()` gives you `messageKeys`. `useMessage(key)` subscribes to one row. Keep that key: it does not change when an optimistic send receives its server id.

```tsx
import { useMessage, useMessages } from '@talkentry/web';

const Row = ({ messageKey }: { messageKey: string }) => {
  const message = useMessage(messageKey);
  return <p>{message?.text}</p>;
};

export const CustomList = () => {
  const { messageKeys } = useMessages();
  return messageKeys.map((messageKey) => <Row key={messageKey} messageKey={messageKey} />);
};
```

`Chat` accepts render slots such as `renderMessage` and `renderComposer`. A custom message should still call `onQuotePress` when the quote is pressed, or the jump will not happen.

## License

[MIT](LICENSE)
