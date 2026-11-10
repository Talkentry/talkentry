# @talkentry/core

Platform-agnostic Talkentry session, message store, timeline window, and viewport coordinator. UI shells (`@talkentry/react-native`, `@talkentry/web`) depend on this package. Host apps normally install a UI package instead of this one. The web package includes a DOM Chat and Provider/hooks without a React Native dependency.

> Early release (`0.x`). The API can still change between minor versions.

## Install

```bash
npm install @talkentry/core
```

Host screens should use `@talkentry/react-native` or `@talkentry/web`. Import `@talkentry/core` only when you need `ChatAdapter` types or a headless `ChatSession`.

## License

[MIT](LICENSE)
