// Demo data from the approved mockups (G04, G07, G22, C05, C08, C09). Prices in paise.
import { percentOf } from '@senzo/schemas';
import { FEES } from '../src/config/fees';
import type { schema } from '../src/db';

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'];
type S = typeof schema;

const rupees = (r: number) => r * 100;
const at = (iso: string) => Date.parse(iso);

const people: Insert<S['users']>[] = [
  { id: 'usr_rahul', phoneE164: '+919800000101', name: 'Rahul Desai', roleFlags: ['guest'] },
  { id: 'usr_krupa', phoneE164: '+919800000102', name: 'Krupa Shah', roleFlags: ['guest'] },
  ...[
    ['ananya', 'Ananya Mehta'],
    ['meera', 'Meera Iyer'],
    ['hetal', 'Hetal Desai'],
    ['jignesh', 'Jignesh Patel'],
    ['bhavna', 'Bhavna Trivedi'],
    ['rohan', 'Rohan Kapoor'],
    ['arjun', 'Arjun Rao'],
    ['priya', 'Priya Nair'],
  ].map(([key, name], i) => ({
    id: `usr_${key}`,
    phoneE164: `+9198000002${String(i).padStart(2, '0')}`,
    name,
    roleFlags: ['chef' as const],
  })),
];

export const users = people.map((u) => ({ ageConfirmedAt: at('2026-10-01T00:00:00Z'), ...u }));

export const serviceAreas: Insert<S['serviceAreas']>[] = [
  {
    id: 'sa_ahd_west',
    city: 'Ahmedabad',
    name: 'Ahmedabad West',
    isLive: true,
    polygon: {
      type: 'Polygon',
      coordinates: [
        [
          [72.45, 22.97],
          [72.61, 22.97],
          [72.61, 23.11],
          [72.45, 23.11],
          [72.45, 22.97],
        ],
      ],
    },
  },
];

type ChefSeed = {
  key: string;
  displayName: string;
  headline: string;
  cuisine: string;
  ratingAvg: number;
  fromPrice: number;
  baseLat: number;
  baseLng: number;
  jain?: boolean;
};

const railChefs: ChefSeed[] = [
  {
    key: 'meera',
    displayName: 'Meera Iyer',
    headline: 'South Indian Coastal',
    cuisine: 'South Indian',
    ratingAvg: 4.9,
    fromPrice: 1600,
    baseLat: 23.07,
    baseLng: 72.53,
  },
  {
    key: 'hetal',
    displayName: 'Hetal Desai',
    headline: 'Kathiyawadi Gujarati',
    cuisine: 'Kathiyawadi',
    ratingAvg: 4.8,
    fromPrice: 1500,
    baseLat: 23.02,
    baseLng: 72.55,
    jain: true,
  },
  {
    key: 'jignesh',
    displayName: 'Jignesh Patel',
    headline: 'Surti Gujarati',
    cuisine: 'Surti',
    ratingAvg: 4.7,
    fromPrice: 1400,
    baseLat: 23.05,
    baseLng: 72.57,
  },
  {
    key: 'bhavna',
    displayName: 'Bhavna Trivedi',
    headline: 'Gujarati Jain Thali',
    cuisine: 'Gujarati',
    ratingAvg: 4.9,
    fromPrice: 1600,
    baseLat: 23.03,
    baseLng: 72.5,
    jain: true,
  },
  {
    key: 'rohan',
    displayName: 'Rohan Kapoor',
    headline: 'North Indian Tandoor',
    cuisine: 'North Indian',
    ratingAvg: 4.8,
    fromPrice: 2200,
    baseLat: 23.04,
    baseLng: 72.52,
  },
  {
    key: 'arjun',
    displayName: 'Arjun Rao',
    headline: 'Pan-Asian',
    cuisine: 'Pan-Asian',
    ratingAvg: 4.8,
    fromPrice: 2400,
    baseLat: 23.01,
    baseLng: 72.53,
  },
  {
    key: 'priya',
    displayName: 'Priya Nair',
    headline: 'Desserts & Patisserie',
    cuisine: 'Desserts',
    ratingAvg: 4.9,
    fromPrice: 1500,
    baseLat: 23.0,
    baseLng: 72.51,
  },
];

