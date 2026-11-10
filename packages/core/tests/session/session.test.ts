import { ChatEventType, ChatSession, type Message, type MessagePage } from '@talkentry/core';
import { deferred, flush, message, mockAdapter, page } from '@test/chat-fixtures';

let sessions: ChatSession[] = [];
const create = (mock = mockAdapter(), options = {}) => {
  const session = new ChatSession({
    adapter: mock.adapter,
    chatId: 'chat',
    currentUserId: 'me',
    ...options,
  });
  sessions.push(session);
  session.start();

  return { session, mock };
};
afterEach(() => {
  sessions.forEach((s) => s.stop());
  sessions = [];
  jest.useRealTimers();
});
describe('session lifecycle and integration', () => {
  it('does not leak an edit timeout when optimistic validation rejects the text', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { editMessage: true });
    mock.loadLatest.mockResolvedValue(page([message('a', { senderId: 'me' })]));
    const { session } = create(mock);
    await flush();
    const timers = jest.getTimerCount();
    await expect(session.edit('a', 'x'.repeat(100001))).rejects.toThrow();
    expect(jest.getTimerCount()).toBe(timers);
    expect(mock.editMessage).not.toHaveBeenCalled();
    expect(session.messageStore.get('a')?.text).toBe('a');
  });

  it('marks only explicit visible peer IDs, excluding own/system/unknown IDs', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(
      page([
        message('a'),
        message('b'),
        message('c', { senderId: 'me' }),
        message('d', { system: true }),
      ]),
    );
    const { session } = create(mock);
    await flush();
    await session.markReadMessages(['b', 'b', 'c', 'd', 'unknown']);
    expect(mock.updateReceipts).toHaveBeenCalledTimes(1);
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({ messageIds: ['b'], status: 'read' }),
    );
    expect(session.messageStore.get('a')?.status).toBe('sent');
    expect(session.messageStore.get('b')?.status).toBe('read');
    expect(session.messageStore.get('c')?.status).toBe('sent');
    expect(session.messageStore.get('d')?.status).toBe('sent');
  });

  it('does not mark new arrivals read when an older receipt completes', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a'), message('b')]));
    const pending = deferred<readonly Message[]>();
    mock.updateReceipts.mockReturnValue(pending.promise);
    const { session } = create(mock);
    await flush();
    const task = session.markReadMessages(['b']);
    mock.emit({ type: ChatEventType.MessageAdded, message: message('c') });
    pending.resolve([]);
    expect(await task).toBe(true);
    expect(session.messageStore.get('a')?.status).toBe('sent');
    expect(session.messageStore.get('b')?.status).toBe('read');
    expect(session.messageStore.get('c')?.status).toBe('sent');
  });

  it('bounds cumulative host read updates to the captured cursor', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a'), message('b'), message('c')]));
    const { session } = create(mock);
    await flush();
    expect(await session.markRead('b')).toBe(true);
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({ upToMessageId: 'b', messageIds: undefined }),
    );
    expect(session.messageStore.get('a')?.status).toBe('read');
    expect(session.messageStore.get('b')?.status).toBe('read');
    expect(session.messageStore.get('c')?.status).toBe('sent');
  });

  it('batches exact reads at 100 IDs without losing the remainder', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    const messages = Array.from({ length: 205 }, (_, index) =>
      message(`m${index}`, { createdAt: index }),
    );
    mock.loadLatest.mockResolvedValue(page(messages));
    const { session } = create(mock, { pageSize: 205 });
    await flush();
    expect(await session.markReadMessages(messages.map((item) => item.id))).toBe(true);
    expect(mock.updateReceipts.mock.calls.map(([command]) => command.messageIds?.length)).toEqual([
      100, 100, 5,
    ]);
    expect(messages.every((item) => session.messageStore.get(item.id)?.status === 'read')).toBe(
      true,
    );
  });

  it('does not advance local read status on a failed receipt', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    mock.updateReceipts.mockRejectedValue(new Error('offline'));
    const { session } = create(mock);
    await flush();
    expect(await session.markReadMessages(['a'])).toBe(false);
    expect(session.messageStore.get('a')?.status).toBe('sent');
  });

  it('ignores a delayed receipt after a thread switch', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { readReceipts: true, threads: true });
    mock.loadLatest.mockResolvedValueOnce(page([message('a')]));
    const pending = deferred<readonly Message[]>();
    mock.updateReceipts.mockReturnValue(pending.promise);
    const { session } = create(mock);
    await flush();
    const read = session.markReadMessages(['a']);
    mock.loadLatest.mockResolvedValueOnce(page([message('b', { threadId: 'root' })]));
    await session.enterThread('root');
    pending.resolve([]);
    expect(await read).toBe(false);
    expect(session.messageStore.get('b')?.status).toBe('sent');
  });

  it('cancels around navigation without replacing the window or reporting an error', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const pending = deferred<MessagePage>();
    mock.loadAround.mockReturnValue(pending.promise);
    const { session } = create(mock);
    await flush();
    const loading = session.loadAround('z');
    await flush();
    session.cancelNavigation();
    pending.resolve(page([message('z')]));
    expect(await loading).toBe(false);
    expect(session.getSnapshot().messageKeys).toEqual(['a']);
    expect(session.getSnapshot().error).toBeNull();
    expect(session.getSnapshot().status).toBe('ready');
  });

  it('does not cancel ordinary older pagination on a user gesture', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('b')], { hasMoreBefore: true }));
    const pending = deferred<MessagePage>();
    mock.loadBefore.mockReturnValue(pending.promise);
    const { session } = create(mock);
    await flush();
    const loading = session.loadOlder();
    session.cancelNavigation();
    pending.resolve(page([message('a')]));
    expect(await loading).toBe(true);
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b']);
  });
  it('cleans state even if the host unsubscribe throws', async () => {
    const mock = mockAdapter();
    mock.adapter.subscribe = () => () => {
      throw new Error('host cleanup failed');
    };
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const { session } = create(mock);
    await flush();
    expect(() => session.stop()).not.toThrow();
    expect(session.messageStore.size).toBe(0);
  });
  it('fails closed when the subscription cannot start', async () => {
    const mock = mockAdapter();
    mock.adapter.subscribe = () => {
      throw new Error('host failed');
    };
    const { session } = create(mock);
    await flush();
    expect(session.isActive()).toBe(false);
    expect(session.getSnapshot().error?.message).toBe('Subscription failed');
  });
  it('does not leave an optimistic ghost if deletion arrives before send acknowledgement', async () => {
    const mock = mockAdapter();
    const ack = deferred<Message>();
    mock.send.mockReturnValue(ack.promise);
    const { session } = create(mock);
    await flush();
    const sending = session.send({ text: 'hi', localId: 'local' });
    mock.emit({ type: ChatEventType.MessageRemoved, chatId: 'chat', messageId: 'server' });
    ack.resolve(message('server', { senderId: 'me' }));
    await sending;
    expect(session.getSnapshot().messageKeys).toEqual([]);
    expect(session.messageStore.size).toBe(0);
  });
  it('does not use a failed local send as a pagination cursor and retries with the same id', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    mock.send.mockRejectedValueOnce(new Error('offline'));
    const { session } = create(mock);
    await flush();
    await expect(session.send({ text: 'hi', localId: 'local' })).rejects.toThrow();
    expect(session.getSnapshot().newestId).toBe('a');
    await session.send({ text: 'hi', localId: 'local' });
    expect(mock.send.mock.calls.map(([command]) => command.localId)).toEqual(['local', 'local']);
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'local']);
  });
  it('rejects a send acknowledgement for a different author', async () => {
    const mock = mockAdapter();
    mock.send.mockResolvedValue(message('server', { senderId: 'foreign' }));
    const { session } = create(mock);
    await flush();
    await expect(session.send({ text: 'hi', localId: 'local' })).rejects.toThrow();
    expect(session.messageStore.get('local')?.status).toBe('failed');
  });
  it('preserves live messages during initial loading', async () => {
    const mock = mockAdapter();
    const load = deferred<MessagePage>();
    mock.loadLatest.mockReturnValue(load.promise);
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.MessageAdded, message: message('z') });
    load.resolve(page([message('a')]));
    await flush();
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'z']);
  });
  it('does not revert edits/receipts on append or refresh', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const { session } = create(mock);
    await flush();
    mock.emit({
      type: ChatEventType.MessageUpdated,
      message: message('a', { updatedAt: 1000, text: 'edited' }),
    });
    mock.emit({
      type: ChatEventType.MessageStatus,
      chatId: 'chat',
      messageId: 'a',
      status: 'read',
    });
    mock.emit({ type: ChatEventType.MessageAdded, message: message('b') });
    await session.loadLatest();
    expect(session.messageStore.get('a')?.text).toBe('edited');
    expect(session.messageStore.get('a')?.status).toBe('read');
  });
  it('notifies only the affected row, not structural subscribers', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const { session } = create(mock);
    await flush();
    const structure = jest.fn();
    const row = jest.fn();
    session.subscribe(structure);
    session.messageStore.subscribe('a', row);
    mock.emit({
      type: ChatEventType.MessageStatus,
      chatId: 'chat',
      messageId: 'a',
      status: 'read',
    });
    expect(structure).not.toHaveBeenCalled();
    expect(row).toHaveBeenCalledTimes(1);
  });
  it('keeps entity and alias counts bounded over a long stream', async () => {
    const { session, mock } = create(undefined, { maxMessages: 3 });
    await flush();
    for (let i = 0; i < 100; i += 1) {
      mock.emit({
        type: ChatEventType.MessageAdded,
        message: message(String(i), { createdAt: i }),
      });
    }
    expect(session.messageStore.size).toBe(3);
    expect(session.messageStore.aliasCount).toBe(3);
    expect(session.getSnapshot().oldestId).toBe('97');
  });
  it('deletes both structure and data, and ignores late resurrection', async () => {
    const { session, mock } = create();
    await flush();
    mock.emit({ type: ChatEventType.MessageAdded, message: message('a') });
    mock.emit({ type: ChatEventType.MessageRemoved, chatId: 'chat', messageId: 'a' });
    mock.emit({ type: ChatEventType.MessageAdded, message: message('a') });
    expect(session.getSnapshot().messageKeys).toEqual([]);
    expect(session.messageStore.size).toBe(0);
  });
  it('blocks ingestion on deletion retention exhaustion', async () => {
    const { session, mock } = create(undefined, { maxTombstones: 1 });
    await flush();
    mock.emit({ type: ChatEventType.MessageRemoved, chatId: 'chat', messageId: 'a' });
    mock.emit({ type: ChatEventType.MessageRemoved, chatId: 'chat', messageId: 'b' });
    mock.emit({ type: ChatEventType.MessageAdded, message: message('c') });
    expect(session.isActive()).toBe(false);
    expect(session.messageStore.size).toBe(0);
    expect(session.getSnapshot().error?.message).toContain('resync');
  });
  it('serializes repeated pagination and fixes cursors after both trims', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(
      page(
        ['b', 'c', 'd'].map((id) => message(id)),
        { hasMoreBefore: true },
      ),
    );
    mock.loadBefore.mockResolvedValue(page([message('a')]));
    mock.loadAfter.mockResolvedValue(page([message('d')]));
    const { session } = create(mock, { maxMessages: 3 });
    await flush();
    await Promise.all([session.loadOlder(), session.loadOlder()]);
    expect(mock.loadBefore).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b', 'c']);
    expect(session.getSnapshot().newestId).toBe('c');
    await session.loadNewer();
    expect(mock.loadAfter).toHaveBeenLastCalledWith(expect.objectContaining({ afterId: 'c' }));
    expect(session.getSnapshot().oldestId).toBe('b');
  });

  it('loadAround replaces the window and sets focusKey on the target', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('y'), message('z')]));
    mock.loadAround.mockResolvedValue(
      page([message('a'), message('b'), message('c')], {
        hasMoreBefore: true,
        hasMoreAfter: true,
      }),
    );
    const { session } = create(mock);
    await flush();
    await session.loadAround('b');
    expect(mock.loadAround).toHaveBeenCalledWith(
      expect.objectContaining({ aroundId: 'b', chatId: 'chat' }),
    );
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b', 'c']);
    expect(session.getSnapshot().hasMoreBefore).toBe(true);
    expect(session.getSnapshot().hasMoreAfter).toBe(true);
    expect(session.getSnapshot().change).toEqual(
      expect.objectContaining({ kind: 'around', focusKey: 'b' }),
    );
  });

  it('loadOlder prepends older pages without dropping the latest edge until trim', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(
      page(
        ['c', 'd', 'e'].map((id) => message(id)),
        { hasMoreBefore: true },
      ),
    );
    mock.loadBefore.mockResolvedValue(
      page(
        ['a', 'b'].map((id) => message(id)),
        { hasMoreBefore: true },
      ),
    );
    const { session } = create(mock, { maxMessages: 10 });
    await flush();
    await session.loadOlder();
    expect(mock.loadBefore).toHaveBeenCalledWith(expect.objectContaining({ beforeId: 'c' }));
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(session.getSnapshot().oldestId).toBe('a');
    expect(session.getSnapshot().newestId).toBe('e');
    expect(session.getSnapshot().change.kind).toBe('older');
  });
  it('does not join distant realtime into a history window; latest reloads data', async () => {
    const mock = mockAdapter();
    mock.loadLatest
      .mockResolvedValueOnce(page([message('a')], { hasMoreAfter: true }))
      .mockResolvedValue(page([message('z')]));
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.MessageAdded, message: message('z') });
    expect(session.getSnapshot().messageKeys).toEqual(['a']);
    await session.loadLatest();
    expect(session.getSnapshot().messageKeys).toEqual(['z']);
    expect(session.getSnapshot().change.kind).toBe('latest');
  });
  it('a superseded history request cannot replace latest', async () => {
    const mock = mockAdapter();
    const older = deferred<MessagePage>();
    mock.loadLatest.mockResolvedValue(page([message('b')], { hasMoreBefore: true }));
    mock.loadBefore.mockReturnValue(older.promise);
    const { session } = create(mock);
    await flush();
    const task = session.loadOlder();
    await flush();
    mock.loadLatest.mockResolvedValue(page([message('z')]));
    await session.loadLatest();
    older.resolve(page([message('a')]));
    await task;
    await flush();
    expect(session.getSnapshot().messageKeys).toEqual(['z']);
  });
  it('late loads, events and sends cannot mutate a stopped session', async () => {
    const mock = mockAdapter();
    const load = deferred<MessagePage>();
    const send = deferred<Message>();
    mock.loadLatest.mockReturnValue(load.promise);
    mock.send.mockReturnValue(send.promise);
    const { session } = create(mock);
    await flush();
    const task = session.send({ text: 'hi' }).catch(() => undefined);
    session.stop();
    load.resolve(page([message('a')]));
    send.resolve(message('server'));
    await task;
    await flush();
    mock.emit({ type: ChatEventType.MessageAdded, message: message('b') });
    expect(session.getSnapshot().messageKeys).toEqual([]);
    expect(session.messageStore.size).toBe(0);
  });
  it('restarts cleanly after StrictMode-style stop/start', async () => {
    const { session } = create();
    session.stop();
    session.start();
    await flush();
    expect(session.isActive()).toBe(true);
    expect(session.getSnapshot().status).toBe('ready');
  });
  it('reconciles a send to one stable key, including an earlier server echo', async () => {
    const mock = mockAdapter();
    const ack = deferred<Message>();
    mock.send.mockReturnValue(ack.promise);
    const { session } = create(mock);
    await flush();
    const sending = session.send({ text: 'hi', localId: 'local' });
    mock.emit({ type: ChatEventType.MessageAdded, message: message('server', { senderId: 'me' }) });
    ack.resolve(message('server', { senderId: 'me' }));
    await sending;
    expect(session.getSnapshot().messageKeys).toEqual(['local']);
    expect(session.messageStore.size).toBe(1);
    expect(session.messageStore.get('local')?.id).toBe('server');
  });
  it('keeps localId echo with server revision/sequence on send ack', async () => {
    const mock = mockAdapter();
    mock.send.mockResolvedValue(
      message('server', {
        senderId: 'me',
        localId: 'local',
        revision: 1,
        sequence: 17,
        status: 'sent',
      }),
    );
    const { session } = create(mock);
    await flush();
    await session.send({ text: 'hi', localId: 'local' });
    const stored = session.messageStore.get('local');
    expect(stored?.id).toBe('server');
    expect(stored?.localId).toBe('local');
    expect(stored?.revision).toBe(1);
    expect(stored?.sequence).toBe(17);
    expect(session.getSnapshot().messageKeys).toEqual(['local']);
  });
  it('does not let a stale revision overwrite content after send ack', async () => {
    const mock = mockAdapter();
    mock.send.mockResolvedValue(
      message('server', {
        senderId: 'me',
        localId: 'local',
        text: 'acked',
        revision: 2,
        sequence: 5,
        status: 'sent',
      }),
    );
    const { session } = create(mock);
    await flush();
    await session.send({ text: 'hi', localId: 'local' });
    mock.emit({
      type: ChatEventType.MessageUpdated,
      message: message('server', {
        senderId: 'me',
        localId: 'local',
        text: 'stale',
        revision: 1,
        sequence: 5,
      }),
    });
    expect(session.messageStore.get('local')?.text).toBe('acked');
    expect(session.messageStore.get('local')?.revision).toBe(2);
  });
  it('retains bounded pending sends outside the window until acknowledgement', async () => {
    const mock = mockAdapter();
    const ack = deferred<Message>();
    mock.send.mockReturnValue(ack.promise);
    const { session } = create(mock, { maxMessages: 1, maxPendingSends: 1 });
    await flush();
    const sending = session.send({ text: 'hi', localId: 'local' });
    await expect(session.send({ text: 'another' })).rejects.toThrow('limit');
    expect(session.messageStore.size).toBeLessThanOrEqual(2);
    ack.resolve(message('server', { senderId: 'me' }));
    await sending;
  });
  it('rejects malformed and foreign-scope input at the session boundary', async () => {
    const { session, mock } = create();
    await flush();
    mock.emit({ type: ChatEventType.MessageUpdated } as never);
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('a', { chatId: 'other-chat' }),
    });
    expect(session.messageStore.size).toBe(0);
  });
  it('catch-up via loadAfter on invalidate when the window is already at the tip', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a'), message('b')]));
    mock.loadAfter.mockResolvedValue(page([message('c'), message('d')]));
    const { session } = create(mock);
    await flush();
    expect(mock.loadLatest).toHaveBeenCalledTimes(1);
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.loadAfter).toHaveBeenCalledWith(expect.objectContaining({ afterId: 'b' }));
    expect(mock.loadLatest).toHaveBeenCalledTimes(1);
    expect(mock.reconcileMessages).not.toHaveBeenCalled();
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b', 'c', 'd']);
    expect(session.getSnapshot().newestId).toBe('d');
  });
  it('replays durable journal events on invalidate when a cursor is known', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { loadEvents: true, reconcileMessages: true });
    mock.loadLatest.mockResolvedValue(page([message('a', { revision: 1 })], { eventCursor: 10 }));
    mock.loadEvents.mockResolvedValue({
      events: [
        {
          type: ChatEventType.MessageAdded,
          message: message('b', { revision: 1, createdAt: 2 }),
          cursor: 11,
        },
        {
          type: ChatEventType.MessageUpdated,
          message: message('a', { text: 'patched', revision: 2, createdAt: 1, updatedAt: 3 }),
          cursor: 12,
        },
      ],
      latestCursor: 12,
      hasMore: false,
    });
    mock.reconcileMessages.mockResolvedValue({
      messages: [
        message('a', { text: 'patched', revision: 2, createdAt: 1, updatedAt: 3 }),
        message('b', { revision: 1, createdAt: 2 }),
      ],
      removedIds: [],
    });
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.loadEvents).toHaveBeenCalledWith(expect.objectContaining({ afterCursor: 10 }));
    expect(mock.loadAfter).not.toHaveBeenCalled();
    expect(session.messageStore.get('a')?.text).toBe('patched');
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b']);
    expect(mock.reconcileMessages).toHaveBeenCalled();
  });
  it('reconciles window edits and deletes after tip catch-up', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { reconcileMessages: true });
    mock.loadLatest.mockResolvedValue(
      page([
        message('a', { text: 'old', revision: 1, createdAt: 1 }),
        message('b', { text: 'keep', revision: 1, createdAt: 2 }),
        message('c', { text: 'gone', revision: 1, createdAt: 3 }),
      ]),
    );
    mock.loadAfter.mockResolvedValue(
      page([message('d', { text: 'new', revision: 1, createdAt: 4 })]),
    );
    mock.reconcileMessages.mockResolvedValue({
      messages: [
        message('a', { text: 'edited', revision: 2, createdAt: 1, updatedAt: 5 }),
        message('b', { text: 'keep', revision: 1, createdAt: 2 }),
        message('d', { text: 'new', revision: 1, createdAt: 4 }),
      ],
      removedIds: ['c'],
    });
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.loadAfter).toHaveBeenCalled();
    expect(mock.reconcileMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        messageIds: expect.arrayContaining(['a', 'b', 'c', 'd']),
      }),
    );
    expect(session.messageStore.get('a')?.text).toBe('edited');
    expect(session.messageStore.get('a')?.revision).toBe(2);
    expect(session.messageStore.get('c')).toBeUndefined();
    expect(session.getSnapshot().messageKeys).toEqual(['a', 'b', 'd']);
    expect(mock.loadLatest).toHaveBeenCalledTimes(1);
  });
  it('falls back to latest when window reconcile fails after catch-up', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { reconcileMessages: true });
    mock.loadLatest.mockResolvedValueOnce(page([message('a', { revision: 1 })]));
    mock.loadLatest.mockResolvedValue(page([message('z')]));
    mock.loadAfter.mockResolvedValue(page([]));
    mock.reconcileMessages.mockRejectedValue(new Error('offline'));
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.reconcileMessages).toHaveBeenCalled();
    expect(mock.loadLatest).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().messageKeys).toEqual(['z']);
  });
  it('falls back to latest when invalidate arrives while reading history', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValueOnce(page([message('a')], { hasMoreAfter: true }));
    mock.loadLatest.mockResolvedValue(page([message('z')]));
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.loadLatest).toHaveBeenCalledTimes(2);
    expect(mock.loadAfter).not.toHaveBeenCalled();
    expect(session.getSnapshot().messageKeys).toEqual(['z']);
  });
  it('falls back to latest when catch-up after invalidate fails', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValueOnce(page([message('a')]));
    mock.loadLatest.mockResolvedValue(page([message('z')]));
    mock.loadAfter.mockRejectedValue(new Error('offline'));
    const { session } = create(mock);
    await flush();
    mock.emit({ type: ChatEventType.HistoryInvalidated, chatId: 'chat' });
    await flush();
    expect(mock.loadAfter).toHaveBeenCalled();
    expect(mock.loadLatest).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().messageKeys).toEqual(['z']);
  });
  it('applies typing.updated and excludes the local actor', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([]));
    const { session } = create(mock);
    await flush();
    mock.emit({
      type: ChatEventType.TypingUpdated,
      chatId: 'chat',
      userIds: ['me', 'peer'],
    });
    expect(session.getTypingUserIds()).toEqual(['peer']);
  });
  it('forwards setTyping when capability is on', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { typingIndicators: true });
    mock.loadLatest.mockResolvedValue(page([]));
    const { session } = create(mock);
    await flush();
    await session.setTyping(true);
    expect(mock.setTyping).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'me', isTyping: true }),
    );
    await session.setTyping(true);
    expect(mock.setTyping).toHaveBeenCalledTimes(1);
  });
  it('fans out live adds to every active session on the same chat (multi-client)', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    const first = create(mock);
    const second = create(mock);
    await flush();
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('b', { senderId: 'other', text: 'from peer' }),
    });
    expect(first.session.getSnapshot().messageKeys).toEqual(['a', 'b']);
    expect(second.session.getSnapshot().messageKeys).toEqual(['a', 'b']);
    expect(first.session.messageStore.get('b')?.text).toBe('from peer');
    expect(second.session.messageStore.get('b')?.text).toBe('from peer');
  });
  it('bounds hung history and send requests even if the adapter ignores signal', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    mock.loadLatest.mockReturnValue(new Promise(() => undefined));
    mock.send.mockReturnValue(new Promise(() => undefined));
    const { session } = create(mock, { requestTimeoutMs: 100 });
    await flush();
    const sending = session.send({ text: 'hi' }).catch((e: Error) => e);
    await jest.advanceTimersByTimeAsync(101);
    expect(await sending).toBeInstanceOf(Error);
    expect(session.getSnapshot().error).not.toBeNull();
  });
  it('rejects a foreign response from a custom adapter', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a', { chatId: 'foreign' })]));
    const { session } = create(mock);
    await flush();
    expect(session.messageStore.size).toBe(0);
    expect(session.getSnapshot().error).not.toBeNull();
  });
  it('auto-acks delivery at the tip but requires explicit visibility for read', async () => {
    jest.useFakeTimers();
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { deliveryReceipts: true, readReceipts: true });
    mock.loadLatest.mockResolvedValue(page([message('a', { senderId: 'other', status: 'sent' })]));
    mock.updateReceipts.mockImplementation(async (command) => {
      if (command.status === 'delivered') {
        return [message('a', { senderId: 'other', status: 'delivered', revision: 2 })];
      }

      return [message('a', { senderId: 'other', status: 'read', revision: 3 })];
    });
    const { session } = create(mock);
    await flush();
    await jest.advanceTimersByTimeAsync(50);
    await flush();
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'delivered',
        messageIds: ['a'],
        actorId: 'me',
      }),
    );
    expect(mock.updateReceipts).not.toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'read',
      }),
    );
    expect(session.messageStore.get('a')?.status).toBe('delivered');
    await session.markReadMessages(['a']);
    expect(mock.updateReceipts).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'read', messageIds: ['a'], actorId: 'me' }),
    );
    expect(session.messageStore.get('a')?.status).toBe('read');
  });
  it('applies inbound message.status ticks without rebuilding the window', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(
      page([message('mine', { senderId: 'me', status: 'sent', revision: 1 })]),
    );
    const { session } = create(mock);
    await flush();
    const before = session.getSnapshot();
    mock.emit({
      type: ChatEventType.MessageStatus,
      chatId: 'chat',
      messageId: 'mine',
      status: 'delivered',
      revision: 2,
    });
    expect(session.messageStore.get('mine')?.status).toBe('delivered');
    expect(session.getSnapshot().messageKeys).toBe(before.messageKeys);
  });
  it('markDelivered is a no-op without deliveryReceipts capability', async () => {
    const mock = mockAdapter();
    const { session } = create(mock);
    await flush();
    await expect(session.markDelivered(['a'])).resolves.toBe(false);
    expect(mock.updateReceipts).not.toHaveBeenCalled();
  });
  it('edits own message text and fans out reconcile', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { editMessage: true });
    mock.loadLatest.mockResolvedValue(
      page([message('a', { senderId: 'me', text: 'old', revision: 1, createdAt: 1 })]),
    );
    mock.editMessage.mockResolvedValue(
      message('a', {
        senderId: 'me',
        text: 'new',
        revision: 2,
        createdAt: 1,
        updatedAt: 2,
      }),
    );
    const { session } = create(mock);
    await flush();
    await session.edit('a', 'new');
    expect(mock.editMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'a', text: 'new', actorId: 'me' }),
    );
    expect(session.messageStore.get('a')?.text).toBe('new');
    expect(session.messageStore.get('a')?.revision).toBe(2);
  });
  it('rejects edit when capability is off', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a', { senderId: 'me', text: 'old' })]));
    const { session } = create(mock);
    await flush();
    await expect(session.edit('a', 'new')).rejects.toThrow('editMessage');
  });
  it('deletes own message after adapter ack and tombstones it', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { deleteMessage: true });
    mock.loadLatest.mockResolvedValue(
      page([
        message('a', { senderId: 'me', text: 'bye', revision: 1, createdAt: 1 }),
        message('b', { senderId: 'other', text: 'hi', revision: 1, createdAt: 2 }),
      ]),
    );
    mock.deleteMessage.mockResolvedValue({ chatId: 'chat', messageId: 'a', revision: 1 });
    const { session } = create(mock);
    await flush();
    await session.delete('a');
    expect(mock.deleteMessage).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'a', actorId: 'me' }),
    );
    expect(session.messageStore.get('a')).toBeUndefined();
    expect(session.getSnapshot().messageKeys).not.toContain('a');
    expect(session.getSnapshot().messageKeys).toContain('b');
  });
  it('rejects delete when capability is off', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a', { senderId: 'me', text: 'bye' })]));
    const { session } = create(mock);
    await flush();
    await expect(session.delete('a')).rejects.toThrow('deleteMessage');
  });
  it('sends with replyToId on the command', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('parent', { senderId: 'other' })]));
    const { session } = create(mock);
    await flush();
    await session.send({ text: 'reply', localId: 'local', replyToId: 'parent' });
    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'reply', replyToId: 'parent', localId: 'local' }),
    );
  });
  it('toggles a reaction and updates the store', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { reactions: true });
    mock.loadLatest.mockResolvedValue(
      page([message('a', { senderId: 'other', text: 'hi', revision: 1, createdAt: 1 })]),
    );
    mock.toggleReaction.mockResolvedValue(
      message('a', {
        senderId: 'other',
        text: 'hi',
        revision: 2,
        createdAt: 1,
        updatedAt: 2,
        reactions: [{ emoji: '👍', userIds: ['me'] }],
      }),
    );
    const { session } = create(mock);
    await flush();
    await session.toggleReaction('a', '👍');
    expect(mock.toggleReaction).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'a', emoji: '👍', actorId: 'me' }),
    );
    expect(session.messageStore.get('a')?.reactions).toEqual([{ emoji: '👍', userIds: ['me'] }]);
  });
  it('clears the last reaction when the response omits the list', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { reactions: true });
    mock.loadLatest.mockResolvedValue(
      page([
        message('a', {
          senderId: 'other',
          text: 'hi',
          revision: 1,
          createdAt: 1,
          reactions: [{ emoji: '👍', userIds: ['me'] }],
        }),
      ]),
    );
    mock.toggleReaction.mockResolvedValue(
      message('a', { senderId: 'other', text: 'hi', revision: 2, createdAt: 1, updatedAt: 2 }),
    );
    const { session } = create(mock);

    await flush();
    await session.toggleReaction('a', '👍');

    expect(session.messageStore.get('a')?.reactions).toEqual([]);
  });
  it('rejects toggleReaction when capability is off', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a', { senderId: 'other' })]));
    const { session } = create(mock);
    await flush();
    await expect(session.toggleReaction('a', '👍')).rejects.toThrow('reactions');
  });
  it('applies reaction updates for known messages outside the thread filter', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { threads: true });
    mock.loadLatest
      .mockResolvedValueOnce(page([message('root', { senderId: 'other', replyCount: 0 })]))
      .mockResolvedValueOnce(
        page([
          message('root', { senderId: 'other', replyCount: 1 }),
          message('reply', { senderId: 'other', threadId: 'root', createdAt: 2 }),
        ]),
      );
    const { session } = create(mock);
    await flush();
    expect(await session.enterThread('root')).toBe(true);
    expect(session.getThreadId()).toBe('root');
    expect(mock.loadLatest).toHaveBeenLastCalledWith(expect.objectContaining({ threadId: 'root' }));
    mock.emit({
      type: ChatEventType.MessageUpdated,
      message: message('root', {
        senderId: 'other',
        replyCount: 2,
        revision: 3,
        reactions: [{ emoji: '❤️', userIds: ['peer'] }],
      }),
    });
    expect(session.messageStore.get('root')?.replyCount).toBe(2);
    expect(session.messageStore.get('root')?.reactions?.[0]?.emoji).toBe('❤️');
  });
  it('filters message.added by active thread scope', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { threads: true });
    mock.loadLatest
      .mockResolvedValueOnce(page([message('root', { senderId: 'other' })]))
      .mockResolvedValueOnce(page([message('root', { senderId: 'other' })]));
    const { session } = create(mock);
    await flush();
    await session.enterThread('root');
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('main-peer', { senderId: 'other', text: 'main', createdAt: 9 }),
    });
    expect(session.getSnapshot().messageKeys).not.toContain('main-peer');
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('thread-peer', {
        senderId: 'other',
        threadId: 'root',
        text: 'in thread',
        createdAt: 10,
      }),
    });
    expect(session.getSnapshot().messageKeys).toContain('thread-peer');
    expect(await session.leaveThread()).toBe(true);
    expect(session.getThreadId()).toBeNull();
    expect(mock.loadLatest).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ threadId: expect.anything() }),
    );
  });
  it('injects active threadId on send', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { threads: true });
    mock.loadLatest
      .mockResolvedValueOnce(page([message('root', { senderId: 'other' })]))
      .mockResolvedValueOnce(page([message('root', { senderId: 'other' })]));
    const { session } = create(mock);
    await flush();
    await session.enterThread('root');
    await session.send({ text: 'in thread', localId: 'local-thread' });
    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'in thread', threadId: 'root', localId: 'local-thread' }),
    );
    expect(session.messageStore.get('local-thread')?.threadId).toBe('root');
  });
  it('rejects enterThread when capability is off', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('root')]));
    const { session } = create(mock);
    await flush();
    await expect(session.enterThread('root')).rejects.toThrow('threads');
  });
  it('sends attachment-only messages', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([]));
    const { session } = create(mock);
    await flush();
    const attachments = [
      { id: 'att-1', type: 'image' as const, url: 'https://cdn.example/a.jpg', name: 'a.jpg' },
    ];
    await session.send({ localId: 'local-media', attachments });
    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({ localId: 'local-media', attachments }),
    );
  });
  it('records page gaps and edge discontinuity instead of silent glue', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(
      page(
        [
          message('a', { sequence: 1 }),
          message('b', { sequence: 2 }),
          message('e', { sequence: 5 }),
        ],
        { hasMoreBefore: true },
      ),
    );
    const { session } = create(mock);
    await flush();
    expect(session.getSnapshot().gaps).toEqual([
      expect.objectContaining({ afterId: 'b', beforeId: 'e', missingCount: 2 }),
    ]);

    mock.loadBefore.mockResolvedValueOnce(
      page([message('old', { sequence: 0 })], {
        hasMoreBefore: false,
        oldestId: 'old',
        newestId: 'old',
      }),
    );
    await session.loadOlder();
    expect(session.getSnapshot().messageKeys[0]).toBe('old');
    expect(
      session.getSnapshot().gaps.some((gap) => gap.afterId === 'b' && gap.beforeId === 'e'),
    ).toBe(true);

    mock.loadLatest.mockResolvedValueOnce(
      page([message('m1', { sequence: 100 }), message('m2', { sequence: 101 })], {
        hasMoreBefore: true,
        hasMoreAfter: false,
      }),
    );
    await session.loadLatest();
    expect(session.getSnapshot().gaps).toEqual([]);

    mock.loadBefore.mockResolvedValueOnce(
      page([message('far', { sequence: 50 })], {
        hasMoreBefore: true,
        oldestId: 'far',
        newestId: 'far',
      }),
    );
    await session.loadOlder();
    expect(session.getSnapshot().gaps).toEqual([
      expect.objectContaining({ afterId: 'far', beforeId: 'm1', missingCount: 49 }),
    ]);
  });
});
