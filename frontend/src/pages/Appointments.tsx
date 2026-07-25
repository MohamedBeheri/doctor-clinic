import { useState } from 'react'
import {
  Card, Button, Table, Tag, Modal, Form, DatePicker, Select, Input, InputNumber, Space, App, Popconfirm,
} from 'antd'
import { PlusOutlined, WhatsAppOutlined, DollarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useGetDentistsQuery,
  useGetBranchesQuery,
  useGetClinicSettingsQuery,
  useCollectFeeMutation,
} from '../app/api'
import PatientSelect from '../components/PatientSelect'
import RowActions from '../components/RowActions'
import { statusColor, appointmentWaLink, money } from '../utils'
import { useLang } from '../i18n'
import type { Appointment, ClinicSettings, VisitType } from '../types'

const STATUS_CODES = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
const VISIT_TYPES: VisitType[] = ['exam', 're_exam', 'consultation', 'procedure']

export function defaultFeeFor(vt: VisitType, settings?: ClinicSettings): number {
  if (!settings) return 0
  if (vt === 'exam') return Number(settings.default_exam_fee)
  if (vt === 're_exam') return Number(settings.default_reexam_fee)
  if (vt === 'consultation') return Number(settings.default_consultation_fee)
  return 0
}

function ReminderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const { data: settings } = useGetClinicSettingsQuery()
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
  const { data } = useGetAppointmentsQuery({ date: tomorrow }, { skip: !open })
  const pending = data?.results.filter((a) => !['cancelled', 'no_show'].includes(a.status)) || []

  return (
    <Modal title={`${t('whatsapp_reminders_title')} (${tomorrow})`} open={open} onCancel={onClose} footer={null} width={560}>
      <Table<Appointment>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={pending}
        locale={{ emptyText: t('no_appts_tomorrow') }}
        columns={[
          { title: t('patient'), dataIndex: 'patient_name' },
          { title: t('appointment_col'), dataIndex: 'scheduled_at', render: (v) => dayjs(v).format('HH:mm') },
          { title: t('phone'), dataIndex: 'patient_phone' },
          {
            title: '',
            width: 130,
            render: (_, r) => (
              <Button
                size="small"
                style={{ background: '#25D366', color: '#fff', border: 'none' }}
                icon={<WhatsAppOutlined />}
                href={appointmentWaLink(r, settings)}
                target="_blank"
              >
                {t('send_reminder')}
              </Button>
            ),
          },
        ]}
      />
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 12 }}>{t('reminder_hint')}</p>
    </Modal>
  )
}