export const chefs: Insert<S['chefs']>[] = [
  {
    id: 'chef_ananya',
    userId: 'usr_ananya',
    slug: 'ananya-mehta',
    displayName: 'Ananya Mehta',
    headline: 'Modern Gujarati · Bodakdev',
    bio: 'Modern Gujarati home cooking for birthdays, kitty parties and festivals.',
    yearsCooking: 8,
    baseLat: 23.04,
    baseLng: 72.51,
    serviceRadiusKm: 12,
    maxGuests: 40,
    hasHelper: true,
    status: 'live',
    ratingAvg: 4.9,
    ratingCount: 126,
    jobsDone: 212,
    acceptRate: 0.96,
    replyMinutesP50: 12,
  },
  ...railChefs.map((c) => ({
    id: `chef_${c.key}`,
    userId: `usr_${c.key}`,
    slug: c.displayName.toLowerCase().replace(' ', '-'),
    displayName: c.displayName,
    headline: c.headline,
    yearsCooking: 5,
    baseLat: c.baseLat,
    baseLng: c.baseLng,
    serviceRadiusKm: 10,
    maxGuests: 12,
    status: 'live' as const,
    ratingAvg: c.ratingAvg,
    ratingCount: 40,
    jobsDone: 60,
  })),
];

export const chefCuisines: Insert<S['chefCuisines']>[] = [
  { chefId: 'chef_ananya', cuisine: 'Gujarati', level: 'expert' },
  { chefId: 'chef_ananya', cuisine: 'Modern Indian', level: 'great' },
  ...railChefs.map((c) => ({
    chefId: `chef_${c.key}`,
    cuisine: c.cuisine,
    level: 'expert' as const,
  })),
];

export const chefFoodRules: Insert<S['chefFoodRules']>[] = [
  { chefId: 'chef_ananya', rule: 'jain' },
  { chefId: 'chef_ananya', rule: 'no_onion_garlic' },
  ...railChefs
    .filter((c) => c.jain)
    .map((c) => ({ chefId: `chef_${c.key}`, rule: 'jain' as const })),
];

export const chefOccasions: Insert<S['chefOccasions']>[] = [
  'Kitty party',
  'Birthday',
  'Festival / puja',
  'Live jalebi',
  'Live khandvi',
].map((occasion) => ({ chefId: 'chef_ananya', occasion }));

// [name, course, extra ₹/guest, jain flag, needs oven]
const ananyaOptions: [string, string, number, 'ok' | 'jain_version' | 'not_jain', boolean?][] = [
  ['Khandvi Tacos', 'Starter 1', 0, 'ok'],
  ['Dhokla', 'Starter 1', 0, 'ok'],
  ['Paneer Tikka', 'Starter 1', 150, 'jain_version'],
  ['Patra', 'Starter 2', 0, 'ok'],
  ['Sev Khamani', 'Starter 2', 0, 'jain_version'],
  ['Batata Vada', 'Starter 2', 0, 'not_jain'],
  ['Deconstructed Undhiyu', 'Main 1', 0, 'jain_version'],
  ['Sev Tameta', 'Main 1', 0, 'jain_version'],
  ['Paneer Lababdar', 'Main 1', 150, 'jain_version'],
  ['Gujarati Dal', 'Main 2', 0, 'ok'],
  ['Kadhi', 'Main 2', 0, 'ok'],
  ['Dal Makhani', 'Main 2', 100, 'jain_version'],
  ['Phulka & Jeera Rice', 'Bread & rice', 0, 'ok'],
  ['Puri & Veg Pulao', 'Bread & rice', 50, 'jain_version'],
  ['Kesar Shrikhand Tart', 'Dessert', 0, 'ok', true],
  ['Gulab Jamun', 'Dessert', 0, 'ok'],
  ['Mango Rasmalai', 'Dessert', 100, 'ok'],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_$/, '');
