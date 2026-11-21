import { activeCount, dateChoices, prettyDate, toParams, type Filters } from './filters';

const none: Filters = { date: null, meal: null, guests: null, cuisines: [], rule: null };

describe('toParams', () => {
  it('sends date and slot only together', () => {
    expect(toParams({ ...none, date: '2026-12-05' })).toEqual({ limit: 50 });
    expect(toParams({ ...none, date: '2026-12-05', meal: 'dinner' })).toMatchObject({
      date: '2026-12-05',
      slot: 'dinner',
    });
  });

  it('joins cuisines and passes the rest through', () => {
    expect(
      toParams({ ...none, cuisines: ['Gujarati', 'Surti'], guests: 5, rule: 'jain' }, 'thali'),
    ).toEqual({
      q: 'thali',
      cuisine: 'Gujarati,Surti',
      guests: 5,
      rule: 'jain',
      limit: 50,
    });
  });
});

describe('activeCount', () => {
  it('counts each chosen filter and each cuisine', () => {
    expect(activeCount(none)).toBe(0);
    expect(activeCount({ ...none, meal: 'lunch', cuisines: ['Gujarati', 'Surti'] })).toBe(3);
  });
});

describe('dates', () => {
  it('offers today, tomorrow and the coming weekend in IST', () => {
    // Thursday 3 Dec 2026, 10:00 IST
    expect(dateChoices(new Date('2026-12-03T04:30:00Z'))).toEqual([
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
  });

  it('does not repeat a day when today is Saturday', () => {
    const choices = dateChoices(new Date('2026-12-05T04:30:00Z'));
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices[0]).toBe('2026-12-05');
  });

  it('formats a calendar date without shifting it', () => {
    expect(prettyDate('2026-11-07')).toMatch(/Sat.*7.*Nov/);
  });
});