export default function Appointments() {
  const [date, setDate] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const { data, isFetching } = useGetAppointmentsQuery({ date })
  const { data: dentists } = useGetDentistsQuery()
  const { data: branches } = useGetBranchesQuery()
  const { data: settings } = useGetClinicSettingsQuery()
  const [createAppt, { isLoading: saving }] = useCreateAppointmentMutation()
  const [updateAppt] = useUpdateAppointmentMutation()
  const [deleteAppt] = useDeleteAppointmentMutation()
  const [collectFee] = useCollectFeeMutation()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const statusOptions = STATUS_CODES.map((c) => ({ value: c, label: te('st', c) }))
  const visitTypeOptions = VISIT_TYPES.map((v) => ({ value: v, label: te('vt', v) }))

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ visit_type: 'exam', fee: defaultFeeFor('exam', settings) })
    setOpen(true)
  }

  const startEdit = (a: Appointment) => {
    setEditing(a)
    form.setFieldsValue({
      patient: a.patient,
      dentist: a.dentist,
      branch: a.branch,
      scheduled_at: dayjs(a.scheduled_at),
      visit_type: a.visit_type,
      fee: Number(a.fee),
      reason: a.reason,
    })
    setOpen(true)
  }

  const onCollect = async (id: number) => {
    try {
      await collectFee({ id }).unwrap()
      message.success(t('fee_collected_msg'))
    } catch (e: any) {
      message.error(e?.data?.detail || t('error_generic'))
    }
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const body = { ...values, scheduled_at: dayjs(values.scheduled_at).toISOString() }
    try {
      if (editing) {
        await updateAppt({ id: editing.id, body }).unwrap()
        message.success(t('updated'))
      } else {
        await createAppt(body).unwrap()
        message.success(t('booked'))
      }
      setOpen(false)
      form.resetFields()
    } catch (e: any) {
      message.error(e?.data?.scheduled_at?.[0] || t('error_generic'))
    }
  }

  const changeStatus = async (id: number, status: string) => {
    await updateAppt({ id, body: { status: status as Appointment['status'] } })
  }

  return (
    <Card
      title={t('appointments')}
      extra={
        <Space>
          <Button
            style={{ background: '#25D366', color: '#fff', border: 'none' }}
            icon={<WhatsAppOutlined />}
            onClick={() => setRemindersOpen(true)}
          >
            {t('tomorrow_reminders')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>
            {t('new_appointment')}
          </Button>
        </Space>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <DatePicker
          placeholder={t('filter_by_date')}
          onChange={(d) => setDate(d ? d.format('YYYY-MM-DD') : undefined)}
        />
      </Space>
      <Table<Appointment>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: t('appointment_col'), dataIndex: 'scheduled_at', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
          { title: t('patient'), dataIndex: 'patient_name' },
          { title: t('dentist'), dataIndex: 'dentist_name', render: (v) => v || '—' },
          { title: t('visit_type'), dataIndex: 'visit_type', width: 100, render: (v) => <Tag color="geekblue">{te('vt', v)}</Tag> },
          {
            title: t('booking_source'), dataIndex: 'source', width: 100,
            render: (v) => v === 'whatsapp'
              ? <Tag color="green">📱 {te('src', v)}</Tag>
              : v && v !== 'walk_in'
              ? <Tag>{te('src', v)}</Tag>
              : null,
          },
          {
            title: t('visit_fee'),
            dataIndex: 'fee',
            width: 150,
            render: (v, r) =>
              Number(v) > 0 ? (
                r.fee_paid_at ? (
                  <Tag color="green">{money(v)} ✓</Tag>
                ) : (
                  <Space size={4}>
                    <span>{money(v)}</span>
                    <Button size="small" type="primary" ghost icon={<DollarOutlined />} onClick={() => onCollect(r.id)}>
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
            render: (_, r) => (
              <Select
                size="small"
                value={r.status}
                variant="borderless"
                style={{ width: 130 }}
                onChange={(v) => changeStatus(r.id, v)}
                options={statusOptions}
                labelRender={() => <Tag color={statusColor(r.status)}>{te('st', r.status)}</Tag>}
              />
            ),
          },
          {
            title: t('actions'),
            width: 130,
            render: (_, r) => (
              <Space size={4}>
                <Button
                  size="small"
                  type="text"
                  title={t('send_reminder')}
                  style={{ color: '#25D366' }}
                  icon={<WhatsAppOutlined />}
                  href={appointmentWaLink(r, settings)}
                  target="_blank"
                />
                <RowActions
                  onEdit={() => startEdit(r)}
                  onDelete={() => deleteAppt(r.id)}
                  deleteTitle={t('delete_appt_confirm')}
                />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('edit') : t('new_appointment')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving} okText={editing ? t('save') : t('book')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="patient" label={t('patient')} rules={[{ required: true, message: t('choose_patient') }]}>
            <PatientSelect />
          </Form.Item>
          <Form.Item name="dentist" label={t('dentist')}>
            <Select
              allowClear
              options={dentists?.map((d) => ({ value: d.id, label: `${d.full_name} (${d.specialty})` }))}
            />
          </Form.Item>
          <Form.Item name="branch" label={t('branch')}>
            <Select
              allowClear
              options={branches?.results
                .filter((b) => b.is_active)
                .map((b) => ({ value: b.id, label: b.name }))}
            />
          </Form.Item>
          <Form.Item name="scheduled_at" label={t('datetime')} rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="visit_type" label={t('visit_type')} style={{ flex: 1 }}>
              <Select
                style={{ width: 150 }}
                options={visitTypeOptions}
                onChange={(v) => form.setFieldsValue({ fee: defaultFeeFor(v, settings) })}
              />
            </Form.Item>
            <Form.Item name="fee" label={t('visit_fee')} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: 140 }} />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label={t('reason')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <ReminderModal open={remindersOpen} onClose={() => setRemindersOpen(false)} />
    </Card>
  )
}
