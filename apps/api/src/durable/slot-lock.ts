import type { Slot } from '@senzo/schemas';
import { DurableObject } from 'cloudflare:workers';
import { CHECKOUT_LOCK_MS } from '../config/policy';
import type { Bindings } from '../env';

type Hold = { holder: string; expiresAt: number };

export type AcquireResult = { ok: true; expiresAt: number } | { ok: false; heldUntil: number };

/**
 * Soft lock on one chef + date + slot while a guest pays (business rules §3). Durable Object
 * input gates serialise calls, so check-then-set here can't race. Once payment is captured the
 * one_booking_per_slot index takes over.
 */
export class SlotLock extends DurableObject<Bindings> {
  async acquire(holder: string, ttlMs = CHECKOUT_LOCK_MS): Promise<AcquireResult> {
    const now = Date.now();
    const hold = await this.ctx.storage.get<Hold>('hold');
    if (hold && hold.expiresAt > now && hold.holder !== holder) {
      return { ok: false, heldUntil: hold.expiresAt };
    }
    const next: Hold = { holder, expiresAt: now + ttlMs };
    await this.ctx.storage.put('hold', next);
    await this.ctx.storage.setAlarm(next.expiresAt);
    return { ok: true, expiresAt: next.expiresAt };
  }

  async release(holder: string) {
    const hold = await this.ctx.storage.get<Hold>('hold');
    if (hold?.holder !== holder) return false;
    await this.ctx.storage.delete('hold');
    await this.ctx.storage.deleteAlarm();
    return true;
  }

  async holder(): Promise<Hold | null> {
    const hold = await this.ctx.storage.get<Hold>('hold');
    return hold && hold.expiresAt > Date.now() ? hold : null;
  }

  override async alarm() {
    const hold = await this.ctx.storage.get<Hold>('hold');
    if (hold && hold.expiresAt <= Date.now()) await this.ctx.storage.delete('hold');
  }
}

export const slotLock = (env: Bindings, chefId: string, date: string, slot: Slot) =>
  env.SLOT_LOCK.get(env.SLOT_LOCK.idFromName(`${chefId}:${date}:${slot}`));
