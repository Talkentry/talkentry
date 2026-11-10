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
});
