import { Link } from 'react-router'

/** The short privacy policy Google asks for (ARCHITECTURE.md 1.5). Readable without logging in. */
export function PrivacyPage() {
  return (
    <main className="page prose">
      <p>
        <Link to="/" className="muted">
          ← DnD Companion App
        </Link>
      </p>
      <h1>Privacy policy</h1>
      <p>
        DnD Companion App (dnd.yannickmul.nl) is a small, private website for one group of friends playing a
        Dungeons &amp; Dragons campaign. It is run by Yannick Mul, the group's Dungeon Master. It is not a business,
        shows no ads and sells nothing. It is invite-only: if you log in without an invite link, you are signed out and
        the account that was just made for you is deleted straight away.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>From your Google account</strong>, when you log in: your name, your email address and Google's id
          for your account. Nothing else, and never your password.
        </li>
        <li>
          <strong>If you use email instead of Google</strong>: your email address and your password. The password is
          never stored as you typed it, only as a salted hash that cannot be turned back into the password.
        </li>
        <li>
          <strong>What you type into the site</strong>: your display name, your characters and anything else you
          enter for the campaign.
        </li>
      </ul>

      <h2>Who can see it</h2>
      <p>
        The DM, and the other players in your campaigns, as the site shows. Your email address is not shown to other
        players. Nothing is shared with anyone else, sold, or used for advertising.
      </p>

      <h2>Where it is kept</h2>
      <p>
        In a database at Supabase, which also handles the login. Verification and password-reset mails are sent
        through Resend. Your browser keeps your login and any change that has
        not reached the server yet, so nothing you type is lost. There are no tracking or advertising cookies.
      </p>

      <h2>Removing your data</h2>
      <p>
        Delete your account yourself under Settings, or ask the DM. Your account, your characters and everything linked
        to them are then removed permanently. You can also remove the site's access
        to your Google account at any time at{' '}
        <a href="https://myaccount.google.com/connections" className="gold">
          myaccount.google.com/connections
        </a>
        .
      </p>
    </main>
  )
}
