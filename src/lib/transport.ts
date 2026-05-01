import type { IStop, Party, Transport, TransportFilter } from "../types";

export const SUBURBAN_MODES: Transport[] = ["train", "bus"];

export const MODE_LABEL: Record<Transport, string> = {
  bus: "Bus",
  ferry: "Ferry",
  metro: "Metro",
  train: "Train",
  tram: "Tram",
  trolleybus: "Trolleybus",
};

export const MODE_EMOJI: Record<Transport, string> = {
  bus: "🚌",
  ferry: "⛴️",
  metro: "🚇",
  train: "🚆",
  tram: "🚊",
  trolleybus: "🚎",
};

export const PARTY_LABELS: Record<Party, string> = {
  single: "1 Adult",
  "one-adult-two-children": "1 Adult + 2 Children",
  "two-adults-two-children": "2 Adults + 2 Children",
};

export function isSuburban(stop: IStop, mode: Transport): boolean {
  return (
    stop.zones[mode] !== undefined &&
    stop.zones[mode].every((z) => z !== "P" && z !== "0" && z !== "B")
  );
}

export function getZoneInfo(
  stop: IStop,
  transport: TransportFilter,
): { count: number; label: string } {
  const modes = transport === "all" ? SUBURBAN_MODES : [transport];
  const numbers = modes
    .flatMap((m) => stop.zones[m] ?? [])
    .map((z) => parseInt(z, 10))
    .filter((n) => !Number.isNaN(n));
  const max = numbers.length ? Math.max(...numbers) : 1;
  return { count: max, label: `Zone ${max}` };
}
