import { useState } from 'react'
import {
  App, Button, Card, Col, DatePicker, Descriptions, Divider, Form, Input, InputNumber, Modal,
  Row, Select, Space, Statistic, Switch, Table, Tabs, Tag,
} from 'antd'
import {
  UserAddOutlined, CalendarOutlined, TeamOutlined, ClockCircleOutlined,
  CheckOutlined, WhatsAppOutlined, FolderOpenOutlined, PlusOutlined, SearchOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useCreatePatientMutation,
  useGetPatientQuery,
  useGetDentistsQuery,
  useDashboardQuery,
  useGetClinicSettingsQuery,
  useCollectFeeMutation,
  useCheckInAppointmentMutation,
} from '../app/api'
import PatientSelect from '../components/PatientSelect'
import { statusColor, appointmentWaLink, money } from '../utils'
import { useLang } from '../i18n'
import { defaultFeeFor } from './Appointments'
import type { Appointment, VisitType } from '../types'

const VISIT_TYPES: VisitType[] = ['exam', 're_exam', 'consultation', 'procedure']

/** Register modal: register a new patient (with age + optional booking) OR find a returning one and book. */
function RegisterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t, te } = useLang()
  const { data: dentists } = useGetDentistsQuery()
  const { data: settings } = useGetClinicSettingsQuery()
  const [createPatient, { isLoading: savingPatient }] = useCreatePatientMutation()
  const [createAppointment, { isLoading: booking }] = useCreateAppointmentMutation()
  const [tab, setTab] = useState('new')
  const [bookNew, setBookNew] = useState(false)
  const [existingId, setExistingId] = useState<number | undefined>()
  const [newForm] = Form.useForm()
  const [bookForm] = Form.useForm()
  const { data: existing } = useGetPatientQuery(existingId!, { skip: !existingId })

  const dentistOptions = dentists?.map((d) => ({ value: d.id, label: `${d.full_name}${d.specialty ? ` (${d.specialty})` : ''}` }))

  const close = () => {
    setTab('new')
    setBookNew(false)
    setExistingId(undefined)
    newForm.resetFields()
    bookForm.resetFields()
    onClose()
  }

  // Approximate DOB from an entered age (reception speed shortcut).
  const ageToDob = (age?: number) =>
    age ? dayjs().subtract(age, 'year').startOf('year').format('YYYY-MM-DD') : null

  const onSaveNew = async () => {
    const v = await newForm.validateFields()
    try {
      const patient = await createPatient({
        full_name: v.full_name,
        gender: v.gender,
        phone: v.phone,
        date_of_birth: ageToDob(v.age),
      }).unwrap()
      if (bookNew && v.scheduled_at) {
        await createAppointment({
          patient: patient.id,
          dentist: v.dentist,
          scheduled_at: dayjs(v.scheduled_at).toISOString(),
          visit_type: v.visit_type,
          fee: v.fee,
          reason: v.reason,
        }).unwrap()
        message.success(t('booked'))
      } else {
        message.success(t('patient_added'))
      }
      close()
    } catch {
      message.error(t('error_generic'))
    }
  }

  const onBookExisting = async () => {
    if (!existingId) {
      message.warning(t('select_patient_first'))
      return
    }
    const v = await bookForm.validateFields()
    try {
      await createAppointment({
        patient: existingId,
        dentist: v.dentist,
        scheduled_at: dayjs(v.scheduled_at).toISOString(),
        visit_type: v.visit_type,
        fee: v.fee,
        reason: v.reason,
      }).unwrap()
      message.success(t('booked'))
      close()
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <Modal
      title={t('quick_register')}
      open={open}
      onCancel={close}
      width={560}
      footer={null}
      destroyOnHidden
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'new',
            label: t('tab_new_patient'),
            forceRender: true,
            children: (
              <Form form={newForm} layout="vertical">
                <Form.Item name="full_name" label={t('full_name')} rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Space style={{ display: 'flex' }} align="baseline">
                  <Form.Item name="gender" label={t('gender')} rules={[{ required: true }]} style={{ flex: 1 }}>
                    <Select
                      style={{ width: 110 }}
                      options={[
                        { value: 'male', label: t('gender_male') },
                        { value: 'female', label: t('gender_female') },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item name="age" label={t('age_years')} style={{ width: 110 }}>
                    <Input type="number" min={0} max={120} suffix={t('age')} />
                  </Form.Item>
                  <Form.Item name="phone" label={t('phone')} rules={[{ required: true }]} style={{ flex: 1 }}>
                    <Input />
                  </Form.Item>
                </Space>

                <Divider style={{ margin: '4px 0 12px' }} />
                <Space align="center" style={{ marginBottom: bookNew ? 12 : 0 }}>
                  <Switch checked={bookNew} onChange={setBookNew} />
                  <span>{t('book_now')}</span>
                </Space>

                {bookNew && (
                  <>
                    <Form.Item name="dentist" label={t('dentist')}>
                      <Select allowClear options={dentistOptions} placeholder={t('dentist')} />
                    </Form.Item>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Form.Item name="visit_type" label={t('visit_type')} initialValue="exam" style={{ flex: 1 }}>
                        <Select
                          style={{ width: 140 }}
                          options={VISIT_TYPES.map((v) => ({ value: v, label: te('vt', v) }))}
                          onChange={(v) => newForm.setFieldsValue({ fee: defaultFeeFor(v, settings) })}
                        />
                      </Form.Item>
                      <Form.Item name="fee" label={t('visit_fee')} initialValue={defaultFeeFor('exam', settings)} style={{ flex: 1 }}>
                        <InputNumber min={0} style={{ width: 120 }} />
                      </Form.Item>
                    </Space>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Form.Item name="scheduled_at" label={t('appointment_time')} rules={[{ required: true }]} style={{ flex: 1 }}>
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="reason" label={t('reason')} style={{ flex: 1 }}>
                        <Input />
                      </Form.Item>
                    </Space>
                  </>
                )}

                <div style={{ textAlign: 'end', marginTop: 8 }}>
                  <Space>
                    <Button onClick={close}>{t('cancel')}</Button>
                    <Button type="primary" loading={savingPatient || booking} onClick={onSaveNew}>
                      {bookNew ? t('save_and_book') : t('save')}
                    </Button>
                  </Space>
                </div>
              </Form>
            ),
          },
          {
            key: 'existing',
            label: t('tab_existing_patient'),
            forceRender: true,
            children: (
              <Form form={bookForm} layout="vertical">
                <label style={{ display: 'block', marginBottom: 6 }}>{t('search_existing')}</label>
                <PatientSelect value={existingId} onChange={setExistingId} />

                {existing && (
                  <>
                    <Descriptions column={2} size="small" bordered style={{ marginTop: 16 }}>
                      <Descriptions.Item label={t('file_number')}>{existing.file_number}</Descriptions.Item>
                      <Descriptions.Item label={t('phone')}>{existing.phone}</Descriptions.Item>
                      <Descriptions.Item label={t('age')}>{existing.age ?? '—'}</Descriptions.Item>
                      <Descriptions.Item label={t('gender')}>{existing.gender_display}</Descriptions.Item>
                      <Descriptions.Item label={t('allergies')} span={2}>{existing.allergies || '—'}</Descriptions.Item>
                      <Descriptions.Item label={t('registered_on')} span={2}>
                        {dayjs(existing.created_at).format('YYYY-MM-DD')}
                      </Descriptions.Item>
                    </Descriptions>

                    <Button
                      type="link"
                      icon={<FolderOpenOutlined />}
                      style={{ paddingInline: 0, marginTop: 6 }}
                      onClick={() => { close(); navigate(`/patients/${existing.id}`) }}
                    >
                      {t('open_patient')}
                    </Button>

                    <Divider>{t('book_appointment')}</Divider>
                    <Form.Item name="dentist" label={t('dentist')}>
                      <Select allowClear options={dentistOptions} />
                    </Form.Item>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Form.Item name="visit_type" label={t('visit_type')} initialValue="consultation" style={{ flex: 1 }}>
                        <Select
                          style={{ width: 140 }}
                          options={VISIT_TYPES.map((v) => ({ value: v, label: te('vt', v) }))}
                          onChange={(v) => bookForm.setFieldsValue({ fee: defaultFeeFor(v, settings) })}
                        />
                      </Form.Item>
                      <Form.Item name="fee" label={t('visit_fee')} initialValue={defaultFeeFor('consultation', settings)} style={{ flex: 1 }}>
                        <InputNumber min={0} style={{ width: 120 }} />
                      </Form.Item>
                    </Space>
                    <Space style={{ display: 'flex' }} align="baseline">
                      <Form.Item name="scheduled_at" label={t('appointment_time')} rules={[{ required: true }]} style={{ flex: 1 }}>
                        <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
                      </Form.Item>
                      <Form.Item name="reason" label={t('reason')} style={{ flex: 1 }}>
                        <Input />
                      </Form.Item>
                    </Space>
                    <div style={{ textAlign: 'end' }}>
                      <Button type="primary" icon={<CalendarOutlined />} loading={booking} onClick={onBookExisting}>
                        {t('book_appointment')}
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  )
}

export default function Reception() {
  const today = dayjs().format('YYYY-MM-DD')
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t, te } = useLang()
  const { data, isFetching } = useGetAppointmentsQuery({ date: today })
  const { data: stats } = useDashboardQuery()
  const { data: settings } = useGetClinicSettingsQuery()
  const [collectFee] = useCollectFeeMutation()
  const [checkInAppt] = useCheckInAppointmentMutation()
  const [open, setOpen] = useState(false)

  const list = data?.results || []
  const waiting = list.filter((a) => a.status === 'scheduled').length

  const checkIn = async (a: Appointment) => {
    try {
      await checkInAppt(a.id).unwrap()
      message.success(t('checked_in'))
    } catch {
      message.error(t('error_generic'))
    }
  }

  const cards = [
    { title: t('appointments_today'), value: list.length, icon: <CalendarOutlined />, color: '#2563eb', bg: '#dbeafe' },
    { title: t('waiting'), value: waiting, icon: <ClockCircleOutlined />, color: '#d97706', bg: '#fef3c7' },
    { title: t('registered_patients'), value: stats?.patients_total ?? 0, icon: <TeamOutlined />, color: '#0d9488', bg: '#ccfbf1' },
  ]

  return (
    <div>
      <h2 className="page-title">{t('reception_desk')}</h2>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {cards.map((c) => (
          <Col xs={24} sm={8} key={c.title}>
            <Card className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="stat-icon" style={{ background: c.bg, color: c.color }}>{c.icon}</div>
                <Statistic title={c.title} value={c.value} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={t('quick_actions')} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12}>
            <label style={{ display: 'block', marginBottom: 6, color: '#64748b', fontSize: 13 }}>
              <SearchOutlined /> {t('search_existing')}
            </label>
            <PatientSelect onChange={(id) => navigate(`/patients/${id}`)} />
          </Col>
          <Col xs={24} md={12}>
            <Space wrap style={{ marginTop: 22 }}>
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setOpen(true)}>
                {t('quick_register')}
              </Button>
              <Button icon={<CalendarOutlined />} onClick={() => navigate('/appointments')}>
                {t('new_appointment')}
              </Button>
              <Button icon={<PlusOutlined />} onClick={() => navigate('/invoices')}>
                {t('new_invoice')}
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title={`${t('todays_queue')} — ${today}`}>
        <Table<Appointment>
          rowKey="id"
          loading={isFetching}
          dataSource={list}
          pagination={false}
          locale={{ emptyText: t('no_appointments_today') }}
          columns={[
            { title: t('time'), dataIndex: 'scheduled_at', width: 90, render: (v) => dayjs(v).format('HH:mm') },
            { title: t('patient'), dataIndex: 'patient_name' },
            { title: t('dentist'), dataIndex: 'dentist_name', render: (v) => v || '—' },
            { title: t('visit_type'), dataIndex: 'visit_type', width: 100, render: (v) => <Tag color="geekblue">{te('vt', v)}</Tag> },
            {
              title: t('visit_fee'),
              dataIndex: 'fee',
              width: 160,
              render: (v, r) =>
                Number(v) > 0 ? (
                  r.fee_paid_at ? (
                    <Tag color="green">{money(v)} ✓</Tag>
                  ) : (
                    <Space size={4}>
                      <span>{money(v)}</span>
                      <Button
                        size="small"
                        type="primary"
                        ghost
                        icon={<DollarOutlined />}
                        onClick={async () => {
                          try {
                            await collectFee({ id: r.id }).unwrap()
                            message.success(t('fee_collected_msg'))
                          } catch (e: any) {
                            message.error(e?.data?.detail || t('error_generic'))
                          }
                        }}
                      >
                        {t('collect')}
                      </Button>
                    </Space>
                  )
                ) : (
                  <Tag>{t('free')}</Tag>
                ),
            },
            {
              title: t('status'),
              dataIndex: 'status',
              render: (_, r) => <Tag color={statusColor(r.status)}>{te('st', r.status)}</Tag>,
            },
            {
              title: t('actions'),
              width: 200,
              render: (_, r) => (
                <Space size={4}>
                  {r.status === 'scheduled' && (
                    <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => checkIn(r)}>
                      {t('check_in')}
                    </Button>
                  )}
                  <Button size="small" icon={<FolderOpenOutlined />} onClick={() => navigate(`/patients/${r.patient}`)}>
                    {t('open_patient')}
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    style={{ color: '#25D366' }}
                    icon={<WhatsAppOutlined />}
                    href={appointmentWaLink(r, settings)}
                    target="_blank"
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <RegisterModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
