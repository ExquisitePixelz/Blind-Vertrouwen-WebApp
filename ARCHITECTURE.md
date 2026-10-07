# DnD Companion App (web version of the Theros DM Companion): Project Plan and Decision Record

*For the owner (Yannick) and for any AI model or coding agent (for example Claude Code) working on this project. It holds the goal, the scope, the decisions already made and why, and the build plan.*

*If you are a model reading this: follow the decisions below. You may challenge one if you have a concrete, better reason, but say so explicitly and explain the trade-off **before** changing course. Check all pricing, free-tier limits and platform rules against current documentation before relying on them, because they change.*

*History: this plan was reviewed and reworked in a separate chat. The decisions below are the result. The specification in section 1.3 is filled in, and the owner decisions it raised are resolved (section 8). On 2026-09-24 the owner skipped Phase 4 for now and put two new phases in scope: 4.5 (look and navigation, section 1.5) and 5 (session notes, section 1.4). The same day the roadmap gained a character builder (6.1) and a Quest Journal (6.2). On 2026-09-25 Phases 4.5, 4.6 (invite-only access, section 1.6), 4.7 (email login, section 1.7) and 5 were built; the app got a footer, a terms page and a version number (3.9), and was renamed **DnD Companion App**. Phase 6 (player features, section 1.8) was built the same day. On 2026-09-27 the owner started the Quest Journal as Phase 7 (section 1.9) and had Phase 4 written out in depth, with a security part (section 5). On 2026-09-28 the owner had Phase 8 written out and built the same day: the automatic character sheet (section 1.10), the first part of the character builder (6.1). On 2026-09-30 a fix made the saving throw and skill tick boxes work, and death saves changed to appear only at 0 HP, with a Dead tag after three failures (`0.8.1-alpha`). The same day the owner asked for a performance check and had it written out as Phase 9 (section 1.11). On 2026-10-06 and 2026-10-07 Phase 9 was built (`0.9.0-alpha`), and the owner changed the version rule: every push that changes the website raises the version, checked by the Deploy workflow (3.9). Also on 2026-10-07 the owner moved the Phase 4 group test to the next week and picked six roadmap items, in three phases: Phase 10 (at the table: conditions, hit dice and rests, a party overview; section 1.12), Phase 11 (lore and links) and Phase 12 (live combat) (section 1.13). The same day the owner answered the Phase 11 questions: it became NPCs and links (section 1.13), with Phase 12 moved to 1.14, and was built the same day (`0.11.0-alpha`). The owner then put the rest of World in scope as Phase 12 (section 1.14), before live combat, which became Phase 13 (1.15). **Section 5, "Where we are", shows the current state and order of work.***

---

## 1. Scope

### 1.1 Version 1 (built in Phases 0–3)

A small website at `https://dnd.yannickmul.nl` for a friend group playing in **Theros**. It is the web version of the owner's existing Unity app, the Theros DM Companion. The web app is called **DnD Companion App** (renamed by the owner, 2026-09-25). Users log in with Google (or, since 1.7, email and password), join a campaign via an invite link shared in WhatsApp, and use it.

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
| `classLevel` | text | `""` | One free-text field such as "Fighter 3". It is not split into class and level. May be empty. **⚠ Plan difference (Phase 8, 1.10):** the web app replaces it with `classes`, a list of class name and level entries. |
| `ac` | integer | 10 | Minimum 0. **⚠ Plan difference (Phase 8, 1.10):** the web app calculates AC from armor and never lets it be typed in. |
| `hpMax` | integer | 10 | Minimum 1. |
| `hpCur` | integer | 10 | Kept between 0 and `hpMax`. |
| `hpTemp` | integer | 0 | Minimum 0, no maximum. |
| `speed` | integer (feet) | 30 | Minimum 0. Shown as "30 ft". |
| `passivePerception` | integer | 10 | Minimum 0. Entered by hand, **not** calculated. **⚠ Plan difference (Phase 8, 1.10):** the web app calculates it (10 + Perception) and never lets it be typed in. |
| `abilities` | 6 integers: STR, DEX, CON, INT, WIS, CHA | 10 each | Each clamped to 1–30. |
| `devotedGodId` | god reference or empty | empty ("None") | Which god the Piety screen shows for this character. **⚠ Plan difference:** the web plan replaces this with `piety_tracks` (see B5). |

No other fields exist: no skills, saving throws, proficiency bonus, spells, conditions, inventory or notes. *(In the Unity app. The web app added notes and inventory in Phase 6, section 1.8, and adds skills, saving throws and the proficiency bonus in Phase 8, section 1.10.)*

**B2. Calculations**
- **Ability modifier** = `floor((score − 10) / 2)`. It is shown as `+2`, `+0` or `−1`, using a true minus sign (U+2212) for negatives.
- **Initiative** = the DEX modifier. It is read-only and cannot be edited. *(Web, Phase 8: the modifier of the final DEX score, after custom modifiers and items, 1.10.)*
- **HP bar fill** = `clamp(hpCur / hpMax, 0, 1)`. It is green (`#6FA86A`), and turns red (`#D2574C`) at 25% or less.
- **Damage X** (X at least 0):
  1. Temp HP absorbs first: `absorbed = min(hpTemp, X)` and `hpTemp −= absorbed`.
  2. Then `hpCur = max(0, hpCur − (X − absorbed))`.
- **Heal X** (X at least 0): `hpCur = min(hpMax, hpCur + X)`. Healing never changes temp HP.
- **Set current HP to X**: `hpCur = clamp(X, 0, hpMax)`.
- **Set max HP to X**: `hpMax = max(1, X)`, then `hpCur = min(hpCur, hpMax)`. Raising max HP does **not** raise current HP.
- There are no death saves or unconscious state. 0 HP is just a number. *(Web, Phase 8: death save circles at 0 HP, 1.10.)*

**B3. Screens**

**Character list** (title "Characters", with a **+** button top-right):
- Sorted by name, case-insensitive.
- Each row shows:
  - **name** in bold
  - on the right, muted: `HP {hpCur}/{hpMax}   AC {ac}`
  - a second line with `classLevel · player`, leaving out whichever is empty, and leaving out the line if both are empty *(web, Phase 8: the class list, such as "Fighter 3 / Wizard 2", and the calculated AC, 1.10)*
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

*Web, Phase 8: the sheet gains the class list, race, background, death saves, inspiration, the proficiency bonus, saving throws and skills. The full order is in 1.10.*

The **…** menu has:
- **Rename**: text prompt. The name cannot be empty.
- **Delete character**: a confirm dialog saying "{name}, their stats and piety history will be removed." Deleting removes the character **and all of its piety history**, then returns to the list.

**B4. Permissions on the web** (from plan 3.3). These are not in Unity, which has only the DM.
- Players edit only their own characters and see everyone else's sheets read-only. On a read-only sheet, nothing is tappable.
- The DM edits everything.
- *Phase 8 (1.10):* the breakdown lines under totals are shown to everyone; the dialogs behind them open only for the owner and the DM.

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

**As built (2026-09-25):**
- **Database:** `sessions` and `session_attendance` came in one migration (so one `db push`), each with only the "dm all" policy. `create_session(campaign, number or null)` uses the given starting number, else the highest live number + 1. `played_on` defaults to today in Europe/Amsterdam, not UTC.
- **Screens:** `/c/:id/sessions` (list) and `/c/:id/sessions/:sessionId` (note taker). A session opens on Preview when it has notes, on Edit when empty.
- **Changing the number, deleting, and the empty-session cleanup** first wait until every typed change has reached the server (`settle()` in the save hook), then change the row with its current version. The cleanup runs when the DM leaves the note taker inside the app; closing the tab on an empty session leaves it in the list until it is opened and left again.
- **Long notes:** saves over 64 KB are sent without `keepalive` (browsers refuse larger keepalive requests); the local backup (3.4) still covers them.
- Text helpers (the `d MMM yyyy` date and the first-line snippet) are unit-tested (`tests/sessionText.test.ts`).

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
- Add **brand verification** in the Google Auth Platform (app name "DnD Companion App", logo, homepage, privacy policy link, `yannickmul.nl` verified in Google Search Console via DNS at Strato), so the window shows the app name and logo. Google takes a few business days.
- The app gets a short **privacy policy page** (Google requires one).
- **Rejected:** a Supabase custom domain (`auth.yannickmul.nl`). It needs the Pro plan plus the add-on (about $35/month, checked 2026-09-24), against priority 3.
- Still Google-only login at the time (3.5; email login was added in 1.7). Redo the WhatsApp test (3.5) on Android and iPhone after the switch.

### 1.6 Phase 4.6: Invite-only access and accounts *(put in scope by the owner, 2026-09-25; built before Phase 5)*

Anyone with a Google account could log in. They saw nothing (row-level security), but the owner wants the site to be invite-only, a way to remove players, and a way for players to delete their account.

**Who is let in:** the DM, always, and anyone in at least one live campaign, i.e. who joined with an invite link. An invite therefore lets someone in until the DM removes them. There is no list of Google addresses.

**Everyone else:** as soon as they log in, the site signs them out with "This site is invite-only. Ask the DM for an invite link." Their account is deleted at once if it owns nothing, so strangers' accounts do not pile up. Someone opening an invite link is checked after joining, not before. Before the DM is set (a fresh install), everyone is let in, so the owner can log in once and make themselves the DM.

**Remove player (DM only):** a Remove button per player on the Players screen, with a confirm dialog. They lose access to that campaign at once; if it was their only campaign they are no longer let in. Their characters stay in the campaign, visible to its players and editable only by the DM (owner decision, 2026-09-25). A new invite link lets them back in.

**Delete my account (players):** in Settings, behind a warning and typing `DELETE`. It permanently deletes the login, the profile, the memberships, and the player's characters with their piety. This is a real delete, not a soft delete: the point is that the data is gone. The DM's account cannot be deleted this way.

**Rejected:** a Supabase "Before User Created" hook with a list of allowed Google addresses. It runs before the invite link is used, so it cannot tell a new friend from a stranger, and the DM would need every friend's Gmail address first.

**Invite links stay reusable** (owner decision, 2026-09-25): one link works for everyone who opens it within its 7 days, so one link in the group chat is enough. The DM revokes it on the Players screen once everyone has joined. Single-use or capped links were offered and not wanted (roadmap, section 6).

The database decides (`check_access`) and row-level security stays the real lock: an account that skips the website still reads nothing.

### 1.7 Phase 4.7: Email and password login *(put in scope by the owner, 2026-09-25; built before Phase 5)*

Not everyone has, or wants to use, a Google account. Next to Google, people can log in with an email address and a password.

**Creating an account happens only through an invite link.** The invite page offers "Log in with Google" or **Create an account** with:
- email address
- display name (the name everyone sees, as in Settings; people log in with their email, not a username)
- password, and the password again; they must match

The website checks the form before sending: a valid-looking email (trimmed, lower-case), a display name of 1–40 characters, a password of at least 8 characters, and matching passwords. Supabase checks again on the server.

**Verification mail.** "Confirm email" is on: nobody can log in until they click the link in the mail. The link brings them back to the invite link, so they join the campaign straight away. It works on another device too (the mail carries a one-time token, checked with `verifyOtp`, not a code stored in the first browser).

**Log in and forgot password.** The login page has Google, plus email and password with a **Forgot password?** link. That sends a reset mail; its link opens `/reset-password`, where the user types a new password twice.

**Passwords are Supabase's job, not ours.** Supabase Auth stores only a bcrypt hash with a random salt per password, so rainbow tables do not work. Passwords never reach our own tables, and the website never hashes or stores them. Inputs reach the database only through Supabase's parameterised API.

**No sign-up without an invite.** A Supabase *Before User Created* hook (free plan) refuses every new email account that does not carry a valid invite code (not revoked, not expired, campaign not deleted). This stops strangers creating accounts and using the mail quota to spam people. New Google accounts are still allowed and handled as in 1.6: signed out and deleted if they have no invite.

**Sending mail: Resend** (owner decision, 2026-09-25), connected to Supabase as custom SMTP. Free for 3,000 mails a month. The sender is `noreply@yannickmul.nl`; the owner adds Resend's DNS records at Strato so mails do not land in spam. Supabase's built-in sender cannot be used: it only sends to the project team's own addresses.

**As built (2026-09-25):** the email forms appear only when the `VITE_EMAIL_LOGIN` variable is `true` (GitHub Actions variable and `.env.local`), so the site shows Google only until the owner has set up Resend and the Supabase settings (README). The hook lives in the `private` schema. Mail links use `{{ .RedirectTo }}?token_hash=…` templates and `verifyOtp`, so they work on any device. The form checks are unit-tested (`tests/validate.test.ts`).

**Google sign-ups get no verification mail** (owner decision, 2026-09-25): Google has already confirmed the address, so a mail would add a step without adding safety. A DM approval step for new players was offered and not wanted.

**Not in 4.7:** changing email or password from Settings (use Forgot password), login with a username, magic links, other providers.

### 1.8 Phase 6: Player features, notes and inventory *(put in scope by the owner, 2026-09-25)*

Players get a place on their own character sheet for their story, their private notes, their money and their things. Everything is on the **character sheet**, in new sections below the abilities (owner decision, 2026-09-25). Who can write stays as in B4: the character's owner and the DM. Who can read depends on the section.

**Backstory** (everyone in the campaign reads):
- One text area for backstory, goals and personality, with markdown and an **Edit / Preview** toggle, as in the session note taker (1.4). Raw HTML is switched off.
- It opens on Preview when it has text. Other players see only the rendered text; when empty they see "No backstory yet."
- It saves through the character's save hook (3.4), 1 s after typing stops.

**Private notes** (only the owner and the DM read):
- One text area like Backstory, labelled "Private notes", with the muted line "Only the player and the DM can see this."
- Other players do not see the section at all.

**Coins** (only the owner and the DM):
- A row of four tiles: **CP, SP, GP, PP**. No electrum (owner decision, 2026-09-25).
- Tapping a tile opens the number dialog with **Add**, **Spend** and **Set**, like the HP dialog. Spend never goes below 0. Up to 6 digits (coins can pass 9,999, unlike the stats in A1).

**Inventory** (only the owner and the DM):
- A list of items, sorted by name (case-insensitive). Each row shows:
  - the **name** in bold, with `×{quantity}` after it when the quantity is not 1
  - on the right, muted: the row's weight, `{quantity × weight} lb`, left out when 0
  - a second line with an **Equipped** and/or **Attuned** chip, left out when neither