// Signature dishes and their G07 notes.
const signature = new Map([
  ['Deconstructed Undhiyu', 'Winter vegetables, methi muthia and green garlic'],
  ['Khandvi Tacos', 'Soft khandvi shells with coconut and pomegranate'],
  ['Kesar Shrikhand Tart', 'Saffron shrikhand on a butter crust'],
]);

export const dishes: Insert<S['dishes']>[] = ananyaOptions.map(([name, course]) => ({
  id: `dish_${slug(name)}`,
  chefId: 'chef_ananya',
  name,
  course,
  foodType: 'veg',
  description: signature.get(name) ?? null,
  isSignature: signature.has(name),
  reviewStatus: 'approved',
}));

export const setMenus: Insert<S['setMenus']>[] = [
  {
    id: 'menu_gujarati_classic',
    chefId: 'chef_ananya',
    name: 'Gujarati Classic',
    summary: '2 starters · 2 mains · phulka & rice · 1 dessert',
    minBookingPaise: rupees(4000),
    grocerySavingPaise: rupees(250),
    offersJain: true,
    offersNog: true,
    isLive: true,
    sort: 0,
  },
  {
    id: 'menu_festive_thali',
    chefId: 'chef_ananya',
    name: 'Festive Thali',
    summary: '3 farsan · 3 shaak · kadhi, dal, rice, puri · 2 sweets · live jalebi',
    minBookingPaise: rupees(8 * 2300),
    grocerySavingPaise: rupees(250),
    offersJain: true,
    isLive: true,
    sort: 1,
  },
  {
    id: 'menu_everyday',
    chefId: 'chef_ananya',
    name: 'Everyday Home-style',
    summary: '1 sabzi · dal · rice · rotli · salad · chaas',
    minBookingPaise: rupees(3000),
    grocerySavingPaise: rupees(150),
    offersJain: true,
    isLive: true,
    sort: 2,
  },
  ...railChefs.map((c, i) => ({
    id: `menu_${c.key}_signature`,
    chefId: `chef_${c.key}`,
    name: `${c.headline} Signature`,
    minBookingPaise: rupees(4000),
    offersJain: c.jain ?? false,
    isLive: true,
    sort: i,
  })),
];

export const menuBands: Insert<S['menuBands']>[] = [
  ...(
    [
      ['menu_gujarati_classic', 2, 4, 2200],
      ['menu_gujarati_classic', 5, 10, 1800],
      ['menu_gujarati_classic', 11, 20, 1500],
      ['menu_festive_thali', 8, 10, 2300],
      ['menu_festive_thali', 11, 20, 1900],
      ['menu_festive_thali', 21, 40, 1650],
      ['menu_everyday', 2, 4, 1100],
      ['menu_everyday', 5, 10, 900],
      ['menu_everyday', 11, 20, 750],
    ] as const
  ).map(([menuId, minGuests, maxGuests, price]) => ({
    menuId,
    minGuests,
    maxGuests,
    pricePerGuestPaise: rupees(price),
  })),
  ...railChefs.map((c) => ({
    menuId: `menu_${c.key}_signature`,
    minGuests: 2,
    maxGuests: 12,
    pricePerGuestPaise: rupees(c.fromPrice),
  })),
];

const courseNames = [...new Set(ananyaOptions.map(([, course]) => course))];

export const menuCourses: Insert<S['menuCourses']>[] = courseNames.map((name, position) => ({
  id: `course_gc_${slug(name)}`,
  menuId: 'menu_gujarati_classic',
  name,
  position,
}));

export const menuOptions: Insert<S['menuOptions']>[] = ananyaOptions.map(
  ([name, course, extra, jainFlag, needsOven], i) => ({
    id: `opt_gc_${slug(name)}`,
    courseId: `course_gc_${slug(course)}`,
    dishId: `dish_${slug(name)}`,
    extraPaise: rupees(extra),
    jainFlag,
    needsOven: needsOven ?? false,
    ovenAltText: needsOven ? 'Served as shrikhand cups' : null,
    position: i,
  }),
);

