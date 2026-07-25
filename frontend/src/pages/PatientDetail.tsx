import { useState } from 'react'
import {
  Card, Descriptions, Tabs, Table, Button, Modal, Form, InputNumber, Input,
  Space, Tag, Spin, App, Row, Col,
} from 'antd'
import { PlusOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  useGetPatientQuery,
  usePatientRecordsQuery,
  usePatientAppointmentsQuery,
  useCreateRecordMutation,
  useUpdateRecordMutation,
  useDeleteRecordMutation,
} from '../app/api'
import RowActions from '../components/RowActions'
import type { TreatmentRecord } from '../types'
import PlansTab from '../components/patient/PlansTab'
import PrescriptionsTab from '../components/patient/PrescriptionsTab'
import FilesTab from '../components/patient/FilesTab'
import InvoicesTab from '../components/patient/InvoicesTab'
import { statusColor, money } from '../utils'
import { useLang } from '../i18n'

export default function PatientDetail() {
  const { id } = useParams()
  const pid = Number(id)
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t, te, lang } = useLang()
  const { data: patient, isLoading } = useGetPatientQuery(pid)
  const { data: records } = usePatientRecordsQuery(pid)
  const { data: appointments } = usePatientAppointmentsQuery(pid)
  const [createRecord, { isLoading: saving }] = useCreateRecordMutation()
  const [updateRecord, { isLoading: updating }] = useUpdateRecordMutation()
  const [deleteRecord] = useDeleteRecordMutation()
  const [open, setOpen] = useState(false)
  const [editingRec, setEditingRec] = useState<TreatmentRecord | null>(null)
  const [form] = Form.useForm()

  if (isLoading || !patient) return <Spin size="large" style={{ display: 'block', marginTop: 80 }} />

  const startCreateRec = () => {
    setEditingRec(null)
    form.resetFields()
    setOpen(true)
  }

  const startEditRec = (r: TreatmentRecord) => {
    setEditingRec(r)
    form.setFieldsValue({ ...r, cost: Number(r.cost) })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const body = { ...values, patient: pid }
    try {
      if (editingRec) {
        await updateRecord({ id: editingRec.id, body }).unwrap()
        message.success(t('updated'))
      } else {
        await createRecord(body).unwrap()
        message.success(t('record_added'))
      }
      setOpen(false)
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <div>
      <Button
        icon={lang === 'ar' ? <ArrowRightOutlined /> : <ArrowLeftOutlined />}
        onClick={() => navigate('/patients')}
        style={{ marginBottom: 16 }}
      >
        {t('back')}
      </Button>

      <Row gutter={[16, 16]}>
        <Col xs={24}>
          <Card
            title={`${t('patient_file')} — ${patient.file_number}`}
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={startCreateRec}>
                {t('treatment_record')}
              </Button>
            }
          >
            <Descriptions column={{ xs: 1, sm: 2, lg: 3 }} size="small">
              <Descriptions.Item label={t('name')}>{patient.full_name}</Descriptions.Item>
              <Descriptions.Item label={t('gender')}>{te('gender', patient.gender)}</Descriptions.Item>
              <Descriptions.Item label={t('age')}>{patient.age ?? '—'}</Descriptions.Item>
              <Descriptions.Item label={t('phone')}>{patient.phone}</Descriptions.Item>
              <Descriptions.Item label={t('allergies')}>{patient.allergies || '—'}</Descriptions.Item>
              <Descriptions.Item label={t('chronic_diseases')}>{patient.chronic_diseases || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'records',
              label: t('tab_records'),
              children: (
                <Table
                  rowKey="id"
                  dataSource={records}
                  pagination={false}
                  locale={{ emptyText: t('no_records') }}
                  columns={[
                    { title: t('date'), dataIndex: 'created_at', render: (v) => dayjs(v).format('YYYY-MM-DD') },
                    { title: t('complaint'), dataIndex: 'complaint', render: (v) => v || '—' },
                    { title: t('diagnosis'), dataIndex: 'diagnosis' },
                    { title: t('treatment_col'), dataIndex: 'treatment', render: (v) => v || '—' },
                    { title: t('cost'), dataIndex: 'cost', render: (v) => money(v) },
                    {
                      title: t('actions'),
                      width: 90,
                      render: (_, r) => (
                        <RowActions onEdit={() => startEditRec(r)} onDelete={() => deleteRecord(r.id)} />
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'appointments',
              label: t('appointments'),
              children: (
                <Table
                  rowKey="id"
                  dataSource={appointments}
                  pagination={false}
                  locale={{ emptyText: t('no_appointments') }}
                  columns={[
                    { title: t('appointment_col'), dataIndex: 'scheduled_at', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                    { title: t('dentist'), dataIndex: 'dentist_name', render: (v) => v || '—' },
                    { title: t('reason_col'), dataIndex: 'reason', render: (v) => v || '—' },
                    { title: t('status'), dataIndex: 'status', render: (_, r) => <Tag color={statusColor(r.status)}>{te('st', r.status)}</Tag> },
                  ]}
                />
              ),
            },
            { key: 'invoices', label: t('tab_invoices'), children: <InvoicesTab patientId={pid} /> },
            { key: 'plans', label: t('tab_plans'), children: <PlansTab patientId={pid} /> },
            { key: 'prescriptions', label: t('tab_prescriptions'), children: <PrescriptionsTab patientId={pid} /> },
            { key: 'files', label: t('tab_files'), children: <FilesTab patientId={pid} /> },
          ]}
        />
      </Card>

      <Modal
        title={editingRec ? t('edit') : t('new_treatment_record')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={saving || updating}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="complaint" label={t('complaint')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="diagnosis" label={t('diagnosis')} rules={[{ required: true }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="treatment" label={t('treatment_given')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="prescription" label={t('prescription_field')} style={{ flex: 1 }}>
              <Input.TextArea rows={1} />
            </Form.Item>
            <Form.Item name="cost" label={t('cost')} style={{ width: 120 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
