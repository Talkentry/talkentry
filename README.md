https://github.com/user-attachments/assets/41535f32-4c2b-4030-b18d-880b406dec2d

https://github.com/user-attachments/assets/767b0231-8f65-4b72-b593-b537f10edc3f

https://github.com/user-attachments/assets/0004e9ec-fc7a-4afe-adf2-037f977a83e4

# chat-public

`chat-public` is the public source repository for the `@talkentry` chat SDK packages for React Native and React DOM. The SDK combines a shared, framework-independent message session with separate native and browser interfaces, so your application can keep control of its backend and presentation.

> Early release: the packages are version `0.0.1`, and APIs may change between releases. Device performance, browser compatibility, accessibility, and production backend integration still require validation in your application.

## Packages

| Package                   | Purpose                                                                                                        | Guide                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `@talkentry/core`         | Message and adapter contracts, session lifecycle, normalized message store, history window, and viewport state | [Core README](packages/core/README.md)                 |
| `@talkentry/react-native` | Native chat components, FlashList-based message list, keyboard integration, theme tokens, and render slots     | [React Native README](packages/react-native/README.md) |
| `@talkentry/web`          | React DOM chat components, session hooks, theme tokens, and render slots without React Native dependencies     | [Web README](packages/web/README.md)                   |

The UI packages depend on the shared core. They do not include a backend client or transport implementation. Your application supplies a `ChatAdapter` for its backend; see the [adapter guide](packages/core/README.md#write-an-adapter).

## What you can build

- **Chat interfaces:** a message list and composer with reply drafts, editing, deletion, attachments, emoji, reactions, and typing indicators. Backend-dependent actions require matching adapter capabilities; file picking and application-specific actions belong to the host.
- **Custom presentation:** use the built-in components, override theme tokens, replace individual render slots, or build a screen from the session hooks.
- **Bounded message history:** load older and newer pages while keeping an active message cache rather than an unlimited conversation in memory. Message rows subscribe by stable UI keys, including during optimistic-send reconciliation.
- **Native navigation:** follow the latest messages, return to the latest page, or navigate to a quoted message with context loading and focus feedback. The browser renderer has its own implementation and does not promise native gesture or transition parity.

Talkentry does not include a messaging server, authentication service, database, durable offline outbox, or global unread-count service. Authorization, tenant isolation, persistence, idempotency, and transport security must be enforced by your application and backend.

## Repository scope

This repository contains SDK packages and their verification tooling, not a runnable application host. Application hosts and local integration infrastructure belong to the separate `playground` project alongside the chat server; there is no application start command in this repository.

The package names remain `@talkentry/core`, `@talkentry/react-native`, and `@talkentry/web`. `chat-public` names the source repository, not a fourth publishable package.

## Integrate with your application

Start with the platform package guide: [React Native](packages/react-native/README.md) or [React DOM](packages/web/README.md). Each guide includes a provider wiring example, peer dependency requirements, customization points, and backend integration notes. The examples require an adapter instance from your application; they are not standalone runnable applications.

Keep the adapter instance stable across renders. Change `scopeKey` when the tenant or authentication session changes, even if the adapter and user ID remain the same; switching scope recreates the chat session and resets its local UI state.

For a headless integration, use [the core session API](packages/core/README.md). The adapter boundary is defined in [ChatAdapter](packages/core/src/core/adapter.ts), with separate [command](packages/core/src/core/commands.ts), [event](packages/core/src/core/events.ts), and [pagination](packages/core/src/core/pagination.ts) contracts.

## Repository layout

```text
packages/
  core/                 Framework-independent contracts and state
  react-native/         Native components, hooks, and theme
  web/                  DOM components, hooks, and theme
scripts/                Lint, style, test, and build verification tooling
test-support/           Shared test fixtures
```

Tests are grouped by the feature they exercise inside each package's `tests` directory. Development configuration, test fixtures, and the lockfile are included intentionally so contributors can reproduce checks from this source checkout.

## Development and packaging

Use Node.js `24.x` and npm `11.13.x`; the exact Node version is recorded in [.nvmrc](.nvmrc). Install dependencies and verify the SDK from the repository root:

```bash
npm ci --ignore-scripts
npm run verify
```

Install lifecycle scripts are skipped by this command; tests and builds run explicitly through the repository scripts. These commands verify the libraries and do not start an application or backend.

| Command            | Purpose                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `npm run verify`   | Formatting, lint with no warnings, style-rule fixtures, type checks, package tests, builds, and output checks |
| `npm run build`    | Build core, web, and native packages in dependency order                                                      |
| `npm run test`     | Run package tests; build core first on a fresh checkout                                                       |
| `npm run format`   | Apply the shared Prettier formatting                                                                          |
| `npm run lint:fix` | Apply supported ESLint fixes                                                                                  |

To create npm tarballs after a successful `npm run verify`:

```bash
npm pack --workspace @talkentry/core --workspace @talkentry/web --workspace @talkentry/react-native --ignore-scripts
```

This produces three package archives, not a monorepo archive, and does not publish anything. `--ignore-scripts` reuses the builds just verified; do not use it with absent or stale build output.

For local consumption before a registry release, install the core tarball together with the chosen UI tarball into a separate application:

```bash
npm install ./talkentry-core-x.x.x.tgz ./talkentry-web-x.x.x.tgz
```

Supply the platform's peer dependencies as described in its package guide. Registry installation commands in those guides apply when the corresponding package version is published.

## Current limitations

- **Release maturity:** the UI and navigation APIs are early-stage. Passing unit tests or creating a bundle does not establish device smoothness, browser support, or production readiness.
- **History and navigation:** full reader-anchor restoration, a navigation back stack, and multi-segment history retention are not complete. Native quote-transition thresholds are provisional.
- **Optimistic edits:** revision ordering can prevent rollback after a failed edit and ignore server-normalized edit responses. Reloading history does not reliably restore the server text; this also affects backends that omit `revision`.
- **Node.js and SSR:** the current core and web JavaScript outputs contain relative imports that do not resolve in native Node.js ESM. Browser bundler consumption has been checked separately; direct Node.js imports and SSR integrations that rely on them require corrected package output.
- **Recovery and storage:** recovery depends on backend capabilities; without event replay, reconnect can reload the latest window instead of recovering every missed event. The SDK's active cache is not persistent offline storage.
- **Read state:** the host owns durable read cursors and unread totals. Native hosts must pass actual screen visibility through `messageListProps.isActive`; the browser renderer needs separate visibility/read integration review.

When contributing, keep changes focused, add regression coverage under the relevant feature directory, and run `npm run verify`. Describe device or browser checks separately from automated test results.

## License

The source is distributed under the [MIT License](LICENSE). Each publishable package includes its own copy of the license; third-party dependencies retain their respective licenses.
