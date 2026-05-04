# ⛰️ Prague Hike Ticket Finder

Find the cheapest [PID](https://pid.cz/en/) day ticket for your hike to suburban stops around Prague.

## What it does

Enter your destination stop and group size — the app looks up the relevant zones and recommends the right PID day ticket for a round trip.

Three ticket types are covered:

| Group                       | Ticket                                            | Price        |
| --------------------------- | ------------------------------------------------- | ------------ |
| 1 adult                     | Regional Day Ticket (zones 1–13) or Whole Network | 168 / 288 Kč |
| 1 adult + up to 2 children  | Family Day Ticket                                 | 190 Kč       |
| 2 adults + up to 4 children | Family Day Ticket                                 | 370 Kč       |

Family tickets are valid **until 4:00 AM the following day**, not a rolling 24 hours.

## Data

Stop and zone data is sourced from the [PID GTFS feed](https://data.pid.cz/PID_GTFS.zip) (CC-BY 4.0, © PID/ROPID). Ticket prices are valid for 2026.

## Stack

- React 19 + TypeScript
- Vite + React Compiler
- Tailwind CSS v4
- Base UI (unstyled components)
- React Hook Form
- Fuse.js (fuzzy stop search)

## Development

```bash
npm install
npm run dev
```

```bash
npm test       # unit tests
npm run build  # production build
```
