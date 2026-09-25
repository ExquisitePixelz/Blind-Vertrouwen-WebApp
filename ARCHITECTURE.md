# Theros DM Companion (web version): Project Plan and Decision Record

*For the owner (Yannick) and for any AI model or coding agent (for example Claude Code) working on this project. It holds the goal, the scope, the decisions already made and why, and the build plan.*

*If you are a model reading this: follow the decisions below. You may challenge one if you have a concrete, better reason, but say so explicitly and explain the trade-off **before** changing course. Check all pricing, free-tier limits and platform rules against current documentation before relying on them, because they change.*

*History: this plan was reviewed and reworked in a separate chat. The decisions below are the result. The specification in section 1.3 is filled in, and the owner decisions it raised are resolved (section 8). On 2026-09-24 the owner skipped Phase 4 for now and put two new phases in scope: 4.5 (look and navigation, section 1.5) and 5 (session notes, section 1.4). The same day the roadmap gained a character builder (6.1) and a Quest Journal (6.2). **Section 5, "Where we are", shows the current order of work.***

---

## 1. Scope

### 1.1 Version 1 (built in Phases 0–3)

A small website at `https://dnd.yannickmul.nl` for a friend group playing in **Theros**. It is the web version of the owner's existing Unity app, the Theros DM Companion. Users log in with Google, join a campaign via an invite link shared in WhatsApp, and use it.

**One DM.** The owner is the only DM, now and in the future. He is DM of the world and of every campaign in it, and can see and edit everything. There is no need for multiple DMs or DM permission levels.

**The world and its campaigns.** Theros is the only world. Campaigns take place in it. Gods belong to the **world**, not to a single campaign, so every campaign sees the same pantheon.

**Piety.** A character has a piety score with the god they believe in (for example, the character Sopar believes in Phenax).
- **The player picks their god when creating the character.** The track starts at score 0.
- Some characters gain piety a different way. For example, Seric does not believe in gods but is an oracle and gains piety by other rules.
- So a piety track is attached **either to a god or to a custom source** (for example "Oracle"). A custom source has a name and a description of how it works.
- A player who does not follow a god picks *"No god / other"* at creation, and the DM sets up the custom source.
- A character normally has one track. The data allows more than one.
- **The app does not calculate piety.** The DM sets the score by hand, whatever the rules for that track.
- **Milestone bar** *(added to v1 by the owner, 2026-09-24)*. Players are rewarded at piety **3, 10, 25 and 50**. Every track shows the segmented milestone bar and the "next at" caption from 1.3 B5:
  - The bar has four equal segments: 0–3, 3–10, 10–25, 25–50.
  - A segment fills in dim gold, and turns solid gold when complete.
  - A milestone number is grey, and turns gold and bold once reached.
  - The caption reads `{score} / 50 · next at {m}`, or `· all milestones reached`.
  - Scores stay between 0 and 50.
  - The − and + buttons, "Add track" and the track menu are DM-only.

**Players can:**
- Create, edit and delete **their own characters**, including picking a god at creation.
- View other players' characters, but not change them.
- View the **Gods** page.
- View the **Piety** page, including everyone's piety scores and milestone bars. Nothing else on that page. It is linked in the header next to **Gods**.

**The DM can:**
- Do everything, everywhere:
  - Edit or delete any character.
  - Create and edit gods.
  - Change a character's god after creation.
  - Add custom sources.
  - Change piety scores.
- See everything, always.

**Everything else is hidden from players** and is not built in version 1.

### 1.2 Not in version 1

Everything below goes on a **roadmap the owner will write** (see section 6). Do not build any of it, even partly, until the owner puts it on the roadmap and says to start:

- Inventory (and inventory pictures)
- Items with secret rules (cursed items)
- Live combat and turn order
- Lore / worldbuilding database, and people writing it together
- Image uploads
- Intro animation *(planned as a Lottie splash, see roadmap section 6)*
- Realtime live updates
- Push notifications
- A native phone app or Play Store release
- Any other feature from the Unity app that is not listed in 1.1

Version 1 is designed so that these can be added later **without redesigning the database** (see section 3.3). Designing for them is allowed; building them is not.

### 1.3 Feature details needed from the Unity app

The Character and Gods screens must **work the way they do in the Unity app**. The agent needs their exact contents.

Piety is already fully specified in sections 1.1 and 4. It needs nothing from the Unity app unless that app shows extra piety information the owner wants kept.

#### Specification (from the Unity app code, 2026-09-24)

*Source: `Assets/Theros/Scripts` in the Unity project (Unity 6.3, UI Toolkit). The Unity app is single-user: it only has the DM, with no login or players. The Unity app compiles but has not yet been run on a phone, so this describes the code, not tested behaviour. Wherever the Unity behaviour conflicts with sections 1.1 or 3.3 of this plan, the plan wins. Those places are marked **⚠ Plan difference**.*

##### A. Shared building blocks

**A1. Number editing (keypad dialog).** Every number is edited in a dialog, never inline. The dialog has:
- a title
- a large display showing the current entry
- a 3×4 keypad: `1–9`, `0`, backspace (`←`), and a `±` key where negatives are allowed (no character field allows negatives)
- a **Cancel** button plus one or more action buttons

Rules:
- The **first key press replaces the value shown**. After that, keys append.
- Backspace as the first press clears the entry.
- At most 4 digits, not counting the minus sign.
- An empty entry or a lone `-` counts as 0.
- Cancel, or tapping outside the dialog, closes it without changing anything.

On the web, a numeric `<input inputmode="numeric">` in a small dialog is fine. Keep "select all on focus", so typing replaces the value.

**A2. Text editing (prompt dialog).** A title, one single-line text field pre-filled with the current value, and Cancel/OK. The value is trimmed. Some fields may be empty (listed per field below). For the others, OK does nothing while the field is empty.

**A3. Confirm dialog.** Used for every delete. It has a title, a message, Cancel, and a red confirm button.

**A4. Pick list.** A dialog with a title and a scrollable list of options. Tapping an option closes the dialog and applies it.

**A5. Saving.** Every change saves immediately, except free-text notes, which save on blur or when the screen is left. On the web, follow section 3.4 instead.

**A6. The 7-step standing scale** is used by god-to-god relationships and a god's attitude toward the party.

| Value | Label | Text colour | Bar colour |
|---|---|---|---|
| 1 | Sworn Enemy | `#E0675C` | `#C0463C` |
| 2 | Enemy | `#D98A5C` | `#C8703F` |
| 3 | Unfriendly | `#BFA878` | `#A89060` |
| 4 | Neutral *(default)* | `#8E8C87` (muted) | `#5E5D5A` |
| 5 | Friendly | `#95BE86` | `#7DA56E` |
| 6 | Ally | `#63BD95` | `#4FA37F` |
| 7 | Greatest Ally | `#D4AF37` | `#D4AF37` |

Values are always clamped to 1–7.

**Standing bar widget:**
- The top line shows the subject's name on the left and the current label on the right, in the value's text colour.
- Below that are 7 equal, tappable steps. The neutral step (4) always has a thin outline.
- The lit steps run from neutral to the current value, inclusive, in that value's bar colour. For example, 2 lights steps 2, 3 and 4 in the "Enemy" colour. At neutral, only step 4 is lit, in grey.
- Tapping a step sets that value and saves it.

##### B. Characters

**B1. Fields**