export const menuAddons: Insert<S['menuAddons']>[] = (
  [
    ['live_jalebi', 'Live jalebi counter', 120, 'Fried hot at your home'],
    ['extra_farsan', 'Extra farsan · Khaman', 60, 'A third starter'],
    ['second_dessert', 'Second dessert · Gulab Jamun', 80, 'Served warm'],
    ['masala_chaas', 'Masala chaas', 40, 'Spiced buttermilk'],
    ['papad_salad', 'Papad, salad & pickle', 30, 'On the side'],
  ] as const
).map(([key, name, price, note]) => ({
  id: `addon_gc_${key}`,
  menuId: 'menu_gujarati_classic',
  name,
  pricePerGuestPaise: rupees(price),
  note,
}));

export const addresses: Insert<S['addresses']>[] = [
  {
    id: 'addr_rahul_home',
    userId: 'usr_rahul',
    label: 'home',
    line1: 'Prahlad Nagar',
    area: 'Prahlad Nagar',
    city: 'Ahmedabad',
    pincode: '380015',
    lat: 23.012,
    lng: 72.511,
    serviceAreaId: 'sa_ahd_west',
    isDefault: true,
  },
  {
    id: 'addr_krupa_home',
    userId: 'usr_krupa',
    label: 'home',
    line1: 'Satellite',
    area: 'Satellite',
    city: 'Ahmedabad',
    pincode: '380015',
    lat: 23.03,
    lng: 72.525,
    serviceAreaId: 'sa_ahd_west',
    isDefault: true,
  },
];

export const foodProfiles: Insert<S['foodProfiles']>[] = [
  { userId: 'usr_krupa', allergies: ['peanut'], rules: { jainCount: 4 } },
];

// Mockup totals round GST on the ₹149 fee to ₹27 (business rules Q8).
const convenienceFeePaise = rupees(149);
const feeGstPaise = rupees(27);

/** Same split as the quote engine; the mockup's ₹9,180 for SZ-1042 predates the Q2 default. */
function split(menuTotalPaise: number) {
  const platformFeePaise = percentOf(menuTotalPaise, FEES.platformFeeBps);
  const platformFeeGstPaise = percentOf(platformFeePaise, FEES.platformFeeGstBps);
  return {
    menuTotalPaise,
    convenienceFeePaise,
    feeGstPaise,
    totalPaise: menuTotalPaise + convenienceFeePaise + feeGstPaise,
    platformFeePaise,
    platformFeeGstPaise,
    chefSharePaise: menuTotalPaise - platformFeePaise - platformFeeGstPaise,
  };
}

