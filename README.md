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