- With no items: "No items yet."
- **Add item** asks only for the name (text prompt). The item starts at quantity 1 and weight 0, and its editor opens.
- **Item editor** (a dialog; title is the item's name), with tappable rows:
  - **Name** (text prompt, cannot be empty)
  - **Quantity** (number dialog, 0 or more; 0 keeps the item, e.g. out of arrows)
  - **Weight** per item in lb (a decimal, e.g. 0.5; comma or dot both work)
  - **Equipped** and **Attuned** (on/off)
  - **Description** (plain multiline text, saves like other typing)
  - **Delete item** (confirm dialog; soft delete)
- **Totals** below the list, muted:
  - `Carried {total} / {capacity} lb`: total = the sum of quantity × weight, plus coins at 50 to the pound. Capacity = STR × 15 (PHB). Shown red when over.
  - `Attuned {n} / 3`, shown when n is above 0, red when above 3.
  - Neither total blocks anything; they are reminders, like C4.

**Why a separate private row.** RLS works on whole rows (3.3), so private notes and coins cannot be columns on `characters`, which every player in the campaign reads. They go in their own one-per-character row with audience `owner`. Inventory items are rows with audience `owner` too.

**Ready for item effects (6.1 part 2).** Equipped and Attuned are what effects will hang on. The effects themselves come later as their own table (or a link to a library item); no speculative columns now. *Changed 2026-09-28 (Phase 8, 1.10): the effects are a short list on the item row itself (up to 5 bonuses and an armor type), not a separate table. They are typed in per item and there is no library yet, so a list on the row gets the item's privacy and saving for free. The Attuned box now shows only for items that require attunement, and `Attuned n / 3` counts only those.*

**Removed players and deleted accounts.** Same as characters (1.6): a removed player's notes, coins and items stay, visible only to the DM. Deleting an account removes them for good. Deleting a character soft-deletes them with it.

**As built (2026-09-25):**
- **Database:** one migration (`20260925170000_player_features.sql`). A trigger gives every new character its `character_private` row, however it is created; existing characters were backfilled. A guard trigger sets `owner_id` and `campaign_id` from the character and stops players moving rows or bypassing soft delete. `delete_character` now also soft-deletes the private row and items. The composite foreign keys follow a character if the DM moves it to another campaign.
- **Screens:** the sections sit below the abilities on `/c/:id/characters/:characterId`. The sheet's one Saved indicator shows the least-saved of the character and its private row; the item editor has its own. The item editor is a dialog; its field dialogs replace it while open.
- **Shared notes component:** Backstory, Private notes and the session notes use one component (`src/components/MarkdownNotes.tsx`). It chooses Edit or Preview once, when it opens. *Fix:* before this, the session notes switched to Preview as soon as the first letter was typed into empty notes.
- The coin, weight and totals rules are unit-tested (`tests/inventory.test.ts`).

**Not in Phase 6 (roadmap):** item effects and the automatic sheet (6.1), items shared with or given to other players, a party stash, item pictures, secret item rules (3.3), encumbrance rules, spell components, a shop.

### 1.9 Phase 7: Quest Journal *(put in scope by the owner, 2026-09-27; replaces the sketch in 6.2)*

A **Quest Journal** that everyone in the campaign reads. The point is that the group talks about what to do next: the quests keep them focused as a party while they decide together. **Only the DM creates, edits, reveals and changes quests.** Players read. Campaign content.

**Where:** a **Quest Journal** button on the dashboard for everyone, directly **below Characters** (1.5). The list is `/c/:campaignId/quests` and one quest is `/c/:campaignId/quests/:questId`.

**Three kinds of quest** (owner decision, 2026-09-27):
- **Main quest:** moves the main story forward. Shown in gold.
- **Side quest:** a short, just-for-fun quest that fits the place the party is in.
- **Character quest:** moves one character's own story forward. It is linked to that character and shows their name. **Everyone in the campaign sees it**, so the group can decide to help that character.

**Hidden until revealed, then never hidden again** (owner decision, 2026-09-27):
- A new quest starts **hidden** (audience `dm`). The DM can write it ahead of time. "Draft" is not a status: a hidden quest has a normal status and the DM edits it like any other quest.
- **Reveal** (with a confirm dialog) makes it visible to the campaign (audience `members`). **A revealed quest can never be hidden again.** The database refuses it, even for the DM.
- The DM can always edit a quest, hidden or revealed.

**Status** (DM only, any change in any direction, at any time):
- **Inactive:** known to the party, not being pursued. The party can leave it for as long as they like. New quests start here.
- **Active:** the party is working on it.
- **Completed:** done, shown crossed off.
- **Failed:** failed or given up.

**A quest shows:**
- the **title** and a **kind** chip (Main / Side / Character, with the character's name)
- a **description** in markdown, with **Edit / Preview** for the DM, as in the notes (`MarkdownNotes`, 1.8). Players see the rendered text.
- **Quest giver** and **Location** (free text; links to lore entries later)
- **Objectives** and **Rewards** (below)

**Objectives, revealed one step at a time** (owner decision, 2026-09-27):
- The main objectives are an **ordered list**. Players see every objective that is ticked off, plus the **first one that is not**. The rest stays hidden until the step before it is ticked off. Un-ticking a step hides the later steps that are not ticked off.
- **Optional objectives** can be added at any time, also while the quest is running. They always sit **below** the main objectives, marked "Optional". Players see them as soon as they are added.
- The DM sees every objective, and the ones players cannot see yet are marked "Hidden".
- The DM ticks objectives off, adds them, edits their text, moves them up or down within their group, and deletes them (confirm; soft delete).
- **The database decides what players see**, not the website: hidden steps never reach a player's phone (priority 2).

**Rewards, each visible or hidden** (owner decision, 2026-09-27):
- A quest has a list of rewards, one line of text each (e.g. "150 gp", "A favour from the harbourmaster").
- The DM marks each one **visible** or **hidden**, and can change it at any time. For example, the gold is visible but a special item stays hidden.
- Players see the visible rewards, plus one muted line **"+ a hidden reward"** (or "+ 2 hidden rewards") when there are hidden ones. The text of a hidden reward never reaches their phone.

**The list:**
- Grouped into **Active**, **Inactive**, **Completed** and **Failed**, in that order. Within each group Main quests come first, then Side, then Character, then newest first. Completed and Failed start folded shut.
- Each card shows the kind chip, the title, the giver and location, and the current objective.
- The DM also sees a **Hidden** group at the top, and a **+** button for **New quest**. That asks for the title and the kind (and the character, for a Character quest), then opens the quest.
- With no quests: "No quests yet."

**Editing (DM):** the quest page is the editor, like the character sheet. The description saves through the save hook (3.4). Title, kind, giver, location, objectives and rewards are tappable rows with a text prompt. The **…** menu has **Reveal** (only while hidden) and **Delete** (confirm; soft delete, e.g. for a quest created by mistake).

**Not tied to sessions** (owner decision, 2026-09-27): no "given in #53" / "completed in #57" for now.

**No voting in the app for now** (owner decision, 2026-09-27): the owner will think about how the group should choose. Voting goes to the roadmap (6.2).

**Removed players and deleted characters:** quests are the DM's content, so nothing changes when a player leaves. If a character is deleted, its Character quest stays and shows "Character quest" without a name. If the account is deleted, the link is cleared.

**As built (2026-09-27):**
- **Database:** one migration (`20260927120000_quest_journal.sql`). Only "dm all" policies write; players only read. `private.quest_guard` refuses hiding a revealed quest, moving a quest to another campaign, and a character from another campaign. `private.quest_part_guard` copies `campaign_id` from the quest and puts a new objective or reward last.
- **Screens:** `/c/:id/quests` and `/c/:id/quests/:questId`. The quest page is the DM's editor; for players it is read-only.
- **Saving:** the quest itself uses the save hook (3.4). Objectives and rewards are saved the moment the DM taps OK or a checkbox, with the conflict guard; they are short, deliberate changes, not typing. On a conflict the list reloads and shows a message.
- **New reward:** after the text, the DM picks "Yes, show it" or "No, keep it hidden", so a secret reward is never visible for a moment.
- **Deleting a quest** is allowed, also after it was revealed (e.g. created by mistake): a soft delete, not hiding it.
- The grouping, step-by-step visibility and hidden-reward text are unit-tested (`tests/quests.test.ts`).

**Not in Phase 7 (roadmap, 6.2):** voting, session links, secret DM notes per quest, links to lore entries, rewards that become inventory items, quest pictures.

### 1.10 Phase 8: Automatic character sheet *(put in scope by the owner, 2026-09-28; part 1 of the character builder in 6.1, with small slices of parts 2 to 4)*

The character sheet **calculates** the proficiency bonus, saving throws, skills, AC and Passive Perception, and shows how each total is made. The ruleset is 2014 (5e classic), as decided in 6.1. There is **no content library yet**: race, class and background are text the player types, and they change no numbers. Bonuses from a race, class or feat are added by hand as **custom modifiers**. Items add their armor and bonuses automatically once they are equipped (and attuned, when they need it).

**Who edits:** the character's owner and the DM, as in B4. Everything new on the sheet is read by the whole campaign, like the rest of the character. The items themselves stay private (1.8); other players see only what they add (below).

**AC and Passive Perception are never typed in** (owner decision, 2026-09-28). Both are always calculated, for the owner and the DM too. Custom modifiers are the only way to adjust them.

**Class, race and background** (owner decisions, 2026-09-28)
- **Class** is a list of entries. Each entry is a class name (free text, may be empty, up to 100 characters) and a level (a whole number, 1 to 20). A new character starts with one entry: no name, level 1.
- **Add class** adds an entry at level 1. It is greyed out once the total level is 20. Tapping an entry opens a dialog with **Name**, **Level** and **Remove**. The last entry cannot be removed.
- **Total level** is the sum of the entries, **at most 20** (the database refuses more). The sheet shows it as "Level 5".
- Wherever a class is shown (the sheet, the Characters list) it reads like "Fighter 3 / Wizard 2". An entry without a name shows as "Level 3".
- **Race** and **background** are free text (up to 100 characters, may be empty), in tappable rows with a text prompt. They change no numbers.
- This **replaces** the free-text `classLevel` (B1).

**Proficiency bonus** is read-only: `2 + floor((total level − 1) / 4)`, so +2 at levels 1–4, rising to +6 at levels 17–20. It is shown above the abilities.

**Ability scores.** The six base scores stay as they are (1 to 30), set with the keypad. Custom modifiers and item bonuses on an ability **add to the score**, so an elf's +2 DEX, entered by hand, changes the DEX modifier. The final score is kept between 1 and 30; when that cuts it off, the breakdown says "max 30" or "min 1". **Everything uses the final score:** the ability modifier, saving throws, skills, AC, initiative and carrying capacity (1.8). The tile shows the final score, with its modifier in gold.

**Saving throws.** Six rows, each with a **Proficient** box. Total = ability modifier + proficiency bonus (when ticked) + custom modifiers and item bonuses on that save or on all saves.

**Skills.** Eighteen rows in alphabetical order, each with a **Proficient** box, an **Expertise** box, and its ability in muted text. Total = ability modifier + proficiency bonus (proficient) or twice the proficiency bonus (expertise) + custom modifiers and item bonuses on that skill.
- Ticking Expertise also ticks Proficient. Un-ticking Proficient clears Expertise.
- **Expertise is for skills only**, not for saving throws (owner decision, 2026-09-28).

| Skill (key) | Ability | Skill (key) | Ability |
|---|---|---|---|
| Acrobatics (`acrobatics`) | DEX | Medicine (`medicine`) | WIS |
| Animal Handling (`animal_handling`) | WIS | Nature (`nature`) | INT |
| Arcana (`arcana`) | INT | Perception (`perception`) | WIS |
| Athletics (`athletics`) | STR | Performance (`performance`) | CHA |
| Deception (`deception`) | CHA | Persuasion (`persuasion`) | CHA |
| History (`history`) | INT | Religion (`religion`) | INT |
| Insight (`insight`) | WIS | Sleight of Hand (`sleight_of_hand`) | DEX |
| Intimidation (`intimidation`) | CHA | Stealth (`stealth`) | DEX |
| Investigation (`investigation`) | INT | Survival (`survival`) | WIS |

**AC** (owner decisions, 2026-09-28)
- **With armor:** the equipped body armor gives the base (table below). Light armor adds the full DEX modifier, medium armor at most +2, heavy armor none.
- **Without armor:** the **Unarmored AC** choice in the AC dialog:
  - **Normal:** `10 + DEX` (the default)
  - **Barbarian:** `10 + DEX + CON`
  - **Monk:** `10 + DEX + WIS`, only without a shield; with a shield it counts as Normal
  - **13 + DEX:** for Mage Armor, Draconic Resilience or natural armor
- **Shield:** +2 while a shield is equipped.
- Then custom modifiers and item bonuses on AC are added. AC is never below 0.
- **More than one body armor or shield equipped:** the one that gives the highest AC counts, and the sheet shows a red line, like `Attuned 4 / 3`.
- **Not yet** (6.1): heavy armor's Strength requirement and Stealth disadvantage, and bonuses that only work without armor (Bracers of Defense).

**Armor table** (SRD 5.1, the free 2014 rules; shipping it is allowed with the credit line on the terms page, see 6.1):

| Armor | Key | Type | AC |
|---|---|---|---|
| Padded | `padded` | Light | 11 + DEX |
| Leather | `leather` | Light | 11 + DEX |
| Studded leather | `studded_leather` | Light | 12 + DEX |
| Hide | `hide` | Medium | 12 + DEX (max 2) |
| Chain shirt | `chain_shirt` | Medium | 13 + DEX (max 2) |
| Scale mail | `scale_mail` | Medium | 14 + DEX (max 2) |
| Breastplate | `breastplate` | Medium | 14 + DEX (max 2) |
| Half plate | `half_plate` | Medium | 15 + DEX (max 2) |
| Ring mail | `ring_mail` | Heavy | 14 |
| Chain mail | `chain_mail` | Heavy | 16 |
| Splint | `splint` | Heavy | 17 |
| Plate | `plate` | Heavy | 18 |
| Shield | `shield` | Shield | +2 |

The credit line (check the current wording on Wizards of the Coast's SRD page when building): *"This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode."*

**Passive Perception** = `10 + the Perception skill total` + custom modifiers and item bonuses on Passive Perception (for example +5 for the Observant feat). Never below 0.

**Speed** = the base speed (keypad, as today) + custom modifiers and item bonuses. Never below 0. **Initiative** stays read-only: the modifier of the final DEX score.

**Custom modifiers** (owner decision, 2026-09-28)
- **Long-press** (about half a second, with a finger or a mouse button) on an ability, speed, a saving throw, a skill, AC or Passive Perception opens that number's dialog.
- Abilities and speed keep a normal tap for the keypad, which sets the base value. Saving throws, skills, AC and Passive Perception have nothing to type, so a normal tap opens the dialog too.
- The dialog shows the calculation at the top (for example `Stealth +6 = DEX +3 + Proficiency +2 + Lucky charm +1`) and a list of that number's modifiers. Tap a modifier to edit or delete it. **Add modifier** adds one. On a saving throw, a new modifier can be for **this save** or for **all saving throws**.
- A modifier is a **label** (free text, up to 100 characters, may be empty) and a **value** (a whole number, −30 to +30). A character holds at most 100.
- Under a total, one muted line shows its breakdown whenever something beyond the plain calculation is in it (custom modifiers, item bonuses, armor or a shield), for example `AC 19 = Chain mail 16 + Shield 2 + Ring of Protection 1`.

**Items** (a slice of 6.1 part 2, owner decisions, 2026-09-28). The item editor (1.8) gets:
- **Requires attunement** (on/off). The **Attuned** box only shows when it is on. Items that are attuned today get it switched on by the migration.
- **Armor:** a pick list from the armor table, "None" by default.
- **Bonuses:** up to 5. Each is a target (any number a custom modifier can go on, including "all saving throws") and a whole number (−30 to +30). For example, a Cloak of Protection: AC +1 and all saving throws +1. Magic armor is an armor type plus a bonus, such as Plate with AC +1.

An item **counts** while it is equipped, not deleted, has a quantity above 0 and, when it requires attunement, is attuned. It counts once, whatever its quantity. Every attuned item counts; the limit of 3 stays a red reminder (1.8), and `Attuned n / 3` counts only items that require attunement. Adding items to the inventory stays manual.

**Who sees what items add** (owner decision, 2026-09-28). Items are private (1.8), but every player reads the sheet, and everyone should see the same AC. So the database keeps a small row per character that lists, for every item that counts, its armor type and bonuses, without its name. **Nobody but the database writes it.** Other players see `Armor 16`, `Shield 2` and `Item +1`; the owner and the DM see the item names, because they can read the items.

**Death saves and inspiration** (owner decision, 2026-09-28)
- **Death saves:** a row of 3 success circles and a row of 3 failure circles below the hit points, shown **only while current HP is 0**. Tapping a circle fills or empties it. *(Changed 2026-09-30, owner: first they were always shown and not tied to HP.)*
  - **Healing:** as soon as current HP is above 0 (Heal, Set or a change to max HP), both counts go back to 0 (5e: regaining any hit points resets them), and the circles are hidden.
  - **Third success:** the character gets 1 HP at once, so the counts reset and the circles are hidden. *(Owner's rule; in 5e 2014 the character is stable at 0 HP.)*
  - **Third failure:** the character is dead. The name is crossed out, with a red `Dead` tag after it (the chip style and red of Sworn Enemy), on the sheet and in the Characters list; nothing else changes. The circles stay, and healing (for example a spell that brings someone back) clears it like any other death saves.
- **Inspiration:** an on/off toggle next to the death saves.

**Order on the web sheet**, top to bottom (replaces B3's list for the web):
1. Identity card: Player, Class (the entries and Add class), Race, Background, Devoted to.
2. Hit points card, with Damage and Heal.
3. Death saves (at 0 HP only) and Inspiration.
4. Tiles: Max HP, Temp HP, AC.
5. Tiles: Speed, Passive Perc., Initiative.
6. Proficiency bonus, then the six abilities.
7. Saving throws.
8. Skills.
9. Backstory and the private sections (1.8).

Other players see all of it read-only, including the breakdown lines, but nothing opens for them (B4).

**Existing characters** (owner decision, 2026-09-28): AC and Passive Perception are **recalculated as soon as this goes live**. A character wearing armor drops to `10 + DEX` until the armor is in the inventory and equipped, so the owner tells the players beforehand. The old class text becomes the class list (section 4). On 2026-09-28 the live characters had "" and "Barbarian", so both start at level 1 and the players set their levels.

**Saving**
- Numbers and boxes that stand alone (ability scores, speed, death saves, inspiration, race, background) use the normal save hook and conflict guard (3.4).
- Modifiers, proficiency ticks, class entries and item bonuses are **lists** in one field, so they are saved as **single changes**, like the objectives in Phase 7. The website first sends anything still waiting, then reads the latest list, applies the one change (add, edit, delete, tick) and saves it with the conflict guard. If someone else saved in between, it reads the list again and applies the change again. Two people changing different entries never overwrite each other (3.4: never overwrite silently). If the change cannot be sent (offline), the website says so, and the dialog stays open or the tick box goes back.
- The database checks the shape and size of every new field (section 4), for every caller, the DM included.

**Not in Phase 8 (roadmap, 6.1):**
- content from 5e: races, classes, backgrounds, feats and what they grant, including class saving throw and skill proficiencies
- conditions ("no armor"), "set" and "at least" effects (Belt of Giant Strength), heavy armor's Strength requirement and Stealth disadvantage
- modifiers on maximum HP and on initiative
- spells, hit dice, passive Investigation and Insight, Jack of All Trades
- a library of items

**Tests.** `tests/sheet.test.ts` covers:
- the proficiency bonus at every level
- final ability scores, including the 1 and 30 limits
- saves and skills with and without proficiency and expertise, and "all saving throws"
- AC for each armor type (with low and high DEX), the shield, the four unarmored choices (Monk with a shield), two armors equipped, and the 0 minimum
- Passive Perception
- which items count
- how the class list is shown

The permission test gains the cases in section 4.

**As built (2026-09-28):**
- **Database:** two migrations. `20260928120000_automatic_sheet.sql` adds the fields, `character_effects` and the checks; `20260928130000_drop_old_character_fields.sql` removes `class_level`, `ac` and `passive_perception`. The JSON checks are small `immutable` functions in `private` (`valid_classes`, `valid_modifiers`, `valid_proficiencies`, `valid_item_effects`), called by CHECK constraints. The class conversion checks itself with `assert`s inside the migration before it touches data. On the live database, "Barbarian" became one entry at level 1. When old class text passes 20 levels, the later entries are lowered and any that would drop below 1 are left out.
- **Rules:** `src/lib/sheet.ts` (unit-tested in `tests/sheet.test.ts`) builds the whole sheet from the character, the `character_effects` list and, for the owner and the DM, the item names.
- **Screens:** the sheet follows the order above. The dialog for a number (`StatDialog`) shows `{name} {total} = {parts}`, the modifiers, and the item bonuses, which are changed in the inventory. The AC dialog has the Unarmored AC choice. Long-press is `Press` (500 ms, with a finger or a mouse button; the phone's own long-press menu is blocked there). A modifier's value has a ± button, because phone number pads often have no minus key. The Characters list calculates AC from the same rules.
- **Saving lists:** `src/lib/listChange.ts` reads the latest list, applies one change and saves it with the conflict guard, trying again up to 3 times. A change that no longer fits (the entry was changed or removed by someone else) is cancelled with a message, and the sheet reloads.
- **Order of work:** steps 4 to 8 went live together, because the owner was the only one testing. Step 9 went live the same day at the owner's request, instead of a few days later.
- **Fixes (2026-09-30, `0.8.1-alpha`):**
  - The saving throw and skill tick boxes did not save. A list change first waits for other saves, and the box was read only after that wait, when it already showed the stored state again. Each box's new state is now read at the moment it is tapped.
  - Death saves changed as described above. `withDeathSaves` (`src/lib/character.ts`) adds the reset to every HP change, and `isDead` decides the Dead state. `CharacterName` shows the crossed-out name with the red `Dead` tag on the sheet and in the Characters list. No database change was needed.

### 1.11 Phase 9: Speed, data and battery *(asked for by the owner, 2026-09-30; built 2026-10-06 to 2026-10-07)*

The owner wants the app to load quickly, use little battery, and stay well inside the Supabase free plan. This phase serves priorities 3 and 4 (section 2). It adds **no new features**: every screen looks and works as before. Priority 1 (never lose typing) and 2 (privacy) still come first; nothing here may weaken them.

**Free plan limits** (checked on supabase.com/pricing, 2026-09-30): 500 MB database, 5 GB egress (data sent out) plus 5 GB cached egress a month, 50,000 monthly active users, pause after a week without activity. There is no limit on the number of writes. **The website's own files come from GitHub Pages, not Supabase**, so the size of the app never counts against the Supabase plan; only database requests do.

**Measured on 2026-09-30 (`0.8.1-alpha`)**

*Loading:*
- The whole app is **one JavaScript file of 709 KB (203 KB compressed)**, plus 17 KB of styles (4 KB compressed). Every first visit downloads all of it, also the login page for someone who never gets past it.
- What is in it: React 202 KB, our own code 117 KB, the Supabase client 209 KB, markdown (`react-markdown` and its helpers) about 105 KB, the router 37 KB.
- About 86 KB of the Supabase client is never used: realtime (live updates), file storage, edge functions and iceberg. Section 3.6 keeps realtime out for now.
- Markdown is needed on only three screens (character sheet, session, quest), yet it is loaded everywhere, the login page and dashboard included.
- Live site, first visit on a fast desktop connection: ready in 0.41 s. On a phone over 4G it will be slower: the 200 KB download and reading 700 KB of code are the main parts. Later visits load from the service worker (3.7) and are fast. After a **new version**, every phone downloads the whole file again, because it is one file: a change of one line means 200 KB for everyone.
- The screen is **empty and white** until the code has loaded (`index.html` has no background or text of its own), which makes loading feel slower than it is.
- Before the first screen can ask for its own data, the app makes three requests one after the other: `check_access`, then `worlds` and `profiles` together, then any leftover saves (3.4).

*Data per screen (Supabase egress):*
- The **character sheet** makes 7 requests when it opens: the character, piety tracks, all gods, `character_effects`, the item names, `character_private` and the inventory. The inventory is read twice (names for the sheet, full rows for the list). **All 7 are made again every time the user comes back to the tab** (3.6), for example after checking WhatsApp during a session.
- **Gods are always read with their notes** (up to 100,000 characters each, 15 gods), also where only the names are needed: the character sheet, the Characters list (for New character) and the Gods list.
- The **Sessions list downloads every session's full notes**, only to show the first line of each. At 50 sessions of a few pages each, that is megabytes per visit, and again on every return to the tab.
- **Every save returns the whole row** (`.select()` in `src/lib/saver.ts` and `src/lib/listChange.ts`). One tap on Damage sends back the character with its full backstory.

*Battery and phone work:*
- Already good: no timers, no animations, no realtime connection, the phone's own fonts (no web fonts), tiny icons. The Supabase login check only runs while the tab is visible.
- While typing in notes, **every key press** redraws the whole screen and writes the local backup copy of the whole text (3.4). With a long backstory this may make typing feel slow on an older phone. Not measured yet.

*Database:* already efficient. Every column the app filters on has an index, and the row-level security helpers look up the logged-in user once per query (`(select auth.uid())`), not once per row.

*Estimate:* a group of 6 with a few sessions a month uses **well under 10% of the 5 GB egress** today, and the database is a few MB of its 500 MB. So there is no risk to the free plan now. The data items below are about staying far from the limits as notes and sessions grow, and about speed on phones. Step 1 replaces this estimate with the real numbers.

**Baseline (step 1, 2026-10-06, `0.8.1-alpha`)**

*How it is measured* (owner, 2026-10-06), the same way again in step 7:
- **Login page (first visit):** the agent runs Lighthouse 12 from the command line, mobile, performance only, three runs on the live site, empty browser each time. The first run of a series is slower (cold server cache); runs 2 and 3 count.
- **Dashboard and character sheet (return visit):** the owner runs Lighthouse in Chrome's developer tools, **in an Incognito window** (extensions added up to 950 ms of blocked time in a normal window), logged in, mobile, performance only, with **Clear storage off** (otherwise the test logs out). The app's files then come from the service worker, so this measures the database requests, not the app download. The owner saves each report as JSON in Downloads; reports stay out of the repository (they hold screenshots of campaign content).
- **Typing (C8):** on the owner's Android phone over USB with Chrome's remote debugging, the agent walking the owner through it.

| Page | Score | First text | Largest item | Blocked | Layout shift | Download |
|---|---|---|---|---|---|---|
| Login page (first visit) | 98 | 1.8 s | 1.8 s | 0 ms | 0.045 | 420 KB (the app 209 KB; Google's sign-in button 210 KB with its font) |
| Dashboard (return) | 100 | 0.0 s | 0.8 s | 10 ms | 0.011 | 4 KB, 5 database requests in 3 waves |
| Character sheet (return) | 95 | 0.0 s | 1.0 s | 0 ms | 0.137 | 12 KB, 10 database requests in 5 waves |

- Character sheet waves: `check_access` → `worlds` + `profiles` → character, piety, gods (with notes), `character_effects`, item names → `character_private` → the full inventory. The last two wait for the sheet to draw first.
- **Supabase Usage** (billing period up to 2026-10-06): egress **0.01 GB of 5 GB** (0.2%), database **28 MB of 500 MB** (6%).

**What Phase 9 changes**

*A. Faster loading*
1. **Split the code per screen.** Each screen, and markdown, becomes its own file that loads when it is first opened (`React.lazy`). The login page and the dashboard no longer carry the character sheet, quests or markdown. React, the router and Supabase go into a shared file of their own, so a new version of the app usually changes only a small file and phones download just that. The service worker still stores every file after the first visit, so later screens open at once.
2. **Something to see straight away.** `index.html` gets the dark background (1.3 D6) and the app name in its own markup, so there is never a white flash or an empty screen while the code loads. The Content Security Policy already allows inline styles (Phase 4, gap 2).
3. **Fewer waits at startup.** `check_access` and the `worlds` and `profiles` reads go out together instead of one after the other. If access is refused, the reads are thrown away and the user is signed out as today (1.6).

*As built, step 2 (2026-10-06):* the login page now needs 142 KB compressed instead of 203 KB (the shared file of React, the router and Supabase is 136 KB of it); markdown is a file of its own (36 KB) loaded only by the character sheet, session and quest. While the app starts, `App.tsx` shows the same app name as `index.html`. One addition: if a screen's file is missing because a new version went live while a tab without the service worker was open, the page reloads once (`vite:preloadError` in `src/main.tsx`); unsent typing survives that (3.4).

*B. Less data per screen*

4. **Sessions list reads a short start of the notes**, not the full text: a new column `notes_start`, generated by the database as the first 500 characters of `notes`. The list's first-line text (`notesSnippet`) is made from it, as today. The note taker still reads the full notes.
5. **Gods only with the columns a screen needs.** Names (and ids) for the character sheet and New character; the Gods list without notes; the god page as today.
6. **The inventory is read once** on the character sheet, and the sheet takes the item names from it.
7. **Saves return only what changed**: the version and the saved fields, not the whole row. Before this, check every trigger on the tables involved: a trigger that changes another column than the one saved would be missed, so those tables keep returning the full row.

*As built, steps 3 and 4 (2026-10-06):*
- `sessions.notes_start` is a generated column (`left(notes, 500)`), live after the owner's `db push`.
- Gods: the character sheet, the Piety screen and New character read `id, name, epithet`; the Gods list reads everything but the notes; the god page as before.
- The character sheet reads the inventory once (8 requests instead of 10 on opening) and hands it to the inventory list.
- Saves (`saver.ts`, `listChange.ts`) return `id`, `version` and the saved fields; the website merges them into the row it has. **Trigger check:** on an update, `content_stamp` changes `version` and `updated_at` (no screen reads `updated_at`); the guard triggers (`guard_character_update`, `character_row_guard`, `quest_guard`, `quest_part_guard`) only refuse, or set a column to the value it already has; `follow_owner` and `rebuild_effects` change other tables, which the sheet already reloads. So every table returns only what changed. A future trigger or generated column that changes a column a screen shows must be added to the returned columns.
- A return to the tab within 30 seconds of the last load makes no requests (checked in the browser pane).

*C. Battery*

8. **Measure typing first.** Type in a long backstory (a few pages) on the owner's phone with the browser's performance tool. The sheet's calculation (`buildSheet`) is only redone when the character changes (`useMemo`). The local backup stays on every key press (owner decision 3); if typing is still slow, the agent reports the numbers to the owner instead of changing more.

*As built, step 5 (2026-10-07):* measured on the owner's Galaxy A52s 5G (Chrome 154) over USB, typing at the end of a 15,200-character backstory (Kraan, filled with test text and restored afterwards). The trace was recorded by a small script over `adb forward` and Chrome's DevTools protocol, because saving a profile from the remote DevTools window did not work.

| Per key press | Before `useMemo` (119 keys) | After (103 keys) |
|---|---|---|
| Main-thread work: median / p90 / max | 8.3 / 11.4 / 22.6 ms | 7.6 / 9.9 / 13.5 ms |
| Tap to next frame (EventTiming): median / max | 45 / 73 ms | 44 / 54 ms |

No task over 50 ms in either recording; Google's "good" limit for an interaction is 200 ms. Typing is not slow, so nothing more is changed (owner decision 3). `buildSheet` now runs only when the scores, speed, classes, modifiers, proficiencies, Unarmored AC or item effects change.

*D. Keep it this way*

9. **Size check in the build.** A small script after `npm run build` fails the Deploy workflow when the files needed for the login page pass a set size (the size after step A plus about 20%). Raising it is a deliberate choice, noted here.
10. **Owner routine:** once a month, open Supabase → **Usage** and look at egress and database size. The README gets the steps. More than half of either limit is a reason to look again.

*As built, step 6 (2026-10-07):* `scripts/check-size.mjs` (`npm run size`) runs in the Deploy workflow after the build. It follows Vite's build manifest (`build.manifest`) from `index.html` and the login screen, and adds up the compressed size of every file a first visit to the login page downloads: **144 KB** now, **limit 173 KB**. The monthly Usage routine is in the README.

**As built: retest (step 7, 2026-10-07, measured the same way as the baseline)**

| Page | Score | First text | Largest item | Blocked | Layout shift | Download |
|---|---|---|---|---|---|---|
| Login page (first visit), before → after | 98 → **100** | 1.8 → **0.8–1.1 s** | 1.8 → **1.5–1.6 s** | 0 ms | 0.045 | the app 209 → **152 KB** |
| Dashboard (return), before → after | 100 → **100** | 0.0 s | 0.8 → **0.8 s** | 10 → **0 ms** | 0.011 → **0.006** | 4 KB, 5 requests in 3 → **2** waves |
| Character sheet (return), before → after | 95 → **100** | 0.0 s | 1.0 → **1.1 s** | 0 → **10 ms** | 0.137 → **0** | 12 → **10 KB**, 10 → **9** requests in 5 → **3** waves |

- Login page: six runs after the fixes below, all 100. The baseline's slow first run (86) came from GitHub Pages answering slowly; after the fixes, slow answers (about 170 ms for the page) no longer lower the score.
- The dashboard and character sheet were measured by the owner before the two fixes below; they remove about 300 ms between the startup requests and the screen's own requests, so the real gain is larger than the table shows.
- **Supabase Usage** unchanged a day later: egress 0.01 GB, database 28 MB.

**Two fixes found by the retest** (part of A1):
- *React's 300 ms hold-back.* After showing a placeholder, React holds back the content behind it for up to 300 ms, so screens do not flicker. With the start screen as placeholder, the first screen waited about 300 ms before asking for its data (1 s in the browser pane). The login check (`useSession`) and the logged-in user (`setMe`) are now set in a React **transition**: the start screen stays until the screen's file is in, and the screen shows at once (first data request 5 ms after its file instead of about 300 ms).
- *Login screen in the main file.* Split off, the login screen's 1.4 KB file could only be asked for after the main code, one extra round trip on a phone's first visit. It is back in the main file; the login page needs 144 KB in total (the size check counts it either way).

**Fix after the retest** (`0.9.1-alpha`, 2026-10-07): the owner's Lighthouse run after the fixes above showed the character sheet's data requests at 162 ms instead of 459 ms, but the score at 95 instead of 100: a layout shift of 0.137, the same as the baseline. The **footer** stood at the bottom of the nearly empty page while the app started or the sheet loaded, and jumped away when the sheet filled the screen; the 300 ms hold-back had hidden this by showing the sheet only once its data was in. Now the footer is hidden (`display: none`) while the start screen or a screen's loading state (class `loading`) is shown, and appears with the screen: appearing is not a layout shift. Measured: the character sheet 0.137 → 0 (browser pane), the login page 0.045 → 0 (Lighthouse). The owner's Lighthouse run on `0.9.1-alpha` (character sheet, Incognito, return visit): score **99**, layout shift **0.001**, 9 requests in 3 waves. The missing point is one 159 ms task at 8 ms, before the app's code runs (the browser starting up); it varies per run. *Note for retests:* an Incognito window that was open before a new version keeps testing the old one until "New version" is tapped; open a fresh window and check the footer first.

**Owner decisions** (2026-09-30)
1. **Coming back to the tab** (3.6): **yes.** A return to the tab no longer reloads a screen that loaded less than 30 seconds ago. Switching to WhatsApp and back then costs nothing; a change by the DM shows up on the next return after that, or when the screen is opened again. Done in `useLoad` (`src/lib/useLoad.ts`), so every screen gets it.
2. **The unused parts of Supabase** (3.7): **no.** The app keeps the full official client. Using only `@supabase/auth-js` and `@supabase/postgrest-js` would save about 86 KB (about 25 KB compressed), but it is a less common setup with fewer examples (priority 5), and Live combat would bring realtime back.
3. **The local backup while typing** (3.4): **no.** It stays written on every key press, so a crash never loses typing (priority 1). C8 only measures typing and adds `useMemo`.

**Not in Phase 9 (roadmap):** a server or CDN in front of GitHub Pages, image compression (no images yet), working offline (section 2), and anything that caches campaign data on the phone (3.4: hidden content must not stay on a phone).

**Tests.** The existing unit and permission tests must stay green. New: the permission test checks that `notes_start` is readable only by the DM (it follows the `sessions` policies) and matches the start of `notes` after a save. Lighthouse (mobile) on the login page and the dashboard, before and after, with the numbers recorded here under *As built*.

### 1.12 Phase 10: At the table *(put in scope by the owner, 2026-10-07)*

Three things that help **during play**: conditions on a character, hit dice with Short and Long rest, and a party overview for the DM. They are built in that order: a long rest lowers exhaustion (a condition), and the party overview shows both. The ruleset stays 2014 (5e classic, 6.1). This phase is built before the Phase 4 group test, so the group tests it too (owner, 2026-10-07).

**Conditions** (owner decision, 2026-10-07: the player and the DM switch them, everyone in the campaign sees them)
- The 14 conditions of SRD 5.1, in this order: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious. Keys are the names in lower case (`blinded` … `unconscious`).
- **Exhaustion** is a level from 0 to 6, not on/off.
- **On the sheet:** a **Conditions** row below death saves and Inspiration. It shows a chip per active condition and `Exhaustion n` when above 0. With none, the owner and the DM see a muted "No conditions"; other players see nothing.
- Tapping the row (owner and DM) opens a dialog with an on/off switch per condition and − / + for exhaustion. Each tap saves at once.
- **Reminders only.** The app changes no numbers: no disadvantage, no halved speed, no halved max HP. Rules text per condition is not shown (owner, 2026-10-07).
- **Exhaustion 6** is death in 5e, so it gives the same crossed-out name and red `Dead` tag as three failed death saves (1.10). Lowering it clears that again.

**Hit dice** (owner decisions, 2026-10-07)
- **Die per class entry.** The die follows the class name (case-insensitive, spaces ignored), from the SRD: Barbarian d12; Fighter, Paladin, Ranger d10; Bard, Cleric, Druid, Monk, Rogue, Warlock d8; Sorcerer, Wizard d6. Any other name, or none, is d8.
- The class dialog (1.10) gets a **Hit die** choice (d6, d8, d10, d12). It shows the die from the name until someone picks one; a picked die is stored with the entry and then wins over the name.
- **Total hit dice** per die = the levels of the entries with that die. The database stores how many of each die are **spent**.
- **On the sheet:** below the hit points card, one line `Hit dice 3 / 5`, with the dice per size when there is more than one (`d10 2 / 3 · d8 1 / 2`), and the buttons **Short rest** and **Long rest** (owner and DM only).
- **Short rest:** a dialog listing each die size with dice left. Tapping a die asks "What did you roll on the d10?" (a number from 1 to the die). The app adds the CON modifier (of the final CON score, 1.10), heals that much (at least 0, never above max HP), and marks the die as spent. The dialog stays open for the next die; **Done** closes it. The player rolls real dice; the app does not roll (owner, 2026-10-07).
- **Long rest:** a confirm dialog that lists what happens:
  - current HP to max HP, temp HP to 0 (2014: temporary HP last until a long rest)
  - spent hit dice come back, up to half the total level (at least 1), the largest dice first
  - exhaustion 1 lower
  - death saves back to 0 (they already reset once HP is above 0)
  
  Other conditions do not change. A dead character (three failed death saves, or exhaustion 6) cannot rest: the buttons are hidden.
- **Who rests** (owner, 2026-10-07): the owner and the DM on the sheet, and the DM for the whole party on the party overview.

**Party overview** (owner decision, 2026-10-07: DM only)
- A **Party** button on the DM's dashboard, next to Players; the page is `/c/:campaignId/party`. Players never see the button, and the page sends them back to the dashboard. *(All of its data is already readable to players on the separate sheets; this is a DM tool, not a lock.)*
- One card per character in the campaign (not deleted), sorted by name, each with:
  - the name (crossed out with `Dead` when dead), and the class line ("Fighter 3 / Wizard 2")
  - **HP** `cur / max` with `+temp` when above 0, red at 0
  - **AC** and **Passive Perception**, calculated by the same rules as the sheet (1.10, from `character_effects`)
  - the conditions and exhaustion chips
  - **Hit dice** `left / total`
- Tapping HP opens the same dialog as on the sheet (Damage, Heal, Set), so the DM can follow a fight from one screen. Tapping anywhere else opens the character's sheet.
- **Long rest for the party** at the bottom: a confirm dialog naming the characters, then a long rest for every living character in the campaign.

**Saving**
- Conditions are a list, so they are saved as single changes (`listChange`, 1.10). Exhaustion, HP and spent hit dice use the save hook and conflict guard (3.4).
- **A long rest is one database function**, `long_rest(characters)`, for one character or the whole party. It runs as the caller (`security invoker`), so the normal rules decide whose characters someone may rest: a player only their own, the DM any. It changes each character in one step and skips dead ones. The screen reloads afterwards; a sheet that is open elsewhere gets the usual conflict warning on its next save (3.4).

**Not in Phase 10 (roadmap):** rules text and automatic effects of conditions, spell slots and anything else a rest restores (they come with spells, 6.1 part 5), an app dice roller, hit dice from a content library, and conditions in the Characters list.

**Tests.** A unit test for the hit die per class name, the dice totals per size, short rest healing (with a negative CON modifier), and what a long rest gives back (odd and even levels, level 1, the largest dice first). The permission test gains the cases in section 4.

**As built (2026-10-07, `0.10.0-alpha`):**
- **Database:** one migration (`20261007120000_at_the_table.sql`). `private.valid_classes` was replaced with a version that also allows `die`; existing rows stay valid, so no data changed. The hit dice that come back are worked out by `private.hit_dice_after_long_rest`, which `long_rest` calls. 124 permission-test cases pass.
- **Rules:** `src/lib/rest.ts` (unit-tested in `tests/rest.test.ts`): the conditions list, the hit die per class name, the dice per size, short rest healing, and `longRestChanges` for the confirm dialog. `isDead` (`src/lib/character.ts`) also counts exhaustion 6, so the Characters list and the party overview show the Dead tag too.
- **Screens:** the sheet has a Hit dice card (Short rest, Long rest) below the hit points, and the Conditions row below Inspiration. The class dialog has the Hit die choice; it follows the name ("from the class name") until a die is tapped. Shared parts: `src/components/Conditions.tsx` and `src/components/Rest.tsx`. The party overview is `src/pages/PartyPage.tsx`; it reads only the columns it needs. A long rest first sends what the sheet has not saved yet, so the sheet's next save gets no false conflict.
- **Checked in the browser** (2026-10-07) as DM, in a new **Stress test** campaign (Phase 4 step 1.1, made early) with the test characters Testra and Testor: the hit die from the class name, the dice line, damage then Short rest, conditions and exhaustion surviving a reload, Long rest, a save after the rest, the Dead tag at exhaustion 6 (sheet and Characters list), HP from the overview, and Long rest for the party skipping the dead character. No errors in the console.

### 1.13 Phase 11: NPCs and links *(put in scope by the owner, 2026-10-07)*

An **NPC library** for Theros that the DM and the players write together, and **links** to characters, gods and NPCs inside notes. Links come last, so they can point to NPCs from the start. Later the World button will also hold places, towns, buildings and factions (roadmap, 6). **Phase 11 builds only NPCs** (owner, 2026-10-07), but puts them behind the World button already, so the dashboard does not change again.

**World button** (owner decision, 2026-10-07)
- A **World** button on the dashboard for everyone, directly below **Gods**. It opens `/world`, a page of full-width buttons like the dashboard. In Phase 11 it has one: **NPCs**.
- **Gods stay on the dashboard** (owner, 2026-10-07).

**World content, revealed per campaign** (owner decision, 2026-10-07)
- NPCs belong to the **world**, like gods: one library for every campaign (3.3). The owner probably never makes a second campaign, but nothing depends on that.
- An NPC the DM creates starts **hidden**. **Reveal** (confirm dialog) shows it to the players of the current campaign; with more than one campaign, a pick list asks which. **A reveal can never be undone**, as with quests (1.9): the database refuses it, even for the DM. Revealing to another campaign later is another Reveal.
- A player sees an NPC that is revealed to a campaign they are in, and is not deleted.

**A shared wiki** (owner decision, 2026-10-07)
- **Players create NPCs too.** A player's new NPC is revealed to their current campaign at once.
- **Players edit every NPC they can see**, including the DM's: name, role, status, location, faction and description. Never the DM secrets, the stats or the reveals.
- **One shared text:** an edit shows in every campaign the NPC is revealed to (owner, 2026-10-07: fine, as there will probably be only one campaign).
- Two people editing at once get the usual conflict warning (3.4). Nothing is overwritten silently.
- **Only the DM deletes** (confirm dialog; soft delete), so nobody removes someone else's work by accident. *(Default chosen by the agent; the owner may change it.)*

**An NPC has** (owner decision, 2026-10-07)
- **Name** (required)
- **Role:** one line, shown under the name, e.g. "Harbourmaster of Meletis" (may be empty)
- **Status:** Alive (default), Dead, Missing or Unknown. A chip next to the name when it is not Alive; a Dead NPC's name is crossed out, like a dead character (1.10).
- **Location** and **Faction:** one free-text line each (may be empty). They can become links once places and factions exist.
- **Description:** markdown with Edit / Preview (`MarkdownNotes`, 1.8), saved through the save hook (3.4).

**DM secrets and stats: DM only, always** (owner decisions, 2026-10-07)
- **DM secrets:** a markdown section per NPC, e.g. "secretly a cultist of Erebos". Players never see it, not even that it exists.
- **Stats are optional** ("some NPCs should have stats"). **Add stats** shows a simple, monster-style block:
  - **AC**, **max HP** and **speed** (ft)
  - the **six ability scores** (1–30) with their modifiers (B2)
  - **challenge rating:** 0, 1/8, 1/4, 1/2, 1 … 30
  - **Actions:** one markdown box for attacks, spells and traits, e.g. "Spear +4, 1d6+2 piercing"
  
  **Remove stats** (confirm dialog) hides the block again. Stats are hidden from players always, also on a revealed NPC. Live combat (Phase 13) can take max HP from here.
- Secrets and stats live in their **own row with audience `dm`** (the separate secret row, 3.3), so they never reach a player's phone.

**The NPC list** (`/world/npcs`)
- Sorted by name (case-insensitive). Each row: the **name** in bold with the status chip, the **role**, and a muted line `location · faction`, leaving out empty parts.
- The DM sees a **Hidden** group at the top: the NPCs not revealed to the current campaign.
- A **filter box** at the top narrows the list by name, role, location and faction as you type. It filters the loaded list; there is no server search.
- **+** (everyone) asks for the name, creates the NPC and opens it.
- With no NPCs: "No NPCs yet. Tap + to add one."

**The NPC page** (`/world/npcs/:npcId`; "NPC" in the top bar, the name as heading)
- Tappable rows for Role, Status (pick list), Location and Faction (text prompts), then the Description.
- For the DM only, below: **DM secrets** and **Stats**.
- The **…** menu: **Rename** (everyone), **Reveal** (DM, while hidden from a campaign) and **Delete** (DM).
- A link to an NPC the user cannot see (hidden or deleted) shows "NPC not found".

**Links in notes** (owner decision, 2026-10-07: type @ and pick)
- In **every markdown notes box** (session notes, backstory, private notes, quest description, NPC description, DM secrets and NPC actions), typing **`@`** in Edit opens a short list below the text: the characters of the current campaign, the gods and the NPCs the user can see, matching the letters typed after `@`, at most 8, with the kind in muted text. Tapping one replaces the `@…` with a link. Escape, or a space with no match, closes the list.
- **Stored as an ordinary markdown link with the target's ID**, e.g. `[Ilona](npc:3f2a…)`, `[Kraan](character:…)`, `[Phenax](god:…)`. No new table (6). Renaming the target does not break the link; Preview shows its current name.
- **In Preview** a link is a tappable gold name that opens the character sheet, god page or NPC page. The names come from one small list (IDs and names only), loaded with the @ list.
- **A link to something the reader cannot see** (a hidden NPC, a deleted one, a character in another campaign) shows as plain text: the name as written in the note. *Note for the DM:* linking a hidden NPC in a text players read (a quest description, a backstory) therefore still shows the name as written, without the link.
- The god notes are a plain text box, not markdown, so they get no links in Phase 11.

**Removed players and deleted accounts.** NPCs are shared world content, so they stay when a player leaves. When an account is deleted (1.6), the NPCs it created stay and lose their owner.

**Not in Phase 11 (roadmap, 6):** places, towns, buildings, factions and other lore under World; a "Mentioned in" list of back-links on an NPC page; a history of wiki edits; NPC pictures; per-campaign party notes; links in the god notes and from the quest giver and location fields; an NPC's attitude toward the party; NPCs in live combat (Phase 12).

**Tests.** Unit tests for the links (writing and reading the link format, which targets the `@` list offers, plain text for unknown targets), the challenge-rating list, and the NPC list (sort, filter, Hidden group). The permission test gains the cases in section 4.

**As built (2026-10-07, `0.11.0-alpha`):**
- **Database:** one migration (`20261007140000_npcs.sql`). A reveal is never undone because `update` and `delete` on `npc_reveals` are revoked from `authenticated`, the DM included; a reveal must be for a live NPC and a live campaign of the same world (`private.npc_reveal_guard`). `npc_secrets` is created by a trigger with every NPC. `delete_my_account` needed no change: `npcs.owner_id` is `on delete set null`, so an NPC loses its owner and stays. The permission test has 10 new NPC cases: 141 in total, all passing.
- **Rules:** `src/lib/npcs.ts` (statuses, CR list, filter, Hidden group) and `src/lib/links.ts` (link format, `@` detection and matches), unit-tested in `tests/links.test.ts`. The names for links come from `src/lib/linkTargets.ts`: IDs and names of the campaign's characters, the gods and the NPCs, loaded only when a notes box has links or an `@` is typed, and shared by every notes box on a screen for 30 seconds.
- **Screens:** `/world` (`WorldPage`), `/world/npcs` (`NpcsPage`) and `/world/npcs/:npcId` (`NpcPage`, with `NpcSecrets` for the DM). The "current campaign" on these world screens is the dashboard's (`profiles.last_campaign_id`): a player's new NPC is revealed to it, and the DM's Hidden group and notice are about it. Links are added to the shared `MarkdownNotes`; Preview lets our `character:`, `god:` and `npc:` links through `react-markdown`'s URL check and sends everything else through the default check. In the `@` list, arrow keys and Enter or Tab pick, Escape closes it.
- **Checked in the browser** (2026-10-07) as DM, in the Stress test campaign: World button and page, a new NPC hidden from Stress test, role, status (Missing chip), location and faction, the filter box, `@` links by tapping and by keyboard (a character, a god, and an NPC from a character's backstory), Preview with gold links that open the right page, DM secrets with a link, Add stats with AC, STR (+3) and CR 1/2, everything after a reload, Reveal asking which campaign (Stress test, not Blind Vertrouwen), the menu still offering Reveal for the other campaign, a rename showing in the backstory link, and Delete turning that link into plain text. The test NPC was deleted and Testor's backstory emptied again. No errors in the console. The player side is covered by the permission test.

### 1.14 Phase 12: The rest of World *(put in scope by the owner, 2026-10-07; moved before live combat)*

The World button (1.13) gets five more libraries next to NPCs: **Places, Factions, Lore, Creatures** and **Items**. They work **exactly like NPCs** (owner, 2026-10-07), so players learn one way of working, and they can all be linked with `@`. Built before live combat (owner, 2026-10-07): creatures with stats then exist before the initiative tracker, which can use them as monsters from the start.

**The same rules as NPCs** (owner decision, 2026-10-07; see 1.13)
- **World content:** one library for every campaign.
- **Hidden until revealed:** the DM's new entries start hidden; **Reveal** shows one to a campaign and can never be undone.
- **A shared wiki:** players create entries (revealed to their current campaign at once) and edit every entry they can see.
- **DM secrets** per entry, DM only, always. **Only the DM deletes** (soft delete).
- Two people editing at once get the conflict warning (3.4).

**World page:** full-width buttons, in this order: **NPCs, Places, Factions, Lore, Creatures, Items**.

**Every entry has**
- a **name** (required) and a **summary**: one line shown under the name in the list, e.g. "Port city on the Siren Sea" (may be empty)
- a **description** in markdown with Edit / Preview, saved through the save hook (3.4)
- **DM secrets** (markdown, DM only)

**Per kind**
- **Places** (owner decisions, 2026-10-07): one Places button. Each place has a **type**: Region, City, Town, Village, Building, Dungeon or Other, shown as a chip; the list filters by type with chips above it. A place can be **part of** one bigger place (e.g. Meletis → Temple of Ephara → the crypt). Its page shows "Part of: Meletis" as a link, and an **Inside** list of the places that are part of it. A place cannot be part of itself or of a place inside it. Players see only the revealed ones: a revealed place inside a hidden one shows no "Part of" line to them.
- **Factions:** guilds, cults, noble houses, the city guard. Nothing extra.
- **Lore:** history, legends, prophecies and events. A **type**: History, Legend, Prophecy, Event or Other, with filter chips like places. *(Default chosen by the agent; the owner may change it.)*
- **Creatures:** the monsters of Theros. The **same DM-only stat block as NPCs** (AC, max HP, speed, the six abilities, CR and Actions, with Add stats and Remove stats; 1.13), so live combat can use them.
- **Items:** famous artifacts and named items, not players' inventory (1.8). DM secrets hold what players should not know, e.g. a curse.

**Places, factions and NPCs together** (owner decision, 2026-10-07)
- An NPC's **Location** and **Faction** become picks: tapping Location shows the places (with a filter box at the top, as the list may grow long), Faction shows the factions. **A small text field at the top creates a new one**: typing a name that is not in the list and tapping **Create** makes that place or faction and picks it. Like any new entry, a player's is revealed to their campaign at once, and the DM's starts hidden.
- The NPC page then links to the place and faction. The name is also stored as text on the NPC, so a player who cannot see the place (hidden) still sees the name as plain text. *Note for the DM:* picking a hidden place for a revealed NPC therefore shows its name, without the link.
- **Existing free text stays** as it is until someone picks: an old Location like "Meletis" shows as plain text.
- A place's page lists **People here** (the NPCs with that place as location), and a faction's page lists its **Members** (the NPCs in that faction), each as a link, only those the reader can see.

**Links** (owner, 2026-10-07)
- The `@` list (1.13) offers places, factions, lore, creatures and items too, with their kind in muted text, next to the characters of the current campaign, the gods and the NPCs. Stored the same way, e.g. `[Meletis](place:…)`.

**Lists** are as for NPCs: sorted by name, a filter box, the DM's Hidden group, **+** for everyone, and "No places yet. Tap + to add one." (per kind).

**Not in Phase 12 (roadmap, 6):** maps and pictures; a place's position on a map; NPCs that belong to several factions; relations between factions; items that become inventory items; creature stats from the SRD (6.1 part 3); "Mentioned in" back-links; a history of wiki edits; the 7-step attitude bar for factions.

**Tests.** Unit tests for the place types, lore types, "part of" (no loops, the chain up, the Inside list), the type filter, and the new link kinds. The permission test gains the cases in section 4.

### 1.15 Phase 13: Live combat *(order agreed with the owner, 2026-10-07; written out when started)*

The initiative tracker that players see live on their phones (6, Initiative tracker and Live combat). It is the hardest phase so far: it adds Supabase Realtime (changes 3.6), needs privacy for monster HP, and must stay light on the battery (1.11). It reuses the conditions and the party overview from Phase 10, and the stats of NPCs (Phase 11) and creatures (Phase 12). Moved after the rest of World (owner, 2026-10-07). The owner answers the questions before it is written out, like the earlier phases.

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
| The built-in email sender is for testing only: very low hourly limit, and it may only send to the project team's own addresses. | Email login (1.7) sends verification and reset mails through **Resend** as custom SMTP (free, 3,000 mails a month). |

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

*Phase 11 (1.13, owner, 2026-10-07):* **NPCs** are world content written as a shared wiki: a player may edit NPCs they did not create, once revealed to their campaign. This is the one place where players write what they do not own. Deleting stays DM only, and the secret part (DM secrets and stats) is a separate `dm` row.

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

### 3.5 Login: Google, or email and password. *Decided (changed 2026-09-25)*
- The group talks on WhatsApp, which cannot be used as a login.
- Google login needs no passwords and no email sending. It stays the main way in.
- *Changed 2026-09-25 (owner):* people without a Google account can use an email address and password, created only through an invite link, with a verification mail. See section 1.7. Before this, the plan was Google only.
- **Not Apple login:** it needs a paid Apple developer account.
- The Supabase login settings must list **both** `https://dnd.yannickmul.nl` and the local development address as allowed redirect URLs.

**Invite links will be shared in WhatsApp. Test this early.**
- Some apps open links in their own built-in browser, and Google blocks login inside those.
- In Phase 1, send yourself an invite link through WhatsApp, and open it on both an Android phone and an iPhone.
- If login fails there, the invite page must detect the built-in browser and tell the user to open the link in their normal browser. That is also where "Add to home screen" works.

### 3.6 No realtime in version 1. *Decided*
Data refreshes when a screen opens and when the user returns to the tab. *Changed 2026-09-30 (owner, Phase 9, 1.11): a return within 30 seconds of the last load does not reload.* Characters are edited by one person, and gods and piety scores change rarely, so live updates are not needed yet. This keeps the app simpler and lighter on battery.
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
- **Build settings** are GitHub Actions **variables** (public values, never secrets), read by `.github/workflows/deploy.yml`, and the same names in `.env.local` for local work (template: `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_GOOGLE_CLIENT_ID` (Google's button, 1.5) and `VITE_EMAIL_LOGIN=true` (email forms, 1.7). All four are set in GitHub (2026-09-25).
- **Public repository:** free GitHub Pages needs one, so anyone can read the code. That is fine because there are no secrets in it. Check before every commit that no keys, database passwords or data exports are included.

### 3.9 Version number. *Decided (owner, 2026-09-25; changed 2026-10-07)*
The version lives only in `package.json` and is shown in the footer (e.g. "v0.5.0 Alpha"). *Current: `0.11.0-alpha` (2026-10-07: Phase 11, NPCs and links).*
- **Alpha:** `0.<minor>.<fix>-alpha`. The minor number is the latest finished phase or roadmap feature: Phase 5 done = `0.5.0-alpha`. Each new phase or feature adds 1 to the minor number (`0.6.0-alpha`, `0.7.0-alpha`, …). **Every other push that changes the website adds 1 to the last number** (`0.9.1-alpha`, `0.9.2-alpha`, …), also a small fix and also a step of a phase that is still being built. *Changed 2026-10-07 (owner):* phones show "New version" whenever the website's files change, so the number in the footer must change with it. Before this, only a finished phase or fix raised it, and during Phase 9 phones showed "New version" several times on the same `0.8.1-alpha`.
- **Beta:** `0.<minor>.<fix>-beta`, from the moment the Character Builder (6.1), the Quest Journal (6.2) and Live Combat are all in. The minor number keeps counting.
- **Release:** `1.0.0`, when the owner says everything works.
- **Rule for the agent:** raise the version in every push that changes the website (anything under `src/` or `public/`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig*.json`), and keep `package-lock.json` in step. A push of several commits needs one raise. A push that only changes the plan, the README, tests, scripts, workflows or database files needs none, and phones then show no "New version".
- **Safety check:** the Deploy workflow runs `scripts/check-version.mjs` first. It compares the push with the one before (`github.event.before`) and stops the deploy when website files changed but the version did not.

**Footer on every page** *(owner, 2026-09-25)*: "DnD Companion App v…", "Created by: Yannick Mul", and links to the privacy policy (`/privacy`) and the terms of use (`/terms`). Both pages are readable without logging in. The terms page is optional for Google's branding, but linked there too.

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
| `profiles` | One per user: display name, and `last_campaign_id` (the dashboard's campaign, 1.5). Linked to the Supabase login user. |
| `worlds` | One row: Theros, with `dm_user_id` set to the owner. "Is this user the DM?" is answered from here and used by every RLS policy. The future lore database also lives at this level. |
| `campaigns` | Name, `subtitle` (1.5), `world_id`. Created by the DM. |
| `campaign_members` | Which players are in which campaign. The DM is not listed; the DM has access everywhere. |
| `campaign_invites` | Invite codes the DM shares as a link in WhatsApp. They can expire or be revoked. |

**Content tables:**

| Table | Level | Purpose |
|---|---|---|
| `characters` | Campaign | Player characters. Owned by the creating player. |
| `gods` | World | The pantheon of Theros, shown on the Gods page and offered as choices at character creation. |
| `piety_tracks` | Campaign | One row per piety track a character has (details below). |
| `sessions`, `session_attendance` | Campaign | DM-only session notes (Phase 5, below). |
| `character_private` | Campaign | A character's private notes and coins, audience `owner` (Phase 6, below). |
| `inventory_items` | Campaign | A character's items, audience `owner` (Phase 6, below). |
| `quests`, `quest_objectives`, `quest_rewards` | Campaign | The Quest Journal (Phase 7, below). |
| `character_effects` | Campaign | What a character's counting items add (armor and bonuses), without item names. Read by the campaign, written only by the database (Phase 8, below). |
| `npcs`, `npc_reveals`, `npc_secrets` | World | The NPC library, which campaigns see each NPC, and the DM-only secrets and stats (Phase 11, below). |
| `world_entries`, `world_entry_reveals`, `world_entry_secrets` | World | Places, factions, lore, creatures and items, built like the NPC tables (Phase 12, below). |

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

**Phase 6 (section 1.8):**
- `characters.backstory` (long text, may be empty). Audience `members`, like the rest of the character.
- `character_private`: the standard columns with `campaign_id` and audience `owner`, plus `character_id` (unique: one row per character), `notes` (long text), and `cp`, `sp`, `gp`, `pp` (integers, 0 to 999,999). The database creates it together with the character and backfills existing characters. Players never insert or delete it; the owner and the DM edit it.
- `inventory_items`: the standard columns with `campaign_id` and audience `owner`, plus `character_id`, `name` (not empty), `quantity` (integer, 0 or more, default 1), `weight` (lb per item, decimal, 0 or more, default 0), `description` (text), `equipped` and `attuned` (true/false). The owner and the DM create and edit; deleting goes through `delete_item(id)` (soft delete).
- On both, `owner_id` is set by the database to the character's owner, and follows it if the character changes owner. Players cannot change `owner_id`, `audience`, `campaign_id`, `character_id` or `deleted_at`.
- Permission test: other players and non-members cannot read or write either table; a player cannot add items to someone else's character; the owner and the DM can; players cannot insert or delete the private row; deleting a character hides them; deleting an account removes them.

**Phase 7 (section 1.9):** only the DM writes these three tables; there are no player write policies at all.
- `quests`: the standard columns with `campaign_id`, plus `kind` (`main` / `side` / `character`), `character_id` (only for `character`; must be in the same campaign; cleared if the character is removed for good), `title` (not empty), `description` (long text), `giver`, `location` (text), and `status` (`inactive` / `active` / `completed` / `failed`, default `inactive`). `audience` is `dm` (hidden, the default) or `members` (revealed). The database refuses a change from `members` back to `dm`, even from the DM.
- `quest_objectives`: the standard columns (`campaign_id` copied from the quest by the database, audience `members`), plus `quest_id`, `text` (not empty), `done`, `optional`, `sort_order`. Players read an objective only when its quest is readable **and** it is optional, ticked off, or the first main objective not yet ticked off (by `sort_order`). A helper, `private.objective_visible`, decides.
- `quest_rewards`: the standard columns (`campaign_id` from the quest), plus `quest_id`, `text` (not empty), `sort_order`. `audience` is `members` (visible) or `dm` (hidden), and the DM may switch it both ways. Players read visible rewards of readable quests.
- `hidden_reward_counts(campaign)`: returns, per readable quest, how many rewards are hidden, without their text, for the "+ a hidden reward" line.
- Permission test: players and non-members cannot create, edit, reveal, delete or change the status of quests, objectives or rewards; hidden quests, their objectives and rewards are invisible to players; players see only the objectives they should; hidden rewards are counted but their text is not readable; a revealed quest cannot be hidden again; a Character quest cannot point to a character in another campaign.

**Phase 8 (section 1.10).** One migration (`20260928120000_automatic_sheet.sql`), and a last one that removes the old columns.
- `characters` gets:
  - `classes`: a JSON list of `{name, level}`, default `[{"name": "", "level": 1}]`
  - `race` and `background`: text, default empty, up to 100 characters
  - `unarmored_ac`: `normal` / `barbarian` / `monk` / `base13`, default `normal`
  - `modifiers`: a JSON list of `{id, target, label, value}`, default empty
  - `proficiencies`: JSON `{"saves": [ability keys], "skills": {skill key: "proficient" or "expertise"}}`, default `{"saves": [], "skills": {}}`
  - `death_saves_success` and `death_saves_failure`: 0 to 3, default 0; `inspiration`: default false
- **Removed by the last migration:** `class_level`, `ac` and `passive_perception`, once the website no longer reads them (section 5, Phase 8 step 9).
- `inventory_items` gets:
  - `attunement_required`: default false; the migration sets it to true where `attuned` is true
  - `armor`: a key from the armor table in 1.10, or empty
  - `effects`: a JSON list of `{target, value}`, at most 5, default empty
- **Keys and targets.** Abilities are `strength` … `charisma` (as the columns); skill keys are in the table in 1.10. A target is one of `ability.<ability>`, `save.<ability>`, `save.all`, `skill.<skill>`, `ac`, `speed` or `passive_perception`.
- **Shape and size checks** are CHECK constraints, so they hold for every caller, the DM included. They call small `immutable` validator functions in `private`, with `search_path = ''`:
  - every list is a JSON array, and every entry a JSON object with exactly the keys above and no others
  - numbers are JSON whole numbers, never text or fractions: levels 1 to 20, values −30 to +30
  - `classes`: 1 to 10 entries, total level at most 20, names up to 100 characters
  - `modifiers`: at most 100; `id` a UUID, `target` from the list, `label` up to 100 characters
  - `proficiencies`: only `saves` (distinct ability keys) and `skills` (known skill keys, each `proficient` or `expertise`)
  - item `effects`: at most 5, targets from the list; `armor` and `unarmored_ac` from their lists
  - a size cap as a backstop: 64 KB for `modifiers`, 8 KB for each of the others
- `character_effects` holds what the counting items add (1.10), for everyone in the campaign to read:
  - The standard columns with `campaign_id`, audience `members` (the only one allowed), plus `character_id` (unique: one row per character) and `items`, a list of `{item_id, armor, effects}` for every item that counts.
  - **Why a separate row:** RLS works on whole rows (3.3), and items have audience `owner`. Keeping this list on `characters` would let the trigger below change the character's `version` (3.4), so everyone editing that character, including the player who just equipped an item, would get a false conflict.
  - A foreign key `(character_id, campaign_id)` to `characters`, `on delete cascade on update cascade` (like `character_private`), so the row follows a character to another campaign and disappears with a deleted account.
  - **Reading:** "dm read" and "members read" policies, for select only. "members read" also requires `exists (select 1 from public.characters c where c.id = character_id)`. That goes through the characters policies, so a character players cannot see (audience `owner` or `dm`) hides its effects too, as quests hide their objectives (Phase 7).
  - **Nobody writes it through the API, the DM included:** `insert`, `update` and `delete` are revoked from `authenticated`.
  - **Written by** `private.rebuild_effects(character)`, `security definer set search_path = ''`, with every name schema-qualified. An after-trigger on `inventory_items` calls it on insert, on delete, and on updates of `equipped`, `attuned`, `attunement_required`, `quantity`, `armor`, `effects`, `audience`, `deleted_at` or `character_id`, for both the old and the new character.
  - It counts items that are not deleted, have audience `owner` or `members` (never `dm`), have a quantity above 0, are equipped, are attuned when they require it, and have armor or bonuses.
  - It only updates the existing row, and only when the list changed. It never inserts, so a character that is being deleted cannot get a new row.
  - Created for every new character by `private.character_after_insert` and backfilled for existing characters (deleted ones get a deleted row). Soft-deleted by `delete_character`. Its `owner_id` follows the character (`private.character_owner_changed`).
- **Migration of `class_level`:** each part between "/" becomes an entry. A number at the end of a part is its level, kept between 1 and 20 (read as a decimal first, so a huge number cannot break the migration); otherwise the level is 1. Names are cut at 100 characters. If the total would pass 20, the last entries are lowered until it is 20, and entries that would drop below level 1 are left out (at most 10 entries). The backfills change every character's and item's `version`, so the owner runs `db push` when nobody has a sheet open.
- **Permission test, new cases:**
  - Other players read `character_effects`; nobody writes it, not even the DM; non-members read nothing.
  - The effects of a character players cannot see are invisible to them. An item with audience `dm` never appears in them.
  - Equipping, attuning, deleting or changing the quantity of an item updates the effects; typing its description does not. An item that requires attunement counts only when it is equipped and attuned.
  - Deleting a character hides its effects. `delete_my_account` still works for a player with an equipped item that counts, and leaves no effects row.
  - A player cannot change another character's new fields.
  - Refused: an unknown target or key, a value out of range, text or a fraction instead of a whole number, an extra key, something that is not a list, a 101st modifier, a 6th item bonus, 0 or 11 class entries, a level of 21, a total level of 21, a death save count of 4, an unknown armor type or unarmored choice.

**Phase 10 (section 1.12).** One migration, so one `db push`. The website before Phase 10 must keep working on it, because phones may still run a cached copy.
- `characters` gets:
  - `conditions`: a JSON list of distinct condition keys (1.12), default empty
  - `exhaustion`: a whole number from 0 to 6, default 0
  - `hit_dice_spent`: a JSON object with only the keys `"6"`, `"8"`, `"10"`, `"12"`, each a whole number from 0 to 20, default empty (a missing key is 0)
- A `classes` entry may have a third key, `die` (6, 8, 10 or 12), the picked hit die. It is optional, so entries without it, and the older website, stay valid. `private.valid_classes` is changed to allow it.
- Shape checks as CHECK constraints with `immutable` validators in `private` (`valid_conditions`, `valid_hit_dice`), like Phase 8.
- `long_rest(characters uuid[])`, `security invoker`, so the characters policies decide. For each character that is not dead: `hp_cur` = `hp_max`, `hp_temp` = 0, death saves 0, `exhaustion` 1 lower (not below 0), and spent hit dice back up to half the total level (at least 1), the largest dice first. When the caller may not change one of the characters, the whole call is refused and nothing changes. It returns the number of characters rested.
- **Permission test, new cases:** a player sets conditions, exhaustion and spent hit dice on their own character, but not on someone else's; others read them; refused: an unknown condition, a condition twice, exhaustion 7 or −1, an unknown die key, a spent count of 21, a `die` of 7, an extra key in a class entry; a class entry without `die` is still accepted. `long_rest`: a player rests their own character; resting someone else's character (alone or in a list with their own) is refused and changes nothing; the DM rests the whole party; a dead character is skipped; the results match the rules above (HP, temp HP, hit dice for an odd and an even level, exhaustion).

**Phase 11 (section 1.13).** One migration, so one `db push`. The links need no table: they are text inside the existing notes.
- `npcs`: world content. The standard columns with `world_id`, plus `name` (not empty, 100), `role`, `location`, `faction` (500 each, may be empty), `status` (`alive` / `dead` / `missing` / `unknown`, default `alive`) and `description` (100,000). `audience` is always `members`; a player's reading also needs a reveal (below). `owner_id` is the creator, and is cleared when that account is deleted (`on delete set null`).
- `npc_reveals`: `npc_id`, `campaign_id`, `created_at`, unique per pair. A row means: the players of that campaign see this NPC. **Nobody updates or deletes it through the API, the DM included** (a reveal is never undone, 1.13). The DM inserts it; for players it is made by `create_npc`. Players in the campaign read their campaign's rows. It disappears only when the NPC or the campaign is removed for good (cascade).
- `npc_secrets`: one per NPC, audience `dm` only. The standard columns with `world_id`, plus `npc_id` (unique), `secrets` (100,000), `has_stats` (default false), `ac`, `hp_max`, `speed` (whole numbers, 0 to 9,999, may be empty), `strength` … `charisma` (1 to 30, default 10), `cr` (one of `0`, `1/8`, `1/4`, `1/2`, `1` … `30`, may be empty) and `actions` (100,000). A trigger creates it with every NPC; only the "dm all" policy exists, so players can neither read nor write it.
- **Reading `npcs`:** the DM reads all. A player reads an NPC that is not deleted and has a reveal for a campaign they are a member of (`private.npc_visible`).
- **Writing `npcs`:**
  - `create_npc(campaign, name)`: a player must be a member of the campaign; it creates the NPC (owner: the caller) and its reveal to that campaign together. Called by the DM it creates a hidden NPC (no reveal). Direct inserts into `npcs` stay DM only.
  - Players update any NPC they can read (the shared wiki, 1.13). A guard trigger stops them changing `world_id`, `owner_id`, `audience` or `deleted_at`.
  - `delete_npc(id)`: DM only, soft-deletes the NPC and its secrets row.
- **Permission test, new cases** (10 tests, 2026-10-07)**:** a player reads a revealed NPC and edits its text fields, but not a hidden one; a player in another campaign reads nothing of an NPC revealed only to the first; non-members read nothing; a player's `create_npc` reveals the NPC to their campaign, and is refused for a campaign they are not in; a player cannot insert into `npcs` or `npc_reveals` directly, nor change `world_id`, `owner_id`, `audience` or `deleted_at`, nor delete or soft-delete an NPC; nobody, the DM included, updates or deletes a reveal; players cannot read or write `npc_secrets`, not even on their own NPC; the DM reads and writes everything and `delete_npc` hides the NPC; refused: an empty name, an unknown status, an ability score of 31, an unknown CR; deleting the account of a player who created an NPC keeps the NPC without an owner.

**Phase 12 (section 1.14).** One migration, so one `db push`. The five new kinds share one set of tables, built like the NPC tables (Phase 11); the NPC tables stay as they are.
- `world_entries`: world content. The standard columns with `world_id` and audience `members` (fixed), plus `kind` (`place` / `faction` / `lore` / `creature` / `item`), `type` (for places `region` / `city` / `town` / `village` / `building` / `dungeon` / `other`; for lore `history` / `legend` / `prophecy` / `event` / `other`; empty for the other kinds), `name` (not empty, 100), `summary` (500), `description` (100,000) and `parent_id` (places only: another live place of the same world; checked by a trigger that refuses a loop).
- `world_entry_reveals` (`entry_id`, `campaign_id`) and `world_entry_secrets` (one per entry, audience `dm`: `secrets`, and for creatures the same stat columns as `npc_secrets`). Same rules as `npc_reveals` and `npc_secrets`: a reveal is never updated or deleted, the secrets row is DM only and made by a trigger.
- `create_world_entry(campaign, kind, name)` and `delete_world_entry(id)`, like `create_npc` and `delete_npc`. A guard trigger stops players changing `world_id`, `owner_id`, `audience`, `kind` or `deleted_at`.
- `npcs` gets `place_id` and `faction_id` (may be empty; `on delete set null`), which must point to a place or a faction of the same world. `location` and `faction` stay as the text shown to whoever cannot see the entry.
- **Permission test, new cases:** the NPC cases again for the new tables (hidden, revealed per campaign, shared wiki, secrets DM only, delete DM only, refused fields, a deleted account); a place cannot be part of itself, of a place inside it, of an entry that is not a place, or of a place in another world; `parent_id` on a non-place is refused; an NPC's `place_id` must be a place and `faction_id` a faction; a player cannot change `kind`.

**Text length limits (all tables, 2026-09-27):** names 100 characters, one-line fields 500, notes and descriptions 100,000. Every new text column gets a limit in the migration that creates it.

**Allowed now for future use:** a nullable `image_path` column on characters and gods, for future image uploads. Nothing else speculative.

**As built (Phase 2, 2026-09-24).** Schema: `supabase/migrations/`. Permission test: `tests/permissions.test.ts`.
- **Policy helpers** live in a `private` schema that the API does not expose (`is_dm`, `is_campaign_member`, `is_world_member`, `shares_campaign`, `audience_allows`). Every table has one "DM can do everything" policy plus narrow player policies.
- **Database functions the website calls:**
  - `create_character(campaign, name, god or null)` creates the character and its score-0 track together.
  - `delete_character(id)` soft-deletes the character and its tracks. Players cannot set `deleted_at` directly.
  - `accept_invite(code)` joins a campaign.
  - *Added later:* `check_access()` (1.6: is this user let in; deletes a stranger's empty account), `delete_my_account()` (1.6), `create_session(campaign, number or null)` (1.4), `delete_item(id)` (1.8; `delete_character` now also soft-deletes the private row and items). The *Before User Created* hook `private.before_user_created` (1.7) is called by Supabase Auth, not the website.
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

**How a database change goes live** (the routine since Phase 4.5):
1. The agent commits the migration and its permission-test cases, and pushes **only that** first. The Database tests workflow must be green.
2. The owner applies it to the real project: `npx.cmd supabase db push` in PowerShell, in the project folder. (Plain `npx` is blocked by PowerShell's script policy on the owner's PC; `npx.cmd` works.) The owner types the database password; the agent never sees it.
3. Only then does the agent push website code that uses the change. Pushing it earlier breaks the live site.
4. The agent checks new screens in the Claude app's browser pane (local copy at `localhost:5173`, which talks to the real database). The owner logs in there; the agent cannot log in for them.

### Where we are *(updated 2026-10-07)*

| Step | Status |
|---|---|
| Phases 0–3: version 1 (login, database and security, campaigns, gods, characters, piety) | **Done** |
| Phase 4: stress test, security check and share | **Written out in depth** (2026-09-27): preparation, accounts and settings, a security test by the agent, a group test with a player checklist, fixes. Four known gaps are listed there for the owner to decide on. **Plan (owner, 2026-10-07):** steps 1–3 in the week of 2026-10-07, next to Phase 10, with the security test at the end of the week so it covers the new tables; the group test (step 4) the week after, including Phase 10. |
| Phase 4.5: look and navigation (1.5): dashboard, account menu, settings, responsive layout, friendlier Google sign-in | **Built** (2026-09-25). Google's button is set up and tested by the owner. Still open: brand verification, the WhatsApp retest (section 8). |
| Phase 4.6: invite-only access, remove player, delete my account (1.6) | **Built** (2026-09-25) |
| Phase 4.7: email and password login (1.7): sign-up through invite links, verification mail, forgot password, Resend | **Built and tested by the owner** (2026-09-25) |
| Phase 5: session notes (1.4): DM-only notes numbered from a chosen start, markdown, attendance | **Built** (2026-09-25), checked by the owner |
| Extras (2026-09-25): footer on every page, terms page, version number (3.9), rename to DnD Companion App | **Built**, version `0.5.2-alpha` |
| Then, from the roadmap (section 6), in the owner's current order: | |
| Phase 6: player features (1.8): backstory, private notes, coins and inventory on the character sheet | **Built** (2026-09-25), version `0.6.0-alpha`. Checked as DM in the browser; the player view is covered by the permission test. |
| Phase 7: Quest Journal (1.9): Main, Side and Character quests, revealed once, objectives revealed step by step, visible and hidden rewards | **Built** (2026-09-27), version `0.7.0-alpha`. Checked as DM in the browser; the player view is covered by the permission test. |
| Phase 8: automatic character sheet (1.10): class list, race and background, proficiency, saving throws and skills, custom modifiers, armor and item bonuses, calculated AC and Passive Perception, death saves, inspiration | **Built** (2026-09-28), version `0.8.0-alpha`. Checked as DM in the browser; the player view is covered by the permission test. Fixes on 2026-09-30, version `0.8.1-alpha`: the tick boxes save again, death saves only at 0 HP, Dead tag. |
| Phase 9: speed, data and battery (1.11): measured 2026-09-30; code split per screen, no white screen while loading, less data per screen, a size check in the build | **Built** (2026-10-07), version `0.9.0-alpha`. Login page 98 → 100, first text 1.8 → 0.8–1.1 s; character sheet 95 → 100; typing measured on the owner's phone. Since then, every push that changes the website raises the version (3.9). |
| Phase 10: at the table (1.12): conditions, hit dice with Short and Long rest, party overview for the DM | **Built** (2026-10-07), version `0.10.0-alpha`. Checked as DM in the browser in the Stress test campaign; the player side is covered by the permission test. Tested by the group in Phase 4. |
| Phase 11: NPCs and links (1.13): a World button with a shared NPC library (DM secrets and stats hidden), then `@` links to characters, gods and NPCs in notes | **Built** (2026-10-07), version `0.11.0-alpha`. Checked as DM in the browser in the Stress test campaign; the player side is covered by the permission test (141 cases). |
| Phase 12: the rest of World (1.14): Places (types, part of), Factions, Lore, Creatures (with stats), Items, all like NPCs; picks for an NPC's Location and Faction; `@` links to all of them | **Written out** (2026-10-07, owner's answers) |
| Phase 13: live combat (1.15): initiative tracker with Realtime | After Phase 12; written out when started |
| Character builder and rules engine (6.1), the parts after Phase 8 | Owner decides when |
| Other roadmap candidates (Lottie animations, session quiz, pictures, …) | Unordered |

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

### Phase 4: Stress test, security check and share *(written out in depth 2026-09-27; the owner decides when)*

*Skipped on 2026-09-24 and planned in full on 2026-09-27 at the owner's request. Security matters a lot to the owner, so this phase has a real security part, not just a quick check.*

**Goal:** find what breaks before the group depends on the app, and be as sure as is realistically possible that nobody can read or change what they should not. **Nothing is ever "absolutely" secure**, so the aim has three layers: no known holes, several locks behind each other (defence in depth), and fast recovery if something still goes wrong (backups, soft delete).

**What already protects the app (built):**
- **Row-level security on all 20 tables.** The database itself decides who reads and writes each row. Hiding a button in the website is never the lock (3.3, priority 2).
- **An automated permission test** (141 cases, `tests/permissions.test.ts`) runs on every push against a throwaway database. It logs in as the DM, two players and an outsider, and tries forbidden things.
- **Only the public key is in the website.** The secret key and the database password are only in Supabase and in the private backup repository (3.2, 3.8).
- **Passwords are handled by Supabase Auth** (bcrypt), never by our code (1.7). Invite-only access (1.6), and sign-up only with a valid invite (1.7).
- **Markdown is rendered without raw HTML** (`skipHtml`). `react-markdown` removes `javascript:` links by default.
- **Unsent changes in the browser are stored per user** (3.4), so on a shared phone the next person does not see or send them.
- **Soft delete, and weekly backups** in the private repository (3.2).

**Known gaps (found while planning, 2026-09-27):** the owner chose to fix 1 and 2 before the group test, and to accept 3 and 4 (2026-09-27).
1. **No length limits on text.** A member could paste megabytes into a name, a note or an item and fill the free database (500 MB). **Fixed (2026-09-27, `0.7.1-alpha`):** database limits of 100 characters for names, 500 for one-line fields and 100,000 for notes and descriptions (migration `20260927130000_text_limits.sql`), with the same limits in the website (`src/lib/limits.ts`).
2. **No Content Security Policy (CSP).** This is a browser safety net: if a script ever got injected, the CSP would stop it from loading code or sending data to other sites. GitHub Pages cannot send headers, but a `<meta http-equiv="Content-Security-Policy">` tag works. It must allow Supabase and Google's sign-in script. **Fixed (2026-09-27, `0.7.1-alpha`):** added to the build only by a small Vite plugin (`vite.config.ts`), because the dev server needs inline scripts. It allows scripts from the site itself and Google's sign-in script, connections to the site, Supabase and Google sign-in, and Google's button frame. Checked in the browser: an injected inline script, a script from another site and sending data to another site were all blocked, while the app, Google's script and Google's button kept working. Styles allow 'unsafe-inline' (needed for the bars and Google's button; styles cannot run code). Logging in with Google and with email on the live site works with the CSP (checked by the owner, 2026-09-28).
3. **No limit on how many rows a member creates** (characters, items). This is acceptable for a group of friends; a limit would add complexity. **Accepted** (owner, 2026-09-27): check the size of the database now and then in Supabase.
4. **Clickjacking protection** (`frame-ancestors`, `X-Frame-Options`) needs HTTP headers, which GitHub Pages cannot send. The risk is low, because every important action asks for confirmation. **Accepted** (owner, 2026-09-27).

#### Step 1: Preparation (owner, with the agent)
1. Make a campaign **"Stress test"**, so real campaigns stay clean. Delete it afterwards.
2. Start the backup workflow in the private repository by hand (Actions → Run workflow), so there is a fresh backup from just before the test.
3. **Restore test:** the agent explains how to load that backup into a throwaway database, to prove it can be restored. A backup that was never restored is not yet a backup.
4. The owner makes a **test player account** with a second email address through an invite link. The agent uses it in the browser pane for the security test in step 3.
5. Invite 3–5 friends into "Stress test", on as many kinds of device as possible: Android + Chrome, iPhone + Safari, a laptop, one very small phone. At least one person uses Google login and one email login.

#### Step 2: Accounts and settings check (owner, with the agent's step-by-step help)
These are the locks outside the code. Most real break-ins happen here, not in the app.
1. **Two-factor authentication (2FA)** on every account that controls the app: the owner's Google account (it is the DM!), GitHub, Supabase, Resend, Strato and Google Cloud. Whoever gets into the DM's account can see and change everything.
2. **GitHub, both repositories:** turn on *secret scanning*, *push protection* and *Dependabot alerts* (free for public repositories). Check that `theros-backups` is **private** and that only the owner has access.
3. **Supabase dashboard:**
   - Run *Advisors → Security Advisor*. It must show no errors.
   - Under *Authentication*: Confirm email on; minimum password length 8; the redirect URLs contain only `https://dnd.yannickmul.nl` and the local address; anonymous sign-ins off; the sign-up hook on.
   - Check *leaked password protection* (it may only be on paid plans; check the current plans).
4. **Google Cloud OAuth client:** allowed origins only `https://dnd.yannickmul.nl` and the local address.
5. **Invite links:** revoke every link once everyone has joined (Players screen).
6. **Supabase organisation:** only the owner is a member.

#### Step 3: Security test by the agent
1. **Code review:** a full security review of the repository (Claude Code's `/security-review`), and reading every RLS policy and database function again against 3.3.
2. **Attack from a logged-in player account.** The agent uses the test player account in the browser pane and calls the database directly (around the website, as an attacker would), trying for example to:
   - read DM session notes, hidden quests, hidden objectives and rewards, other players' private notes, coins and items, invite codes
   - change another player's character, their own piety score, a god, a quest's status, their own `owner_id` or campaign
   - add themselves to another campaign, create an invite, delete something directly instead of through a function
   - read other campaigns' characters, or other users' email addresses
   Everything must be refused. Anything that gets through is fixed first and gets its own case in the permission test.
3. **Logged out:** the same without logging in. Nothing may be readable.
4. **Script injection:** put `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>` and `[click](javascript:alert(1))` in every text field (names, notes, backstory, items, quests). No pop-up may appear anywhere, for the DM or for players.
5. **Extra automatic check:** a permission-test case that fails if any table ever lacks row-level security, so a future table cannot forget it.
6. **Dependencies:** `npm audit` and the Dependabot list, with no known serious problems left.

#### Step 4: Group test (one session, everyone together, about an hour)
Everyone uses the "Stress test" campaign. The full list for players is in **"Phase 4 checklist for players"** below. The main areas:
- **Login and joining:** Google, email sign-up through an invite, wrong password, forgot password, the confirmation mail opened on another device, an old or revoked invite link, links opened from WhatsApp and Telegram.
- **Saving (priority 1):** the saving tests from Phase 3 step 5 (closing the tab straight after typing, flight mode, locking the phone, the same character on two devices, the conflict warning, tapping fast), also on the newer text fields (backstory, private notes, quest description) and with very long texts.
- **Strange input:** empty names, spaces only, very long names, emoji, other alphabets, very large numbers, weights with a comma or a dot.
- **Navigation:** back, refresh on every screen, a shared link to a character, links to things you may not see or that were deleted, the app from the home screen.
- **Phones:** a small screen, landscape, a larger text size in the phone settings, the keyboard covering fields, notches.
- **Privacy in practice:** players try to find anything they should not see (DM sessions, hidden quests, someone else's private notes, coins or inventory).
- **Quest Journal:** a hidden quest is invisible, the next objective appears once the DM ticks off the current one, hidden rewards show only "+ a hidden reward".
- **Accounts:** the DM removes a player, a player deletes their account, rejoining with a new invite.

The DM, meanwhile, tests the DM-only parts on a second device: sessions, attendance, Players, invites, piety scores, gods, quests.

**Reporting bugs:** one message per problem in the group chat with: what you did, what you expected, what happened, your phone and browser, the time, and a screenshot. **Never send passwords or login links.**

#### Step 5: Speed and installing
1. Lighthouse (mobile) in Chrome: performance, accessibility and best practices. *If Phase 9 (1.11) is done by then, this is a retest against its recorded numbers.*
2. Everyone adds the app to their home screen, and checks that the "New version" message appears after an update.

#### Step 6: Fix round and retest
1. The agent sorts the reports by the priorities in section 2 and fixes them one by one, with a test where possible. Security and lost-text bugs first.
2. What went wrong is retested, and the permission test is run again.
3. The owner deletes the "Stress test" campaign and revokes the invites.
4. What was learned goes into this section under *As built*.

**Stop here. Version 1 is complete** once Phase 4 is done. Work continues only from the owner's roadmap.

#### Phase 4 checklist for players
*(Short enough to send in a chat, as plain text without checkboxes or emoji. The script-injection tests are left to the agent, step 3.)*

**Login and joining**
- Join through the invite link: once with Google, once with email and password
- Log in with a wrong password; use "Forgot password?"
- Open the confirmation mail on another device than the one you signed up on
- Try an old or revoked invite link
- Open the link from WhatsApp and from Telegram
- Log out and log in as someone else on the same phone: none of the first person's changes may appear

**Saving (most important)**
- Type in a field and close the app within 1 second; reopen: the text must be there
- Flight mode on, change something ("Not saved yet"), flight mode off: it is sent
- Lock your phone or switch apps while typing
- Open the same character on two devices and change both: a warning must appear
- Tap − / + and Damage very fast, then refresh: is the number right?
- Paste a very long text (a few pages) into your backstory

**Strange input**
- Names that are empty, only spaces, 300 characters long, emoji, other alphabets (Ελληνικά)
- Very large numbers, 0, and a weight with a comma (0,5) and a dot (0.5)

**Navigation**
- Refresh on every screen; use your phone's back button everywhere
- Share a link to your character and have someone open it
- Open a link to something that was deleted
- Use the app from your home screen

**Privacy: try to see what you are not allowed to**
- Someone else's private notes, coins or inventory
- The DM's sessions (type `/sessions` after the campaign address)
- Hidden quests, the next objectives, hidden rewards
- Change someone else's character, or your own piety score

**Phone**
- A small screen, landscape, and a larger text size in your phone settings
- Does the keyboard cover the field you are typing in?

**At the table (new in 0.10)**
- Switch a few conditions on and off, and set exhaustion; refresh: are they still there?
- Set your class (or classes) and check the hit die; take damage, then a Short rest with a real die roll
- Take a Long rest: HP full, hit dice back, exhaustion 1 lower
- Try to change conditions or rest someone else's character

**NPCs and links (new in 0.11)**
- Open World, then NPCs; add an NPC your party met, and give it a role and a place
- Edit an NPC someone else made; edit the same NPC on two devices at once: a warning must appear
- Type @ in your backstory and link a character, a god and an NPC; tap Preview, then tap the links
- Try to find NPCs the DM has not revealed, or an NPC's DM secrets and stats

**Report each problem** in the chat: what you did, what you expected, what happened, your phone and browser, the time, and a screenshot. Never send passwords.

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

### Phase 4.7: Email and password login (section 1.7)
1. Migration: the *Before User Created* hook function (email sign-ups need a valid invite code; Google sign-ups pass), switched on in `supabase/config.toml` for the tests, with test cases (sign-up without a code, with a revoked or expired code, and with a valid code; the display name comes from the form).
2. Invite page: Create an account (email, display name, password twice, checks), and the confirmation link that joins the campaign.
3. Login page: email and password, Forgot password, and `/reset-password`.
4. Owner setup with step-by-step instructions: Resend account and DNS records at Strato, Supabase SMTP settings, Email provider with Confirm email, minimum password length 8, the two email templates, and switching the hook on. Then test the whole flow with a non-Google address.

### Phase 5: Session notes (section 1.4)
1. Migration: the `sessions` table with RLS (DM only), the unique-number rule, and new cases in the permission test.
2. Sessions list and **New session** (starting number for the first session, highest + 1 after that), plus the **Create Session** and **Sessions** buttons on the dashboard for the DM only (1.5).
3. Note taker: title, played-on date, notes, autosave via the shared save hook, the **…** menu (Rename, Change number, Delete), and auto-delete of empty sessions on leave.
4. Formatting: Edit / Preview toggle with markdown.
5. Attendance checkboxes (with its migration and permission tests).
6. "Last session: #n" on the dashboard.

One step per commit. **Do not add anything that is not in section 1.4.**

### Phase 6: Player features (section 1.8)
1. Migration: `characters.backstory`, `character_private` (created with each character, existing ones backfilled) and `inventory_items`, with RLS, `delete_item`, updates to `delete_character`, and new cases in the permission test. Pushed alone first; the owner runs `db push`.
2. Backstory and Private notes on the character sheet (markdown, Edit / Preview, autosave).
3. Coins row with Add / Spend / Set.
4. Inventory list, Add item, the item editor, and Delete item.
5. Totals: carried weight against capacity, and attunement (a unit-tested calculation in `src/lib`). Version `0.6.0-alpha`.

One step per commit. **Do not add anything that is not in section 1.8.**

### Phase 7: Quest Journal (section 1.9)
1. Migration: `quests`, `quest_objectives`, `quest_rewards` with RLS, `private.objective_visible`, `hidden_reward_counts`, the never-hide-again rule, and new cases in the permission test. Pushed alone first; the owner runs `db push`.
2. Quest Journal button on the dashboard (below Characters), the quest list grouped by status, and New quest for the DM.
3. Quest page: title, kind, giver, location, description (markdown, autosave), status, and the **…** menu (Reveal, Delete).
4. Objectives: main steps revealed one at a time, optional ones below, tick off, add, edit, move, delete.
5. Rewards: visible and hidden, with the "+ a hidden reward" line for players. Version `0.7.0-alpha`.

One step per commit. **Do not add anything that is not in section 1.9.**

### Phase 8: Automatic character sheet (section 1.10)
1. **Migration**, with its new permission-test cases (section 4):
   - the new columns on `characters` and `inventory_items`, with their checks
   - `class_level` converted into `classes`, and `attunement_required` backfilled
   - `character_effects` with its policies, trigger and backfill
   
   Steps 2 and 3 are committed locally *before* this is pushed, so the new class list goes live right after the owner's `db push`. That keeps the time short in which the old "Class & level" field is still in use. Pushed alone first; the owner runs `db push` when nobody has a sheet open.
2. `src/lib/sheet.ts` with `tests/sheet.test.ts`: proficiency bonus, final scores, totals with their breakdown, the skill and armor tables, AC, which items count.
3. Class list, race and background on the sheet and in the Characters list. The website stops reading `class_level`.
4. Ability tiles with final scores and the proficiency bonus, then saving throws and skills with their tick boxes. Initiative and carrying capacity use the final scores.
5. Long-press dialog with custom modifiers, and the breakdown lines.
6. Death saves and inspiration.
7. Item editor: Requires attunement (the Attuned box only then), Armor and Bonuses. The sheet reads `character_effects`, for everyone. The SRD credit line goes on the terms page.
8. AC and Passive Perception calculated, with the Unarmored AC choice in the AC dialog; the Characters list calculates AC too. The website stops reading `ac` and `passive_perception`. **Before this goes live**, the owner tells the players:
   - their AC and Passive Perception will be recalculated
   - they should add and equip their armor, and set their class levels
   - a Barbarian or Monk picks their Unarmored AC
9. **After step 8 has been live for a few days**, the last migration removes `class_level`, `ac` and `passive_perception`. This is the reverse of the usual order: the website stopped using them first, so only phones still on a cached old version can still ask for them, and they reload on "New version".
   - The permission tests that use those columns change in the same commit.
   - Version `0.8.0-alpha`; update 3.9 and the table and test counts in Phase 4.
   - Fill in "As built" in 1.10.

One step per commit. **Do not add anything that is not in section 1.10.**

### Phase 9: Speed, data and battery (section 1.11) *(built 2026-10-07)*
1. **Baseline.** Lighthouse (mobile) on the live login page and, with the owner logged in in the browser pane, the dashboard and a character sheet. The owner reads Supabase → Usage (egress this month, database size). Record the numbers in 1.11. No code changes.
2. **Loading (A1–A3):** code split per screen with a shared file for React, the router and Supabase; the dark background and app name in `index.html`; the startup requests together. Check every screen in the browser pane, including a refresh on each and the "New version" message.
3. **Migration: `sessions.notes_start`**, with its permission-test case. Pushed alone first; the owner runs `db push`.
4. **Less data (B4–B7):** the Sessions list reads `notes_start`; gods with only the columns each screen needs; the inventory read once; saves return only what changed (after the trigger check); no reload on a return to the tab within 30 seconds (owner decision 1).
5. **Typing (C8):** measure, and add `useMemo` for the sheet. The local backup is not changed (owner decision 3).
6. **Keep it this way (D9–D10):** the size check in the Deploy workflow and the monthly Usage routine in the README.
7. **Retest:** Lighthouse and Usage again, numbers next to the baseline in 1.11 under *As built*. Version `0.9.0-alpha`; update 3.9.

One step per commit. **Do not add anything that is not in section 1.11.**

### Phase 10: At the table (section 1.12)
1. **Migration**, with its new permission-test cases (section 4). Pushed alone first; the owner runs `db push`.
2. **Rules** in `src/lib` with unit tests: hit die per class name, dice totals per size, short rest healing, what a long rest gives back, Dead at exhaustion 6.
3. **Conditions** on the sheet: the row, the dialog, and the Dead tag at exhaustion 6.
4. **Hit dice:** the Hit die choice in the class dialog, the hit dice line, and Short rest.
5. **Long rest** on the sheet, through `long_rest`.
6. **Party overview:** the Party button on the DM's dashboard, `/c/:campaignId/party`, HP from the overview, and Long rest for the party.
7. **Finish:** check every step in the browser pane as DM; add Phase 10 lines to the Phase 4 checklist for players; version `0.10.0-alpha`; update 3.9; fill in *As built* in 1.12.

One step per commit; each push that changes the website raises the last version number (3.9). **Do not add anything that is not in section 1.12.**

### Phase 11: NPCs and links (section 1.13)
1. **Migration**, with its new permission-test cases (section 4): `npcs`, `npc_reveals`, `npc_secrets`, `private.npc_visible`, `create_npc`, `delete_npc`, the guard trigger and the change to `delete_my_account`. Pushed alone first; the owner runs `db push`.
2. **Rules** in `src/lib` with unit tests: the link format (write and read), the `@` matches, the challenge-rating list, and the NPC list (sort, filter, Hidden group).
3. **World and the NPC list:** the World button on the dashboard (below Gods), `/world`, `/world/npcs` with the filter box, the Hidden group for the DM, and **+** New NPC.
4. **NPC page:** role, status, location, faction, the description, and the **…** menu (Rename, Reveal, Delete).
5. **DM secrets and stats** on the NPC page, for the DM only, with Add stats and Remove stats.
6. **Links:** the `@` list in Edit and tappable links in Preview, in every `MarkdownNotes` box.
7. **Finish:** check every step in the browser pane as DM, in the Stress test campaign. NPCs are world content, so test NPCs are revealed only to Stress test and deleted afterwards. Add Phase 11 lines to the Phase 4 checklist for players if the group test has not happened yet. Version `0.11.0-alpha`; update 3.9; fill in *As built* in 1.13.

*All seven steps built and checked on 2026-10-07.*

One step per commit; each push that changes the website raises the last version number (3.9). **Do not add anything that is not in section 1.13.**

### Phase 12: The rest of World (section 1.14)
1. **Migration**, with its new permission-test cases (section 4): `world_entries`, `world_entry_reveals`, `world_entry_secrets`, `create_world_entry`, `delete_world_entry`, the guard and part-of triggers, and `npcs.place_id` and `faction_id`. Pushed alone first; the owner runs `db push`.
2. **Rules** in `src/lib` with unit tests: kinds, place and lore types, part of (no loops, chain, Inside list), the type filter, the new link kinds.
3. **One list and one page for all five kinds**, with the World buttons, the filter box, type chips, the Hidden group, **+**, Reveal and Delete. The NPC screens stay as they are.
4. **Places:** type, Part of (a pick list with a filter box, without the place itself and what is inside it), and the Inside list.
5. **DM secrets** for every kind, and the **stat block** for creatures (shared with the NPC page).
6. **NPC Location and Faction** as picks with Create, the links on the NPC page, and People here and Members on place and faction pages.
7. **Links:** the new kinds in the `@` list and in Preview.
8. **Finish:** check every step in the browser pane as DM in the Stress test campaign (test entries revealed only to Stress test and deleted afterwards); Phase 12 lines in the Phase 4 checklist if the group test has not happened yet; version `0.12.0-alpha`; update 3.9; fill in *As built* in 1.14.

One step per commit; each push that changes the website raises the last version number (3.9). **Do not add anything that is not in section 1.14.**

---

## 6. Roadmap input (unordered; the owner decides what and when)

These are candidates, not commitments. Each one lists what version 1 already provides for it.

| Candidate | Already prepared in v1 |
|---|---|
| **Inventory**, private to the owner and DM | The `owner` audience |
| **Items with secret rules** (e.g. Longsword of Vengeance) | The separate-secret-row pattern in 3.3 |
| **Lore database** with linked entries, written together | The world level, and Postgres suits linked data. Writing in the same document **at the same time** would need an extra technology (for example Yjs) and is a larger project. Taking turns editing works with the v1 conflict guard. |
| **Live combat** with shared turn order *(Phase 13, 1.15)* | Add Supabase Realtime together with this feature |
| **Image uploads** | `image_path` columns. Compress on the phone before upload. |
| **Lottie animations** *(owner plan, 2026-09-24; the owner makes the files later, e.g. After Effects + Bodymovin)*: a splash screen and animated dashboard icons/buttons | The Phase 4.5 dashboard (1.5). Agreed behaviour: the splash shows on a cold start only, covers loading, fades out as soon as the app is ready (at most about 1.5 s), can be tapped to skip, and **never delays the app**. Use the light SVG build of `lottie-web`, loaded lazily; pause off screen. Add an **Animations on/off** setting (per device, off by default when the phone asks for reduced motion) together with it. |
| **Native phone app** with a local copy that checks the server for updates when online | The version numbers and database timestamps make "what changed since my copy" possible. Note the hidden-content problem from 3.4: the app must remove local copies of anything the server no longer returns. |
| **More piety features**: history of changes, reusable custom sources, automatic calculation, the boons themselves at each milestone (v1 only shows which milestones are reached) | `piety_tracks` already separates god and custom sources |
| **Other Unity app features** | From the specification (section 1.3) |
| **Player features: character notes and inventory** *(moved into Phase 6, see 1.8)* | |
| **Session notes: character/god links** *(owner interest, 2026-09-24; in Phase 11 as `@` links in every notes box, 1.13)*: mention a character or god in the notes as a tappable link | The `sessions` table and markdown (1.4). Links can be stored as text markers, so no new table is needed. |
| **Initiative tracker** *(owner interest; Phase 13, 1.15)*: turn order for combat that players see live on their phones | Needs Supabase Realtime, so this is the same project as Live combat |
| **NPC / lore notes** *(owner interest; NPCs are Phase 11, 1.13)*: NPCs, places and factions, each entry either DM only or shared with players, with secret parts in their own `dm` row | The world level, the `dm` / `members` audiences, and the separate-secret-row pattern in 3.3 |
| **More of the World button** *(owner plan, 2026-10-07; Phase 12, 1.14)*: places, towns, cities, buildings and factions as their own buttons under World, next to NPCs; the NPC's Location and Faction lines can then become links | The World button and the NPC library from Phase 11 (1.13): same world level, per-campaign reveals and shared wiki |
| **NPC extras** *(left out of Phase 11, 2026-10-07)*: a "Mentioned in" list of back-links, a history of wiki edits, pictures, an attitude toward the party (the 7-step bar), links in the god notes and the quest giver and location fields | The `@` link format stores IDs, so back-links can be found by searching the notes |
| **Tighter invites** *(offered 2026-09-25, not wanted for now)*: single-use links, or a maximum number of uses | `campaign_invites`; add a `max_uses` / used-by record |
| **DM approves new players** *(offered 2026-09-25, not wanted for now)*: someone opening an invite waits until the DM taps Let in | `campaign_members`; add a pending state |
| **Session quiz** *(owner idea, very future)*: a Kahoot-style quiz where players answer questions about the previous session, maybe with AI-generated questions | Needs Realtime for a live quiz. AI questions would read the DM-only notes, so the DM must approve every question before players see it (priority 2), and an AI API has a running cost (priority 3). |

### 6.1 Character builder and rules engine *(owner idea, 2026-09-24; roadmap, built in parts)*

Build characters from 5e races, classes, subclasses, feats, spells and items, with automatic proficiency, expertise and modifiers (for example Bracers of Defense: AC +2; Belt of Giant Strength: STR 21). This is large, so it is split into parts that are each useful on their own. **Nothing here is in scope until the owner says to start a part.**

**Decisions (owner, 2026-09-24):**
- **Ruleset: 2014 (5e classic)**, matching *Mythic Odysseys of Theros*. The free content base is **SRD 5.1**.
- **Content: the app ships only the SRD** (CC-BY-4.0, with the required attribution). Everything else (other subclasses, Xanathar's, Tasha's, Theros races, subclasses and supernatural gifts) is copyrighted and **must never be in the public repository**. The DM enters it through an in-app editor. It is stored in the database as world content (audience `members`, or `dm` while hidden).
- **Automatic, with overrides.** Every total is calculated and shows its sources (for example `AC 17 = 10 + DEX 3 + Bracers 2 + Shield 2`). The owner of the character and the DM can override any total by hand. Existing hand-entered characters keep working. *Changed 2026-09-28 (owner, Phase 8, 1.10): no total is typed in by hand. AC comes from armor or an Unarmored AC choice, and everything else is adjusted with custom modifiers. Existing AC and Passive Perception are recalculated as soon as Phase 8 goes live.*
- **Players build and level their own characters** and add custom modifiers to them. The DM can edit everything.

**Core design: base values plus effects.** A character stores base values and choices. Race, class features, feats, items and custom modifiers each carry **effects** stored as data, for example:
- `{target: "ac", op: "add", value: 2, when: "no armor, no shield"}`
- `{target: "str", op: "set_min", value: 21}`
- `{target: "skill.stealth", op: "expertise"}`

A pure function calculates the sheet from base values, effects and overrides. Test it well with unit tests: it is the part most likely to be subtly wrong.

**Parts, in suggested order:**
1. **Automatic sheet.** Proficiency bonus from level, saving throws, the 18 skills with proficiency and expertise, and hand-entered custom modifiers. No content library needed. *Written out as Phase 8 (section 1.10).*
2. **Items with effects.** Builds on the inventory (next after Phase 5). Equip and attune; effects then apply. **Design the inventory table with this in mind.** *Phase 8 takes a first slice: an armor type and up to 5 add-only bonuses per item, applied when equipped (and attuned, when required). Conditions, "set" effects and items from a library stay here.*
3. **Content library.** The SRD 5.1 imported (for example from the 5e-srd-api or Open5e data), plus the DM's editor for races, classes, subclasses, feats, items and spells. *Phase 8 already ships the SRD armor table (12 armors and the shield) as fixed data.*
4. **Character builder.** Race, class and subclass choices level by level, including multiclassing. This replaces the free-text `classLevel` with structured class levels. *Phase 8 already has the class list (a name and a level per entry, at most 20 levels in total) and the Unarmored AC choice; this part makes the entries structured, with subclasses and class features.*
5. **Spells.** Spell list, known and prepared spells, and slots per level.
6. **Theros.** Supernatural gifts, and piety boons that apply at milestones (links to the milestone bar in 1.1).

### 6.2 Quest Journal *(owner idea, 2026-09-24; the first version is Phase 7, section 1.9)*

Built in Phase 7 without voting and without session links. Still on the roadmap:
- **Voting or another way for the group to choose** *(the owner is still thinking about how; 2026-09-27)*. The 2026-09-24 idea was one vote per player per Inactive quest, visible to everyone, with the DM deciding. It would need a `quest_votes` table (`quest_id`, `user_id`, unique per pair; players insert and delete only their own).
- **Session links** ("given in #53", "completed in #57"), stored as numbers rather than links to `sessions` rows, because sessions are DM-only (1.4).
- Secret DM notes per quest (the separate-secret-row pattern in 3.3), links to lore entries (6, NPC / lore notes), rewards that become inventory items, and quest pictures.

---

## 7. Costs
Expected cost is 0 EUR beyond the domain already owned, as long as the free-plan limits hold. Check current Supabase and GitHub limits before starting.

## 8. Open items

**Still to check:**
1. Supabase keep-alive. *Checked 2026-09-24:* the [Terms of Service](https://supabase.com/terms) say nothing about free-plan pausing or keep-alive requests, and the [pausing docs](https://supabase.com/docs/guides/platform/free-project-pausing) say only that a project is paused without "sufficient user database activity over the past week" ("a few user requests to the database each day" is typically enough). A scheduled ping is not forbidden, but not explicitly allowed either, and Supabase could change how it counts activity. Plan: build the ping in Phase 2 as a real, tiny read query (not just a health check), run it daily, and keep the manual restore in the dashboard as the fallback. *Built 2026-09-24:* see the backups row in section 3.2.

2. **Owner to-dos outside the code** (2026-09-25):
   - Google Auth Platform → Branding: app name `DnD Companion App`, terms link `https://dnd.yannickmul.nl/terms`, and brand verification (Search Console DNS at Strato first). Google may take a few business days, and may question "DnD" as a trademark (D&D belongs to Wizards of the Coast); a name without it passes more easily.
   - Supabase → Authentication → Emails: sender name `DnD Companion App`, and the new name in the Confirm signup and Reset password templates (README has the texts).
   - Redo the WhatsApp login test (3.5) on Android and iPhone with Google's button and with email login.
   - Phones that installed the app: on iPhone, remove and re-add it to pick up the new name.



**Resolved:**
- **Phase 11: NPCs and links** (owner decisions, 2026-10-07; see section 1.13): Phase 11 builds only NPCs, behind a new World button on the dashboard (places, towns, buildings and factions come there later); Gods stay on the dashboard; NPCs are one shared world library, revealed per campaign and never hidden again; a shared wiki where players create NPCs (revealed to their campaign at once) and edit every NPC they can see, with one shared text across campaigns; an NPC has a name, role, status, location, faction and description; DM secrets and optional stats (AC, HP, speed, the six abilities, CR, actions) are DM only, always; links are written by typing `@` and picking. Default chosen by the agent: only the DM deletes NPCs.
- **Phase 12: the rest of World** (owner decisions, 2026-10-07; see section 1.14): Places, Factions, Lore, Creatures and Items under World, all working exactly like NPCs; one Places button with a type, and places that are part of a bigger place; creatures get the NPC stat block, items are famous artifacts; an NPC's Location and Faction become picks with a field to create a new one; everything can be linked with `@`. Built before live combat, which becomes Phase 13 (1.15). Default chosen by the agent: lore types History, Legend, Prophecy, Event, Other.
- **Next phases** (owner, 2026-10-07): Phase 10 at the table (1.12), then Phase 11 lore and links and Phase 12 live combat (1.13). Phase 4 steps 1–3 this week, the group test next week, including Phase 10. Phase 10 decisions: conditions switched by the player and the DM, without rules text; the player types their hit die roll; the owner and the DM rest a character, and the DM also the whole party; the party overview is DM only.
- **Version number on every website change** (owner, 2026-10-07; see 3.9): every push that changes the website raises the last number, a finished phase the middle one; the Deploy workflow refuses a website change without a new version.
- **Phase 9: speed, data and battery** (owner decisions, 2026-09-30; see section 1.11): no reload on a return to the tab within 30 seconds; keep the full Supabase client; keep the local typing backup on every key press.
- **Automatic character sheet (Phase 8)** (owner decisions, 2026-09-28; see section 1.10):
  - class as a list of name and level entries with an Add class button, no separate level field, at most 20 levels in total
  - race and background as free text that changes no numbers
  - custom modifiers by long-press on abilities, speed, saves, skills, AC and Passive Perception
  - equipped items apply their bonuses automatically (up to 5 per item, including "all saving throws"), and need attunement only when the item requires it
  - AC and Passive Perception always calculated and never typed in, by nobody, not even the DM; AC comes from armor picked from the SRD list, or from an Unarmored AC choice
  - existing AC and Passive Perception recalculated at once
  - other players see item bonuses as "Item +1", without the item's name
  - proficiency and expertise boxes (expertise for skills only), death save circles and an inspiration toggle
  - death saves shown only at 0 HP and reset by healing; the third success gives 1 HP, the third failure crosses out the name with a Dead tag (owner, 2026-09-30)
  - players and the DM both edit
  - left out for now: an edit icon next to every number, and a Reset button for death saves (healing resets them)
- **Security gaps found while planning Phase 4:** text length limits and a Content Security Policy are added; no row-count limits and no clickjacking headers are accepted (owner, 2026-09-27). See section 5, Phase 4.
- **Quest Journal (Phase 7):** visible to everyone, button below Characters; Main, Side and Character quests (Character quests visible to everyone); hidden until revealed, never hidden again; statuses Inactive, Active, Completed, Failed; objectives revealed one step at a time with optional ones below; each reward visible or hidden, with a "+ a hidden reward" line; no voting and no session links for now (owner decisions, 2026-09-27). See section 1.9.
- **Player features (Phase 6):** on the character sheet; a Backstory everyone in the campaign reads plus Private notes for the player and DM; items with name, quantity, weight, description, Equipped and Attuned, and a carried-weight total; a coin row without electrum (owner decisions, 2026-09-25). See section 1.8.
- **App name:** the web app is **DnD Companion App** (owner, 2026-09-25); the Unity app keeps its name.
- **Footer, terms page, version number:** see 3.9 (owner, 2026-09-25).
- **Google sign-ups get no verification mail**, and there is no DM approval step (owner, 2026-09-25). See 1.7.
- **Email and password login (Phase 4.7):** next to Google, sign-up only through an invite link, verification mail, forgot password; the display name is the "username"; mail through Resend (owner decisions, 2026-09-25). See section 1.7.
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
- **Login:** Google, or email and password through an invite link (changed 2026-09-25, section 1.7). Contact is WhatsApp.
- **Joining:** by a DM-shared invite link.
- **World:** Theros is the one world. Campaigns belong to it, and gods are world content.
- **Domain:** Strato allows the `CNAME` record for `dnd.yannickmul.nl`, which currently points nowhere.
