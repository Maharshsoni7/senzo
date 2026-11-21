import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { slotLock } from './slot-lock';

let n = 0;
const fresh = () =>
  slotLock(env, 'chef_ananya', `2027-03-${String(++n).padStart(2, '0')}`, 'dinner');

describe('SlotLock', () => {
  it('gives the slot to the first guest and tells the second when it frees up', async () => {
    const lock = fresh();
    const first = await lock.acquire('bk_a');
    expect(first.ok).toBe(true);
    const second = await lock.acquire('bk_b');
    expect(second).toEqual({ ok: false, heldUntil: first.ok ? first.expiresAt : 0 });
  });

  it('lets the same checkout re-acquire to extend', async () => {
    const lock = fresh();
    await lock.acquire('bk_a', 1_000);
    const again = await lock.acquire('bk_a', 60_000);
    expect(again.ok).toBe(true);
  });

  it('frees the slot on release, but only for the holder', async () => {
    const lock = fresh();
    await lock.acquire('bk_a');
    expect(await lock.release('bk_b')).toBe(false);
    expect(await lock.release('bk_a')).toBe(true);
    expect((await lock.acquire('bk_b')).ok).toBe(true);
  });

  it('expires after its time and clears on the alarm', async () => {
    const lock = fresh();
    await lock.acquire('bk_a', 1);
    await new Promise((r) => setTimeout(r, 5));
    expect(await lock.holder()).toBeNull();
    expect((await lock.acquire('bk_b')).ok).toBe(true);

    await runInDurableObject(lock, async (_, state) => {
      await state.storage.put('hold', { holder: 'bk_b', expiresAt: Date.now() - 1 });
    });
    expect(await runDurableObjectAlarm(lock)).toBe(true);
    await runInDurableObject(lock, async (_, state) => {
      expect(await state.storage.get('hold')).toBeUndefined();
    });
  });
});
