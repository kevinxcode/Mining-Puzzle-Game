# Mining Puzzle Game — Roadmap

_Last updated: 28 September 2026_

Effort: **S** = days, **M** = 1–2 weeks, **L** = 3+ weeks (small team).

## Done

| Area | What shipped |
|---|---|
| Platform | Expo SDK 57 (RN 0.86, React 19.2), dev client, EAS profiles, release signing via config plugin (`key/`), package `com.fadedind.miningflow.game` |
| Core game | 60-level campaign in 6 regions; trucks/excavators/routes/fuel/queues/traffic; events (rain, closures, breakdowns, fuel outage, target increase); 3-star scoring; rewards paid once per star tier |
| Progression | XP, coins, upgrades with visible effects, equipment unlocks by campaign progress (readme §20) |
| Modes | Daily Challenge (streaks), Weekly Challenge, Endless Shift; unlocked truck classes selectable as mode fleet |
| Map & feel | Pinch-zoom / pan / double-tap camera, drag-to-assign trucks, smooth truck motion, excavator arm swing, modern terrain art |
| Help | 3 hints per mission with one-tap APPLY; undo last 5 moves |
| Sharing | Wordle-style result card via the system share sheet |
| Training | Site Induction: 6 modules (cards + quiz + practice level), glossary, PDF certificate |
| Store readiness | App icon, adaptive icon, splash, in-app privacy policy + `docs/privacy-policy.txt` for Google Sites |
| Quality | 125 jest tests (engine, balance of all 60 levels, modes, save migration v3, hints, undo, camera) |

## Next — before Play Store release

| # | Item | Effort | Notes |
|---|---|---|---|
| 1 | Fill contact details in privacy policy, publish on Google Sites | S | Needed for the Play Console listing |
| 2 | First EAS production build (`eas build -p android --profile production`) + internal testing track | S | Requires `eas login`; enrol in Play App Signing |
| 3 | ~~Store listing: screenshots, feature graphic, short/long description~~ | S | **Done** — `docs/store/` (listing.md, icon-512, feature graphic, 6 screenshots from a release build) |
| 4 | Crash reporting (e.g. Sentry) | S | Needs a privacy-policy update |
| 5 | ~~Status bar icons on home screen~~ | S | **Done** — verified light on the home art |

## Planned — game features

| # | Feature | Effort | Why |
|---|---|---|---|
| 6 | Leaderboards (global + crew/site code) with cloud save | M | Social play and competition between crews; **needs a backend decision** (Firebase / Supabase / company server) |
| 7 | Site HQ: build facilities between levels (workshop, canteen, wash bay) for small passive bonuses | M–L | Long-term meta and a use for coins beyond upgrades |
| 8 | Ghost replay of your best run | M | Cheap because the sim is deterministic; good for learning |
| 9 | Cosmetic truck liveries / site themes | M | Monetisation without pay-to-win |
| 10 | Optional rewarded ad (free retry / double coins) — consumer build only | M | Industry-standard retention lever; never in company builds |
| 11 | 2.5D / isometric map view | L | Closer to the Clash of Clans look the user asked about |
| 12 | Level editor / user levels, season pass | L | Deferred until there is a player base |

## Planned — company training (B2B)

| # | Feature | Effort | Why |
|---|---|---|---|
| 13 | ~~Hazard-spotting mini-game~~ | M | **Done** — 3 scenes (loading area, haul road, refuelling bay), 12 hazards, results saved |
| 14 | ~~Pre-start inspection (P2H) checklist mini-game~~ | M | **Done** — 3 trucks × 8 items, OK/Defect + operate/tag-out decision, results saved |
| 15 | ~~Supervisor / HSE report export~~ | M | **Done** — CSV training report (Excel-ready) + certificate PDF now lists hazard spotting and P2H results |
| 16 | ~~Trainee identity + certificate expiry / retake~~ | M | **Done** — employee ID, site, company on certificate + CSV; 365-day validity, Renew induction |
| 17 | Content outside the app (modules/quizzes loaded from JSON) | M | Site-specific rules without an app release |
| 18 | White-label company build (branding, custom levels, no ads) | M | Main revenue path identified in market research |
| 19 | Bahasa Indonesia | M | Postponed by request; needed before a pilot at an Indonesian site |
| 20 | Pilot at one site with the HSE team | — | Measure completion, quiz scores, time-to-induct vs classroom |

## Decisions needed

- **Backend** for leaderboards / cloud save / HSE reports: Firebase, Supabase or company server?
- **Monetisation** for the consumer build: rewarded ads, cosmetics, or premium only?
- **Isometric map** (#11): worth the effort now or after launch?
