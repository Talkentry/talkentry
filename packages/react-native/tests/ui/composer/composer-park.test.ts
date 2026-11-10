import {
  listBottomInsetWhileSelecting,
  parkedComposerStyle,
  SELECTION_BAR_FALLBACK_HEIGHT,
} from '../../../src/ui/chat-screen/composerPark';

describe('composer parking', () => {
  it('hides the composer without collapsing its layout', () => {
    expect(parkedComposerStyle).toEqual({ pointerEvents: 'none', opacity: 0 });
    expect(parkedComposerStyle).not.toEqual(expect.objectContaining({ height: 0 }));
    expect(parkedComposerStyle).not.toEqual(expect.objectContaining({ overflow: 'hidden' }));
  });

  it('tucks the list under the selection bar instead of the hidden reply banner', () => {
    expect(listBottomInsetWhileSelecting(false, 140, 68)).toBe(140);
    expect(listBottomInsetWhileSelecting(true, 140, 68)).toBe(68);
    expect(listBottomInsetWhileSelecting(true, 140, 0)).toBe(SELECTION_BAR_FALLBACK_HEIGHT);
  });
});
