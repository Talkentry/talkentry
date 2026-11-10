import {
  canReleaseEmojiDock,
  resolveEmojiDockTarget,
} from '../../../src/ui/chat-screen/emojiDockRelease';

describe('emoji dock release', () => {
  it('waits until the keyboard has reached the sheet', () => {
    expect(canReleaseEmojiDock(-300, -320, -340)).toBe(false);
    expect(canReleaseEmojiDock(-320, -320, -340)).toBe(true);
    expect(canReleaseEmojiDock(-340, -320, -340)).toBe(true);
  });

  it('does not treat a still-moving keyboard as finished', () => {
    expect(canReleaseEmojiDock(-100, -320, -336)).toBe(false);
    expect(canReleaseEmojiDock(-336, -320, -336)).toBe(true);
  });

  it('keeps one target while rapid taps reverse a moving keyboard', () => {
    expect(resolveEmojiDockTarget(320, -140, 304)).toBe(320);
    expect(resolveEmojiDockTarget(0, -336, 304)).toBe(336);
    expect(resolveEmojiDockTarget(0, 0, 304)).toBe(304);
  });
});
