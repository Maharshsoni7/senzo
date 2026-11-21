import type { QuoteRequest } from '@senzo/schemas';
import type { Db } from '../../db';
import { AppError } from '../../lib/errors';
import { priceQuote } from './engine';
import { findActivePromo, loadMenuForQuote } from './repo';

/**
 * Per-device and first-booking promo limits need a signed-in user and are
 * checked when the booking is created, not here.
 */
export async function quote(db: Db, req: QuoteRequest) {
  const menu = await loadMenuForQuote(db, req.menuId);
  if (!menu) throw new AppError('NOT_FOUND', 404, 'Menu not found');

  const promo = req.promo ? await findActivePromo(db, req.promo, Date.now()) : null;
  if (req.promo && !promo) throw new AppError('PROMO_INVALID', 422, 'Promo code is not valid');

  return priceQuote(menu, {
    guests: req.guests,
    foodRule: req.foodRule,
    optionIds: req.options,
    addonIds: req.addons,
    groceriesBy: req.groceriesBy,
    kitchen: req.kitchen,
    promo,
  });
}
