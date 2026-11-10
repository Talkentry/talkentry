import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  Chat,
  ChatSession,
  Composer,
  defaultTheme,
  mergeTheme,
  MessageList,
  TalkentryProvider,
  TalkentryThemeProvider,
  useMessages,
  useTalkentryTheme,
  useViewport,
} from '../../src';

const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: Record<string, unknown>;
};

describe('@talkentry/web', () => {
  it('exports the provider, hooks, and Chat UI', async () => {
    expect(typeof ChatSession).toBe('function');
    expect(typeof TalkentryProvider).toBe('function');
    expect(typeof useMessages).toBe('function');
    expect(typeof useViewport).toBe('function');
    expect(typeof Chat).toBe('function');
    expect(typeof MessageList).toBe('function');
    expect(typeof Composer).toBe('function');
    expect(typeof TalkentryThemeProvider).toBe('function');
    expect(typeof useTalkentryTheme).toBe('function');
    expect(typeof mergeTheme).toBe('function');
    expect(defaultTheme.colors.canvas).toBe('#E4EAF0');
    expect(defaultTheme.colors.bubbleMine).toBe('#3390EC');

    const index = readFileSync(join(__dirname, '../../src/index.ts'), 'utf8');

    expect(index).not.toMatch(/from ['"].\/adapters/);
  });

  it('depends on core and not on React Native or react-native-web', () => {
    expect(pkg.dependencies?.['@talkentry/core']).toBe('^0.0.2');
    expect(pkg.dependencies?.['react-native']).toBeUndefined();
    expect(pkg.dependencies?.['react-native-web']).toBeUndefined();
    expect(pkg.peerDependencies?.['react-native']).toBeUndefined();
    expect(pkg.peerDependencies?.['react-native-web']).toBeUndefined();
    expect(pkg.peerDependencies?.react).toBe('19.3.x');
    expect(pkg.peerDependencies?.['react-dom']).toBe('19.3.x');
    expect(pkg.dependencies?.['socket.io-client']).toBeUndefined();
    expect(pkg.devDependencies?.['socket.io-client']).toBeUndefined();
    expect(pkg.peerDependencies?.['socket.io-client']).toBeUndefined();
    expect(pkg.exports?.['./adapters/talkentry-server']).toBeUndefined();
  });
});
