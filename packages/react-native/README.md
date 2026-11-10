# @talkentry/react-native

A React Native chat screen on top of `@talkentry/core`. You get `TalkentryProvider`, a `Chat` with a message list and composer, and hooks if you want to draw the list yourself. Auth, your backend, and anything that must survive a restart stay in the app.

This is a `0.x` release. The screen works in tests with doubles. It has not been accepted on a physical device, and the API can still change.

## Install

```bash
npm install @talkentry/react-native
```

`@talkentry/core` comes with it. Also install the peer dependencies at the versions in `package.json`: `react`, `react-native`, `@shopify/flash-list`, `react-native-keyboard-controller`, `react-native-reanimated`, and `react-native-safe-area-context`.

This package does not include a backend client or transport implementation. Pass your application's `ChatAdapter`; see the [adapter guide](../core/README.md#write-an-adapter).

## Show a chat

The screen requires `KeyboardProvider` and `SafeAreaProvider`, included below. `scopeKey` is part of the session identity: change it when the tenant or login changes, even if `chatId` and `currentUserId` stay the same.

```tsx
import { Chat, TalkentryProvider, type ChatAdapter } from '@talkentry/react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

declare const adapter: ChatAdapter;

export const ChatScreen = () => (
  <SafeAreaProvider>
    <KeyboardProvider>
      <TalkentryProvider
        adapter={adapter}
        chatId="support"
        currentUserId="user-1"
        scopeKey="tenant-1:auth-session-1"
      >
        <Chat locale="en" />
      </TalkentryProvider>
    </KeyboardProvider>
  </SafeAreaProvider>
);
```

`declare const adapter` is a type placeholder, not a runtime implementation. Replace it with an import or initialization of your application's stable adapter instance. The `ChatAdapter` contract, including `capabilities`, is documented in the [core guide](../core/README.md#write-an-adapter).

`locale` is `en` today. Pass `users` when you have display names or avatars. Pass `onCopy` if the Copy action should do something; without it the copy control is hidden.

## Your own list

`useMessages()` returns `messageKeys` and the loading state. Read one row with `useMessage(key)`. Do not use the server id as the React key for an optimistic send: the key has to stay put when the server id arrives.

```tsx
import { useMessage, useMessages } from '@talkentry/react-native';
import { Text } from 'react-native';

const MessageRow = ({ messageKey }: { messageKey: string }) => {
  const message = useMessage(messageKey);
  return message ? <Text>{message.text}</Text> : null;
};

export const CustomList = () => {
  const { messageKeys } = useMessages();
  return messageKeys.map((messageKey) => <MessageRow key={messageKey} messageKey={messageKey} />);
};
```

`Chat` also takes render slots (`renderMessage`, `renderMessageBody`, `renderComposer`, and others). A custom message must forward `onQuotePress` and `onNavigationFocus`, or quote navigation and focus will not run.

## Theme

`TalkentryThemeProvider` sits inside the provider. `theme` replaces tokens, `themeOverride` patches them. Colors, type, radii, and spacing for the built-in screen come from that theme.

```tsx
import { Chat, TalkentryThemeProvider } from '@talkentry/react-native';

<TalkentryThemeProvider themeOverride={{ colors: { bubbleMine: '#3390EC' } }}>
  <Chat locale="en" />
</TalkentryThemeProvider>;
```

## Scrolling and read receipts

A finger on the list cancels automatic scrolling, including a jump that was already in flight. Sending a message asks the list to follow the tail, but an active gesture or a screen that is not focused wins.

`messageListProps.isActive` should follow navigation focus. `false` stops both scrolling and read receipts. `readEnabled={false}` pauses read receipts only.

Delivered and read are different. The screen can mark incoming messages read after they sit visible and unobscured for a short dwell. That local observation is not proof the server stored it. The badge on the scroll-to-latest button counts new messages in the open window. A total unread count for the whole history belongs to your app.

## License

[MIT](LICENSE)
