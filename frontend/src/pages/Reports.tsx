import { useState } from 'react'
import {
  Button, Card, Col, DatePicker, Descriptions, Empty, Row, Select, Space, Spin,
  Statistic, Table, Tabs, Tag,
} from 'antd'
import {
  CalendarOutlined, TeamOutlined, CloseCircleOutlined,
  CheckCircleOutlined, ClockCircleOutlined, MedicineBoxOutlined,
  PrinterOutlined, UserOutlined, FileSearchOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import {
  useGetReportsQuery,
  useGetPatientReportQuery,
  useGetDentistReportQuery,
  useGetDoctorDayQuery,
  useGetDentistsQuery,
  useGetClinicSettingsQuery,
} from '../app/api'
import PatientSelect from '../components/PatientSelect'
import { money, statusColor, printHtml, invoiceColor } from '../utils'
import { useLang } from '../i18n'
import type { ClinicSettings } from '../types'

const { RangePicker } = DatePicker

type Range = [Dayjs, Dayjs]
const defaultRange: Range = [dayjs().startOf('month'), dayjs()]
const fmt = (d: Dayjs) => d.format('YYYY-MM-DD')

function rowsToHtml(headers: string[], rows: (string | number)[][]): string {
  return `<table><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`)
    .join('')}</table>`
}

function usePrintOpts(settings?: ClinicSettings) {
  return { logoUrl: settings?.logo_url, clinicName: settings?.clinic_name }
}

/* ---------------- System stats (existing) ---------------- */

function Bars({ data, color, format, emptyText }: {
  data: { label: string; value: number }[]
  color: string
  format?: (v: number) => string
  emptyText: string
}) {
  if (!data.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 180, padding: '0 8px' }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#475569' }}>
            {format ? format(d.value) : d.value}
          </div>
          <div style={{ height: Math.max((d.value / max) * 130, 4), background: color, borderRadius: '6px 6px 0 0' }} />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function SystemTab() {
  const { data, isLoading } = useGetReportsQuery()
  const { t, te } = useLang()

  if (isLoading || !data) return <Spin size="large" style={{ display: 'block', marginTop: 40 }} />

  const tiles = [
    { label: t('total_appointments'), value: data.tiles.total_appointments, icon: <CalendarOutlined />, grad: 'linear-gradient(135deg,#0ea5e9,#0284c7)' },
    { label: t('patients_total'), value: data.tiles.total_patients, icon: <TeamOutlined />, grad: 'linear-gradient(135deg,#10b981,#059669)' },
    { label: t('total_dentists'), value: data.tiles.total_dentists, icon: <MedicineBoxOutlined />, grad: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
    { label: t('cancelled_appointments'), value: data.tiles.cancelled, icon: <CloseCircleOutlined />, grad: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    { label: t('completed_appointments'), value: data.tiles.completed, icon: <CheckCircleOutlined />, grad: 'linear-gradient(135deg,#64748b,#475569)' },
    { label: t('appointments_today'), value: data.tiles.today, icon: <ClockCircleOutlined />, grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
  ]

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {tiles.map((tile) => (
          <Col xs={24} sm={12} lg={8} key={tile.label}>
            <div className="tile" style={{ background: tile.grad }}>
              <div>
                <div className="tile-label">{tile.label}</div>
                <div className="tile-value">{tile.value}</div>
              </div>
              <span className="tile-icon">{tile.icon}</span>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={t('monthly_revenue')}>
            <Bars color="#2563eb" emptyText={t('no_data')} data={data.revenue_by_month.map((r) => ({ label: r.month, value: Number(r.total) }))} format={(v) => money(v)} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('new_patients_monthly')}>
            <Bars color="#10b981" emptyText={t('no_data')} data={data.patients_by_month.map((r) => ({ label: r.month, value: r.total }))} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('month_appts_by_status')}>
            <Table
              size="small" rowKey="status" pagination={false} dataSource={data.appointments_by_status}
              columns={[
                { title: t('status'), dataIndex: 'status', render: (v) => <Tag color={statusColor(v)}>{te('st', v)}</Tag> },
                { title: t('count'), dataIndex: 'total' },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={t('top_dentists')}>
            <Table
              size="small" rowKey="dentist__full_name" pagination={false} dataSource={data.top_dentists}
              columns={[
                { title: t('dentist'), dataIndex: 'dentist__full_name' },
                { title: t('appt_count'), dataIndex: 'total' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

/* ---------------- Patient report ---------------- */

function PatientReportTab() {
  const { t, te } = useLang()
  const { data: settings } = useGetClinicSettingsQuery()
  const printOpts = usePrintOpts(settings)
  const [patientId, setPatientId] = useState<number>()
  const [range, setRange] = useState<Range>(defaultRange)
  const { data, isFetching } = useGetPatientReportQuery(
    { id: patientId!, from: fmt(range[0]), to: fmt(range[1]) },
    { skip: !patientId },
  )

  const onPrint = () => {
    if (!data) return
    const p = data.patient
    const body = `
      <h2>${t('report_patient')}</h2>
      <div class="meta">${t('patient')}: <b>${p.full_name}</b> (${p.file_number}) · ${t('phone')}: ${p.phone}
      · ${t('from_date')}: ${data.from} — ${t('to_date')}: ${data.to}</div>
      <h2>${t('tab_records')}</h2>
      ${rowsToHtml(
        [t('date'), t('diagnosis'), t('treatment_col'), t('cost'), t('dentist')],
        data.records.map((r) => [r.date, r.diagnosis, r.treatment || '—', r.cost, r.dentist ?? '—']),
      )}
      <h2>${t('appointments')}</h2>
      ${rowsToHtml(
        [t('date'), t('visit_type'), t('status'), t('visit_fee'), t('collected')],
        data.appointments.map((a) => [dayjs(a.date).format('YYYY-MM-DD HH:mm'), te('vt', a.visit_type), te('st', a.status), a.fee, a.fee_paid ? '✓' : '—']),
      )}
      <h2>${t('invoices')}</h2>
      ${rowsToHtml(
        [t('number_col'), t('date'), t('total'), t('paid'), t('balance')],
        data.invoices.map((i) => [i.number, i.date, i.total, i.paid, i.balance]),
      )}
      <div class="totals">
        <div>${t('records_cost')}: <b>${data.totals.records_cost}</b></div>
        <div>${t('invoiced')}: <b>${data.totals.invoiced}</b> · ${t('paid')}: <b>${data.totals.paid}</b> · ${t('balance')}: <b>${data.totals.balance}</b></div>
        <div>${t('visit_fees_paid')}: <b>${data.totals.visit_fees_paid}</b></div>
      </div>`
    printHtml(`${t('report_patient')} - ${p.full_name}`, body, printOpts)
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <div style={{ minWidth: 260 }}>
          <PatientSelect value={patientId} onChange={setPatientId} />
        </div>
        <RangePicker value={range} onChange={(v) => v && setRange(v as Range)} allowClear={false} />
        <Button icon={<PrinterOutlined />} disabled={!data} onClick={onPrint}>
          {t('print_pdf')}
        </Button>
      </Space>

      {isFetching && <Spin style={{ display: 'block', marginTop: 24 }} />}
      {data && !isFetching && (
        <>
          <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label={t('name')}>{data.patient.full_name}</Descriptions.Item>
            <Descriptions.Item label={t('file_number')}>{data.patient.file_number}</Descriptions.Item>
            <Descriptions.Item label={t('phone')}>{data.patient.phone}</Descriptions.Item>
            <Descriptions.Item label={t('age')}>{data.patient.age ?? '—'}</Descriptions.Item>
            <Descriptions.Item label={t('allergies')}>{data.patient.allergies || '—'}</Descriptions.Item>
            <Descriptions.Item label={t('chronic_diseases')}>{data.patient.chronic_diseases || '—'}</Descriptions.Item>
          </Descriptions>

          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title={t('records_cost')} value={Number(data.totals.records_cost)} suffix={t('egp')} /></Col>
            <Col span={6}><Statistic title={t('paid')} value={data.totals.paid} suffix={t('egp')} valueStyle={{ color: '#16a34a' }} /></Col>
            <Col span={6}><Statistic title={t('balance')} value={data.totals.balance} suffix={t('egp')} valueStyle={{ color: data.totals.balance > 0 ? '#ef4444' : '#16a34a' }} /></Col>
            <Col span={6}><Statistic title={t('visit_fees_paid')} value={Number(data.totals.visit_fees_paid)} suffix={t('egp')} /></Col>
          </Row>

          <Card size="small" title={t('tab_records')} style={{ marginBottom: 12 }}>
            <Table
              size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={data.records}
              locale={{ emptyText: t('no_records') }}
              columns={[
                { title: t('date'), dataIndex: 'date' },
                { title: t('diagnosis'), dataIndex: 'diagnosis' },
                { title: t('cost'), dataIndex: 'cost', render: (v) => money(v) },
                { title: t('dentist'), dataIndex: 'dentist', render: (v) => v || '—' },
              ]}
            />
          </Card>

          <Card size="small" title={t('appointments')}>
            <Table
              size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={data.appointments}
              locale={{ emptyText: t('no_appointments') }}
              columns={[
                { title: t('date'), dataIndex: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                { title: t('visit_type'), dataIndex: 'visit_type', render: (v) => <Tag color="geekblue">{te('vt', v)}</Tag> },
                { title: t('status'), dataIndex: 'status', render: (v) => <Tag color={statusColor(v)}>{te('st', v)}</Tag> },
                { title: t('visit_fee'), dataIndex: 'fee', render: (v, r) => (Number(v) > 0 ? `${money(v)} ${r.fee_paid ? '✓' : ''}` : t('free')) },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  )
}

/* ---------------- Dentist report ---------------- */

function DentistReportTab() {
  const { t, te } = useLang()
  const { data: settings } = useGetClinicSettingsQuery()
  const printOpts = usePrintOpts(settings)
  const { data: dentists } = useGetDentistsQuery()
  const [dentistId, setDentistId] = useState<number>()
  const [range, setRange] = useState<Range>(defaultRange)
  const { data, isFetching } = useGetDentistReportQuery(
    { id: dentistId!, from: fmt(range[0]), to: fmt(range[1]) },
    { skip: !dentistId },
  )

  const onPrint = () => {
    if (!data) return
    const body = `
      <h2>${t('report_dentist')} — ${data.dentist.name}</h2>
      <div class="meta">${t('from_date')}: ${data.from} — ${t('to_date')}: ${data.to}</div>
      ${rowsToHtml(
        [t('date'), t('patient'), t('visit_type'), t('status'), t('visit_fee'), t('collected')],
        data.visits.map((v) => [dayjs(v.date).format('MM-DD HH:mm'), v.patient, te('vt', v.visit_type), te('st', v.status), v.fee, v.fee_paid ? '✓' : '—']),
      )}
      <div class="totals">
        <div>${t('visits_count')}: <b>${data.totals.visits}</b> · ${t('unique_patients')}: <b>${data.totals.unique_patients}</b></div>
        <div>${t('fees_collected')}: <b>${data.totals.fees_collected}</b> · ${t('fees_uncollected')}: <b>${data.totals.fees_uncollected}</b></div>
        <div>${t('treatments_count')}: <b>${data.totals.treatments}</b> · ${t('treatments_value')}: <b>${data.totals.treatments_value}</b></div>
      </div>`
    printHtml(`${t('report_dentist')} - ${data.dentist.name}`, body, printOpts)
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('select_dentist')}
          style={{ minWidth: 220 }}
          value={dentistId}
          onChange={setDentistId}
          options={dentists?.map((d) => ({ value: d.id, label: d.full_name }))}
        />
        <RangePicker value={range} onChange={(v) => v && setRange(v as Range)} allowClear={false} />
        <Button icon={<PrinterOutlined />} disabled={!data} onClick={onPrint}>
          {t('print_pdf')}
        </Button>
      </Space>

      {isFetching && <Spin style={{ display: 'block', marginTop: 24 }} />}
      {data && !isFetching && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={12} md={4}><div className="tile" style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', minHeight: 88 }}><div><div className="tile-label">{t('visits_count')}</div><div className="tile-value" style={{ fontSize: 24 }}>{data.totals.visits}</div></div></div></Col>
            <Col xs={12} md={4}><div className="tile" style={{ background: 'linear-gradient(135deg,#10b981,#059669)', minHeight: 88 }}><div><div className="tile-label">{t('unique_patients')}</div><div className="tile-value" style={{ fontSize: 24 }}>{data.totals.unique_patients}</div></div></div></Col>
            <Col xs={12} md={5}><div className="tile" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', minHeight: 88 }}><div><div className="tile-label">{t('fees_collected')}</div><div className="tile-value" style={{ fontSize: 22 }}>{money(data.totals.fees_collected)}</div></div></div></Col>
            <Col xs={12} md={5}><div className="tile" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', minHeight: 88 }}><div><div className="tile-label">{t('fees_uncollected')}</div><div className="tile-value" style={{ fontSize: 22 }}>{money(data.totals.fees_uncollected)}</div></div></div></Col>
            <Col xs={24} md={6}><div className="tile" style={{ background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', minHeight: 88 }}><div><div className="tile-label">{t('treatments_value')}</div><div className="tile-value" style={{ fontSize: 22 }}>{money(data.totals.treatments_value)}</div></div></div></Col>
          </Row>

          <Table
            size="small" rowKey={(_, i) => String(i)} dataSource={data.visits} pagination={{ pageSize: 15 }}
            columns={[
              { title: t('date'), dataIndex: 'date', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
              { title: t('patient'), dataIndex: 'patient' },
              { title: t('visit_type'), dataIndex: 'visit_type', render: (v) => <Tag color="geekblue">{te('vt', v)}</Tag> },
              { title: t('status'), dataIndex: 'status', render: (v) => <Tag color={statusColor(v)}>{te('st', v)}</Tag> },
              { title: t('visit_fee'), dataIndex: 'fee', render: (v, r) => (Number(v) > 0 ? <span>{money(v)} {r.fee_paid ? <Tag color="green">{t('collected')}</Tag> : <Tag color="orange">{t('not_collected')}</Tag>}</span> : t('free')) },
            ]}
          />
        </>
      )}
    </div>
  )
}

/* ---------------- Doctor day statement ---------------- */

function DoctorDayTab() {
  const { t, te } = useLang()
  const { data: settings } = useGetClinicSettingsQuery()
  const printOpts = usePrintOpts(settings)
  const { data: dentists } = useGetDentistsQuery()
  const [dentistId, setDentistId] = useState<number>()
  const [date, setDate] = useState<Dayjs>(dayjs())
  const { data, isFetching } = useGetDoctorDayQuery({ date: fmt(date), dentist: dentistId })

  const onPrint = () => {
    if (!data) return
    const dentistName = dentists?.find((d) => d.id === dentistId)?.full_name || t('dentist')
    const body = `
      <h2>${t('report_doctor_day')} — ${data.date}</h2>
      <div class="meta">${dentistId ? `${t('dentist')}: ${dentistName}` : ''}</div>
      ${rowsToHtml(
        [t('time'), t('patient'), t('dentist'), t('visit_type'), t('visit_fee'), t('collected')],
        data.visits.map((v) => [dayjs(v.time).format('HH:mm'), v.patient, v.dentist ?? '—', te('vt', v.visit_type), v.fee, v.fee_paid ? '✓' : '—']),
      )}
      <div class="totals">
        <div>${t('visits_count')}: <b>${data.totals.visits}</b></div>
        <div>${t('fees_collected')}: <b>${data.totals.fees_collected}</b> · ${t('fees_uncollected')}: <b>${data.totals.fees_uncollected}</b></div>
        <div>${t('invoice_payments_col')}: <b>${data.totals.invoice_payments}</b></div>
        <div>${t('total_cash')}: <b>${data.totals.total_cash}</b></div>
      </div>`
    printHtml(`${t('report_doctor_day')} ${data.date}`, body, printOpts)
  }

  return (
    <div>
      <p className="page-subtitle" style={{ margin: '0 0 14px' }}>{t('day_statement_hint')}</p>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
        <Select
          placeholder={t('select_dentist')}
          style={{ minWidth: 200 }}
          allowClear
          value={dentistId}
          onChange={setDentistId}
          options={dentists?.map((d) => ({ value: d.id, label: d.full_name }))}
        />
        <Button icon={<PrinterOutlined />} disabled={!data} onClick={onPrint}>
          {t('print_pdf')}
        </Button>
      </Space>

      {isFetching && <Spin style={{ display: 'block', marginTop: 24 }} />}
      {data && !isFetching && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}><Statistic title={t('visits_count')} value={data.totals.visits} /></Col>
            <Col span={6}><Statistic title={t('fees_collected')} value={Number(data.totals.fees_collected)} suffix={t('egp')} valueStyle={{ color: '#16a34a' }} /></Col>
            <Col span={6}><Statistic title={t('invoice_payments_col')} value={Number(data.totals.invoice_payments)} suffix={t('egp')} /></Col>
            <Col span={6}><Statistic title={t('total_cash')} value={data.totals.total_cash} suffix={t('egp')} valueStyle={{ color: '#2563eb', fontWeight: 700 }} /></Col>
          </Row>
          <Table
            size="small" rowKey={(_, i) => String(i)} dataSource={data.visits} pagination={false}
            locale={{ emptyText: t('no_appointments') }}
            columns={[
              { title: t('time'), dataIndex: 'time', render: (v) => dayjs(v).format('HH:mm') },
              { title: t('patient'), dataIndex: 'patient' },
              { title: t('dentist'), dataIndex: 'dentist', render: (v) => v || '—' },
              { title: t('visit_type'), dataIndex: 'visit_type', render: (v) => <Tag color="geekblue">{te('vt', v)}</Tag> },
              { title: t('visit_fee'), dataIndex: 'fee', render: (v, r) => (Number(v) > 0 ? <span>{money(v)} {r.fee_paid ? <Tag color="green">{t('collected')}</Tag> : <Tag color="orange">{t('not_collected')}</Tag>}</span> : <Tag>{t('free')}</Tag>) },
            ]}
          />
        </>
      )}
    </div>
  )
}

/* ---------------- Page ---------------- */

export default function Reports() {
  const { t } = useLang()
  return (
    <div>
      <h2 className="page-title">{t('reports_title')}</h2>
      <Card>
        <Tabs
          items={[
            { key: 'system', label: <span><FileSearchOutlined /> {t('report_system')}</span>, children: <SystemTab /> },
            { key: 'patient', label: <span><UserOutlined /> {t('report_patient')}</span>, children: <PatientReportTab /> },
            { key: 'dentist', label: <span><MedicineBoxOutlined /> {t('report_dentist')}</span>, children: <DentistReportTab /> },
            { key: 'doctor_day', label: <span><ClockCircleOutlined /> {t('report_doctor_day')}</span>, children: <DoctorDayTab /> },
          ]}
        />
      </Card>
    </div>
  )
}
