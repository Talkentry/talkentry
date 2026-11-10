# @talkentry/web

Talkentry chat SDK for a React DOM / webpack host. It depends on `@talkentry/core` and must not be installed in the same bundler graph as `@talkentry/react-native`.

> Early release (`0.x`). Prototype `Chat` (list + composer) ships, including a right-click message menu with Telegram-style quick reactions. Built-in colors match the React Native `defaultTheme` (cool-gray canvas, blue outgoing bubbles); wrap Chat in `TalkentryThemeProvider` to override tokens. The composer emoji control sits on the right: hover opens a popover, click pins a sidebar (`showEmoji={false}` hides it). Swipe, keyboard-height emoji dock, and masked quote jumps are not part of this package.

## Install

```bash
npm install @talkentry/web
```

Peer dependencies: `react`, `react-dom`. Do not add `react-native`, `react-native-web`, or `socket.io-client` to use this package.

```tsx
import type { ChatAdapter } from '@talkentry/core';
import { Chat, TalkentryProvider, TalkentryThemeProvider } from '@talkentry/web';

declare const adapter: ChatAdapter;

export const App = () => (
  <TalkentryProvider adapter={adapter} chatId="support" currentUserId="user-1" scopeKey="session-1">
    <TalkentryThemeProvider>
      <Chat locale="en" />
    </TalkentryThemeProvider>
  </TalkentryProvider>
);
```

`adapter` is your `ChatAdapter`. A client for the reference server lives in the `chat-example` repository under `adapter/web`. A runnable demo is `chat-example/apps/web`. That is not a bank-host webpack acceptance.

## License

[MIT](LICENSE)
