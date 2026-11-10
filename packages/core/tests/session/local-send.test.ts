import {
  ChatEventType,
  ChatSession,
  type ChatSessionOptions,
  type Message,
  type MessagePage,
} from '@talkentry/core';
import { deferred, flush, message, mockAdapter, page } from '@test/chat-fixtures';

const sessions: ChatSession[] = [];
const create = (mock = mockAdapter(), options: Partial<ChatSessionOptions> = {}) => {
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
const detach = async (session: ChatSession, mock: ReturnType<typeof mockAdapter>) => {
  mock.loadAround.mockResolvedValue(page([message('old')], { hasMoreAfter: true }));
  expect(await session.loadAround('old')).toBe(true);
};

afterEach(() => {
  sessions.splice(0).forEach((session) => session.stop());
});

describe('local send acceptance and tail staging', () => {
  it('publishes synchronously after canonical acceptance, before history or server ACK', async () => {
    const mock = mockAdapter();
    const history = deferred<MessagePage>();
    const ack = deferred<Message>();
    mock.loadLatest.mockReturnValue(history.promise);
    mock.send.mockReturnValue(ack.promise);
    const { session } = create(mock);
    const accepted = jest.fn(() =>
      expect(session.messageStore.get('local')?.status).toBe('sending'),
    );
    session.subscribeLocalSendAccepted(accepted);
    const task = session.send({ localId: 'local', text: 'hello' });
    expect(accepted).toHaveBeenCalledWith({
      sequence: 1,
      localId: 'local',
      threadId: null,
      requiresLatest: true,
    });
    expect(mock.send).toHaveBeenCalledTimes(1);
    history.resolve(page([message('a')]));
    await flush();
    expect(session.getSnapshot().messageKeys).toContain('local');
    ack.resolve(message('server', { senderId: 'me', localId: 'local' }));
    await task;
    expect(accepted).toHaveBeenCalledTimes(1);
  });

  it('does not load or glue a remote tail while sending from a detached window', async () => {
    const { session, mock } = create();
    await flush();
    await detach(session, mock);
    const accepted = jest.fn();
    session.subscribeLocalSendAccepted(accepted);
    await session.send({ localId: 'local', text: 'hello' });
    expect(mock.loadLatest).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().messageKeys).toEqual(['old']);
    expect(session.messageStore.get('local')?.id).toBe('server');
    expect(accepted).toHaveBeenCalledTimes(1);
    mock.loadLatest.mockResolvedValue(page([message('new')]));
    expect(await session.loadLatest()).toBe(true);
    expect(session.getSnapshot().messageKeys).toContain('local');
    expect(session.getSnapshot().messageKeys).not.toContain('old');
  });

  it('retains a failed detached send until a successful tail load without repeating acceptance on retry', async () => {
    const { session, mock } = create();
    await flush();
    await detach(session, mock);
    mock.send.mockRejectedValueOnce(new Error('offline'));
    const accepted = jest.fn();
    session.subscribeLocalSendAccepted(accepted);
    await expect(session.send({ localId: 'local', text: 'hello' })).rejects.toThrow(
      'could not be sent',
    );
    expect(session.messageStore.get('local')?.status).toBe('failed');
    expect(session.getSnapshot().error).toBeNull();
    mock.loadLatest.mockRejectedValueOnce(new Error('history offline'));
    expect(await session.loadLatest()).toBe(false);
    expect(session.messageStore.get('local')?.status).toBe('failed');
    await session.send({ localId: 'local', text: 'hello' });
    expect(accepted).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().error).not.toBeNull();
    mock.loadLatest.mockResolvedValue(page([message('new')]));
    await session.loadLatest();
    expect(session.getSnapshot().messageKeys).toContain('local');
    expect(session.getSnapshot().error).toBeNull();
  });

  it('keeps an ACK received during a stale tail fetch without duplicate identities', async () => {
    const { session, mock } = create();
    await flush();
    await detach(session, mock);
    const history = deferred<MessagePage>();
    mock.loadLatest.mockReturnValue(history.promise);
    let navigation: Promise<boolean> | undefined;
    session.subscribeLocalSendAccepted(() => {
      navigation = session.loadLatest();
    });
    await session.send({ localId: 'local', text: 'hello' });
    history.resolve(page([message('new')]));
    expect(await navigation).toBe(true);
    expect(session.getSnapshot().messageKeys.filter((key) => key === 'local')).toHaveLength(1);
    expect(session.messageStore.get('local')?.id).toBe('server');
  });

  it('does not turn a navigation failure or gesture cancellation into a send failure', async () => {
    const { session, mock } = create();
    await flush();
    await detach(session, mock);
    const history = deferred<MessagePage>();
    mock.loadLatest.mockReturnValue(history.promise);
    let navigation: Promise<boolean> | undefined;
    session.subscribeLocalSendAccepted(() => {
      navigation = session.loadLatest();
    });
    await session.send({ localId: 'local', text: 'hello' });
    session.cancelNavigation();
    expect(await navigation).toBe(false);
    expect(session.messageStore.get('local')?.status).toBe('sent');
    history.resolve(page([message('late')]));
    await flush();
    expect(session.getSnapshot().messageKeys).toEqual(['old']);
  });

  it('bounds staged IDs independently from concurrent requests and releases the budget at latest', async () => {
    const { session, mock } = create(undefined, { maxPendingSends: 2 });
    mock.send.mockImplementation(async (command) =>
      message(`server-${command.localId}`, { ...command, status: 'sent' }),
    );
    await flush();
    await detach(session, mock);
    await session.send({ localId: 'one', text: '1' });
    await session.send({ localId: 'two', text: '2' });
    await expect(session.send({ localId: 'three', text: '3' })).rejects.toThrow(
      'Unshown local send limit',
    );
    expect(mock.send).toHaveBeenCalledTimes(2);
    await session.loadLatest();
    await session.send({ localId: 'three', text: '3' });
    expect(mock.send).toHaveBeenCalledTimes(3);
  });

  it('does not replay acceptance or let a failing observer prevent delivery', async () => {
    const { session } = create();
    await flush();
    session.subscribeLocalSendAccepted(() => {
      throw new Error('host callback');
    });
    await session.send({ localId: 'one', text: '1' });
    const accepted = jest.fn();
    const unsubscribe = session.subscribeLocalSendAccepted(accepted);
    expect(accepted).not.toHaveBeenCalled();
    unsubscribe();
    await session.send({ localId: 'two', text: '2' });
    expect(accepted).not.toHaveBeenCalled();
  });

  it('does not treat ACKs or own realtime messages as a new local action', async () => {
    const { session, mock } = create();
    await flush();
    const accepted = jest.fn();
    session.subscribeLocalSendAccepted(accepted);
    await session.send({ localId: 'local', text: 'hello' });
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('server', { senderId: 'me', localId: 'local' }),
    });
    mock.emit({
      type: ChatEventType.MessageAdded,
      message: message('other-device', { senderId: 'me' }),
    });
    expect(accepted).toHaveBeenCalledTimes(1);
  });

  it('does not accept invalid or tombstoned local IDs and releases the pending budget', async () => {
    const { session, mock } = create(undefined, { maxPendingSends: 1 });
    await flush();
    const accepted = jest.fn();
    session.subscribeLocalSendAccepted(accepted);
    await expect(session.send({ text: '' })).rejects.toThrow('empty');
    mock.emit({
      type: ChatEventType.MessageRemoved,
      chatId: 'chat',
      messageId: 'deleted',
      revision: 1,
    });
    await expect(session.send({ localId: 'deleted', text: 'hello' })).rejects.toThrow('accepted');
    expect(accepted).not.toHaveBeenCalled();
    await session.send({ localId: 'valid', text: 'hello' });
    expect(accepted).toHaveBeenCalledTimes(1);
  });

  it('never merges a main-channel pending send into a thread page', async () => {
    const mock = mockAdapter();
    Object.assign(mock.adapter.capabilities, { threads: true });
    const ack = deferred<Message>();
    mock.send.mockReturnValue(ack.promise);
    const { session } = create(mock);
    await flush();
    const task = session.send({ localId: 'local', text: 'main' });
    mock.loadLatest.mockResolvedValue(page([message('child', { threadId: 'root' })]));
    await session.enterThread('root');
    expect(session.getSnapshot().messageKeys).toEqual(['child']);
    ack.resolve(message('server', { localId: 'local', senderId: 'me' }));
    await task;
    expect(session.getSnapshot().messageKeys).toEqual(['child']);
  });

  it('rejects an ACK that changes the destination thread', async () => {
    const { session, mock } = create();
    await flush();
    mock.send.mockResolvedValue(
      message('wrong', { localId: 'local', senderId: 'me', threadId: 'other' }),
    );
    await expect(session.send({ localId: 'local', text: 'hello' })).rejects.toThrow(
      'could not be sent',
    );
    expect(session.messageStore.get('local')?.status).toBe('failed');
    expect(session.messageStore.get('wrong')).toBeUndefined();
  });
});
