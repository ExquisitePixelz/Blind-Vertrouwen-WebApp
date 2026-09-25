# Theros DM Companion (web)

Live at https://dnd.yannickmul.nl. The plan and all decisions are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Everyday commands

```bash
npm install          # once, after cloning
npm run dev          # local site at http://localhost:5173 (needs .env.local, see .env.example)
npm run build        # what GitHub Actions builds
```

Every push to `main`:
- **Deploy** builds the site and publishes it to GitHub Pages.
- **Database tests** start a throwaway Supabase from `supabase/migrations/` and run the permission test (`tests/permissions.test.ts`). If it fails, do not apply the migrations to the real project.

## Applying database changes to the real project

Only after the Database tests workflow is green. You type the database password yourself; never put it in a file or a chat.

```bash
npx supabase login
npx supabase link --project-ref olzfzwlaprjqobasxekn
npx supabase db push
```

`login` and `link` are needed once per computer. After that, `npx supabase db push` applies any new migration files.

## Making yourself the DM (once)

1. Log in once on https://dnd.yannickmul.nl with your Google account.
2. In the Supabase dashboard, open **SQL Editor** and run, with your own Google address:

   ```sql
   update public.worlds
   set dm_user_id = (select id from auth.users where email = 'you@example.com')
   where name = 'Theros';
   ```

3. Check it: `select name, dm_user_id from public.worlds;` shows a filled-in `dm_user_id`.

## Google's own sign-in button (Phase 4.5, once)

Until this is done the site keeps the old login, whose Google window says "continue to …supabase.co". Nothing breaks in the meantime.

1. **Google Cloud console** → APIs & Services → **Credentials** → open the Web OAuth client used for login. Under **Authorized JavaScript origins** add:
   - `https://dnd.yannickmul.nl`
   - `http://localhost:5173`
   - `http://localhost`

   Save. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is public, like the publishable key.
2. **GitHub** → this repository → Settings → Secrets and variables → Actions → **Variables** → New variable `VITE_GOOGLE_CLIENT_ID` with that Client ID. (A variable, not a secret.) For local work, add the same line to `.env.local`.
3. **Supabase dashboard** → Authentication → Sign In / Providers → **Google**: the Client ID field must contain this Client ID (it already does if it is the same client). Leave **Skip nonce checks** off.
4. Push any commit (or re-run the Deploy workflow) so the site is rebuilt with the variable. The login page now shows Google's button.
5. **Brand verification**, so the Google window shows the app name and logo:
   1. [Google Search Console](https://search.google.com/search-console): add a **Domain** property `yannickmul.nl`. Google shows a `TXT` record; add it in the Strato DNS settings for `yannickmul.nl`, wait a few minutes, then press Verify.
   2. Google Cloud console → **Google Auth Platform** → **Branding**: app name `Theros DM Companion`, a square logo of 120 × 120 px, homepage `https://dnd.yannickmul.nl`, privacy policy `https://dnd.yannickmul.nl/privacy`, and `yannickmul.nl` under Authorized domains. Save.
   3. Google Auth Platform → **Verification Centre** → submit for brand verification. The app must be **In production** (Audience page), not Testing. Google takes a few business days.
6. Redo the WhatsApp test: send yourself an invite link in WhatsApp and log in from it on an Android phone and an iPhone.

## Email and password login (Phase 4.7, once)

Until the last step the site keeps showing Google only. Never paste the Resend API key into a file, a chat or GitHub: it goes only into the Supabase dashboard.

1. **Database:** `npx.cmd supabase db push` (adds the invite check for email sign-ups).
2. **Resend** ([resend.com](https://resend.com), free plan):
   1. Sign up. Under **Domains**, add `yannickmul.nl` (region: EU).
   2. Resend shows a few DNS records (an `MX` and a `TXT` for `send`, and a `TXT` for `resend._domainkey`). Add each one in the Strato DNS settings for `yannickmul.nl`, exactly as shown. Press **Verify** in Resend; it can take up to an hour.
   3. Under **API Keys**, create a key with **Sending access** for `yannickmul.nl`. Copy it; you need it in the next step.
3. **Supabase dashboard → Authentication:**
   1. **Emails → SMTP Settings:** switch on custom SMTP. Sender email `noreply@yannickmul.nl`, sender name `Theros DM Companion`, host `smtp.resend.com`, port `465`, username `resend`, password: the Resend API key. Save.
   2. **Sign In / Providers → Email:** switched on, **Confirm email** on, minimum password length `8`. Save.
   3. **URL Configuration → Redirect URLs:** make sure both `https://dnd.yannickmul.nl/**` and `http://localhost:5173/**` are listed.
   4. **Hooks → Add hook → Before User Created:** type Postgres, schema `private`, function `before_user_created`. Enable and save. (If `private` is not offered, stop and tell Claude.)
   5. **Emails → Templates → Confirm signup:** subject `Confirm your Theros DM Companion account`, and as the message:

      ```html
      <h2>Welcome to Theros DM Companion</h2>
      <p>Click the link to confirm your email address and join the campaign.</p>
      <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm my email</a></p>
      <p>Did not ask for this? Then you can ignore this mail.</p>
      ```

   6. **Emails → Templates → Reset password:** subject `Reset your Theros DM Companion password`, and as the message:

      ```html
      <h2>Choose a new password</h2>
      <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
      <p>Did not ask for this? Then you can ignore this mail; your password stays the same.</p>
      ```

4. **GitHub** → Settings → Secrets and variables → Actions → **Variables**: add `VITE_EMAIL_LOGIN` with the value `true`. Re-run the Deploy workflow (or push anything). The login page now shows the email forms. For local work, add `VITE_EMAIL_LOGIN=true` to `.env.local`.
5. **Test** with an address that is not a Google account, in a private browser window:
   1. Make an invite link, open it, and choose **Create an account**.
   2. The mail arrives (check spam). The link opens the site and joins the campaign.
   3. Log out, then use **Forgot password?**. The reset mail's link lets you choose a new password.
   4. Try **Create an account** on a revoked link: it must be refused.
