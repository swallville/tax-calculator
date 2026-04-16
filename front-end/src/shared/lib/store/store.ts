import { StoreWritable } from 'effector';
import { persist } from 'effector-storage/local';

// SSR guard — Next.js renders components on the server where `window` is
// absent. Attempting to access `localStorage` there would throw a
// ReferenceError, so persistence is skipped entirely for server-side renders.
const isClient = typeof window !== 'undefined';

/**
 * Options that control persistence behaviour for a given store.
 *
 * @template T - The store's state type.
 */
interface PersistOptions<T> {
  /**
   * Optional transform applied to the state before it is written to
   * `localStorage`. Use this to strip sensitive or ephemeral fields
   * (e.g. in-flight request flags, raw salary values) that should not
   * survive a page reload.
   */
  sanitize?: (state: T) => T;
  /**
   * Maximum age of a persisted entry in milliseconds. Entries older than
   * this are treated as expired and removed on the next read.
   *
   * Useful for tax-rate caches where stale data would produce incorrect
   * results after a new tax year's brackets are published.
   */
  ttlMs?: number;
}

/**
 * Wires an Effector store to `localStorage` with optional sanitization and TTL.
 *
 * Wraps `effector-storage/local` with a custom JSON envelope so we can store
 * a write timestamp alongside the payload — enabling time-based expiry without
 * a separate metadata key.
 *
 * @param store   - The writable Effector store to persist.
 * @param key     - `localStorage` key under which the serialised state is saved.
 * @param options - Optional sanitize function and TTL duration.
 *
 * @example
 * createPersistedStore($taxRates, 'tax-rates-cache', { ttlMs: 24 * 60 * 60 * 1000 });
 */
export const createPersistedStore = <T>(
  store: StoreWritable<T>,
  key: string,
  options?: PersistOptions<T>,
) => {
  if (!isClient) return;

  const { sanitize, ttlMs } = options ?? {};

  persist({
    store,
    key,
    serialize: (state: T) => {
      // Apply sanitize before serialization so sensitive fields are stripped
      // from the stored string, not just from the in-memory state.
      const safe = sanitize ? sanitize(state) : state;
      // The `ts` field is the write timestamp used by the TTL check on
      // deserialization. Storing it inside the envelope avoids a second
      // `localStorage` entry per store.
      return JSON.stringify({ data: safe, ts: Date.now() });
    },
    deserialize: (raw: string): T | undefined => {
      const parsed = JSON.parse(raw) as { data: T; ts: number };
      // TTL check: if the entry is older than `ttlMs`, evict it and return
      // `undefined` so the store reverts to its initial (default) state rather
      // than surfacing stale data. `localStorage.removeItem` keeps storage tidy.
      if (ttlMs && Date.now() - parsed.ts > ttlMs) {
        localStorage.removeItem(key);
        return undefined;
      }
      return parsed.data;
    },
  });
};
