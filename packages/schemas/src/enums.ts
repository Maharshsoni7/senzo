import { z } from 'zod';

// Mirrored by CHECK constraints in apps/api/src/db/schema; change both in one migration.

export const Lang = z.enum(['en', 'gu', 'hi']);
export const Role = z.enum(['guest', 'chef']);
export type Role = z.infer<typeof Role>;
export const UserStatus = z.enum(['active', 'blocked', 'deleted']);
export const Platform = z.enum(['android', 'ios', 'web']);
export const AppKind = z.enum(['guest', 'partner']);
export type AppKind = z.infer<typeof AppKind>;
export const OtpPurpose = z.enum(['login']);
export const ConsentKind = z.enum(['terms', 'privacy', 'marketing']);

export const AddressLabel = z.enum(['home', 'work', 'other']);
export const WalletReason = z.enum(['refund_credit', 'promo', 'goodwill', 'spent']);

export const ChefStatus = z.enum(['draft', 'in_review', 'live', 'paused', 'suspended']);
export const CuisineLevel = z.enum(['good', 'great', 'expert']);
export type CuisineLevel = z.infer<typeof CuisineLevel>;
export const ChefFoodRule = z.enum(['jain', 'no_onion_garlic', 'vegan', 'eggless', 'kids']);
export const ProofKind = z.enum(['kitchen', 'training', 'certificate']);
export type ProofKind = z.infer<typeof ProofKind>;
export const ProofStatus = z.enum(['need', 'review', 'ok', 'rejected']);
export const KycKind = z.enum(['aadhaar', 'pan', 'bank', 'background', 'liveness']);
export const KycStatus = z.enum(['pending', 'passed', 'failed', 'expired']);
export const HelperStatus = z.enum(['pending', 'verified', 'rejected']);
export const PennyDropStatus = z.enum(['pending', 'verified', 'failed']);
export const Slot = z.enum(['lunch', 'dinner', 'late']);
export type Slot = z.infer<typeof Slot>;
export const AvailabilityState = z.enum(['open', 'off']);

export const FoodType = z.enum(['veg', 'jain', 'vegan', 'egg', 'non_veg']);
export const ReviewStatus = z.enum(['pending', 'approved', 'rejected']);
export const MenuKind = z.enum(['event', 'meal_prep']);
export type MenuKind = z.infer<typeof MenuKind>;
export const JainFlag = z.enum(['ok', 'jain_version', 'not_jain']);
export type JainFlag = z.infer<typeof JainFlag>;
export const FoodRule = z.enum(['regular', 'jain', 'no_onion_garlic']);
export type FoodRule = z.infer<typeof FoodRule>;
export const GroceriesBy = z.enum(['chef', 'guest']);
export type GroceriesBy = z.infer<typeof GroceriesBy>;

export const BudgetTier = z.enum(['simple', 'special', 'premium']);
export const MenuRequestStatus = z.enum(['open', 'closed', 'booked', 'expired']);
export const ProposalStatus = z.enum(['sent', 'chosen', 'expired', 'withdrawn']);

export const BookingState = z.enum([
  'payment_pending',
  'requested',
  'confirmed',
  'in_progress',
  'completed',
  'paid_out',
  'declined',
  'cancelled',
  'no_show',
  'disputed',
  'refunded',
  'expired',
]);
export type BookingState = z.infer<typeof BookingState>;
export const BookingSubStatus = z.enum(['on_the_way', 'awaiting_finish', 'possible_no_show']);
export type BookingSubStatus = z.infer<typeof BookingSubStatus>;
export const Actor = z.enum(['guest', 'chef', 'system', 'admin']);
export type Actor = z.infer<typeof Actor>;
export const JobOtpKind = z.enum(['start', 'finish']);
export const JobCheckKind = z.enum(['arrival', 'door_wait', 'call']);

export const PaymentStatus = z.enum(['created', 'authorized', 'captured', 'failed', 'refunded']);
export const RefundStatus = z.enum(['pending', 'processed', 'failed']);
export const LedgerAccountKind = z.enum([
  'guest_cash',
  'chef_payable',
  'platform_revenue',
  'gateway_fee',
  'gst_payable',
  'tds_payable',
  'wallet_liability',
  'promo_expense',
]);
export const PayoutStatus = z.enum(['queued', 'sent', 'failed', 'paid']);
export const PromoKind = z.enum(['flat', 'percent']);
export const InvoiceKind = z.enum(['chef_service', 'platform_commission']);
export const TaxStatementKind = z.enum(['monthly', 'form16a', 'annual']);

export const MessageKind = z.enum(['text', 'photo', 'menu_card', 'system']);
export const Side = z.enum(['guest', 'chef']);
export const NotificationChannel = z.enum(['push', 'sms', 'email', 'in_app']);
export const ReportCategory = z.enum([
  'food',
  'hygiene',
  'damage',
  'cash_request',
  'safety',
  'other',
]);
export const ReportStatus = z.enum(['open', 'investigating', 'resolved']);
export const ReportOutcome = z.enum(['none', 'partial_refund', 'full_refund']);

export const WebhookProvider = z.enum(['razorpay', 'msg91', 'exotel', 'kyc']);
export const AdminRole = z.enum(['support', 'operations', 'finance', 'admin']);
