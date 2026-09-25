import { Link } from 'react-router'

/** Short terms of use (linked from Google's sign-in screen and the footer). Readable without logging in. */
export function TermsPage() {
  return (
    <main className="page prose">
      <p>
        <Link to="/" className="muted">
          ← Theros DM Companion
        </Link>
      </p>
      <h1>Terms of use</h1>
      <p>
        Theros DM Companion (dnd.yannickmul.nl) is a free, private hobby website for one group of friends playing a
        Dungeons &amp; Dragons campaign, made and run by Yannick Mul. By logging in you agree to the points below.
      </p>

      <h2>Who can use it</h2>
      <p>
        Only people the DM has invited. Keep your invite link and your login to yourself. The DM can remove anyone from
        a campaign at any time.
      </p>

      <h2>What you put in</h2>
      <p>
        What you write (your characters and anything else) stays yours. You let the site store it and show it to the
        DM and the other players in your campaign, as the site does. Do not put in anything that is not yours to share
        or that would hurt someone.
      </p>

      <h2>No guarantees</h2>
      <p>
        The site is a work in progress (see the version in the footer). It is offered as it is, without any guarantee
        that it always works or never loses anything. It may change or stop at any time. Nothing here is sold, and no
        one pays for it.
      </p>

      <h2>Your data</h2>
      <p>
        How your data is handled, and how to delete your account, is in the{' '}
        <Link to="/privacy" className="gold">
          privacy policy
        </Link>
        .
      </p>
    </main>
  )
}