export const bookings: Insert<S['bookings']>[] = [
  {
    id: 'bk_sz1042',
    code: 'SZ-1042',
    guestId: 'usr_rahul',
    chefId: 'chef_ananya',
    menuId: 'menu_gujarati_classic',
    addressId: 'addr_rahul_home',
    date: '2026-11-07',
    slot: 'dinner',
    guests: 6,
    foodRule: 'regular',
    groceriesBy: 'chef',
    state: 'paid_out',
    priceSnapshot: { menu: 'Gujarati Classic', band: '5–10', perGuestPaise: rupees(1800) },
    ...split(6 * rupees(1800)),
    allergiesAckAt: at('2026-11-04T06:00:00Z'),
    acceptedAt: at('2026-11-04T06:00:00Z'),
    startedAt: at('2026-11-07T12:05:00Z'),
    doneAt: at('2026-11-07T15:40:00Z'),
    completedAt: at('2026-11-07T15:45:00Z'),
    paidOutAt: at('2026-11-08T15:45:00Z'),
  },
  {
    id: 'bk_sz1048',
    code: 'SZ-1048',
    guestId: 'usr_krupa',
    chefId: 'chef_ananya',
    menuId: 'menu_festive_thali',
    addressId: 'addr_krupa_home',
    date: '2026-11-15',
    slot: 'lunch',
    guests: 10,
    foodRule: 'regular',
    groceriesBy: 'chef',
    state: 'requested',
    priceSnapshot: {
      menu: 'Festive Thali',
      band: '8–10',
      perGuestPaise: rupees(2300),
      addons: ['Live jalebi counter'],
    },
    ...split(10 * (rupees(2300) + rupees(120))),
  },
  // G11/G12 demo for Rahul: one coming up, one the chef didn't take.
  {
    id: 'bk_sz1051',
    code: 'SZ-1051',
    guestId: 'usr_rahul',
    chefId: 'chef_ananya',
    menuId: 'menu_gujarati_classic',
    addressId: 'addr_rahul_home',
    date: '2026-12-19',
    slot: 'dinner',
    guests: 6,
    foodRule: 'regular',
    groceriesBy: 'chef',
    state: 'confirmed',
    priceSnapshot: { menu: 'Gujarati Classic', band: '5–10', perGuestPaise: rupees(1800) },
    ...split(6 * rupees(1800)),
    allergiesAckAt: at('2026-11-20T06:00:00Z'),
    acceptedAt: at('2026-11-20T06:00:00Z'),
  },
  {
    id: 'bk_sz1050',
    code: 'SZ-1050',
    guestId: 'usr_rahul',
    chefId: 'chef_rohan',
    menuId: 'menu_rohan_signature',
    addressId: 'addr_rahul_home',
    date: '2026-12-13',
    slot: 'dinner',
    guests: 6,
    foodRule: 'regular',
    groceriesBy: 'chef',
    state: 'declined',
    priceSnapshot: { menu: 'Signature', band: '2–12', perGuestPaise: rupees(2200) },
    ...split(6 * rupees(2200)),
    cancelledBy: 'system',
    cancelReason: 'No answer in 2 hours',
  },
  // C05 demo for Ananya: a fresh request from Krupa, who has a peanut allergy.
  {
    id: 'bk_sz1052',
    code: 'SZ-1052',
    guestId: 'usr_krupa',
    chefId: 'chef_ananya',
    menuId: 'menu_gujarati_classic',
    addressId: 'addr_krupa_home',
    date: '2026-12-20',
    slot: 'lunch',
    guests: 8,
    foodRule: 'jain',
    groceriesBy: 'chef',
    state: 'requested',
    priceSnapshot: { menu: 'Gujarati Classic', band: '5–10', perGuestPaise: rupees(1800) },
    ...split(8 * rupees(1800)),
  },
];

export const bookingItems: Insert<S['bookingItems']>[] = (
  [
    ['Starter 1', 'Khandvi Tacos'],
    ['Starter 2', 'Patra'],
    ['Main 1', 'Deconstructed Undhiyu'],
    ['Main 2', 'Gujarati Dal'],
    ['Bread & rice', 'Phulka & Jeera Rice'],
    ['Dessert', 'Gulab Jamun'],
  ] as const
).map(([course, dishName], i) => ({
  id: `item_sz1051_${i}`,
  bookingId: 'bk_sz1051',
  course,
  dishName,
}));

const sz1042Flow = [
  [null, 'payment_pending', 'guest', '2026-11-04T05:20:00Z'],
  ['payment_pending', 'requested', 'system', '2026-11-04T05:21:00Z'],
  ['requested', 'confirmed', 'chef', '2026-11-04T06:00:00Z'],
  ['confirmed', 'in_progress', 'chef', '2026-11-07T12:05:00Z'],
  ['in_progress', 'completed', 'chef', '2026-11-07T15:45:00Z'],
  ['completed', 'paid_out', 'system', '2026-11-08T15:45:00Z'],
] as const;

