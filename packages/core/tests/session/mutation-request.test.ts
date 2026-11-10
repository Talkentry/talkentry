import { MessageStore } from '@talkentry/core';
import { deferred, message, mockAdapter } from '@test/chat-fixtures';

import { createMutationRequest } from '../../src/session/internal/mutations/mutationRequest';
import {
  MessageMutation,
  requireMutationTarget,
} from '../../src/session/internal/mutations/mutationTarget';
import { createSessionHandle } from '../../src/session/internal/session-handle';

const create = () => {
  const session = createSessionHandle({
    id: 1,
    options: { adapter: mockAdapter().adapter, chatId: 'chat', currentUserId: 'me' },
    messageStore: new MessageStore(),
    pageSize: 50,
    maxPending: 16,
    timeoutMs: 100,
  });
  session.active = true;

  return session;
};

afterEach(() => jest.useRealTimers());

describe('message mutation targets', () => {
  it.each(Object.values(MessageMutation))('rejects a missing target for %s', (mutation) => {
    expect(() => requireMutationTarget(create(), 'missing', mutation)).toThrow('Message not found');
  });

  it.each([MessageMutation.Edit, MessageMutation.Delete])(
    'rejects another sender before checking confirmation for %s',
    (mutation) => {
      const session = create();
      session.messageStore.upsert(message('a', { localId: 'a' }));
      expect(() => requireMutationTarget(session, 'a', mutation)).toThrow(
        `Only the sender can ${mutation} this message`,
      );
    },
  );

  it.each(Object.values(MessageMutation))(
    'rejects an unconfirmed own target for %s',
    (mutation) => {
      const session = create();
      session.messageStore.upsert(message('a', { localId: 'a', senderId: 'me' }));
      expect(() => requireMutationTarget(session, 'a', mutation)).toThrow('unconfirmed message');
    },
  );

  it.each(Object.values(MessageMutation))(
    'returns the canonical confirmed target for %s',
    (mutation) => {
      const session = create();
      session.messageStore.upsert(message('a', { senderId: 'me' }));
      expect(requireMutationTarget(session, 'a', mutation)).toBe(session.messageStore.get('a'));
    },
  );

  it('allows a reaction to another sender', () => {
    const session = create();
    session.messageStore.upsert(message('a'));
    expect(requireMutationTarget(session, 'a', MessageMutation.React).senderId).toBe('other');
  });
});

describe('message mutation request ownership', () => {
  it('bounds a request even when the adapter ignores its signal', async () => {
    jest.useFakeTimers();
    const request = createMutationRequest(create());
    const pending = deferred<void>();
    const rejected = expect(request.run(pending.promise)).rejects.toThrow('Operation cancelled');
    jest.advanceTimersByTime(100);
    await rejected;
    request.dispose();
    pending.resolve();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('checks generation immediately before commit, including after the response resolves', async () => {
    const session = create();
    const request = createMutationRequest(session);
    expect(await request.run(Promise.resolve('accepted'))).toBe('accepted');
    session.epoch += 1;
    expect(request.isCurrent()).toBe(false);
    expect(request.assertCurrent).toThrow('Operation cancelled');
    request.dispose();
  });

  it.each(['active', 'blocked'] as const)(
    'rejects a session whose %s state changes',
    (property) => {
      const session = create();
      const request = createMutationRequest(session);
      session[property] = property === 'blocked';
      expect(request.isCurrent()).toBe(false);
      expect(request.assertCurrent).toThrow('Operation cancelled');
      request.dispose();
    },
  );

  it('disposes its deadline without aborting a completed adapter call', async () => {
    jest.useFakeTimers();
    const request = createMutationRequest(create());
    expect(await request.run(Promise.resolve(42))).toBe(42);
    request.assertCurrent();
    request.dispose();
    expect(jest.getTimerCount()).toBe(0);
    expect(request.signal.aborted).toBe(false);
  });
});
