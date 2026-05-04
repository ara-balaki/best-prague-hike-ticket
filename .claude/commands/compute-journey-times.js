#!/usr/bin/env node
/**
 * Augments public/stops.json with `journeyMinutes` — the shortest direct-trip
 * scheduled travel time from any of the configured Prague hubs to each stop,
 * derived from PID GTFS. A single streaming pass over stop_times.txt handles
 * all hubs simultaneously, so adding more hubs costs almost nothing.
 *
 * Direct trips only (no transfers). Stops not reachable on a direct trip from
 * any hub get no `journeyMinutes` field.
 *
 * Run AFTER generate-stops.js. Reuses the same /tmp directory by default.
 *
 * Usage:
 *   node .claude/commands/compute-journey-times.js
 *   node .claude/commands/compute-journey-times.js --no-download
 *   node .claude/commands/compute-journey-times.js --hub "Praha-Smíchov" --hub "Praha-Holešovice"
 *   node .claude/commands/compute-journey-times.js --tmp-dir /my/dir
 *
 * --hub may be repeated any number of times to override the default hub list.
 * With no --hub flags the default set of Prague transit hubs is used.
 */

import { execSync } from 'child_process'
import { createReadStream, readFileSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const GTFS_URL = 'https://data.pid.cz/PID_GTFS.zip'
const __dirname = dirname(fileURLToPath(import.meta.url))
const STOPS_JSON_PATH = join(__dirname, '../../public/stops.json')

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const noDownload = args.includes('--no-download')

const tmpDirIdx = args.indexOf('--tmp-dir')
const TMP_DIR = tmpDirIdx !== -1 ? args[tmpDirIdx + 1] : '/tmp/PID_GTFS_gen'
const EXTRACTED_DIR = `${TMP_DIR}/extracted`

// Collect all --hub values (flag may repeat).
const hubNames = []
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--hub' && args[i + 1]) hubNames.push(args[++i])
}

// Default: the main Prague railway / transit hubs that suburban lines pass through.
const DEFAULT_HUBS = [
  // Railway stations (S-lines + regional/IC/EC)
  'Praha hl.n.', // main station          (S1–S9, EC, IC)
  'Praha Masarykovo nádraží', // Masaryk station       (S1, S2, S3)
  'Praha-Smíchov', // Smíchov station       (S7, S9, regional south)
  'Praha-Holešovice', // Holešovice station    (S4, S5, S8)
  'Praha-Libeň', // Libeň station         (S2, S9, north-east)
  // Bus terminals (suburban buses to outer zones)
  'Černý Most', // north-east suburbs
  'Roztyly', // south suburbs
  'Letňany', // north suburbs
  'Zličín', // west suburbs
  'Smíchovské nádraží', // south-west suburbs
  'Florenc', // central bus terminal
  'Háje', // south-east suburbs
]

const HUB_NAMES = hubNames.length > 0 ? hubNames : DEFAULT_HUBS

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('')
      break
    }
    if (line[i] === '"') {
      i++
      let value = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"'
            i += 2
          } else {
            i++
            break
          }
        } else {
          value += line[i++]
        }
      }
      fields.push(value)
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) {
        fields.push(line.slice(i))
        break
      }
      fields.push(line.slice(i, end))
      i = end + 1
    }
  }
  return fields
}

async function readCSV(filePath, callback) {
  const rl = createInterface({
    input: createReadStream(filePath, 'utf-8'),
    crlfDelay: Infinity,
  })
  let headers = null
  for await (const line of rl) {
    if (!line.trim()) continue
    const fields = parseCSVLine(line)
    if (!headers) {
      headers = fields
      continue
    }
    callback(Object.fromEntries(headers.map((h, i) => [h, fields[i] ?? ''])))
  }
}

