import { useTranslation } from 'react-i18next'

import type { Stop } from '../types'
import { StopInput } from './StopInput'

interface FormProps {
  stops: Stop[]
}

export function Form({ stops }: FormProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-6">
      <StopInput name="from" stops={stops} label={t('from.label')} />
      <StopInput name="to" stops={stops} label={t('destination.label')} />
    </div>
  )
}
