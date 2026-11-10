import { MessageStore } from '@talkentry/core';
import { message } from '@test/chat-fixtures';

describe('MessageStore revision and localId contracts', () => {
  it('prefers higher revision and ignores stale content', () => {
    const store = new MessageStore();
    store.upsert(message('a', { text: 'new', revision: 2 }));
    store.upsert(message('a', { text: 'old', revision: 1 }));
    expect(store.get('a')?.text).toBe('new');
    expect(store.get('a')?.revision).toBe(2);

    store.upsert(message('a', { text: 'newer', revision: 3 }));
    expect(store.get('a')?.text).toBe('newer');
    expect(store.get('a')?.revision).toBe(3);
  });

  it('keeps localId as the stable key after server ack with sequence', () => {
    const store = new MessageStore();
    store.upsert(message('local-1', { localId: 'local-1', status: 'sending' }));
    store.upsert(
      message('server-1', {
        localId: 'local-1',
        status: 'sent',
        revision: 1,
        sequence: 42,
      }),
    );
    expect(store.get('local-1')?.id).toBe('server-1');
    expect(store.get('local-1')?.sequence).toBe(42);
    expect(store.get('local-1')?.revision).toBe(1);
    expect(store.size).toBe(1);
  });
});
