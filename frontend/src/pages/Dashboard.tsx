import { useState } from 'react'
import { Card, Col, Row, Table, Tag, Spin, Empty, DatePicker } from 'antd'
import {
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  WalletOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  ScheduleOutlined,
} from '@ant-design/icons'
import dayjs, { type Dayjs } from 'dayjs'
import { useDashboardQuery } from '../app/api'
import { statusColor, money } from '../utils'
import { useLang } from '../i18n'

const { RangePicker } = DatePicker

const DONUT_COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#64748b', '#0ea5e9', '#ec4899']

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  const R = 60
  const C = 2 * Math.PI * R
  let offset = 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <g transform="rotate(-90 80 80)">
          {data.map((d, i) => {
            const frac = d.value / total
            const seg = (
              <circle
                key={d.label}
                cx={80}
                cy={80}
                r={R}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth={26}
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-offset * C}
              />
            )
            offset += frac
            return seg
          })}
        </g>
        <text x="80" y="86" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0f172a">
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <span key={d.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            {d.label}: <b>{d.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function RevenueLine({ data }: { data: { date: string; total: number }[] }) {
  const { t } = useLang()
  if (!data.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('no_data')} />

  const PAD_X = 56
  const PAD_TOP = 20
  const PAD_BOTTOM = 40
  const W = 700
  const H = 260
  const chartW = W - PAD_X - 16
  const chartH = H - PAD_TOP - PAD_BOTTOM

  const max = Math.max(...data.map((d) => d.total), 1)
  const yTicks = 5
  const yStep = Math.ceil(max / yTicks / 1000) * 1000 || 1

  const points = data.map((d, i) => ({
    x: PAD_X + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: PAD_TOP + chartH - (d.total / (yStep * yTicks)) * chartH,
    ...d,
  }))

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  let smooth = ''
  if (points.length >= 2) {
    smooth = `M${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      smooth += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }
  }

  const areaPath = smooth
    ? `${smooth} L${points[points.length - 1].x},${PAD_TOP + chartH} L${points[0].x},${PAD_TOP + chartH} Z`
    : `${line} L${points[points.length - 1].x},${PAD_TOP + chartH} L${points[0].x},${PAD_TOP + chartH} Z`

  const maxLabels = 14
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const y = PAD_TOP + chartH - (i / yTicks) * chartH
        const val = i * yStep
        return (
          <g key={i}>
            <line x1={PAD_X} y1={y} x2={W - 16} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={PAD_X - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#94a3b8">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
            </text>
          </g>
        )
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={smooth || line} fill="none" stroke="#0ea5e9" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#0ea5e9" strokeWidth={2} />
          {i % labelStep === 0 && (
            <text x={p.x} y={H - 8} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {dayjs(p.date).format('MM/DD')}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs(),
  ])
  const params = {
    from: range[0].format('YYYY-MM-DD'),
    to: range[1].format('YYYY-MM-DD'),
  }
  const { data, isLoading } = useDashboardQuery(params)
  const { t, te } = useLang()

  if (isLoading || !data) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  const vc = data.visit_counts_today || {}
  const mainCards = [
    { title: t('patients_total'), value: data.patients_total, icon: <TeamOutlined />, color: '#0ea5e9', bg: '#e0f2fe' },
    { title: t('appointments_today'), value: data.appointments_today, icon: <CalendarOutlined />, color: '#2563eb', bg: '#dbeafe' },
    { title: t('unpaid_invoices'), value: data.unpaid_invoices, icon: <WalletOutlined />, color: '#d97706', bg: '#fef3c7' },
    { title: t('month_revenue'), value: money(data.month_revenue), icon: <DollarOutlined />, color: '#16a34a', bg: '#dcfce7' },
  ]

  const clinicalTiles = [
    { label: te('vt', 'exam'), value: vc.exam || 0, icon: <MedicineBoxOutlined />, grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
    { label: te('vt', 're_exam'), value: vc.re_exam || 0, icon: <ScheduleOutlined />, grad: 'linear-gradient(135deg,#0ea5e9,#0284c7)' },
    { label: te('vt', 'consultation'), value: vc.consultation || 0, icon: <UserAddOutlined />, grad: 'linear-gradient(135deg,#22c55e,#16a34a)' },
    { label: te('vt', 'procedure'), value: vc.procedure || 0, icon: <CheckCircleOutlined />, grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    { label: t('total_rx'), value: data.prescriptions_total, icon: <FileTextOutlined />, grad: 'linear-gradient(135deg,#64748b,#475569)' },
    { label: t('records_total'), value: data.records_total, icon: <HeartOutlined />, grad: 'linear-gradient(135deg,#ec4899,#db2777)' },
  ]

  const donutData = Object.entries(vc)
    .map(([k, v]) => ({ label: te('vt', k), value: v }))
    .sort((a, b) => b.value - a.value)

  return (
    <div>
      <div className="hero-banner">
        <HeartOutlined className="hero-icon" />
        <div style={{ position: 'relative' }}>
          <h1>{t('login_title')}</h1>
          <p>{t('login_hero')}</p>
        </div>
      </div>

      {/* Date range filter */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <RangePicker
          value={range}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              setRange([dates[0], dates[1]])
            }
          }}
          format="YYYY-MM-DD"
          allowClear={false}
          style={{ maxWidth: 320 }}
          presets={[
            { label: t('today') || 'اليوم', value: [dayjs(), dayjs()] },
            { label: '7 ' + (t('days') || 'أيام'), value: [dayjs().subtract(7, 'day'), dayjs()] },
            { label: '30 ' + (t('days') || 'يوم'), value: [dayjs().subtract(30, 'day'), dayjs()] },
            { label: t('this_month') || 'هذا الشهر', value: [dayjs().startOf('month'), dayjs()] },
            { label: t('last_month') || 'الشهر الماضي', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
          ]}
        />
      </div>

      {/* Main KPI cards */}
      <Row gutter={[16, 16]}>
        {mainCards.map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.title}>
            <Card className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="stat-icon" style={{ background: c.bg, color: c.color }}>
                  {c.icon}
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 2 }}>{c.title}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
                    {c.value}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Clinical breakdown tiles */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {clinicalTiles.map((tile) => (
          <Col xs={12} sm={8} lg={6} key={tile.label}>
            <div className="tile" style={{ background: tile.grad, minHeight: 92, padding: '16px 18px' }}>
              <div>
                <div className="tile-label" style={{ fontSize: 13 }}>{tile.label}</div>
                <div className="tile-value" style={{ fontSize: 26 }}>{tile.value}</div>
              </div>
              <span className="tile-icon" style={{ fontSize: 28 }}>{tile.icon}</span>
            </div>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title={t('revenue_trend')}>
            <RevenueLine data={data.revenue_by_day} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={t('visits_dist')}>
            <Donut data={donutData} />
          </Card>
        </Col>
      </Row>

      <Card title={t('appointments_in_period')} style={{ marginTop: 16 }}>
        <Table
          rowKey="id"
          pagination={false}
          dataSource={data.appointments_today_list}
          locale={{ emptyText: t('no_appointments_today') }}
          columns={[
            { title: t('patient'), dataIndex: 'patient_name' },
            { title: t('dentist'), dataIndex: 'dentist_name', render: (v) => v || '—' },
            { title: t('time'), dataIndex: 'scheduled_at', render: (v) => dayjs(v).format('HH:mm') },
            { title: t('visit_type'), dataIndex: 'visit_type', render: (v) => <Tag>{te('vt', v)}</Tag> },
            {
              title: t('visit_fee'),
              dataIndex: 'fee',
              render: (v, r) =>
                Number(v) > 0 ? (
                  <span>
                    {money(v)}{' '}
                    <Tag color={r.fee_paid ? 'green' : 'orange'}>
                      {r.fee_paid ? t('collected') : t('not_collected')}
                    </Tag>
                  </span>
                ) : (
                  <Tag>{t('free')}</Tag>
                ),
            },
            {
              title: t('status'),
              dataIndex: 'status',
              render: (_, r) => <Tag color={statusColor(r.status)}>{te('st', r.status)}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  )
}
