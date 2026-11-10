import { MAX_ID_LENGTH, MAX_METADATA_BYTES } from './limits';

export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;

export const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const version = (value: unknown): boolean =>
  value === undefined || (number(value) && Number.isSafeInteger(value));

export const optionalId = (value: unknown): boolean => value === undefined || id(value);

export const metadata = (value: unknown): boolean => {
  if (value === undefined) {
    return true;
  }
  if (!record(value)) {
    return false;
  }
  try {
    return JSON.stringify(value).length <= MAX_METADATA_BYTES;
  } catch {
    return false;
  }
};