| Field | Type | Default | Rules |
|---|---|---|---|
| `name` | text | (entered at creation) | Required, trimmed, cannot be empty. |
| `player` | text | `""` | Free text, may be empty. **Keep it as free text on the web** (owner decision, 2026-09-24). It is a display label only; ownership and permissions come from `owner_id`, never from this field. |
| `classLevel` | text | `""` | One free-text field such as "Fighter 3". It is not split into class and level. May be empty. |
| `ac` | integer | 10 | Minimum 0. |
| `hpMax` | integer | 10 | Minimum 1. |
| `hpCur` | integer | 10 | Kept between 0 and `hpMax`. |
| `hpTemp` | integer | 0 | Minimum 0, no maximum. |
| `speed` | integer (feet) | 30 | Minimum 0. Shown as "30 ft". |
| `passivePerception` | integer | 10 | Minimum 0. Entered by hand, **not** calculated. |
| `abilities` | 6 integers: STR, DEX, CON, INT, WIS, CHA | 10 each | Each clamped to 1–30. |
| `devotedGodId` | god reference or empty | empty ("None") | Which god the Piety screen shows for this character. **⚠ Plan difference:** the web plan replaces this with `piety_tracks` (see B5). |

No other fields exist: no skills, saving throws, proficiency bonus, spells, conditions, inventory or notes.

**B2. Calculations**
- **Ability modifier** = `floor((score − 10) / 2)`. It is shown as `+2`, `+0` or `−1`, using a true minus sign (U+2212) for negatives.
- **Initiative** = the DEX modifier. It is read-only and cannot be edited.
- **HP bar fill** = `clamp(hpCur / hpMax, 0, 1)`. It is green (`#6FA86A`), and turns red (`#D2574C`) at 25% or less.
- **Damage X** (X at least 0):
  1. Temp HP absorbs first: `absorbed = min(hpTemp, X)` and `hpTemp −= absorbed`.
  2. Then `hpCur = max(0, hpCur − (X − absorbed))`.
- **Heal X** (X at least 0): `hpCur = min(hpMax, hpCur + X)`. Healing never changes temp HP.
- **Set current HP to X**: `hpCur = clamp(X, 0, hpMax)`.
- **Set max HP to X**: `hpMax = max(1, X)`, then `hpCur = min(hpCur, hpMax)`. Raising max HP does **not** raise current HP.
- There are no death saves or unconscious state. 0 HP is just a number.

**B3. Screens**

**Character list** (title "Characters", with a **+** button top-right):
- Sorted by name, case-insensitive.
- Each row shows:
  - **name** in bold
  - on the right, muted: `HP {hpCur}/{hpMax}   AC {ac}`
  - a second line with `classLevel · player`, leaving out whichever is empty, and leaving out the line if both are empty
- Tapping a row opens the character sheet.
- With no characters, it shows the message "No characters yet. Tap + to add one."
- **+** opens a prompt titled "New character" asking only for the name. It creates the character with every default from B1 and opens its sheet.
- **⚠ Plan difference:** the web plan also asks for the god at creation, with a "No god / other" option. The Unity app sets the god afterwards, on the sheet.

