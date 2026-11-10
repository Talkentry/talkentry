import { createScrollToLatestStore } from '../../../src/react/context/scrollToLatestStore';

describe('scroll-to-latest store', () => {
  it('notifies on visibility and count, and keeps jump current without a second notice', async () => {
    const store = createScrollToLatestStore();
    const listener = jest.fn();
    store.subscribe(listener);

    store.publish({
      visible: true,
      unreadCount: 2.8,
      jumpToLatest: async () => undefined,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual(expect.objectContaining({ visible: true, unreadCount: 2 }));

    let jumped = false;
    store.publish({
      visible: true,
      unreadCount: 2,
      jumpToLatest: async () => {
        jumped = true;
      },
    });
    expect(listener).toHaveBeenCalledTimes(1);
    await store.getSnapshot().jumpToLatest();
    expect(jumped).toBe(true);

    store.publish({ visible: true, unreadCount: -4, jumpToLatest: async () => undefined });
    expect(store.getSnapshot().unreadCount).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);

    store.clear();
    expect(store.getSnapshot().visible).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);
    store.clear();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
