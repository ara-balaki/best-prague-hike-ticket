import type { TFunction } from 'i18next'

import type { ITicket, Party } from '../types'

const TICKET_NAME_KEYS: Record<string, string> = {
  regional: 'ticket.regional',
  'prague-and-1-4': 'ticket.pragueAnd14',
  'whole-network': 'ticket.wholeNetwork',
  'family-one-adult': 'ticket.familyOneAdult',
  'family-two-adults': 'ticket.familyTwoAdults',
}

const PARTY_LABEL_KEYS: Record<Party, string> = {
  single: 'partyLabels.single',
  'one-adult-two-children': 'partyLabels.oneAdultTwoChildren',
  'two-adults-two-children': 'partyLabels.twoAdultsFourChildren',
}

/**
 * Translate a ticket's display name. Short-term tickets are parameterised by
 * their fareZones count; day tickets use a per-id key.
 */
export function ticketName(ticket: ITicket, t: TFunction): string {
  if (ticket.category === 'short-term') {
    return t('ticket.shortTerm', { zones: ticket.fareZones })
  }
  return t(TICKET_NAME_KEYS[ticket.id])
}

/**
 * Translate a ticket's validity label.
 * - Short-term: "{N} min"
 * - day-cutoff (family): "Until 4:00 AM next day"
 * - day: "24 hours"
 */
export function ticketValidity(ticket: ITicket, t: TFunction): string {
  if (ticket.category === 'short-term') {
    return t('validity.minutes', { count: ticket.validity })
  }
  return t(`validity.${ticket.type === 'day-cutoff' ? 'cutoff' : 'day'}`)
}

export function partyLabel(party: Party, t: TFunction): string {
  return t(PARTY_LABEL_KEYS[party])
}
