import { ChatEventType, type ChatSession, type MessagePage } from '@talkentry/core';
import { StrictMode } from 'react';

import { TalkentryProvider, useMessage, useMessages, useTalkentrySession } from '../../src';
import { deferred, flush, message, mockAdapter, page } from '../support/helpers';
import { act, render } from '../support/renderer';

describe('web provider lifecycle', () => {
  it('isolates a late A response after switching to B', async () => {
    const mock = mockAdapter();
    const a = deferred<MessagePage>();
    const b = deferred<MessagePage>();
    mock.loadLatest.mockImplementation((p) =>
      (p as { chatId: string }).chatId === 'A' ? a.promise : b.promise,
    );
    let keys: readonly string[] = [];
    const Probe = () => {
      keys = useMessages().messageKeys;

      return null;
    };
    const view = (chatId: string) => (
      <TalkentryProvider adapter={mock.adapter} chatId={chatId} currentUserId="me">
        <Probe />
      </TalkentryProvider>
    );
    const tree = await render(view('A'));

    await act(async () => {
      tree.update(view('B'));
    });
    await act(async () => {
      b.resolve(page([message('b', { chatId: 'B' })]));
      await flush();
    });
    expect(keys).toEqual(['b']);
    await act(async () => {
      a.resolve(page([message('a', { chatId: 'A' })]));
      await flush();
    });
    expect(keys).toEqual(['b']);
  });

  it.each(['account', 'adapter', 'scopeKey'] as const)(
    'changes scope on %s replacement',
    async (which) => {
      const first = mockAdapter();
      const second = mockAdapter();
      let session!: ChatSession;
      const Probe = () => {
        session = useTalkentrySession();

        return null;
      };
      const view = (next: boolean) => (
        <TalkentryProvider
          adapter={next && which === 'adapter' ? second.adapter : first.adapter}
          currentUserId={next && which === 'account' ? 'other-user' : 'me'}
          scopeKey={next && which === 'scopeKey' ? 'tenant-B' : 'tenant-A'}
          chatId="chat"
        >
          <Probe />
        </TalkentryProvider>
      );
      const tree = await render(view(false));
      const old = session;

      await act(async () => {
        tree.update(view(true));
      });
      expect(session).not.toBe(old);
      expect(old.isActive()).toBe(false);
    },
  );

  it('updates a point subscriber without rerendering the structural hook', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page([message('a')]));
    let renders = 0;
    let text: string | undefined;
    const Structure = () => {
      useMessages();
      renders += 1;

      return null;
    };
    const Row = () => {
      text = useMessage('a')?.text;

      return null;
    };

    await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Structure />
        <Row />
      </TalkentryProvider>,
    );
    const before = renders;

    await act(async () => {
      mock.emit({
        type: ChatEventType.MessageUpdated,
        message: message('a', { revision: 1, text: 'edit' }),
      });
    });
    expect(text).toBe('edit');
    expect(renders).toBe(before);
  });

  it('survives React StrictMode effect replay', async () => {
    const mock = mockAdapter();
    let session!: ChatSession;
    const Probe = () => {
      session = useTalkentrySession();

      return null;
    };

    await render(
      <StrictMode>
        <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
          <Probe />
        </TalkentryProvider>
      </StrictMode>,
    );
    expect(session.isActive()).toBe(true);
    expect(session.getSnapshot().status).toBe('ready');
  });
});