**Character sheet** (the title is the character's name; a **…** menu is top-right). From top to bottom:
1. **Identity card**, three tappable rows showing the label on the left and the value on the right:
   - **Player**: text prompt. An empty value shows "—".
   - **Class & level**: text prompt. An empty value shows "—".
   - **Devoted to**: opens a pick list titled "Devoted to". It offers "None" first, then all gods sorted by name, with a dot after the current choice. "None" is shown muted.
2. **Hit points card**:
   - The label "HIT POINTS", then a large `hpCur`, a smaller muted `/ hpMax`, and `+{hpTemp} temp` in blue (`#7FB3D5`) when temp HP is above 0. Below that is the HP bar.
   - Tapping this area opens a keypad titled `HP {cur} / {max}`, starting at 0, with three actions: **Damage** (red), **Heal** (gold) and **Set** (grey).
   - Below it are two large buttons, **Damage** and **Heal**. Each opens a keypad starting at 0 with one **Apply** action.
3. **Tile row:** Max HP, Temp HP, AC. Tapping a tile opens a keypad with a **Set** action.
4. **Tile row:** Speed ("30 ft"), Passive Perception (labelled "Passive Perc."), and Initiative (read-only, shown greyed).
5. **Two tile rows of three abilities:** STR/DEX/CON, then INT/WIS/CHA. Each tile shows the label, the score large, and the modifier in gold below it. Tapping a tile opens a keypad with **Set**.

The **…** menu has:
- **Rename**: text prompt. The name cannot be empty.
- **Delete character**: a confirm dialog saying "{name}, their stats and piety history will be removed." Deleting removes the character **and all of its piety history**, then returns to the list.

**B4. Permissions on the web** (from plan 3.3). These are not in Unity, which has only the DM.
- Players edit only their own characters and see everyone else's sheets read-only. On a read-only sheet, nothing is tappable.
- The DM edits everything.

**B5. How piety works in the Unity app** (for reference; the web plan's model replaces it)
- **Model:** each character has a list of `{godId, value}` scores, one per god, 0–50, clamped. `devotedGodId` picks which one the Piety overview shows.
- **Piety overview:** one card per character. The card shows:
  - the name, and the devoted god in gold
  - `−` / bar / `+`, changing the score by ±1 per tap
  - a caption: `{v} / 50 · next at {m}`, or `· all milestones reached`
  - a "Displeases / Pleases" line (see C4)
  - with no devoted god: a **Choose a god** button instead of the bar

  The bar has **four equal-width segments**: 0–3, 3–10, 10–25 and 25–50. Each segment fills proportionally in dim gold and turns solid gold when complete. The milestone numbers 3, 10, 25 and 50 sit under the right end of each segment and turn gold and bold once reached.
- **Piety detail** (tap a card):
  - the devoted-god picker
  - a bar with ± for every god the character has more than 0 piety with, plus the devoted god
  - a **"Piety with another god"** pick list that adds +1 with the chosen god
- **Piety history:** every change is logged as `{character, god, delta, resulting score, latest session number, time}` and shown newest first, up to 100 entries.
  - Each entry reads like `#4  Nylea  +3  → 12`.
  - Taps on the same character and god, in the same session, less than 5 minutes apart, merge into one entry. If the merged total reaches 0, the entry is removed.

  **Roadmap candidates** from this: the history log and the Displeases/Pleases line. The plan already lists history under "More piety features". *(The segmented milestone bar and "next at" moved into v1: see 1.1.)*

##### C. Gods

**C1. Fields**

| Field | Type | Default | Rules |
|---|---|---|---|
| `id` | text slug, e.g. `nylea` | seeded | Fixed. |
| `name` | text | seeded | **Not editable** in Unity. |
| `epithet` | text | seeded | Editable (shown as "Title"). May be empty. |
| `alignment` | text | seeded | Editable free text, e.g. "NG". May be empty. |
| `domains` | text | seeded | Editable free text, comma-separated, e.g. "Life, Nature". It is not a list type. May be empty. |
| `symbol` | text | seeded | Editable. May be empty. |
| `notes` | long text | `""` | "DM notes", multiline. |
| `partyAttitude` | integer 1–7 | 4 | This god's attitude toward the whole party, on the A6 scale. |

- **No create or delete:** Unity seeds a fixed pantheon and never creates or deletes gods.
- **⚠ Plan difference:** the web plan lets the DM create gods, so the web version needs a create form (and editable names).

**C2. Seed data: the 15 gods**

| id | Name | Epithet | Alignment | Domains | Symbol |
|---|---|---|---|---|---|
| athreos | Athreos | God of Passage | LE | Death, Grave | Crescent moon |
| ephara | Ephara | God of the Polis | LN | Knowledge, Light | Urn pouring water |
| erebos | Erebos | God of the Dead | NE | Death, Trickery | Serene face |
| heliod | Heliod | God of the Sun | LG | Light | Laurel crown |
| iroas | Iroas | God of Victory | CG | War | Four-winged helmet |
| karametra | Karametra | God of Harvests | NG | Life, Nature | Cornucopia |
| keranos | Keranos | God of Storms | CN | Knowledge, Tempest | Blue eye |
| klothys | Klothys | God of Destiny | N | Knowledge, War | Drop spindle |
| kruphix | Kruphix | God of Horizons | N | Knowledge, Trickery | Eight-pointed star |
| mogis | Mogis | God of Slaughter | CE | War | Four-horned bull's head |
| nylea | Nylea | God of the Hunt | NG | Nature | Four arrows |
| pharika | Pharika | God of Affliction | NE | Death, Knowledge, Life | Snakes |
| phenax | Phenax | God of Deception | CN | Trickery | Winged golden mask |
| purphoros | Purphoros | God of the Forge | CN | Forge, Knowledge | Double crest |
| thassa | Thassa | God of the Sea | N | Knowledge, Tempest | Waves |

**Checked against the book.** This table matches the "Gods of Theros" table in *Mythic Odysseys of Theros* (confirmed by the owner, 2026-09-24). The Forge and Grave domains come from *Xanathar's Guide to Everything*.

All relationships start at Neutral, and all party attitudes start at 4.

**C3. Relationships (god → god)**
- **Directed:** `value(A → B)` is how A sees B. It is independent of `value(B → A)`. Nylea may see Mogis as a Sworn Enemy while Mogis sees Nylea as Neutral.
- Every ordered pair of different gods has a value 1–7. A god has no relationship with itself.
- **Stored sparsely:** only non-neutral values are saved. A missing pair means 4, and setting a pair back to 4 deletes the row.
- On the web this can be a table `god_relationships (from_god_id, to_god_id, value)`, with a check constraint that the two gods differ and the value is 1–7.

**C4. Calculation: "who reacts when god X is favoured"** (shown on Piety cards in Unity)
- Take every god G where `value(G → X)` is not 4.
- **Displeases:** gods with value below 4, most hostile first, each as `Name (Label)`.
- **Pleases:** gods with value above 4, friendliest first.
- Show one line per group and leave out empty groups. Nothing is changed automatically; it is only a reminder.

**C5. Screens**

**God list** (title "Gods"):
- All gods sorted by name, case-insensitive. Each row shows:
  - the **name** in bold, with a coloured chip showing the party attitude label **only when it isn't Neutral**
  - the epithet
  - a muted line: `alignment · domains · symbol`, leaving out empty parts
- Tapping a row opens the god page.

**God page** (the title is the god's name). From top to bottom:
1. **Facts card:** tappable rows **Title, Alignment, Domains, Symbol**. Each opens a text prompt, and all may be empty. An empty value shows "—".
2. **"Attitude toward the party":** one standing bar labelled "The party".
3. **"How {god} sees others":** a standing bar for each of the other 14 gods, sorted by name. Tapping a step saves `value(this → other)` and immediately refreshes section 4.
4. **"How others see {god}":** read-only. It lists every god whose view of this god isn't neutral, most hostile first, as name plus a coloured label chip. If there are none, it shows "Every god is neutral toward {god}."
5. **"DM notes":** a multiline text box with the placeholder "Your notes on {god}…". It saves on blur, when the screen is left, and when the app is backgrounded.

**C6. Web visibility (decided by the owner, 2026-09-24).** In Unity everything is DM-only, because there are no players. On the web, **everything on the god page is visible to players**:
- **God notes**, **god-to-god relationships** and **party attitude** all have audience `members`. Players read them; only the DM writes.
- The notes can be a plain column on `gods`. Label the section **"Notes"** on the web, not "DM notes", so the DM remembers players can read it.
- The notes are not a place for secrets. Hidden god lore belongs to the roadmap's `dm`-audience rows (section 3.3), not v1.

##### D. Other Unity app features (not v1, for the roadmap)

1. **Session notes** *(moved into Phase 5, see 1.4)*:
   - **Create Session** makes session number = highest existing number + 1 (not count + 1).
   - It opens a full-screen note taker that autosaves 1.5 s after typing stops, and also on leave and on app pause.
   - An optional title is tappable. The screen shows the creation date as `d MMM yyyy`.
   - A session left with an empty title and body is deleted automatically.
   - The **Sessions** list is newest first, showing `#n`, the title (or "Untitled"), the date, and the first line of the notes up to 80 characters.
   - Rename and delete (with confirmation) are in the **…** menu.
2. **Piety extras:** the history log and the Displeases/Pleases line (B5, C4). *(The milestone bar is in v1.)*
3. **God attitude toward the party** (C1, C3), if not included in v1.
4. **Backup & restore:**
   - export the whole campaign as JSON via the share sheet or clipboard
   - import from the clipboard, with confirmation, taking a snapshot first
   - automatic on-device snapshots once a day and before each import, keeping the latest 20, each restorable

   On the web this is largely replaced by the server backups in 3.2. A DM "export everything as JSON" button could still be a small roadmap item.
5. **Main menu:** shows "Last session: #n". *(In Phase 5 as a line on the campaign page, see 1.4.)*
6. **App-only behaviour** that doesn't carry over to the web: the Android back button, safe-area and keyboard padding, reduced frame rate when idle, portrait lock, and a dark theme.
   - **Dark theme palette:** background `#121214`, surface `#1C1C20`, text `#ECEAE4`, muted `#8E8C87`, gold accent `#D4AF37`, danger `#D2574C`.
   - The web can reuse this palette.

**Rules for the agent:**
- If the block above still contains the placeholder, you may do Phases 0 to 2 (tools, hosting, login, database and security) and build the Piety page. **Stop and ask the owner for the specification before building the Character or Gods screens or their tables' detailed columns.**
- Reproduce behaviour and data, not Unity code.
- If the specification describes other features, they are **not** version 1 scope. List them for the owner's roadmap instead of building them.
- There is no existing data to migrate (confirmed by the owner).

### 1.4 Phase 5: Session notes *(put in scope by the owner, 2026-09-24)*

A **Sessions** tab where the DM takes notes per session. It is based on the Unity note taker (1.3 D1), with the differences below.

**DM only.** Sessions have audience `dm`. Players cannot read or write them, and the **Create Session** and **Sessions** dashboard buttons (1.5) are not shown to players. This is the first real use of the `dm` audience.

**Per campaign.** Sessions are campaign content. Each campaign has its own numbering. The page is `/c/:campaignId/sessions`.

**Numbering.**
- The first **New session** in a campaign asks for the starting number, pre-filled with 1. Campaigns that are already running (e.g. at session 53) start from there.
- After that, **New session** uses the highest existing number + 1 (not count + 1).
- The number can be changed later from the **…** menu.
- Two live sessions in one campaign cannot share a number (enforced by the database). A deleted session does not block its number.

**Sessions list.** Newest first (highest number first). Each row shows `#n`, the title (or "Untitled"), the played-on date, and the first line of the notes up to 80 characters. With no sessions: "No sessions yet. Tap + to start one."

**Note taker.** Full screen:
- an optional title (tap to edit, text prompt, may be empty)
- a **played-on date**, defaulting to the day the session was created, editable by the DM (notes are often written up a day later). Shown as `d MMM yyyy`.
- one large notes area with **formatting** (markdown: headings, lists, bold, italic). The DM types markdown and toggles between **Edit** and **Preview**; the sessions list shows the first line as plain text. Rendered with `react-markdown`, with raw HTML switched off.
- **Attendance**: a checkbox per character in the campaign (sorted by name), ticked for those present
- saving follows section 3.4 (the shared save hook, 1 s after typing stops, on hide and close, local backup, conflict guard, Saved indicator)
- the **…** menu has **Rename**, **Change number** and **Delete** (confirm dialog; soft delete)

**Empty sessions.** A session left with an empty title and empty notes is deleted (soft delete) automatically when the DM leaves it, as in Unity.

**Also in Phase 5:** the dashboard shows "Last session: #n" to the DM (1.3 D5, 1.5).

**Not in Phase 5 (roadmap):** search across sessions, linking characters or gods from notes, player-visible recaps, exporting notes.

### 1.5 Phase 4.5: Look and navigation *(put in scope by the owner, 2026-09-24; built before Phase 5)*

The site must feel like a phone app, based on the Unity main menu (owner's reference screenshot): a dashboard of large full-width buttons, not a text menu in a header.

**Dashboard** (the home page, `/`):
- Opens on the user's **last selected campaign**, remembered **per account** (`profiles.last_campaign_id`), so phone and laptop agree. If none is remembered: with exactly one campaign, open it; otherwise show the campaign picker.
- Top: the campaign name large in gold, and its subtitle muted below (default "A Theros campaign").
- Full-width buttons, in order: **Piety Scores**, **Characters**, **Gods**, and for the DM only **Players** (the player list and invite links, moved off the old campaign page). Phase 5 adds **Create Session** (gold, first) and **Sessions** above them, for the DM only.
- Below the buttons, muted: "Last session: #n" or "No sessions yet" (DM only; added in Phase 5).

**Top bar on other screens:** a back arrow and the screen title on the left, the account button on the right. No text menu.

**Account button:** shows the user's name (or initial on narrow screens). Tapping opens a small popover with:
- the current campaign, and **Switch campaign** (a pick list of the user's campaigns; the DM also gets **New campaign** there)
- **Settings**
- **Log out**

**Settings:**
- **Display name:** stored in `profiles.display_name` and shown everywhere in place of the Google name.
- **Campaign name and subtitle** (DM only): `campaigns.name` and a new `campaigns.subtitle`.

**Mobile first, scales to every screen:** designed for a ~375 px wide phone first, and responsive from 320 px phones up to tablets and laptops:
- fluid widths
- font sizes that scale between a minimum and a maximum (`clamp()`)
- full-width buttons
- safe-area insets for notches and home bars
- on wide screens, a centred column instead of stretching

Tap targets at least 44 px; no sideways scrolling; the same dark palette (1.3 D6).

**Friendlier Google sign-in (owner request, 2026-09-24).** Google's sign-in window currently says "continue to olzfzwlaprjqobasxekn.supabase.co", which looks like phishing.
- **Fix (free):** use **Google's own sign-in button** (Google Identity Services) and hand the resulting ID token to Supabase with `signInWithIdToken` (with a nonce). The Google window then opens from `dnd.yannickmul.nl`, and no supabase.co redirect is involved.
- Add **brand verification** in the Google Auth Platform (app name "Theros DM Companion", logo, homepage, privacy policy link, `yannickmul.nl` verified in Google Search Console via DNS at Strato), so the window shows the app name and logo. Google takes a few business days.
- The app gets a short **privacy policy page** (Google requires one).
- **Rejected:** a Supabase custom domain (`auth.yannickmul.nl`). It needs the Pro plan plus the add-on (about $35/month, checked 2026-09-24), against priority 3.
- Still Google-only login (3.5). Redo the WhatsApp test (3.5) on Android and iPhone after the switch.

### 1.6 Phase 4.6: Invite-only access and accounts *(put in scope by the owner, 2026-09-25; built before Phase 5)*

Anyone with a Google account could log in. They saw nothing (row-level security), but the owner wants the site to be invite-only, a way to remove players, and a way for players to delete their account.

**Who is let in:** the DM, always, and anyone in at least one live campaign, i.e. who joined with an invite link. An invite therefore lets someone in until the DM removes them. There is no list of Google addresses.

**Everyone else:** as soon as they log in, the site signs them out with "This site is invite-only. Ask the DM for an invite link." Their account is deleted at once if it owns nothing, so strangers' accounts do not pile up. Someone opening an invite link is checked after joining, not before. Before the DM is set (a fresh install), everyone is let in, so the owner can log in once and make themselves the DM.

**Remove player (DM only):** a Remove button per player on the Players screen, with a confirm dialog. They lose access to that campaign at once; if it was their only campaign they are no longer let in. Their characters stay in the campaign, visible to its players and editable only by the DM (owner decision, 2026-09-25). A new invite link lets them back in.

**Delete my account (players):** in Settings, behind a warning and typing `DELETE`. It permanently deletes the login, the profile, the memberships, and the player's characters with their piety. This is a real delete, not a soft delete: the point is that the data is gone. The DM's account cannot be deleted this way.

**Rejected:** a Supabase "Before User Created" hook with a list of allowed Google addresses. It runs before the invite link is used, so it cannot tell a new friend from a stranger, and the DM would need every friend's Gmail address first.

The database decides (`check_access`) and row-level security stays the real lock: an account that skips the website still reads nothing.

---

## 2. Priorities

In order:
1. **Never lose what someone typed.** Saving must survive the tab being backgrounded, closed or the phone locking.
2. **Correct privacy.** Players must never be able to read or change what they are not allowed to, and this is enforced by the server, not just hidden in the interface.
3. **Near-zero cost.**
4. **Small, light, battery-friendly**, and installable on a phone's home screen.
5. **Easy for an AI agent to build and for a non-programmer owner to maintain.** Prefer boring, well-documented solutions over clever ones.

**Not a priority:** working without internet. This is a website and needs a connection (confirmed by the owner).

---

## 3. Decisions

### 3.1 Platform: website (PWA) on GitHub Pages. *Decided*
- No install needed, works on Android and iPhone, updates instantly, free to host.
- Replaces the Unity app because a Unity web build is tens of MB and runs poorly on phones.
- Can be added to a phone's home screen like an app (PWA).
- A native app is a possible roadmap item later (see section 6), not a v1 concern.

### 3.2 Backend: Supabase, free plan. *Decided*
Hosted Postgres database with login, row-level security (RLS) and file storage, with no server to run.
- **Why Postgres:** the future lore database is made of linked things (gods, places, people, items referring to each other). That fits a relational database well.
- **The public "publishable" key** (`sb_publishable_…`, Supabase's replacement for the legacy "anon" key, which is retired by end 2026) and project URL are safe in the website's code **only because RLS is enforced on every table**. The **secret key** (`sb_secret_…`, formerly "service-role") **must never be in the repository or the website**.
- **Project:** `https://olzfzwlaprjqobasxekn.supabase.co` (project ref `olzfzwlaprjqobasxekn`). Locally the URL and publishable key live in `.env.local` (ignored by Git; see `.env.example`). In the deploy they are set as GitHub Actions variables.

**Known free-plan drawbacks and how we handle them:**

| Drawback | Handling |
|---|---|
| Projects pause after about a week without activity. Groups often go longer between sessions, and a paused project means the site does not work until the owner restores it in the dashboard. | A scheduled GitHub Action makes a tiny database request every few days to keep it active. **Check that this is allowed under current Supabase terms.** If not, the owner restores it manually when needed. |
| No automatic backups. | A scheduled GitHub Action in a **separate private repository** (`theros-backups`) runs a database export weekly and stores it there. **Backups must never go in the public website repository**, because they contain every campaign's private data. *Built:* the same private repo also runs the daily keep-alive (a `select` on `gods`). Both use one repository secret, `SUPABASE_DB_URL` (Session pooler connection string). They live there, not in the public repo, because the database password must not be anywhere near public code, and because GitHub switches off scheduled workflows in **public** repos after 60 days without activity. |
| The built-in email sender is for testing only: very low hourly limit, and it may only send to the project team's own addresses. | Not needed: login is Google only (section 3.5), so the app sends no email. |

### 3.3 Permissions model. *Decided*

This is the most important design in the app.

**Roles.** There are only two:
- **The DM:** one person, the owner, set once in the `worlds` row. The DM can read and write everything.
- **Players:** members of one or more campaigns.

**Levels.** Content lives at one of two levels:
- **World content** belongs to Theros and is shared by all its campaigns. Gods now, the lore database later.
- **Campaign content** belongs to one campaign. Characters and piety tracks.

**Reading.** Every piece of content has an **audience** that decides who can read it:

| Audience | Who can read it | Example |
|---|---|---|
| `members` | For campaign content: the players in that campaign, and the DM. For world content: every player in any campaign, and the DM. | A character sheet, a god |
| `owner` | The owner of the thing, and the DM | A player's inventory *(roadmap)* |
| `dm` | Only the DM | DM notes, secret lore *(roadmap)* |

**Writing:**
- A player can create, edit and delete things they **own**, unless a table's rules say otherwise (piety, below).
- The DM can create, edit and delete **everything**.

**Version 1 uses it like this:**
- **Characters:** campaign content, audience `members`, owned by the creating player. Players in the campaign read. The owner and the DM write.
- **Gods:** world content, audience `members`. Players read. Only the DM writes.
- **Piety tracks:** campaign content, audience `members`. Players in the campaign read. Writing is restricted (section 4):
  - A player may create **one god track** for their own character, at creation, and it always starts at score 0.
  - Everything else is DM only: changing the score, changing the god later, custom sources, and deleting tracks.

**Secrets inside a visible thing.** RLS works on whole rows, not individual fields. When one part of a thing is secret, the secret part goes in its **own row** with a stricter audience.

Worked example (roadmap, not v1): the 5e *Longsword of Vengeance*.
- The item row is readable by whoever can see the item, e.g. "a longsword".
- A separate "secret rules" row holds the curse and has audience `owner` (the holder and the DM) or `dm` (only the DM, if the curse should stay hidden until it triggers).

Build the v1 tables so this pattern can be added without changing existing tables.

**Rule for the agent:** every table gets RLS switched on in the same migration that creates it. No table is ever readable without a policy.

### 3.4 Online-first saving. *Decided*
The server is the single source of truth. There is **no local database and no sync engine** in version 1. This is deliberate: sync engines are the hardest part to get right, and they can leak hidden content that stays cached on a player's phone after the DM hides it.

Saving works like this:
- Edits save automatically about one second after the user stops typing.
- Also save immediately when the page is hidden or closed (`visibilitychange` and `pagehide` events).
- Until the server confirms a save, the unsent change is kept in the browser's local storage. It is sent again on the next visit or when the connection comes back. After confirmation it is deleted.
- A small indicator shows *Saved / Saving… / Not saved yet*.
- **Conflict guard:** every row has a `version` number. A save only succeeds if the version has not changed since the user loaded it. If it has (for example, the DM edited your character in the meantime), show a warning and let the user choose. Never overwrite silently.
- Timestamps (`updated_at`) are set by the **database**, not by the phone, because phone clocks can be wrong.
- Deleting marks a row as deleted (`deleted_at`) instead of removing it, so accidental deletes can be undone by the DM.

### 3.5 Login: Google only. *Decided*
- The group talks on WhatsApp, which cannot be used as a login.
- Everyone in the group has a Google account (confirmed by the owner). Google login needs no passwords and no email sending.
- **Not Apple login:** it needs a paid Apple developer account.
- The Supabase login settings must list **both** `https://dnd.yannickmul.nl` and the local development address as allowed redirect URLs.

**Invite links will be shared in WhatsApp. Test this early.**
- Some apps open links in their own built-in browser, and Google blocks login inside those.
- In Phase 1, send yourself an invite link through WhatsApp, and open it on both an Android phone and an iPhone.
- If login fails there, the invite page must detect the built-in browser and tell the user to open the link in their normal browser. That is also where "Add to home screen" works.

### 3.6 No realtime in version 1. *Decided*
Data refreshes when a screen opens and when the user returns to the tab. Characters are edited by one person, and gods and piety scores change rarely, so live updates are not needed yet. This keeps the app simpler and lighter on battery.
Realtime is added later together with the features that need it, such as live combat.

### 3.7 Tech stack. *Decided*

| Part | Choice | Reason |
|---|---|---|
| Language | TypeScript | Catches mistakes before they reach users. |
| Framework | React + Vite | AI agents have the most examples to work from. The size difference compared with lighter frameworks makes no real battery difference. |
| Backend client | Official Supabase JavaScript client | |
| Database changes | Supabase CLI migration files in the repo | The whole database can be rebuilt from files. |
| Installable app | `vite-plugin-pwa` | When a new version is deployed, show a *"New version, tap to reload"* message, so nobody is stuck on an old cached version. |
| Hosting | GitHub Pages, public repository, deployed by GitHub Actions on every push | |

### 3.8 Hosting details. *Decided*
- **Page links:** GitHub Pages returns "404 not found" when someone refreshes on any page other than the home page. Fix: the build copies `index.html` to `404.html`, so every link loads the app.
- **Custom domain:** at Strato (DNS editing confirmed available), add a `CNAME` record for `dnd` pointing to `<github-username>.github.io`. Set `dnd.yannickmul.nl` in the repository's Pages settings and enable **Enforce HTTPS**.
- **Domain protection:** also verify `yannickmul.nl` in the GitHub account settings (Pages → verified domains), so nobody else can claim the subdomain.
- **Public repository:** free GitHub Pages needs one, so anyone can read the code. That is fine because there are no secrets in it. Check before every commit that no keys, database passwords or data exports are included.

---

## 4. Data model (version 1)

Detailed columns for characters and gods come from the specification in section 1.3.

**Every content table has:**
- `id`
- `owner_id`
- `audience` (`members` / `owner` / `dm`)
- `version`
- `created_at`, `updated_at` (set by the database)
- `deleted_at` (empty unless deleted)
- **Either** `world_id` (world content) **or** `campaign_id` (campaign content)

**Structure tables:**

| Table | Purpose |
|---|---|
| `profiles` | One per user: display name. Linked to the Supabase login user. |
| `worlds` | One row: Theros, with `dm_user_id` set to the owner. "Is this user the DM?" is answered from here and used by every RLS policy. The future lore database also lives at this level. |
| `campaigns` | Name, `world_id`. Created by the DM. |
| `campaign_members` | Which players are in which campaign. The DM is not listed; the DM has access everywhere. |
| `campaign_invites` | Invite codes the DM shares as a link in WhatsApp. They can expire or be revoked. |

**Content tables:**

| Table | Level | Purpose |
|---|---|---|
| `characters` | Campaign | Player characters. Owned by the creating player. |
| `gods` | World | The pantheon of Theros, shown on the Gods page and offered as choices at character creation. |
| `piety_tracks` | Campaign | One row per piety track a character has (details below). |

**`piety_tracks` columns:**
- `character_id`
- `god_id`: the god, for a normal believer such as Sopar and Phenax.
- `custom_source_name` and `custom_source_rules`: a name and a description, for a character like Seric who gains piety another way.
- `score`

**Rules for `piety_tracks`, all enforced in the database, not only in the interface:**
- Each row has **exactly one** of `god_id` or `custom_source_name`.
- A player may insert a track only when **all** of these hold:
  - it is for **their own** character,
  - that character has **no track yet**,
  - it uses a **god** (not a custom source).
- The database **forces the score to 0** on any track a player creates, whatever the website sends.
- All other changes are **DM only**: updating the score or the god, adding custom sources, and deleting tracks.
- The simplest safe way to build this is one database function, *create character with chosen god*. It creates the character and its track together, so there is never a character left half-created. Direct inserts into `piety_tracks` stay DM only.
- The Piety page lists every character in the campaign with their track or tracks and scores, and shows the god's name or the custom source's name.
- Reusing custom sources across characters, or calculating piety automatically, is a roadmap item. It is not v1.

**`sessions` columns (Phase 5, section 1.4):** the standard columns above with `campaign_id` and audience `dm`, plus:
- `number` (integer, at least 1; unique per campaign among rows where `deleted_at` is empty)
- `title` (text, may be empty)
- `notes` (long text, may be empty)
- `played_on` (date, defaults to the creation day)

**`session_attendance` (Phase 5):** `session_id`, `character_id`, one row per character present, unique per pair. It is a checkbox, not content: unticking removes the row (no soft delete, no `version`). DM only, like `sessions`.

Only the DM can read or write sessions and attendance. Add these cases to the permission test: players and non-members cannot read or write sessions, and duplicate live numbers in one campaign are refused.

**Allowed now for future use:** a nullable `image_path` column on characters and gods, for future image uploads. Nothing else speculative.

**As built (Phase 2, 2026-09-24).** Schema: `supabase/migrations/`. Permission test: `tests/permissions.test.ts`.
- **Policy helpers** live in a `private` schema that the API does not expose (`is_dm`, `is_campaign_member`, `is_world_member`, `shares_campaign`, `audience_allows`). Every table has one "DM can do everything" policy plus narrow player policies.
- **Database functions the website calls:**
  - `create_character(campaign, name, god or null)` creates the character and its score-0 track together.
  - `delete_character(id)` soft-deletes the character and its tracks. Players cannot set `deleted_at` directly.
  - `accept_invite(code)` joins a campaign.
- **Conflict guard:** a save must send the `version` it loaded. If the row changed since then, the database refuses it with HTTP 409. `version`, `created_at` and `updated_at` are always set by triggers.
- **Owner-only fields:** a player cannot change a character's `owner_id`, `campaign_id` or `deleted_at`.
- **Character stats:** the six abilities are stored as `strength` … `charisma`.
- **Gods:** have a fixed `slug` (e.g. `phenax`) next to the `id`.
- **`god_relationships`:** readable when both gods are readable. Value 4 (Neutral) is never stored.
- **`piety_tracks.owner_id`:** set by the database to the character's owner.
- **Character sheet:** the "Devoted to" row is read-only and lists the character's tracks. The DM changes gods and custom sources on the Piety page (Phase 3, step 4).
- **Seed data:** Theros and the 15 gods are in a migration. `worlds.dm_user_id` is set by hand once (see Phase 2 notes in the README).

---

## 5. Build plan

Work in small steps. Commit to Git after each working step so anything can be rolled back. Keep `ARCHITECTURE.md` in the repo up to date. This document seeds it.

### Where we are *(updated 2026-09-24)*

| Step | Status |
|---|---|
| Phases 0–3: version 1 (login, database and security, campaigns, gods, characters, piety) | **Done** |
| Phase 4: stress test and share | **Skipped for now** (owner decision). Its saving tests still apply once the group tries the app together. |
| Phase 4.5: look and navigation (1.5): dashboard, account menu, settings, responsive layout, friendlier Google sign-in | **Built** (2026-09-25). Owner to-dos: the Google console steps in the README, brand verification, and the WhatsApp retest. |
| Phase 4.6: invite-only access, remove player, delete my account (1.6) | **Built** (2026-09-25) |
| **Phase 5: session notes** (1.4): DM-only notes numbered from a chosen start, markdown, attendance | **Next.** Start at step 1. |
| Then, from the roadmap (section 6), in the owner's current order: | |
| 1. Player features: character notes and inventory (items designed to carry effects later) | Planned next after Phase 5 |
| 2. Character builder and rules engine (6.1), part by part, starting with the automatic sheet | Owner decides when |
| 3. Quest Journal (6.2) | Owner decides when |
| Other roadmap candidates (lore notes, initiative tracker, Lottie animations, session quiz, character/god links in notes, …) | Unordered |

A roadmap item becomes buildable only when the owner says to start it. At that point, write it up as its own scope section (like 1.4 and 1.5) and phase, and add its build steps below.

### Phase 0: Accounts and tools
1. GitHub account, plus a **public** repository for the website and a **private** repository for backups.
2. Supabase project on the free plan. Record the project URL and publishable key. Never commit the secret key or database password. Enable only the Google login provider; switch Email off.
3. A Google Cloud project with an OAuth client for Google login. It is free. The agent gives step-by-step instructions.
4. Install Node.js, Git and Claude Code.

### Phase 1: Live on the internet with working login
1. Set up React + Vite + TypeScript with the installable-app setup and the `404.html` fix.
2. Deploy with GitHub Actions to GitHub Pages.
3. Connect `dnd.yannickmul.nl`, enforce HTTPS, verify the domain.
4. Google login working **on the real domain, on a real phone**, including when the link is opened from WhatsApp (section 3.5).

### Phase 2: Database and security, before any screens
1. Create the tables from section 4 as migration files, with RLS on every table.
2. **Automated permission test:** a script that logs in as test users (the DM, Player A, Player B, and a non-member) and checks, among other things:
   - Player B cannot edit or delete Player A's character.
   - Player B can read Player A's character and Player A's piety.
   - Player A can create a character with a chosen god, and the track starts at 0 **even if the request asks for a higher score**.
   - Player A cannot change their own score, change their god afterwards, add a second track, add a custom source, or delete a track.
   - Player A cannot create a track for Player B's character.
   - The DM can do all of the above.
   - A track with both a god and a custom source, or neither, is rejected.
   - Players cannot edit gods. The DM can.
   - A non-member cannot read anything in the campaign, or any gods.
   - A row with audience `dm` is invisible to players.
   - A row with audience `owner` is invisible to other players.

   These pass using test rows even though v1 has no `owner`/`dm` content yet. **Run this script after every database change.** Most security bugs come from later changes, not the first version.

   *Decided 2026-09-24:* the test runs **in GitHub Actions only**, on every push, against a throwaway local Supabase that the workflow starts, fills from the migration files, and throws away. The real project only allows Google login, so test users cannot exist there without the secret key. The throwaway copy's keys are generated fresh on each run and are never stored. No Docker is needed on the owner's PC.
3. Scheduled GitHub Actions: keep-alive ping, and the weekly backup into the private repository.

### Phase 3: Version 1 features
**Character and Gods need the specification from section 1.3.**
1. The DM creates a campaign in Theros. Players join one via an invite link.
2. Gods page: players read, the DM edits.
3. Characters: create (including picking a god, or *"No god / other"*), view, edit, delete, following the specification.
4. Piety page: players in the campaign read. The DM changes scores and gods, and adds custom sources.
5. Saving behaviour from section 3.4 on every edit screen. *Built into steps 2–4* (god page, character sheet, piety page all use one save hook, `src/lib/saver.ts`). *Testing it moved into the Phase 4 stress test* (owner decision, 2026-09-24): it needs several people and devices at once.

One screen or feature per step. **Do not add anything that is not in section 1.1.**

### Phase 4: Stress test and share
*Skipped for now (owner decision, 2026-09-24). Work moved on to Phase 5.*

Done as one group session with several people and devices at once.

1. Try to break it:
   - Close the tab mid-edit.
   - Lose the connection mid-edit.
   - DM and player editing the same character.
   - A player trying to edit someone else's character.
   - The site on an iPhone and an Android phone.
   - **Saving (section 3.4, moved here from Phase 3 step 5):**
     - Type in a field and close the tab within a second, then reopen it. The change must be there.
     - Turn on flight mode, make changes, and check the indicator shows "Not saved yet". Turn flight mode off: the changes are sent.
     - Make a change offline, close the app, go back online and reopen it. The change is sent on that visit.
     - DM and player edit the same character at the same time. The second save shows the conflict warning; both "Keep mine" and "Use their version" work.
     - Tap − / + and Damage quickly, many times. The final value is right after a refresh.
     - On a shared phone, log out and log in as someone else. The first person's unsent changes do not appear.
2. Check performance with Lighthouse (mobile).
3. Share the link with the group, ask them to add it to their home screen, and gather feedback.

**Stop here. Version 1 is complete.** Work continues only from the owner's roadmap.

### Phase 4.5: Look and navigation (section 1.5)
1. Migration: `profiles.last_campaign_id` and `campaigns.subtitle`, with permission-test cases (a player can set only their own `last_campaign_id`; only the DM changes campaign names).
2. App shell: top bar with back arrow and title, the account popover (Switch campaign, Settings, Log out), and a mobile-first CSS pass.
3. Dashboard on `/` with the last campaign and its buttons. Characters move to `/c/:campaignId/characters`, players and invites to `/c/:campaignId/players`.
4. Settings: display name, campaign name and subtitle.
5. Google sign-in button with `signInWithIdToken`, the privacy policy page, and step-by-step instructions for the owner (allowed origins, Search Console, brand verification). Redo the WhatsApp login test.

**As built (Phase 4.5, 2026-09-25):**
- **Screens:** `/` is the dashboard, `/c/:id/characters`, `/c/:id/players` (DM only), `/c/:id/piety` (titled "Piety Scores"), `/gods`, `/settings`, `/privacy` (readable without logging in). Opening `/c/:id` (e.g. after an invite) makes that campaign current and shows the dashboard. Opening any screen inside a campaign also makes it current.
- **Last campaign:** stored only in `profiles.last_campaign_id`; the old per-device browser copy is gone. A trigger (`guard_profile_update`) stops a player pointing it at a campaign they are not in.
- **Profiles backfilled:** accounts that first logged in before the profiles table existed (including the DM's) had no profile row, so saving a display name or last campaign silently changed nothing. A migration gives every existing login a profile.
- **Settings save when OK is tapped**, not through the save hook (3.4). `profiles` and `campaigns` are structure tables without a `version` column, and a prompt dialog is one deliberate change, not typing.
- **Google sign-in:** the Google Identity Services button is used when the `VITE_GOOGLE_CLIENT_ID` variable is set (GitHub Actions variable, and `.env.local`). Without it, or if Google's script cannot load, the old redirect login is shown, so nobody is locked out. Owner setup steps are in the README.

### Phase 4.6: Invite-only access and accounts (section 1.6)
1. Migration: `check_access()` (who is let in; deletes a stranger's empty account) and `delete_my_account()`, with permission-test cases (strangers are not let in and their account is gone; members and the DM are; only the DM removes players; a removed player reads nothing and keeps their characters; a player deletes their account and characters; the DM's account cannot be deleted).
2. The website signs out anyone not let in, with a message on the login page. Remove player on the Players screen. Delete my account in Settings. Privacy policy updated.

### Phase 5: Session notes (section 1.4)
1. Migration: the `sessions` table with RLS (DM only), the unique-number rule, and new cases in the permission test.
2. Sessions list and **New session** (starting number for the first session, highest + 1 after that), plus the **Create Session** and **Sessions** buttons on the dashboard for the DM only (1.5).
3. Note taker: title, played-on date, notes, autosave via the shared save hook, the **…** menu (Rename, Change number, Delete), and auto-delete of empty sessions on leave.
4. Formatting: Edit / Preview toggle with markdown.
5. Attendance checkboxes (with its migration and permission tests).
6. "Last session: #n" on the dashboard.

One step per commit. **Do not add anything that is not in section 1.4.**

---

## 6. Roadmap input (unordered; the owner decides what and when)

These are candidates, not commitments. Each one lists what version 1 already provides for it.

| Candidate | Already prepared in v1 |
|---|---|
| **Inventory**, private to the owner and DM | The `owner` audience |
| **Items with secret rules** (e.g. Longsword of Vengeance) | The separate-secret-row pattern in 3.3 |
| **Lore database** with linked entries, written together | The world level, and Postgres suits linked data. Writing in the same document **at the same time** would need an extra technology (for example Yjs) and is a larger project. Taking turns editing works with the v1 conflict guard. |
| **Live combat** with shared turn order | Add Supabase Realtime together with this feature |
| **Image uploads** | `image_path` columns. Compress on the phone before upload. |
| **Lottie animations** *(owner plan, 2026-09-24; the owner makes the files later, e.g. After Effects + Bodymovin)*: a splash screen and animated dashboard icons/buttons | The Phase 4.5 dashboard (1.5). Agreed behaviour: the splash shows on a cold start only, covers loading, fades out as soon as the app is ready (at most about 1.5 s), can be tapped to skip, and **never delays the app**. Use the light SVG build of `lottie-web`, loaded lazily; pause off screen. Add an **Animations on/off** setting (per device, off by default when the phone asks for reduced motion) together with it. |
| **Native phone app** with a local copy that checks the server for updates when online | The version numbers and database timestamps make "what changed since my copy" possible. Note the hidden-content problem from 3.4: the app must remove local copies of anything the server no longer returns. |
| **More piety features**: history of changes, reusable custom sources, automatic calculation, the boons themselves at each milestone (v1 only shows which milestones are reached) | `piety_tracks` already separates god and custom sources |
| **Other Unity app features** | From the specification (section 1.3) |
| **Player features: character notes and inventory** *(owner's pick for the next phase after Phase 5, 2026-09-24)*: a free-text notes field on a player's own sheet (backstory, goals), and an inventory private to the player and the DM | `characters` (owner and DM write); the `owner` audience. Items should be able to carry effects later (6.1, part 2). |
| **Session notes: character/god links** *(owner interest, 2026-09-24)*: mention a character or god in the notes as a tappable link | The `sessions` table and markdown (1.4). Links can be stored as text markers, so no new table is needed. |
| **Initiative tracker** *(owner interest)*: turn order for combat that players see live on their phones | Needs Supabase Realtime, so this is the same project as Live combat |
| **NPC / lore notes** *(owner interest)*: NPCs, places and factions, each entry either DM only or shared with players, with secret parts in their own `dm` row | The world level, the `dm` / `members` audiences, and the separate-secret-row pattern in 3.3 |
| **Session quiz** *(owner idea, very future)*: a Kahoot-style quiz where players answer questions about the previous session, maybe with AI-generated questions | Needs Realtime for a live quiz. AI questions would read the DM-only notes, so the DM must approve every question before players see it (priority 2), and an AI API has a running cost (priority 3). |

### 6.1 Character builder and rules engine *(owner idea, 2026-09-24; roadmap, built in parts)*

Build characters from 5e races, classes, subclasses, feats, spells and items, with automatic proficiency, expertise and modifiers (for example Bracers of Defense: AC +2; Belt of Giant Strength: STR 21). This is large, so it is split into parts that are each useful on their own. **Nothing here is in scope until the owner says to start a part.**

**Decisions (owner, 2026-09-24):**
- **Ruleset: 2014 (5e classic)**, matching *Mythic Odysseys of Theros*. The free content base is **SRD 5.1**.
- **Content: the app ships only the SRD** (CC-BY-4.0, with the required attribution). Everything else (other subclasses, Xanathar's, Tasha's, Theros races, subclasses and supernatural gifts) is copyrighted and **must never be in the public repository**. The DM enters it through an in-app editor. It is stored in the database as world content (audience `members`, or `dm` while hidden).
- **Automatic, with overrides.** Every total is calculated and shows its sources (for example `AC 17 = 10 + DEX 3 + Bracers 2 + Shield 2`). The owner of the character and the DM can override any total by hand. Existing hand-entered characters keep working.
- **Players build and level their own characters** and add custom modifiers to them. The DM can edit everything.

**Core design: base values plus effects.** A character stores base values and choices. Race, class features, feats, items and custom modifiers each carry **effects** stored as data, for example:
- `{target: "ac", op: "add", value: 2, when: "no armor, no shield"}`
- `{target: "str", op: "set_min", value: 21}`
- `{target: "skill.stealth", op: "expertise"}`

A pure function calculates the sheet from base values, effects and overrides. Test it well with unit tests: it is the part most likely to be subtly wrong.

**Parts, in suggested order:**
1. **Automatic sheet.** Proficiency bonus from level, saving throws, the 18 skills with proficiency and expertise, and hand-entered custom modifiers. No content library needed.
2. **Items with effects.** Builds on the inventory (next after Phase 5). Equip and attune; effects then apply. **Design the inventory table with this in mind.**
3. **Content library.** The SRD 5.1 imported (for example from the 5e-srd-api or Open5e data), plus the DM's editor for races, classes, subclasses, feats, items and spells.
4. **Character builder.** Race, class and subclass choices level by level, including multiclassing. This replaces the free-text `classLevel` with structured class levels.
5. **Spells.** Spell list, known and prepared spells, and slots per level.
6. **Theros.** Supernatural gifts, and piety boons that apply at milestones (links to the milestone bar in 1.1).

### 6.2 Quest Journal *(owner idea, 2026-09-24; roadmap)*

The DM offers the party several quests; the players vote on what they want to do. **Only the DM creates, edits, reveals and crosses off quests.** Campaign content.

**Decisions (owner, 2026-09-24):**
- **Statuses:** Offered (to pick from), Active (being pursued), Completed (crossed off), Failed/abandoned. Only the DM changes status.
- **Voting:** each player can vote for any number of **Offered** quests, one vote per player per quest, and take it back. Everyone in the campaign sees the tally and who voted. The DM decides and sets a quest to Active. Voting closes when a quest leaves Offered.
- **Draft quests:** the DM can write quests ahead. A draft has audience `dm` and becomes `members` when the DM reveals it.
- **A quest card shows:** title, description, quest giver and location (free text; links to lore entries later), reward, an **objectives checklist** the DM ticks off, and session links ("given in #53", "completed in #57").

**Data sketch:**
- `quests`: `campaign_id`, `title`, `description`, `giver`, `location`, `reward`, `status`, `given_session_number`, `completed_session_number`, the standard columns, audience `dm` (draft) or `members` (revealed). DM writes; members read revealed quests.
- `quest_objectives`: `quest_id`, `text`, `done`, `sort_order`. DM writes; readable when the quest is readable.
- `quest_votes`: `quest_id`, `user_id`, unique per pair. A player inserts and deletes **only their own** vote, and only while the quest is Offered (enforced by the database). Members read all votes.
- **Session numbers are stored as numbers, not links to `sessions` rows.** Sessions are DM-only (1.4), so players could not follow a link to one.
- Permission tests: players cannot create, edit or change the status of quests; drafts are invisible to players; a player cannot vote for someone else or on a quest that is not Offered.

**Later:** secret DM notes per quest (the separate-secret-row pattern in 3.3), links to lore entries (6, NPC / lore notes), and rewards that become inventory items.

---

## 7. Costs
Expected cost is 0 EUR beyond the domain already owned, as long as the free-plan limits hold. Check current Supabase and GitHub limits before starting.

## 8. Open items

**Still to check:**
1. Supabase keep-alive. *Checked 2026-09-24:* the [Terms of Service](https://supabase.com/terms) say nothing about free-plan pausing or keep-alive requests, and the [pausing docs](https://supabase.com/docs/guides/platform/free-project-pausing) say only that a project is paused without "sufficient user database activity over the past week" ("a few user requests to the database each day" is typically enough). A scheduled ping is not forbidden, but not explicitly allowed either, and Supabase could change how it counts activity. Plan: build the ping in Phase 2 as a real, tiny read query (not just a health check), run it daily, and keep the manual restore in the dashboard as the fallback. *Built 2026-09-24:* see the backups row in section 3.2.

**Resolved:**
- **Invite-only access, removing players, deleting accounts (Phase 4.6):** an invite lets someone in until the DM removes them; strangers are signed out and their empty account deleted; removed players keep their characters; players can permanently delete their own account (owner decisions, 2026-09-25). See section 1.6.
- **Session notes (Phase 5):** DM only, numbered per campaign from a starting number the DM picks, with an editable played-on date, and empty sessions deleted automatically (owner decisions, 2026-09-24). See section 1.4.
- **Google sign-in screen showing supabase.co:** fixed for free with Google's own sign-in button plus brand verification, not with the paid Supabase custom domain (owner request, 2026-09-24). See section 1.5.
- **Look and navigation (Phase 4.5):** dashboard in the Unity style, last campaign remembered per account, Players button on the DM's dashboard, account popover with Switch campaign and Settings (display name, campaign name) (owner decisions, 2026-09-24). Lottie animations moved to the roadmap (section 6). See section 1.5.
- **Phase 5 extras:** markdown formatting and session attendance are in Phase 5; character/god links stay on the roadmap. Next after Phase 5: character notes and inventory (owner decisions, 2026-09-24).
- **Phase 4:** skipped for now (owner decision, 2026-09-24).
- **Login from WhatsApp:** tested 2026-09-24 on desktop, Android (WhatsApp opened the link in Chrome) and iPhone. It works everywhere, so the built-in-browser detection from section 3.5 is not needed.
- **`player` field on characters:** kept as free text, a display label only (section 1.3, B1).
- **God seed data:** checked against the book's "Gods of Theros" table (section 1.3, C2).
- **God notes, relationships and party attitude:** visible to players (audience `members`), editable only by the DM. The owner wants players to see them. See section 1.3, C6.
- **Specification:** Character and Gods specification filled in from the Unity code (section 1.3). It describes the code as written; the app has not been tested on a phone.
- **Piety:** a score per character per track, where a track is a god or a custom source. The player picks a god at creation (score 0). Everything after that is the DM's.
- **DM:** the owner is the only DM, now and in the future, with full access.
- **Login:** Google only. Everyone in the group has an account. Contact is WhatsApp.
- **Joining:** by a DM-shared invite link.
- **World:** Theros is the one world. Campaigns belong to it, and gods are world content.
- **Domain:** Strato allows the `CNAME` record for `dnd.yannickmul.nl`, which currently points nowhere.
