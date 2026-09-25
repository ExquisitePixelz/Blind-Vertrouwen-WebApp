// Checks for the email and password forms (ARCHITECTURE.md 1.7). Supabase
// checks again on the server; these give a clear message before sending.
// Passwords are never hashed or stored here: Supabase Auth keeps only a
// salted bcrypt hash.

export const PASSWORD_MIN = 8
/** bcrypt only uses the first 72 bytes of a password. */
export const PASSWORD_MAX_BYTES = 72
export const NAME_MAX = 40

/** Trimmed and lower-case, so " Anna@Mail.com" and "anna@mail.com" are one account. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase()

export function emailProblem(email: string): string | null {
  const e = normalizeEmail(email)
  if (!e) return 'Enter your email address.'
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return 'This does not look like an email address.'
  return null
}

/** Trimmed, with runs of spaces made single. */
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ')

export function nameProblem(name: string): string | null {
  const n = normalizeName(name)
  if (!n) return 'Enter the name the others will see.'
  if (n.length > NAME_MAX) return `Use at most ${NAME_MAX} characters.`
  return null
}

export function passwordProblem(password: string, repeat: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'This password is too long.'
  if (password !== repeat) return 'The passwords do not match.'
  return null
}
