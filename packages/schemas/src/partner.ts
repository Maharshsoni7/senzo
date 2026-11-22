import { z } from 'zod';
import { BookingState, BookingSubStatus, FoodRule, GroceriesBy, Slot } from './enums';
import { Paise } from './money';

export const PartnerBookingScope = z.enum(['requests', 'upcoming', 'past']);
export type PartnerBookingScope = z.infer<typeof PartnerBookingScope>;

export const PartnerBookingListQuery = z.object({
  scope: PartnerBookingScope.default('upcoming'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PartnerBookingListQuery = z.infer<typeof PartnerBookingListQuery>;

export const PartnerBookingSummary = z
  .object({
    id: z.string(),
    code: z.string(),
    state: BookingState,
    subStatus: BookingSubStatus.nullable(),
    /** IST calendar date. */
    date: z.iso.date(),
    slot: Slot,
    startsAt: z.iso.datetime(),
    /** Serving time minus 2 h. */
    arriveBy: z.iso.datetime(),
    /** Set while the request waits for an answer. */
    acceptBy: z.iso.datetime().nullable(),
    guests: z.number().int(),
    /** "Rahul D." */
    guestName: z.string(),
    area: z.string(),
    menuName: z.string().nullable(),
    foodRule: FoodRule,
    /** Menu total minus platform fee and its GST. */
    earningsPaise: Paise,
  })
  .meta({ id: 'PartnerBookingSummary' });
export type PartnerBookingSummary = z.infer<typeof PartnerBookingSummary>;

export const PartnerBookingList = z
  .object({ items: z.array(PartnerBookingSummary), nextCursor: z.string().nullable() })
  .meta({ id: 'PartnerBookingList' });

export const PartnerBookingDetail = PartnerBookingSummary.extend({
  groceriesBy: GroceriesBy,
  etaMinutes: z.number().int().nullable(),
  allergiesAckAt: z.iso.datetime().nullable(),
  startedAt: z.iso.datetime().nullable(),
  doneAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  items: z.array(z.object({ course: z.string().nullable(), dishName: z.string() })),
  foodProfile: z.object({
    allergies: z.array(z.string()),
    jainCount: z.number().int().nullable(),
    noOnionGarlic: z.boolean(),
    notes: z.string().nullable(),
  }),
  kitchen: z
    .object({ gas: z.boolean(), oven: z.boolean(), mixer: z.boolean(), fridge: z.boolean() })
    .nullable(),
  /** Street, pincode and coordinates only after accepting, until 24 h after the job. */
  address: z.object({
    unlocked: z.boolean(),
    area: z.string(),
    city: z.string(),
    line1: z.string().nullable(),
    pincode: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  }),
}).meta({ id: 'PartnerBookingDetail' });
export type PartnerBookingDetail = z.infer<typeof PartnerBookingDetail>;

export const AcceptBookingBody = z
  .object({ allergiesAck: z.literal(true, { error: "Confirm you've read the allergies" }) })
  .meta({ id: 'AcceptBookingBody' });

export const DeclineBookingBody = z
  .object({ reason: z.string().trim().max(200).optional() })
  .meta({ id: 'DeclineBookingBody' });

export const OnMyWayBody = z
  .object({ etaMinutes: z.union([z.literal(15), z.literal(30), z.literal(45)]) })
  .meta({ id: 'OnMyWayBody' });

const JobCode = z.string().regex(/^\d{4}$/, 'Enter the 4-digit code');

export const StartJobBody = z
  .object({
    otp: JobCode,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .meta({ id: 'StartJobBody' });

export const FinishJobBody = z.object({ otp: JobCode }).meta({ id: 'FinishJobBody' });
