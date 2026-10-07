# DnD Companion App (web)

Read ARCHITECTURE.md before doing any work. It is the plan and decision record for this project.

- Follow its decisions. To challenge one, explain the trade-off and ask first.
- Build only what sections 1.1 and 1.4–1.13 list. Everything else goes on the roadmap (section 6).
- Work phase by phase (section 5). Commit after each working step.
- When a decision changes, update ARCHITECTURE.md in the same commit.
- Raise the version in package.json (and package-lock.json) in every push that changes the website; a finished phase raises the middle number (ARCHITECTURE.md 3.9). The Deploy workflow refuses a website change without a new version.
- Never commit secrets: no Supabase service-role key, database password or data exports.

Current phase: none being built. Phases 4.5 to 10 are built (Phase 10: at the table, version 0.10.0-alpha). Phase 4 steps 1–3 run this week (the Stress test campaign already exists); its group test is next week (section 5). Phase 11 (NPCs and links, section 1.13) is written out and is next to build; Phase 12 (live combat, 1.14) follows.