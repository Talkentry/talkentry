/**
 * Stable user identifier assigned by the host application or backend.
 */
export type UserId = string;

/**
 * Participant visible to the chat UI.
 *
 * Host apps may attach arbitrary `metadata`. Talkentry never interprets it.
 */
export interface User {
  /** Stable user id (matches `Message.senderId`). */
  readonly id: UserId;
  /** Display name shown in the bubble header / typing label. */
  readonly name?: string;
  /** Avatar image URL when the host provides one. */
  readonly avatarUrl?: string;
  /** Host-defined extras; Talkentry does not interpret them. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}
