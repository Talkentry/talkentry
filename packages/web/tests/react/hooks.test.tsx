import { TimelineChangeKind } from '@talkentry/core';

import { TalkentryProvider, useSendMessage, useTyping, useViewport } from '../../src';
import { mockAdapter } from '../support/helpers';
import { act, render } from '../support/renderer';

describe('web session hooks', () => {
  it('exposes session send through useSendMessage', async () => {
    const mock = mockAdapter();
    let send: ((input: { text: string }) => Promise<unknown>) | undefined;
    const Probe = () => {
      send = useSendMessage().sendMessage;

      return null;
    };

    await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Probe />
      </TalkentryProvider>,
    );

    await act(async () => {
      await send?.({ text: 'hello' });
    });
    expect(mock.send).toHaveBeenCalled();
  });

  it('starts with no typing peers', async () => {
    const mock = mockAdapter();
    let typing: readonly string[] = ['stale'];
    const Probe = () => {
      typing = useTyping();

      return null;
    };

    await render(
      <TalkentryProvider adapter={mock.adapter} chatId="chat" currentUserId="me">
        <Probe />
      </TalkentryProvider>,
    );
    expect(typing).toEqual([]);
  });
});

describe('web viewport hook', () => {
  it('resets interaction when scopeKey changes', async () => {
    let getState: (() => { interacting: boolean }) | undefined;
    let onUserDrag: (() => void) | undefined;
    const Probe = ({ scopeKey }: { scopeKey: string }) => {
      const viewport = useViewport({
        change: { sequence: 1, kind: TimelineChangeKind.Latest },
        hasMoreAfter: false,
        scopeKey,
      });

      getState = viewport.getState;
      onUserDrag = viewport.onUserDrag;

      return null;
    };
    const tree = await render(<Probe scopeKey="a" />);

    await act(async () => {
      onUserDrag?.();
    });
    expect(getState?.().interacting).toBe(true);

    await act(async () => {
      tree.update(<Probe scopeKey="b" />);
    });
    expect(getState?.().interacting).toBe(false);
  });
});
