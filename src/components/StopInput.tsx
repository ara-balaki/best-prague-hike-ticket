import { Field } from '@base-ui/react'
import Fuse from 'fuse.js'
import { type ChangeEvent, useState } from 'react'
import { useController, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { SUBURBAN_MODES } from '../lib/zones'
import type { FormValues, Stop, Transport } from '../types'

const MODE_LABEL: Record<Transport, string> = {
  bus: 'Bus',
  ferry: 'Ferry',
  metro: 'Metro',
  train: 'Train',
  tram: 'Tram',
  trolleybus: 'Trolleybus',
}

const MODE_EMOJI: Record<Transport, string> = {
  bus: '🚌',
  ferry: '⛴️',
  metro: '🚇',
  train: '🚆',
  tram: '🚊',
  trolleybus: '🚎',
}

interface StopInputProps {
  stops: Stop[]
  name: keyof FormValues
  label: string
}

export function StopInput({ stops, name, label }: StopInputProps) {
  const { t } = useTranslation()
  const {
    control,
    formState: { errors },
  } = useFormContext<FormValues>()

  const { field } = useController({ name, control })

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(() => (field.value as string) ?? '')
  const [activeIndex, setActiveIndex] = useState(-1)

  const fuse = new Fuse(stops, {
    keys: [
      { name: 'searchKey', weight: 1 },
      { name: 'name', weight: 0.5 },
    ],
    threshold: 0.35,
    distance: 80,
    minMatchCharLength: 2,
  })

  const selectItem = (stop: Stop) => {
    field.onChange(stop.name)
    setQuery(stop.name)
    setOpen(false)
    setActiveIndex(-1)
  }

  const clear = () => {
    field.onChange('')
    setQuery('')
    setOpen(false)
    setActiveIndex(-1)
  }

  const results = query.length >= 2 ? fuse.search(query, { limit: 10 }) : []

  const totalOptions = results.length

  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    field.onChange(e)
    setOpen(true)
    setActiveIndex(-1)
  }

  const handleOnBlur = () => {
    setTimeout(() => {
      setOpen(false)
      setActiveIndex(-1)
    }, 150)
  }

  const handleOnFocus = () => {
    if (results.length > 0) {
      setOpen(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || totalOptions === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, totalOptions - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const idx = activeIndex >= 0 ? activeIndex : 0
      const target = results[idx]
      if (target) selectItem(target.item)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <Field.Root className="relative flex flex-col gap-2">
      <Field.Label className="text-sm font-bold text-black">
        {label}
      </Field.Label>

      <div className="relative">
        <Field.Control
          autoFocus
          type="text"
          value={query}
          placeholder={t('destination.placeholder')}
          onChange={handleOnChange}
          onKeyDown={handleKeyDown}
          onFocus={handleOnFocus}
          onBlur={handleOnBlur}
          autoComplete="off"
          className="w-full rounded-xl border-2 border-forest/10 bg-transparent px-4 py-3 pr-10 text-base text-black outline-none placeholder:text-muted/60 focus:border-forest"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label={t('destination.clear')}
            className="absolute inset-y-0 right-3 flex items-center text-muted hover:text-forest"
          >
            ×
          </button>
        )}
      </div>

      {open && totalOptions > 0 && (
        <ul className="absolute top-full z-10 mt-1 max-h-60 w-full list-none overflow-y-auto rounded-xl border border-forest/20 bg-cream-card p-1 shadow-lg">
          {results.map(({ item }, idx) => {
            return (
              <li
                key={item.name}
                onMouseDown={() => selectItem(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${idx === activeIndex ? 'bg-forest/10' : 'hover:bg-forest/10'}`}
              >
                <span className="text-black">{item.name}</span>
                <div className="flex shrink-0 gap-1">
                  {SUBURBAN_MODES.filter(
                    (m) => item.zones[m] !== undefined
                  ).map((m) => (
                    <span
                      key={m}
                      title={MODE_LABEL[m]}
                      className="inline-flex items-center gap-1 rounded-md bg-forest/10 px-1.5 py-0.5 text-xs text-forest"
                    >
                      <span aria-hidden>{MODE_EMOJI[m]}</span>
                      <span className="sr-only">{MODE_LABEL[m]}</span>
                      Zone {item.zones[m]!.join(', ')}
                    </span>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {errors.stop && (
        <p className="text-sm text-red-600">{errors.stop.message}</p>
      )}
    </Field.Root>
  )
}
