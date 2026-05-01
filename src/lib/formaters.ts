import type { TicketValidityDuration } from "../types";

export function formatPrice(price: number): string {
  return `${Math.round(price)} Kč`;
}

export function formatValidity(
  validity: number,
  type: TicketValidityDuration,
): string {
  if (type === "day-cutoff") return "Until 4:00 AM next day";
  if (validity >= 1440) return "24 hours";
  return `${validity} minutes`;
}
