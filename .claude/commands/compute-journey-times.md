# compute-journey-times

Augments `public/stops.json` with `journeyMinutes` — the shortest direct-trip
scheduled travel time from any Prague hub to each stop, using PID GTFS data.

A **single streaming pass** over `stop_times.txt` processes all hubs at once,
so adding more hubs has near-zero cost.

The script lives at `.claude/commands/compute-journey-times.js`.

## Run

After `generate-stops.js` (which downloads + extracts the GTFS feed):

```bash
# Default: 5 Prague railway hubs, reuses /tmp/PID_GTFS_gen if already there
node .claude/commands/compute-journey-times.js

# Skip re-download (data already in /tmp/PID_GTFS_gen)
node .claude/commands/compute-journey-times.js --no-download

# Custom hub set — --hub may repeat
node .claude/commands/compute-journey-times.js --no-download \
  --hub "Praha hl.n." \
  --hub "Praha-Smíchov" \
  --hub "Praha-Holešovice"
```

## Default hubs (12 total)

| Hub name (exact GTFS stop_name) | Coverage |
|---|---|
| `Praha hl.n.` | S1–S9, EC, IC (main railway station) |
| `Praha Masarykovo nádraží` | S1, S2, S3 |
| `Praha-Smíchov` | S7, S9, regional south |
| `Praha-Holešovice` | S4, S5, S8 |
| `Praha-Libeň` | S2, S9, north-east rail |
| `Černý Most` | Bus — north-east suburbs |
| `Roztyly` | Bus — south suburbs |
| `Letňany` | Bus — north suburbs |
| `Zličín` | Bus — west suburbs |
| `Smíchovské nádraží` | Bus — south-west suburbs |
| `Florenc` | Bus — central terminal, all directions |
| `Háje` | Bus — south-east suburbs |

To find additional hub names: `grep -i "keyword" /tmp/PID_GTFS_gen/extracted/stops.txt`

## What the script does

1. Parses `stops.txt` — maps `stop_id → name`, collects all `stop_id`s matching each hub.
2. Streams `stop_times.txt` once. For each trip:
   - finds the first occurrence of each hub in the stop sequence;
   - computes `arrival_time − hub.departure_time` in minutes to every later stop;
   - keeps the minimum across all trips and all hubs.
3. Reads `public/stops.json`, sets `journeyMinutes` on matched stops, writes back.
   Stops with no direct-trip connection get no field (re-runs clean up stale values).

## Output additions to stops.json

| Field | Type | Description |
|---|---|---|
| `stop.journeyMinutes` | `number?` | Min journey time in minutes from any hub |
| `_meta.journeyHubs` | `string[]` | Hub names used in this run |
| `_meta.journeyComputedAt` | `string` | ISO timestamp of the run |

## Limitations

- **Direct trips only.** Stops requiring a transfer get no journey time.
  Most suburban rail destinations have direct service; bus-heavy suburbs need
  additional hubs or full RAPTOR routing.
- **Scheduled times only.** Uses the static GTFS timetable, not real-time delays.
- **Minimum across hubs.** Records the fastest route from any hub — assumes the
  user can choose their departure point.
