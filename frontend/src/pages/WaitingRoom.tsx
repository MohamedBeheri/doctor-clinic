import { App, Badge, Button, Card, Col, Empty, Row, Select, Space, Tag, Tooltip } from 'antd'
import {
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckOutlined,
  LoginOutlined,
  RollbackOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useGetAppointmentsQuery,
  useGetDentistsQuery,
  useSetQueueStateMutation,
  useMoveQueueMutation,
} from '../app/api'
import { useLang } from '../i18n'
import type { Appointment } from '../types'

function PatientCard({
  a,
  next,
  children,
}: {
  a: Appointment
  next?: boolean
  children: React.ReactNode
}) {
  const { t } = useLang()
  const navigate = useNavigate()
  return (
    <div
      style={{
        border: next ? '2px solid #2563eb' : '1px solid #e2e8f0',
        background: next ? 'linear-gradient(135deg,#eff6ff,#ffffff)' : '#fff',
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar next={next} order={a.queue_order} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            <a
              onClick={() => navigate(`/patients/${a.patient}`)}
              style={{ color: '#2563eb', cursor: 'pointer' }}
              title={t('open_file')}
            >
              {a.patient_name}
            </a>{' '}
            {next && <Tag color="blue" style={{ marginInlineStart: 4 }}>{t('next_patient')}</Tag>}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
            <span><ClockCircleOutlined /> {t('appt_time')}: {dayjs(a.scheduled_at).format('hh:mm A')}</span>
            {a.checked_in_at && <span>{t('arrived_at')}: {dayjs(a.checked_in_at).format('hh:mm A')}</span>}
            <Tag>{a.visit_type_display}</Tag>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Avatar({ next, order }: { next?: boolean; order: number }) {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        color: '#fff',
        flexShrink: 0,
        background: next ? '#2563eb' : '#94a3b8',
      }}
    >
      {order || <UserOutlined />}
    </div>
  )
}

export default function WaitingRoom() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const today = dayjs().format('YYYY-MM-DD')
  const { data: dentists } = useGetDentistsQuery()
  const [dentist, setDentist] = useState<number | undefined>()
  const { data, isFetching } = useGetAppointmentsQuery(
    { date: today, page: 1 },
    { pollingInterval: 20_000 },
  )
  const [setState] = useSetQueueStateMutation()
  const [move] = useMoveQueueMutation()

  const all = (data?.results || []).filter(
    (a) => a.queue_status && (!dentist || a.dentist === dentist),
  )
  const waiting = all
    .filter((a) => a.queue_status === 'waiting')
    .sort((a, b) => a.queue_order - b.queue_order)
  const inRoom = all.filter((a) => a.queue_status === 'in_room')
  const done = all.filter((a) => a.queue_status === 'done')

  const act = async (fn: Promise<unknown>, ok: string) => {
    try {
      await fn
      message.success(ok)
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <div>
      <div className="hero-banner" style={{ marginBottom: 16 }}>
        <div>
          <h1>{t('waiting_room')}</h1>
          <p>{dayjs().format('dddd — DD MMMM YYYY')}</p>
        </div>
        <span className="hero-icon"><ClockCircleOutlined /></span>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          allowClear
          placeholder={t('dentist')}
          style={{ minWidth: 200 }}
          value={dentist}
          onChange={setDentist}
          options={dentists?.map((d) => ({ value: d.id, label: d.full_name }))}
        />
        <Tag color="blue">{t('waiting_count')}: {waiting.length}</Tag>
        <Tag color="green">{t('inside_room')}: {inRoom.length}</Tag>
        <Tag>{t('done_today')}: {done.length}</Tag>
      </Space>

      <Row gutter={[16, 16]} align="stretch">
        {/* Outside the exam room */}
        <Col xs={24} lg={11}>
          <Card
            loading={isFetching && !data}
            title={
              <span>
                <span style={{ color: '#94a3b8', marginInlineEnd: 6 }}>◔</span>
                {t('outside_room')} · {t('todays_queue')}
              </span>
            }
            styles={{ body: { minHeight: 360 } }}
          >
            {waiting.length === 0 ? (
              <Empty description={t('no_one_waiting')} />
            ) : (
              waiting.map((a, i) => (
                <PatientCard key={a.id} a={a} next={i === 0}>
                  <Button
                    type="primary"
                    size="small"
                    icon={<LoginOutlined />}
                    onClick={() => act(setState({ id: a.id, state: 'in_room' }).unwrap(), t('inside_room'))}
                  >
                    {t('call_in')}
                  </Button>
                  <Tooltip title={t('move_up')}>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={i === 0}
                      onClick={() => move({ id: a.id, dir: 'up' })}
                    />
                  </Tooltip>
                  <Tooltip title={t('move_down')}>
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={i === waiting.length - 1}
                      onClick={() => move({ id: a.id, dir: 'down' })}
                    />
                  </Tooltip>
                </PatientCard>
              ))
            )}
          </Card>
        </Col>

        {/* Connector */}
        <Col xs={24} lg={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#2563eb' }}>
            <ArrowRightOutlined className="wr-arrow" style={{ fontSize: 30 }} />
          </div>
        </Col>

        {/* Inside the exam room */}
        <Col xs={24} lg={11}>
          <Card
            title={
              <span>
                <Badge status="processing" color="#22c55e" />
                {t('inside_room')}
              </span>
            }
            styles={{ body: { minHeight: 360 } }}
          >
            {inRoom.length === 0 ? (
              <Empty description={t('no_one_in_room')} />
            ) : (
              inRoom.map((a) => (
                <PatientCard key={a.id} a={a}>
                  <Button
                    size="small"
                    icon={<FolderOpenOutlined />}
                    onClick={() => navigate(`/patients/${a.patient}`)}
                  >
                    {t('open_file')}
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    style={{ background: '#22c55e' }}
                    icon={<CheckOutlined />}
                    onClick={() => act(setState({ id: a.id, state: 'done' }).unwrap(), t('done_today'))}
                  >
                    {t('finish_visit')}
                  </Button>
                  <Button
                    size="small"
                    icon={<RollbackOutlined />}
                    onClick={() => act(setState({ id: a.id, state: 'waiting' }).unwrap(), t('return_to_wait'))}
                  >
                    {t('return_to_wait')}
                  </Button>
                </PatientCard>
              ))
            )}

            {done.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                  {t('done_today')} ({done.length})
                </div>
                <Space wrap>
                  {done.map((a) => (
                    <Tag key={a.id} icon={<CheckOutlined />} color="default">
                      {a.patient_name}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
