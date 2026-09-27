// Text length limits (ARCHITECTURE.md 4, "Text length limits"). The database
// enforces the same numbers; the website stops typing at them, so nobody
// types something that cannot be saved. (The browser counts an emoji as 2,
// the database as 1, so the website is never looser than the database.)

/** Names: characters, items, gods, campaigns, quest titles, display names. */
export const NAME_MAX = 100
/** One-line fields: titles, class and level, quest giver, objectives, rewards. */
export const LINE_MAX = 500
/** Notes and descriptions (about 15-20 pages). */
export const NOTES_MAX = 100_000
