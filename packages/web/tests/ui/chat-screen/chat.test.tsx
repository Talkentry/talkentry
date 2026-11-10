import { Chat, TalkentryProvider } from '../../../src';
import { flush, message, mockAdapter, page } from '../../support/helpers';
import { act, render, type TestInstance } from '../../support/renderer';

const json = (tree: { toJSON: () => unknown }) => JSON.stringify(tree.toJSON());

const call = (instance: TestInstance, name: string, ...args: unknown[]) =>
  (instance.props[name] as (...next: unknown[]) => void)(...args);

describe('web Chat', () => {
  it('renders history and sends through the session', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('hello', { senderId: 'other', text: 'hello', chatId: 'chat' })]),
    );
    mock.send.mockImplementation(async (command) =>
      message(command.localId ?? 'sent', {
        chatId: command.chatId,
        senderId: command.senderId,
        text: command.text,
        status: 'sent',
      }),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat users={{ me: { id: 'me', name: 'You' }, other: { id: 'other', name: 'Alex' } }} />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    expect(json(tree)).toContain('hello');

    const field = tree.root.findByType('textarea');

    await act(async () => {
      call(field, 'onChange', { target: { value: 'ping' } });
    });

    await act(async () => {
      call(tree.root.findByType('form'), 'onSubmit', { preventDefault() {} });
      await flush();
    });

    expect(mock.send).toHaveBeenCalled();
    expect(json(tree)).toContain('ping');
  });

  it('opens message actions from a context menu and starts a reply', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('quoted', { senderId: 'other', text: 'quoted', chatId: 'chat' })]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const target = tree.root
      .findAllByType('div')
      .find((node) => typeof node.props.onContextMenu === 'function');

    if (!target) {
      throw new Error('missing message context target');
    }

    await act(async () => {
      call(target, 'onContextMenu', {
        preventDefault() {},
        clientX: 40,
        clientY: 80,
      });
    });

    const reply = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === 'Reply to message');

    if (!reply) {
      throw new Error('missing reply control');
    }

    await act(async () => {
      call(reply, 'onClick');
    });

    expect(json(tree)).toContain('Replying to');
  });

  it('inserts an emoji from the hover popover', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page());

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const hover = tree.root
      .findAllByType('div')
      .find((node) => node.props['aria-label'] === 'Emoji');

    if (!hover) {
      throw new Error('missing emoji hover target');
    }

    expect(
      hover.findAllByType('button').filter((node) => node.props['aria-label'] === '😀'),
    ).toHaveLength(0);

    await act(async () => {
      call(hover, 'onMouseEnter');
    });

    const grin = hover.findAllByType('button').find((node) => node.props['aria-label'] === '😀');

    if (!grin) {
      throw new Error('missing hover emoji cell');
    }

    await act(async () => {
      call(grin, 'onClick');
    });

    expect(tree.root.findByType('textarea').props.value).toContain('😀');
  });

  it('pins a right-hand emoji sidebar on click', async () => {
    const mock = mockAdapter();
    mock.loadLatest.mockResolvedValue(page());

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const toggle = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === 'Open emoji picker');

    if (!toggle) {
      throw new Error('missing emoji toggle');
    }

    const sidebar = tree.root
      .findAllByType('aside')
      .find((node) => node.props['aria-label'] === 'Emoji sidebar');

    if (!sidebar) {
      throw new Error('missing emoji sidebar');
    }
    expect(sidebar.props['aria-hidden']).toBe(true);
    expect((sidebar.props.style as { transform?: string })?.transform).toBe('translateX(100%)');

    await act(async () => {
      call(toggle, 'onClick');
    });

    expect(sidebar.props['aria-hidden']).toBe(false);
    expect((sidebar.props.style as { transform?: string })?.transform).toBe('translateX(0)');

    const grin = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === '😀');

    if (!grin) {
      throw new Error('missing sidebar emoji cell');
    }

    await act(async () => {
      call(grin, 'onClick');
    });

    expect(tree.root.findByType('textarea').props.value).toContain('😀');

    await act(async () => {
      call(toggle, 'onClick');
    });

    expect(sidebar.props['aria-hidden']).toBe(true);
    expect((sidebar.props.style as { transform?: string })?.transform).toBe('translateX(100%)');
  });

  it('toggles a quick reaction from the message context menu', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('quoted', { senderId: 'other', text: 'quoted', chatId: 'chat' })]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const target = tree.root
      .findAllByType('div')
      .find((node) => typeof node.props.onContextMenu === 'function');

    if (!target) {
      throw new Error('missing message context target');
    }

    await act(async () => {
      call(target, 'onContextMenu', {
        preventDefault() {},
        clientX: 40,
        clientY: 80,
      });
    });

    const like = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === 'React 👍');

    if (!like) {
      throw new Error('missing quick reaction');
    }

    await act(async () => {
      call(like, 'onClick');
      await flush();
    });

    expect(mock.toggleReaction).toHaveBeenCalledWith(
      expect.objectContaining({ emoji: '👍', messageId: 'quoted', actorId: 'me' }),
    );
    expect(json(tree)).toContain('👍');
  });

  it('keeps message actions when the reaction picker expands', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('quoted', { senderId: 'other', text: 'quoted', chatId: 'chat' })]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const target = tree.root
      .findAllByType('div')
      .find((node) => typeof node.props.onContextMenu === 'function');

    if (!target) {
      throw new Error('missing message context target');
    }

    await act(async () => {
      call(target, 'onContextMenu', {
        preventDefault() {},
        clientX: 40,
        clientY: 80,
      });
    });

    const more = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === 'More reactions');

    if (!more) {
      throw new Error('missing more reactions control');
    }

    await act(async () => {
      call(more, 'onClick');
    });

    const reply = tree.root
      .findAllByType('button')
      .find((node) => node.props['aria-label'] === 'Reply to message');

    if (!reply) {
      throw new Error('missing reply control');
    }

    expect(json(tree)).toContain('😀');
  });

  it('renders image attachments in the bubble', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([
        message('pic', {
          senderId: 'other',
          text: 'look',
          chatId: 'chat',
          attachments: [
            {
              id: 'att-pic',
              type: 'image',
              url: '/uploads/cat.png',
              name: 'cat.png',
            },
          ],
        }),
      ]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const image = tree.root.findByType('img');

    expect(image.props.src).toBe('/uploads/cat.png');
    expect(image.props.alt).toBe('cat.png');
  });

  it('uploads a picked file and sends it as an attachment', async () => {
    const mock = mockAdapter();
    const file = new File(['hello'], 'note.txt', { type: 'text/plain' });

    mock.send.mockImplementation(async (command) =>
      message(command.localId ?? 'sent', {
        chatId: command.chatId,
        senderId: command.senderId,
        text: command.text ?? '',
        attachments: command.attachments,
        status: 'sent',
      }),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const input = tree.root.findAllByType('input').find((node) => node.props.type === 'file');

    if (!input) {
      throw new Error('missing file input');
    }

    const currentTarget = { files: [file], value: 'note.txt' };

    await act(async () => {
      call(input, 'onChange', { currentTarget, target: currentTarget });
      await flush();
    });

    expect(mock.uploadAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'note.txt', mimeType: 'text/plain' }),
    );
    expect(json(tree)).toContain('note.txt');

    await act(async () => {
      call(tree.root.findByType('form'), 'onSubmit', { preventDefault() {} });
      await flush();
    });

    expect(mock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            id: 'att-note.txt',
            name: 'note.txt',
            type: 'file',
          }),
        ],
      }),
    );
  });

  it('shows receipt ticks on own messages instead of the status word', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([
        message('own', {
          senderId: 'me',
          text: 'mine',
          chatId: 'chat',
          status: 'sent',
        }),
        message('seen', {
          senderId: 'me',
          text: 'seen',
          chatId: 'chat',
          status: 'read',
        }),
      ]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const ticks = tree.root
      .findAllByType('span')
      .filter((node) => typeof node.props['aria-label'] === 'string');
    const sent = ticks.find((node) => node.props['aria-label'] === 'sent');
    const read = ticks.find((node) => node.props['aria-label'] === 'read');

    expect(sent?.props.children).toBe('✓');
    expect(read?.props.children).toBe('✓✓');
  });

  it('shows an avatar on the last incoming message of a same-sender run', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([
        message('a', {
          senderId: 'other',
          text: 'first',
          chatId: 'chat',
          createdAt: 1,
        }),
        message('b', {
          senderId: 'other',
          text: 'second',
          chatId: 'chat',
          createdAt: 2,
        }),
      ]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat
          users={{
            other: { id: 'other', name: 'Alex', avatarUrl: 'https://cdn.example/alex.png' },
          }}
        />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    const avatarsOn = (key: string) => {
      const row = tree.root
        .findAllByType('div')
        .find((node) => node.props['data-message-key'] === key);

      return (
        row
          ?.findAllByType('img')
          .filter((node) => node.props.src === 'https://cdn.example/alex.png') ?? []
      );
    };

    expect(avatarsOn('a')).toHaveLength(0);
    expect(avatarsOn('b')).toHaveLength(1);
    expect(avatarsOn('b')[0]?.props.alt).toBe('Alex');
    expect(json(tree)).toContain('first');
    expect(json(tree)).toContain('second');
  });

  it('lets the host rearrange the Chat tree', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('hello', { senderId: 'other', text: 'hello', chatId: 'chat' })]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat
          renderChat={({ list, composer }) => (
            <div>
              <div>custom-shell</div>
              {composer}
              {list}
            </div>
          )}
        />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    expect(json(tree)).toContain('custom-shell');
    expect(json(tree)).toContain('hello');
    expect(tree.root.findByType('textarea')).toBeTruthy();
  });

  it('replaces a message row and the composer through slots', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(
      page([message('hello', { senderId: 'other', text: 'hello', chatId: 'chat' })]),
    );

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat
          renderMessage={({ message: row }) => <div>{`row-${row.text}`}</div>}
          renderComposer={() => <div>bank-composer</div>}
        />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    expect(json(tree)).toContain('row-hello');
    expect(json(tree)).toContain('bank-composer');
    expect(tree.root.findAllByType('textarea')).toHaveLength(0);
  });

  it('replaces empty history through renderEmpty', async () => {
    const mock = mockAdapter();

    mock.loadLatest.mockResolvedValue(page([]));

    const tree = await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Chat renderEmpty={() => <div>no-history</div>} />
      </TalkentryProvider>,
    );

    await act(async () => {
      await flush();
    });

    expect(json(tree)).toContain('no-history');
  });
});
