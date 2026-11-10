/**
 * Private merge helpers for `MessageStore`.
 *
 * Why this folder exists: the store owns maps/aliases/tombstones/notify.
 * These functions only answer "given two Message payloads, what should we keep?".
 *
 * Entry points used by the store:
 * - `mergeWithExisting` — upsert when the UI key already has a row
 * - `collapseRemoteEcho` — upsert when a second row appeared under server id
 * - `statusRanksAbove` — early exit for `patchStatus`
 */

export { collapseRemoteEcho } from './remote-echo';
export { statusRanksAbove } from './status';
export { type MergeExistingResult, mergeWithExisting } from './with-existing';
