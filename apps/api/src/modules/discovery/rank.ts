import { RANKING } from '../../config/ranking';

export type Rankable = {
  distanceKm: number | null;
  serviceRadiusKm: number | null;
  ratingAvg: number | null;
  acceptRate: number | null;
  replyMinutesP50: number | null;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 0–1; higher ranks first. */
export function score(c: Rankable) {
  const distance =
    c.distanceKm === null || !c.serviceRadiusKm
      ? RANKING.neutral
      : 1 - clamp01(c.distanceKm / c.serviceRadiusKm);
  const rating = c.ratingAvg === null ? RANKING.neutral : clamp01((c.ratingAvg - 1) / 4);
  const acceptance = c.acceptRate ?? RANKING.neutral;
  const reply =
    c.replyMinutesP50 === null
      ? RANKING.neutral
      : 1 - clamp01(c.replyMinutesP50 / RANKING.slowReplyMinutes);
  return (
    RANKING.distance * distance +
    RANKING.rating * rating +
    RANKING.acceptance * acceptance +
    RANKING.reply * reply
  );
}
