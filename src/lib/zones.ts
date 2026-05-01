import type { IStop, Transport, TransportFilter } from "../types";

/** Transport modes that can take a hiker into the suburban zones. */
export const SUBURBAN_MODES: Transport[] = ["train", "bus"];

/**
 * True if the stop has at least one numbered zone (1-13) on the given mode —
 * i.e., it's outside Prague's tariff zones P, 0, B.
 */
export function isSuburban(stop: IStop, mode: Transport): boolean {
  return (
    stop.zones[mode] !== undefined &&
    stop.zones[mode].every((z) => z !== "P" && z !== "0" && z !== "B")
  );
}

/**
 * Highest outer zone number reached on the given transport filter.
 * Returns 1 if the stop has no parseable numeric zones.
 */
export function highestZone(stop: IStop, transport: TransportFilter): number {
  const modes = transport === "all" ? SUBURBAN_MODES : [transport];
  const numbers = modes
    .flatMap((m) => stop.zones[m] ?? [])
    .map((z) => parseInt(z, 10))
    .filter((n) => !Number.isNaN(n));
  return numbers.length ? Math.max(...numbers) : 1;
}
