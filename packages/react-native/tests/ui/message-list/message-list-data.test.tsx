import type { Message } from '@talkentry/core';
import { message } from '@test/chat-fixtures';

import { useMessageListData } from '../../../src/ui/message-list/useMessageListData';
import { act, render } from '../../support/renderer';

describe('controlled message list data', () => {
  let data!: ReturnType<typeof useMessageListData>;
  const Host = ({
    messages,
    hasMoreAfter = false,
  }: {
    messages: readonly Message[];
    hasMoreAfter?: boolean;
  }) => {
    data = useMessageListData({ messages, currentUserId: 'me', hasMoreAfter });
    return null;
  };

  it('resolves server/local aliases and cached quote parents to canonical rows', async () => {
    const parent = message('server-parent', { localId: 'local-parent' });
    const child = message('reply', { replyToId: parent.id });
    const tree = await render(<Host messages={[parent, child]} />);

    expect(data.resolveKey(parent.id)).toBe(parent.localId);
    expect(data.resolveKey(parent.localId!)).toBe(parent.localId);
    expect(data.resolveMessage(parent.id)).toBe(parent);
    expect(data.resolveReplyParent(child.id)).toBe(parent);
    expect(data.resolveKey('absent')).toBeUndefined();
    await act(async () => {
      tree.unmount();
    });
  });

  it('keeps snapshot keys stable across flag-only renders and updates the data on a new page', async () => {
    const messages = [message('a')];
    const tree = await render(<Host messages={messages} />);
    const keys = data.keys;
    const rowKeys = data.rowKeys;

    await act(async () => {
      tree.update(<Host messages={messages} hasMoreAfter />);
    });
    expect(data.keys).toBe(keys);
    expect(data.rowKeys).toBe(rowKeys);
    expect(data.moreAfter).toBe(true);

    await act(async () => {
      tree.update(<Host messages={[...messages, message('b')]} />);
    });
    expect(data.keys).not.toBe(keys);
    expect(data.resolveKey('b')).toBe('b');
    expect(data.rowIndexes.get('b')).toBeDefined();
    await act(async () => {
      tree.unmount();
    });
  });
});
