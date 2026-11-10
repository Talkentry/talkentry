import { defaultTheme, getComponentTokens, mergeTheme } from '../../src/theme';

describe('TalkentryTheme merge', () => {
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

  it('merges component tokens without dropping sibling groups or base overrides', () => {
    const base = mergeTheme({
      components: { composer: { iconSize: 30 }, effects: { shadowColor: '#112233' } },
    });
    const next = mergeTheme({ components: { composer: { rowPadding: 18 } } }, base);
    const tokens = getComponentTokens(next);
    expect(tokens.composer.iconSize).toBe(30);
    expect(tokens.composer.rowPadding).toBe(18);
    expect(tokens.effects.shadowColor).toBe('#112233');
    expect(tokens.selection).toEqual(getComponentTokens(defaultTheme).selection);
  });

  it('resolves a full host theme created before component tokens existed', () => {
    const legacyTheme = {
      colors: defaultTheme.colors,
      spacing: defaultTheme.spacing,
      radii: defaultTheme.radii,
      typography: defaultTheme.typography,
    };
    expect(getComponentTokens(legacyTheme)).toEqual(getComponentTokens(defaultTheme));
    expect(
      getComponentTokens(mergeTheme({ components: { latest: { size: 50 } } }, legacyTheme)).latest
        .size,
    ).toBe(50);
  });
});
