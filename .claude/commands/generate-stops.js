#!/usr/bin/env node
/**
 * Part of the generate-stops skill (.claude/commands/generate-stops.md).
 * Downloads PID_GTFS.zip and writes public/stops.json.
 *
 * Each stop entry maps zone IDs per transport mode:
 *   { name, searchKey, zones: { bus: ["P"], train: ["0", "P"] } }
 *
 * Uses route_stops.txt (PID extension) to link stops → routes → mode
 * without processing the large stop_times.txt.
 *
 * Options:
 *   --no-download   Skip download/extract, reuse data already in --tmp-dir
 *   --tmp-dir <dir> Temp directory (default: /tmp/PID_GTFS_gen)
 */

import { execSync } from 'child_process'
import { createReadStream, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const GTFS_URL = 'https://data.pid.cz/PID_GTFS.zip'
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = join(__dirname, '../../public/stops.json')

const args = process.argv.slice(2)
const noDownload = args.includes('--no-download')
const tmpDirIdx = args.indexOf('--tmp-dir')
const TMP_DIR = tmpDirIdx !== -1 ? args[tmpDirIdx + 1] : '/tmp/PID_GTFS_gen'
const EXTRACTED_DIR = `${TMP_DIR}/extracted`

// GTFS route_type → transport mode name
function routeTypeToMode(routeType) {
  const t = parseInt(routeType, 10)
  if (isNaN(t)) return null
  if (t === 0 || (t >= 900 && t <= 999)) return 'tram'
  if (t === 1 || (t >= 400 && t <= 499)) return 'metro'
  if (t === 2 || (t >= 100 && t <= 199)) return 'train'
  if (t === 3 || (t >= 700 && t <= 799)) return 'bus'
  if (t === 4) return 'ferry'
  if (t === 11 || (t >= 800 && t <= 899)) return 'trolleybus'
  return null
}

// RFC 4180 CSV line parser — handles quoted fields and escaped quotes ("")
function parseCSVLine(line) {
  const fields = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) {
      fields.push('')
      break
    }
    if (line[i] === '"') {
      i++ // skip opening quote
      let value = ''
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            value += '"'
            i += 2
          } // escaped quote
          else {
            i++
            break
          } // closing quote
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

// Strip diacritics and lowercase — used for searchKey
function normalizeSearch(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

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
      `unzip -o "${TMP_DIR}/PID_GTFS.zip" -d "${EXTRACTED_DIR}" stops.txt routes.txt route_stops.txt`,
      { stdio: 'inherit' }
    )
  } else {
    console.log(`Reusing extracted data in ${EXTRACTED_DIR}`)
  }

  // 1. stops.txt → Map<stop_id, {name, zoneId, lat, lon}>
  console.log('Parsing stops.txt...')
  const stopById = new Map()
  await readCSV(`${EXTRACTED_DIR}/stops.txt`, (row) => {
    // Skip virtual boundary stops (T-prefixed) used only for fare calculations
    if (row.stop_id.startsWith('T')) return
    // Skip parent stations / entrances (location_type 1, 2, 3, 4); keep 0 and blank
    if (row.location_type !== '' && row.location_type !== '0') return
    stopById.set(row.stop_id, {
      name: row.stop_name,
      zoneId: row.zone_id || '-',
      lat: parseFloat(row.stop_lat),
      lon: parseFloat(row.stop_lon),
    })
  })
  console.log(`  ${stopById.size} stops`)

  // 2. routes.txt → Map<route_id, mode>
  console.log('Parsing routes.txt...')
  const modeByRoute = new Map()
  await readCSV(`${EXTRACTED_DIR}/routes.txt`, (row) => {
    const mode = routeTypeToMode(row.route_type)
    if (mode) modeByRoute.set(row.route_id, mode)
  })
  console.log(`  ${modeByRoute.size} routes`)

  // 3. route_stops.txt → Map<stop_id, Set<mode>>
  console.log('Parsing route_stops.txt...')
  const modesByStop = new Map()
  await readCSV(`${EXTRACTED_DIR}/route_stops.txt`, (row) => {
    const mode = modeByRoute.get(row.route_id)
    if (!mode || !stopById.has(row.stop_id)) return
    if (!modesByStop.has(row.stop_id)) modesByStop.set(row.stop_id, new Set())
    modesByStop.get(row.stop_id).add(mode)
  })
  console.log(`  ${modesByStop.size} stops assigned to routes`)

  // 4. Merge by name → Map<name, Map<mode, Set<zoneId>>> + lat/lon accumulator + stop_ids
  //    Skip zone_id "-" — stops explicitly marked as outside the PID fare zone system.
  console.log('Building stop name → zones-by-mode map...')
  const byName = new Map()
  const latLonByName = new Map() // name → { latSum, lonSum, count }
  const stopIdsByName = new Map() // name → Set<stop_id>
  for (const [stopId, { name, zoneId, lat, lon }] of stopById) {
    if (zoneId === '-') continue // no fare zone — unusable for ticket calculation
    const modes = modesByStop.get(stopId)
    if (!modes) continue // stop exists in stops.txt but no active route serves it
    if (!byName.has(name)) byName.set(name, new Map())
    const modeMap = byName.get(name)
    for (const mode of modes) {
      if (!modeMap.has(mode)) modeMap.set(mode, new Set())
      modeMap.get(mode).add(zoneId)
    }
    if (!stopIdsByName.has(name)) stopIdsByName.set(name, new Set())
    stopIdsByName.get(name).add(stopId)
    if (!isNaN(lat) && !isNaN(lon)) {
      if (!latLonByName.has(name))
        latLonByName.set(name, { latSum: 0, lonSum: 0, count: 0 })
      const ll = latLonByName.get(name)
      ll.latSum += lat
      ll.lonSum += lon
      ll.count++
    }
  }

  // 5. Serialise, sort
  const stops = []
  for (const [name, modeMap] of byName) {
    const zones = {}
    for (const [mode, zoneSet] of modeMap) {
      // Drop modes whose only zones were "-" (already excluded above, but belt-and-suspenders)
      const validZones = [...zoneSet].filter((z) => z !== '-').sort()
      if (validZones.length > 0) zones[mode] = validZones
    }
    if (Object.keys(zones).length === 0) continue // skip fully-unzoned stops
    const ids = [...(stopIdsByName.get(name) ?? [])]
    const entry = { name, searchKey: normalizeSearch(name), stopIds: ids, zones }
    const ll = latLonByName.get(name)
    if (ll && ll.count > 0) {
      entry.lat = Math.round((ll.latSum / ll.count) * 1e6) / 1e6
      entry.lon = Math.round((ll.lonSum / ll.count) * 1e6) / 1e6
    }
    stops.push(entry)
  }
  stops.sort((a, b) => a.name.localeCompare(b.name, 'cs'))

  const output = {
    _meta: {
      source: GTFS_URL,
      license: 'CC-BY 4.0',
      attribution: 'Data © PID/ROPID',
      generatedAt: new Date().toISOString(),
      stopCount: stops.length,
    },
    stops,
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\nWrote ${stops.length} stops → ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
