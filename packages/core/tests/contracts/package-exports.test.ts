import { ChatSession, initialViewportState, MessageStore, viewportReducer } from '../../src';

describe('@talkentry/core', () => {
  it('exports the session, store, and viewport coordinator', () => {
    expect(typeof ChatSession).toBe('function');
    expect(typeof MessageStore).toBe('function');
    expect(typeof viewportReducer).toBe('function');
    expect(initialViewportState().mode).toBeDefined();
  });
});
