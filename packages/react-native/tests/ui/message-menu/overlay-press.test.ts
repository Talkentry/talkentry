import { createPressLock, overlayPressProps } from '../../../src/ui/message-menu/overlayPress';

describe('overlayPressProps', () => {
  it('fires once when both onPress and onTouchEnd run', () => {
    const lock = createPressLock();
    const onPress = jest.fn();
    const props = overlayPressProps(lock, onPress);
    const event = { stopPropagation: jest.fn() };

    props.onPress();
    props.onTouchEnd(event as never);

    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('fires from onTouchEnd when onPress never arrives', () => {
    const lock = createPressLock();
    const onPress = jest.fn();
    const props = overlayPressProps(lock, onPress);

    props.onTouchEnd({ stopPropagation: jest.fn() } as never);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('allows the next gesture after this turn', async () => {
    const lock = createPressLock();
    const onPress = jest.fn();
    const props = overlayPressProps(lock, onPress);

    props.onPress();
    await Promise.resolve();
    props.onPress();

    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
