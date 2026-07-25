import { useState } from 'react'
import { Select, Spin } from 'antd'
import { useGetPatientsQuery } from '../app/api'
import { useLang } from '../i18n'

interface Props {
  value?: number
  onChange?: (v: number) => void
}

export default function PatientSelect({ value, onChange }: Props) {
  const [search, setSearch] = useState('')
  const { data, isFetching } = useGetPatientsQuery({ search })
  const { t } = useLang()

  return (
    <Select
      showSearch
      value={value}
      placeholder={t('search_select_patient')}
      filterOption={false}
      onSearch={setSearch}
      onChange={onChange}
      notFoundContent={isFetching ? <Spin size="small" /> : t('not_found')}
      options={data?.results.map((p) => ({
        value: p.id,
        label: `${p.file_number} — ${p.full_name} (${p.phone})`,
      }))}
      style={{ width: '100%' }}
    />
  )
}
