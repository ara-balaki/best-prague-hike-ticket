# generate-stops

Regenerate `public/stops.json` from the live PID GTFS feed.

The script lives next to this file at `.claude/commands/generate-stops.js`.

## Run

Full pipeline (download + process):

```bash
node .claude/commands/generate-stops.js
```

Skip the 44 MB download if you already have the data (e.g. re-running after a code change):

```bash
node .claude/commands/generate-stops.js --no-download --tmp-dir /tmp/PID_GTFS_gen
```

## What the script does

1. Downloads `https://data.pid.cz/PID_GTFS.zip` to a temp directory.
2. Extracts only the three files it needs: `stops.txt`, `routes.txt`, `route_stops.txt`.
3. Builds a mapping of stop name → zones per transport mode using `route_stops.txt` (a PID extension that gives a direct stop→route link, avoiding the much larger `stop_times.txt`).
4. Filters out stops whose only zone is `"-"` — these are real stops at the edge of PID's service area that are not part of any fare zone and cannot be used for ticket calculation.
5. Writes `public/stops.json`.

## Output format

```json
{
  "_meta": {
    "source": "https://data.pid.cz/PID_GTFS.zip",
    "license": "CC-BY 4.0",
    "attribution": "Data © PID/ROPID",
    "generatedAt": "2026-05-01T10:30:00Z",
    "stopCount": 7453
  },
  "stops": [
    {
      "name": "Bečváry",
      "searchKey": "becvary",
      "zones": {
        "bus": ["5"],
        "train": ["5"]
      }
    }
  ]
}
```

- `zones` is keyed by transport mode. Possible modes: `bus`, `train`, `tram`, `metro`, `ferry`, `trolleybus`.
- `searchKey` is the stop name lowercased with all Czech diacritics stripped, used for fuzzy search.
- A border zone like `"3,4"` means the stop sits on the boundary between zones 3 and 4.
- The UI exposes only `bus` and `train` modes; other modes are stored in the data for completeness.

## GTFS route_type → mode mapping

| GTFS route_type | Mode |
|---|---|
| 0, 900–999 | tram |
| 1, 400–499 | metro |
| 2, 100–199 | train |
| 3, 700–799 | bus |
| 4 | ferry |
| 11, 800–899 | trolleybus |