export const bookingEvents: Insert<S['bookingEvents']>[] = [
  ...sz1042Flow.map(([fromState, toState, actor, when], i) => ({
    id: `evt_sz1042_${i}`,
    bookingId: 'bk_sz1042',
    fromState,
    toState,
    actor,
    at: at(when),
  })),
  {
    id: 'evt_sz1048_0',
    bookingId: 'bk_sz1048',
    fromState: null,
    toState: 'payment_pending',
    actor: 'guest',
    at: at('2026-11-12T09:00:00Z'),
  },
  {
    id: 'evt_sz1048_1',
    bookingId: 'bk_sz1048',
    fromState: 'payment_pending',
    toState: 'requested',
    actor: 'system',
    at: at('2026-11-12T09:02:00Z'),
  },
  ...(
    [
      ['bk_sz1051', null, 'payment_pending', 'guest', '2026-11-20T05:00:00Z'],
      ['bk_sz1051', 'payment_pending', 'requested', 'system', '2026-11-20T05:01:00Z'],
      ['bk_sz1051', 'requested', 'confirmed', 'chef', '2026-11-20T06:00:00Z'],
      ['bk_sz1050', null, 'payment_pending', 'guest', '2026-11-21T05:00:00Z'],
      ['bk_sz1050', 'payment_pending', 'requested', 'system', '2026-11-21T05:01:00Z'],
      ['bk_sz1050', 'requested', 'declined', 'system', '2026-11-21T07:01:00Z'],
      ['bk_sz1052', null, 'payment_pending', 'guest', '2026-11-22T04:00:00Z'],
      ['bk_sz1052', 'payment_pending', 'requested', 'system', '2026-11-22T04:01:00Z'],
    ] as const
  ).map(([bookingId, fromState, toState, actor, when], i) => ({
    id: `evt_${bookingId.slice(3)}_${i}`,
    bookingId,
    fromState,
    toState,
    actor,
    at: at(when),
  })),
];

export const tips: Insert<S['tips']>[] = [
  { id: 'tip_sz1042', bookingId: 'bk_sz1042', amountPaise: rupees(200) },
];

export const reviews: Insert<S['reviews']>[] = [
  {
    id: 'rev_sz1042_guest',
    bookingId: 'bk_sz1042',
    authorSide: 'guest',
    stars: 5,
    text: 'Wonderful dinner for the family.',
  },
];

export const promoCodes: Insert<S['promoCodes']>[] = [
  {
    code: 'FIRSTFEAST',
    kind: 'flat',
    amountPaise: rupees(500),
    perDeviceLimit: 1,
    validFrom: at('2026-11-01T00:00:00Z'),
    validTo: at('2027-03-31T18:29:59Z'),
  },
];

export const ledgerAccounts: Insert<S['ledgerAccounts']>[] = (
  ['platform_revenue', 'gateway_fee', 'gst_payable', 'tds_payable', 'promo_expense'] as const
).map((kind) => ({ id: `acct_${kind}`, kind }));

// C10: Ananya is off Monday–Wednesday; rail chefs cook lunch and dinner daily.
export const cookingDays: Insert<S['cookingDays']>[] = [
  ...[0, 4, 5, 6].map((weekday) => ({
    chefId: 'chef_ananya',
    weekday,
    slots: ['lunch' as const, 'dinner' as const, 'late' as const],
  })),
  ...railChefs.flatMap((c) =>
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      chefId: `chef_${c.key}`,
      weekday,
      slots: ['lunch' as const, 'dinner' as const],
    })),
  ),
];

export const searchSynonyms: Insert<S['searchSynonyms']>[] = [
  { term: 'dhokla', synonym: 'dhokra' },
  { term: 'dhokla', synonym: 'ઢોકળા' },
  { term: 'undhiyu', synonym: 'undhiya' },
];

// G07 shows only verified proofs; the second stays hidden until ops approves it.
export const chefProofs: Insert<S['chefProofs']>[] = [
  {
    id: 'proof_ananya_kitchen',
    chefId: 'chef_ananya',
    kind: 'kitchen',
    title: 'Hotel kitchen, Ahmedabad',
    detail: '3 years on the Gujarati line',
    status: 'ok',
  },
  {
    id: 'proof_ananya_cert',
    chefId: 'chef_ananya',
    kind: 'certificate',
    title: 'Food safety course',
    status: 'review',
  },
];
