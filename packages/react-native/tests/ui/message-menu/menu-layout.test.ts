import {
  MENU_GAP,
  MENU_MARGIN,
  pickerSize,
  placeMenu,
} from '../../../src/ui/message-menu/menuLayout';

const host = { width: 390, height: 700 };
const menu = { width: 240, height: 260 };

describe('placeMenu', () => {
  it('opens below the bubble and lines up with its side', () => {
    const anchor = { x: 200, y: 100, width: 180, height: 40 };
    expect(placeMenu(anchor, menu, host, true)).toEqual({
      left: 380 - 240,
      top: 140 + MENU_GAP,
    });
    expect(placeMenu({ ...anchor, x: 12 }, menu, host, false).left).toBe(12);
  });

  it('flips above the bubble near the bottom edge', () => {
    const anchor = { x: 20, y: 560, width: 200, height: 60 };
    expect(placeMenu(anchor, menu, host, false).top).toBe(560 - MENU_GAP - 260);
  });

  it('stays inside the host when neither side fits', () => {
    const anchor = { x: -40, y: 20, width: 300, height: 640 };
    const position = placeMenu(anchor, menu, host, false);
    expect(position.left).toBe(MENU_MARGIN);
    expect(position.top).toBeGreaterThanOrEqual(MENU_MARGIN);
    expect(position.top + menu.height).toBeLessThanOrEqual(host.height - MENU_MARGIN);
  });
});

describe('pickerSize', () => {
  it('caps the emoji card and keeps margins on small hosts', () => {
    expect(pickerSize(host)).toEqual({ width: 360, height: 340 });
    expect(pickerSize({ width: 300, height: 200 })).toEqual({
      width: 300 - MENU_MARGIN * 2,
      height: 200 - MENU_MARGIN * 2,
    });
  });
});
