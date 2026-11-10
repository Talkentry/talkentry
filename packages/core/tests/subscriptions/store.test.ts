import { MessageStore } from '@talkentry/core';
import { message } from '@test/chat-fixtures';

describe('canonical message store', () => {
  it('rejects old revisions and equal-revision content rewrites', () => {
    const store = new MessageStore();
    store.upsert(message('a', { revision: 2, text: 'new' }));
    store.upsert(message('a', { revision: 1, text: 'old' }));
    store.upsert(message('a', { revision: 2, text: 'different' }));
    expect(store.get('a')?.text).toBe('new');
  });
  it('uses updatedAt when revisions are absent', () => {
    const store = new MessageStore();
    store.upsert(message('a', { updatedAt: 20, text: 'new' }));
    store.upsert(message('a', { updatedAt: 10, text: 'old' }));
    expect(store.get('a')?.text).toBe('new');
  });
  it('does not undo realtime with a pending history response', () => {
    const store = new MessageStore();
    store.upsert(message('a'));
    const watermark = store.version;
    store.upsert(message('a', { updatedAt: 200, text: 'edit' }));
    store.upsert(message('a', { updatedAt: 100, text: 'snapshot' }), watermark);
    expect(store.get('a')?.text).toBe('edit');
  });
  it('notifies only affected rows once at the transaction boundary', () => {
    const store = new MessageStore();
    store.upsert(message('a'));
    store.upsert(message('b'));
    const a = jest.fn();
    const b = jest.fn();
    store.subscribe('a', a);
    store.subscribe('b', b);
    store.batch(() => {
      store.patchStatus('a', 'delivered');
      store.patchStatus('a', 'read');
      expect(a).not.toHaveBeenCalled();
    });
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
  });
  it('reconciles echo before ack without changing optimistic UI key', () => {
    const store = new MessageStore();
    store.upsert(message('local', { localId: 'local', status: 'sending', createdAt: 999 }));
    store.upsert(message('server', { status: 'read' }));
    expect(store.upsert(message('server', { localId: 'local' }))).toBe('local');
    expect(store.get('server')).toBe(store.get('local'));
    expect(store.get('local')?.status).toBe('read');
    expect(store.size).toBe(1);
  });
  it('evicts entities and their aliases', () => {
    const store = new MessageStore();
    store.upsert(message('server', { localId: 'local' }));
    store.retain(new Set());
    expect(store.size).toBe(0);
    expect(store.aliasCount).toBe(0);
  });
  it('does not resurrect removed messages even with a newer event', () => {
    const store = new MessageStore();
    store.upsert(message('a'));
    store.remove('a');
    expect(store.upsert(message('a', { revision: 100 }))).toBeUndefined();
    expect(store.get('a')).toBeUndefined();
  });
  it('ignores stale deletes and bounds tombstones without silently forgetting', () => {
    const store = new MessageStore(2);
    store.upsert(message('a', { revision: 3 }));
    store.remove('a', 2);
    expect(store.get('a')).toBeDefined();
    store.remove('a', 3);
    store.remove('b');
    expect(() => store.remove('c')).toThrow('retention');
    expect(store.tombstoneCount).toBe(2);
  });
  it('keeps statuses monotonic and removes listeners on unsubscribe', () => {
    const store = new MessageStore();
    store.upsert(message('a', { status: 'read' }));
    const hit = jest.fn();
    const off = store.subscribe('a', hit);
    off();
    store.patchStatus('a', 'failed');
    expect(store.get('a')?.status).toBe('read');
    expect(hit).not.toHaveBeenCalled();
  });
});
