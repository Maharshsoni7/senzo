// Home rail ranking (PRD E2: distance, rating, acceptance, reply time). Weights sum to 1.
export const RANKING = {
  distance: 0.35,
  rating: 0.35,
  acceptance: 0.15,
  reply: 0.15,
  /** Replies slower than this score zero. */
  slowReplyMinutes: 120,
  /** Used for a chef with no data yet (new chefs get a fair first chance). */
  neutral: 0.5,
} as const;
