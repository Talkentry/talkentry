import { defaultTheme, mergeTheme } from '../../src/theme';

describe('TalkentryTheme merge', () => {
  it('keeps the RN light palette as the web default', () => {
    expect(defaultTheme.colors.canvas).toBe('#E4EAF0');
    expect(defaultTheme.colors.surface).toBe('#FFFFFF');
    expect(defaultTheme.colors.accent).toBe('#3390EC');
    expect(defaultTheme.colors.bubbleMine).toBe('#3390EC');
    expect(defaultTheme.colors.bubbleTheirs).toBe('#FFFFFF');
    expect(defaultTheme.colors.inputBackground).toBe('#EEF2F6');
  });

  it('overrides only provided token groups', () => {
    const next = mergeTheme({
      colors: { accent: '#000000', bubbleMine: '#111111' },
      spacing: { md: 20 },
    });

    expect(next.colors.accent).toBe('#000000');
    expect(next.colors.bubbleMine).toBe('#111111');
    expect(next.colors.canvas).toBe(defaultTheme.colors.canvas);
    expect(next.spacing.md).toBe(20);
    expect(next.spacing.sm).toBe(defaultTheme.spacing.sm);
    expect(next.radii).toEqual(defaultTheme.radii);
  });

  it('merges onto an explicit base theme', () => {
    const base = mergeTheme({ colors: { accent: '#aaaaaa' } });
    const next = mergeTheme({ colors: { text: '#bbbbbb' } }, base);

    expect(next.colors.accent).toBe('#aaaaaa');
    expect(next.colors.text).toBe('#bbbbbb');
  });
});
