import {
  shouldClaimSwipeReply,
  shouldCommitSwipeReply,
  SWIPE_REPLY_MAX,
  SWIPE_REPLY_THRESHOLD,
  swipeReplyOffset,
} from '../../../src/ui/message-bubble/view/swipeReply';

describe('swipeReplyOffset', () => {
  it('ignores a right swipe', () => {
    expect(swipeReplyOffset(12)).toBe(0);
    expect(swipeReplyOffset(0)).toBe(0);
  });

  it('follows the finger until the catch point', () => {
    expect(swipeReplyOffset(-20)).toBe(-20);
    expect(swipeReplyOffset(-SWIPE_REPLY_THRESHOLD)).toBe(-SWIPE_REPLY_THRESHOLD);
  });

  it('rubber-bands past the catch instead of hitting a wall', () => {
    const pulled = swipeReplyOffset(-(SWIPE_REPLY_THRESHOLD + 40));

    expect(pulled).toBeLessThan(-SWIPE_REPLY_THRESHOLD);
    expect(pulled).toBeGreaterThan(-(SWIPE_REPLY_THRESHOLD + 40));
    expect(pulled).toBeGreaterThanOrEqual(-SWIPE_REPLY_MAX);
  });
});

describe('shouldClaimSwipeReply', () => {
  it('claims a short left swipe before the list can scroll', () => {
    expect(shouldClaimSwipeReply(-6, 0)).toBe(true);
    expect(shouldClaimSwipeReply(-5, 0)).toBe(false);
    expect(shouldClaimSwipeReply(8, 0)).toBe(false);
  });

  it('leaves mostly vertical movement to the list', () => {
    expect(shouldClaimSwipeReply(-10, -20)).toBe(false);
    expect(shouldClaimSwipeReply(-20, -10)).toBe(true);
  });
});

describe('shouldCommitSwipeReply', () => {
  it('commits at the catch point', () => {
    expect(shouldCommitSwipeReply(-SWIPE_REPLY_THRESHOLD, 0)).toBe(true);
    expect(shouldCommitSwipeReply(-(SWIPE_REPLY_THRESHOLD + 8), 0)).toBe(true);
  });

  it('commits a short left flick', () => {
    expect(shouldCommitSwipeReply(-18, -0.8)).toBe(true);
  });

  it('cancels when the finger comes back or the flick is too weak', () => {
    expect(shouldCommitSwipeReply(-8, -1.2)).toBe(false);
    expect(shouldCommitSwipeReply(-20, -0.1)).toBe(false);
    expect(shouldCommitSwipeReply(12, -2)).toBe(false);
  });
});
