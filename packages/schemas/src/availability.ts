import { z } from 'zod';

export const SlotStatus = z.enum(['open', 'booked', 'off']);

export const ChefMonthAvailability = z
  .object({
    chefId: z.string(),
    month: z.string(),
    days: z.array(
      z.object({
        date: z.iso.date(),
        /** At least one slot is open. */
        open: z.boolean(),
        slots: z.object({ lunch: SlotStatus, dinner: SlotStatus, late: SlotStatus }),
      }),
    ),
  })
  .meta({ id: 'ChefMonthAvailability' });
export type ChefMonthAvailability = z.infer<typeof ChefMonthAvailability>;
