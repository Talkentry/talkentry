import { message } from '@test/chat-fixtures';

import { useChatActions } from '../../../src/ui/chat-screen/useChatActions';
import { MessageActionId } from '../../../src/ui/message-bubble/actions/messageActions';
import { act, render } from '../../support/renderer';

const mockDelete = jest.fn(async () => undefined);
const mockReact = jest.fn(async () => undefined);
jest.mock('../../../src/react/context', () => ({
  useTalkentrySession: () => ({ options: { currentUserId: 'me' } }),
}));
jest.mock('../../../src/react/hooks', () => ({
  useSendMessage: () => ({ deleteMessage: mockDelete, toggleReaction: mockReact }),
}));
jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: 390, height: 844 }),
    addEventListener: () => ({ remove: jest.fn() }),
  },
}));

describe('chat action composition', () => {
  let actions!: ReturnType<typeof useChatActions>;
  const onForward = jest.fn();
  const onCopy = jest.fn();
  const Probe = () => {
    actions = useChatActions({ locale: 'en', onForward, onCopy });
    return null;
  };

  it('keeps one reply/edit draft and clears only a deleted draft target', async () => {
    await render(<Probe />);
    await act(async () => actions.onReply(message('first')));
    expect(actions.composerFocusKey).toBe(1);
    await act(async () => actions.onReply(message('second')));
    expect(actions.composerFocusKey).toBe(1);
    expect(actions.draft).toEqual({ type: 'reply', messageId: 'second' });
    await act(async () => actions.onEdit(message('edit', { text: 'body' })));
    expect(actions.draft).toEqual({ type: 'edit', messageId: 'edit', text: 'body' });
    await act(async () => actions.onDelete(message('other')));
    expect(actions.draft?.messageId).toBe('edit');
    await act(async () => actions.onDelete(message('edit')));
    expect(actions.draft).toBeNull();
    expect(mockDelete).toHaveBeenLastCalledWith('edit');
  });

  it('rejects local/system selection and executes the selected toolbar command', async () => {
    await render(<Probe />);
    await act(async () => actions.handleLongPress?.(message('local', { localId: 'local' })));
    expect(actions.selected).toBeNull();
    await act(async () => actions.handleLongPress?.(message('system', { system: true })));
    expect(actions.selected).toBeNull();
    await act(async () => actions.handleLongPress?.(message('confirmed')));
    expect(actions.selected?.id).toBe('confirmed');
    await act(async () => actions.forwardSelected());
    expect(onForward).toHaveBeenCalledWith(expect.objectContaining({ id: 'confirmed' }));
    expect(actions.selected).toBeNull();
  });

  it('reuses reply and reaction commands without keeping a second menu draft', async () => {
    await render(<Probe />);
    await act(async () =>
      actions.handlePress(message('mine', { senderId: 'me' }), (callback) =>
        callback(10, 20, 100, 50),
      ),
    );
    const reply = actions.menuActions.find((action) => action.id === MessageActionId.Reply)!;
    expect(actions.menuActions.some((action) => action.id === MessageActionId.Edit)).toBe(true);
    await act(async () => actions.runMenuAction(reply));
    expect(actions.menu).toBeNull();
    expect(actions.draft).toEqual({ type: 'reply', messageId: 'mine' });
    await act(async () => actions.onReact(message('mine'), 'ok'));
    expect(mockReact).toHaveBeenCalledWith('mine', 'ok');
  });
});
