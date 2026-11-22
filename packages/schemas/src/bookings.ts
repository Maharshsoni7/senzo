import { z } from 'zod';
import {
  Actor,
  AddressLabel,
  BookingState,
  BookingSubStatus,
  FoodRule,
  GroceriesBy,
  JobOtpKind,
  Slot,
} from './enums';
import { Paise } from './money';

export const BookingScope = z.enum(['upcoming', 'past']);
export type BookingScope = z.infer<typeof BookingScope>;

export const BookingListQuery = z.object({
  scope: BookingScope.default('upcoming'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type BookingListQuery = z.infer<typeof BookingListQuery>;

/** The code the guest reads out to the chef; present only while it is due. */
export const JobOtp = z
  .object({ kind: JobOtpKind, code: z.string().regex(/^\d{4}$/) })
  .meta({ id: 'JobOtp' });

export const BookingSummary = z
  .object({
    id: z.string(),
    code: z.string(),
    state: BookingState,
    subStatus: BookingSubStatus.nullable(),
    /** IST calendar date. */
    date: z.iso.date(),
    slot: Slot,
    startsAt: z.iso.datetime(),
    guests: z.number().int(),
    chef: z.object({ id: z.string(), slug: z.string(), displayName: z.string() }),
    menuName: z.string().nullable(),
    totalPaise: Paise,
    otp: JobOtp.nullable(),
  })
  .meta({ id: 'BookingSummary' });
export type BookingSummary = z.infer<typeof BookingSummary>;

export const BookingList = z
  .object({ items: z.array(BookingSummary), nextCursor: z.string().nullable() })
  .meta({ id: 'BookingList' });
export type BookingList = z.infer<typeof BookingList>;

export const BookingDetail = BookingSummary.extend({
  foodRule: FoodRule,
  groceriesBy: GroceriesBy,
  etaMinutes: z.number().int().nullable(),
  /** When the chef tapped "on my way"; arrival ≈ this + etaMinutes. */
  onTheWayAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  doneAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  cancelledBy: Actor.nullable(),
  address: z.object({ label: AddressLabel, line1: z.string(), area: z.string().nullable() }),
  items: z.array(z.object({ course: z.string().nullable(), dishName: z.string() })),
  price: z.object({
    menuTotalPaise: Paise,
    convenienceFeePaise: Paise,
    feeGstPaise: Paise,
    promoPaise: Paise,
    walletPaise: Paise,
    totalPaise: Paise,
  }),
}).meta({ id: 'BookingDetail' });
export type BookingDetail = z.infer<typeof BookingDetail>;