// "HH:MM:SS" → minutes from midnight (handles 24h+ overflow used by GTFS).
function parseGtfsTime(s) {
  if (!s) return NaN
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!noDownload) {
    console.log('Downloading PID_GTFS.zip...')
    execSync(`mkdir -p "${EXTRACTED_DIR}"`)
    execSync(
      `curl -L "${GTFS_URL}" -o "${TMP_DIR}/PID_GTFS.zip" --progress-bar`,
      { stdio: 'inherit' }
    )
    console.log('Extracting required files...')
    execSync(
      `unzip -o "${TMP_DIR}/PID_GTFS.zip" -d "${EXTRACTED_DIR}" stops.txt stop_times.txt`,
      { stdio: 'inherit' }
    )
  } else {
    console.log(`Reusing extracted data in ${EXTRACTED_DIR}`)
  }

  // 1. stops.txt → stop_id → name
  //    Build one Set<stop_id> per hub (exact name match).
  console.log(`Parsing stops.txt for ${HUB_NAMES.length} hub(s)...`)
  const nameByStopId = new Map()
  // Map<hubName, Set<stop_id>>
  const stopIdsByHub = new Map(HUB_NAMES.map((h) => [h, new Set()]))
  // Reverse map: stop_id → hubName (for fast lookup in flushTrip)
  const hubByStopId = new Map()

  await readCSV(`${EXTRACTED_DIR}/stops.txt`, (row) => {
    if (row.stop_id.startsWith('T')) return
    if (row.location_type !== '' && row.location_type !== '0') return
    nameByStopId.set(row.stop_id, row.stop_name)
    const hubSet = stopIdsByHub.get(row.stop_name)
    if (hubSet) {
      hubSet.add(row.stop_id)
      hubByStopId.set(row.stop_id, row.stop_name)
    }
  })

  for (const [hub, ids] of stopIdsByHub) {
    console.log(`  "${hub}": ${ids.size} stop_id(s)`)
    if (ids.size === 0)
      console.warn(`  ⚠  No stop_ids found for "${hub}" — check the name`)
  }

  const anyHubFound = [...stopIdsByHub.values()].some((s) => s.size > 0)
  if (!anyHubFound)
    throw new Error('No hub stop_ids found at all. Check hub names.')

  // 2. Single-pass over stop_times.txt.
  //    For each trip: find the earliest position of each hub, then record
  //    min journey time to all subsequent stops. All hubs processed together.
  console.log('Streaming stop_times.txt (single pass, all hubs)...')
  const minMinutesByName = new Map()
  let currentTrip = null
  let buffer = [] // { stop_id, arrival, departure, seq }
  let tripsProcessed = 0
  let tripsWithHub = 0

  function flushTrip() {
    if (buffer.length === 0) return
    buffer.sort((a, b) => a.seq - b.seq)

    // For each hub, find its earliest position in this trip.
    // Using a Map<hubName, earliestIdx> avoids redundant scanning.
    const hubPositions = new Map() // hubName → index in buffer
    for (let i = 0; i < buffer.length; i++) {
      const hub = hubByStopId.get(buffer[i].stop_id)
      if (hub && !hubPositions.has(hub) && !Number.isNaN(buffer[i].departure)) {
        hubPositions.set(hub, i)
      }
    }
    if (hubPositions.size === 0) return

    tripsWithHub++
    // For each hub found in this trip, compute journey to all later stops.
    for (const [, hubIdx] of hubPositions) {
      const hubDeparture = buffer[hubIdx].departure
      for (let j = hubIdx + 1; j < buffer.length; j++) {
        const arrival = buffer[j].arrival
        if (Number.isNaN(arrival)) continue
        const minutes = arrival - hubDeparture
        if (minutes <= 0) continue
        const name = nameByStopId.get(buffer[j].stop_id)
        if (!name) continue
        const prev = minMinutesByName.get(name)
        if (prev === undefined || minutes < prev)
          minMinutesByName.set(name, minutes)
      }
    }

    tripsProcessed++
    if (tripsProcessed % 100000 === 0) {
      console.log(
        `  ${tripsProcessed.toLocaleString()} trips scanned, ${tripsWithHub.toLocaleString()} contained a hub`
      )
    }
  }

  await readCSV(`${EXTRACTED_DIR}/stop_times.txt`, (row) => {
    if (row.trip_id !== currentTrip) {
      flushTrip()
      currentTrip = row.trip_id
      buffer = []
    }
    buffer.push({
      stop_id: row.stop_id,
      arrival: parseGtfsTime(row.arrival_time),
      departure: parseGtfsTime(row.departure_time),
      seq: parseInt(row.stop_sequence, 10),
    })
  })
  flushTrip()
  console.log(`  ${tripsProcessed.toLocaleString()} trips scanned total`)
  console.log(
    `  ${tripsWithHub.toLocaleString()} trips contained at least one hub`
  )
  console.log(
    `  ${minMinutesByName.size} unique stops reachable directly from any hub`
  )

  // 3. Augment stops.json — take the minimum across all hubs.
  console.log('\nAugmenting stops.json...')
  const data = JSON.parse(readFileSync(STOPS_JSON_PATH, 'utf-8'))
  let augmented = 0
  for (const stop of data.stops) {
    const m = minMinutesByName.get(stop.name)
    if (m !== undefined) {
      stop.journeyMinutes = m
      augmented++
    } else {
      delete stop.journeyMinutes
    }
  }
  data._meta.journeyHubs = HUB_NAMES
  data._meta.journeyComputedAt = new Date().toISOString()

  writeFileSync(STOPS_JSON_PATH, JSON.stringify(data, null, 2))
  console.log(
    `Augmented ${augmented}/${data.stops.length} stops with journeyMinutes`
  )
  console.log(`Hubs used: ${HUB_NAMES.join(', ')}`)
  console.log(`Wrote ${STOPS_JSON_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
