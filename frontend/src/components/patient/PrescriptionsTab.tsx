import { useState } from 'react'
import { App, AutoComplete, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table } from 'antd'
import { DeleteOutlined, PlusOutlined, PrinterOutlined, WhatsAppOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useCreatePrescriptionMutation,
  useDeletePrescriptionMutation,
  useGetDentistsQuery,
  useGetDrugsQuery,
  useGetPrescriptionsQuery,
  useGetClinicSettingsQuery,
} from '../../app/api'
import { printHtml, waLink } from '../../utils'
import { currentLang, useLang } from '../../i18n'
import type { ClinicSettings, Prescription } from '../../types'

/** Text version of a prescription for WhatsApp (wa.me sends text only). */
function prescriptionWaLink(rx: Prescription, settings?: ClinicSettings): string {
  const en = currentLang() === 'en'
  const clinic = settings?.clinic_name || (en ? 'Dental Clinic' : 'عيادة الأسنان')
  const head = en ? `Prescription from ${clinic}` : `روشتة من ${clinic}`
  const lines = rx.items.map((i) => {
    const parts = [i.dosage, i.frequency, i.duration].filter(Boolean).join(' - ')
    return `• ${i.drug_name}${parts ? ` (${parts})` : ''}`
  })
  const notes = rx.notes ? `\n${en ? 'Instructions' : 'تعليمات'}: ${rx.notes}` : ''
  const msg = `${en ? 'Hello' : 'مرحباً'} ${rx.patient_name} 🦷\n${head}:\n${lines.join('\n')}${notes}`
  return waLink(rx.patient_phone, msg, settings?.whatsapp_country_code || '20')
}

function printPrescription(rx: Prescription, settings?: ClinicSettings) {
  const en = currentLang() === 'en'
  const L = {
    header: en ? 'Prescription ℞' : 'روشتة ℞',
    patient: en ? 'Patient' : 'المريض',
    age: en ? 'Age' : 'السن',
    dentist: en ? 'Dentist' : 'الطبيب',
    date: en ? 'Date' : 'التاريخ',
    drug: en ? 'Drug' : 'الدواء',
    dosage: en ? 'Dosage' : 'الجرعة',
    frequency: en ? 'Frequency' : 'عدد المرات',
    duration: en ? 'Duration' : 'المدة',
    instructions: en ? 'Instructions' : 'تعليمات',
  }
  const rows = rx.items
    .map(
      (i) =>
        `<tr><td>${i.drug_name}</td><td>${i.dosage || '—'}</td><td>${i.frequency || '—'}</td><td>${i.duration || '—'}</td></tr>`,
    )
    .join('')
  printHtml(
    `${L.header} - ${rx.patient_name}`,
    `<h2>${L.header}</h2>
     <div class="meta">
       ${L.patient}: <b>${rx.patient_name}</b>${rx.patient_age ? ` — ${L.age}: ${rx.patient_age}` : ''}<br>
       ${L.dentist}: ${rx.dentist_name || '—'} · ${L.date}: ${dayjs(rx.created_at).format('YYYY-MM-DD')}
     </div>
     <table>
       <tr><th>${L.drug}</th><th>${L.dosage}</th><th>${L.frequency}</th><th>${L.duration}</th></tr>
       ${rows}
     </table>
     ${rx.notes ? `<p class="meta">${L.instructions}: ${rx.notes}</p>` : ''}`,
    { logoUrl: settings?.logo_url, clinicName: settings?.clinic_name },
  )
}

export default function PrescriptionsTab({ patientId }: { patientId: number }) {
  const { data } = useGetPrescriptionsQuery({ patient: patientId })
  const { data: dentists } = useGetDentistsQuery()
  const { data: drugs } = useGetDrugsQuery()
  const { data: settings } = useGetClinicSettingsQuery()
  const [createRx, { isLoading: saving }] = useCreatePrescriptionMutation()
  const [deleteRx] = useDeletePrescriptionMutation()
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  // Picking a drug from the catalog autofills its default dosage/frequency/duration.
  const onDrugSelect = (fieldName: number, drugName: string) => {
    const drug = drugs?.find((d) => d.name === drugName)
    if (!drug) return
    const items = form.getFieldValue('items') || []
    items[fieldName] = {
      ...items[fieldName],
      drug_name: drug.name,
      dosage: items[fieldName]?.dosage || drug.default_dosage,
      frequency: items[fieldName]?.frequency || drug.default_frequency,
      duration: items[fieldName]?.duration || drug.default_duration,
    }
    form.setFieldsValue({ items })
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      await createRx({ ...values, patient: patientId }).unwrap()
      message.success(t('rx_saved'))
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        {t('new_rx')}
      </Button>

      {data?.results.map((rx) => (
        <Card
          key={rx.id}
          size="small"
          style={{ marginBottom: 12 }}
          title={`${t('rx_word')} ${dayjs(rx.created_at).format('YYYY-MM-DD')} — ${rx.dentist_name || '—'}`}
          extra={
            <Space>
              <Button
                size="small"
                style={{ background: '#25D366', color: '#fff', border: 'none' }}
                icon={<WhatsAppOutlined />}
                href={prescriptionWaLink(rx, settings)}
                target="_blank"
              >
                {t('send_rx_whatsapp')}
              </Button>
              <Button size="small" icon={<PrinterOutlined />} onClick={() => printPrescription(rx, settings)}>
                {t('print_pdf')}
              </Button>
              <Popconfirm title={t('delete_confirm')} okText={t('yes')} cancelText={t('no')} okButtonProps={{ danger: true }} onConfirm={() => deleteRx(rx.id)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          }
        >
          <Table
            size="small"
            rowKey={(r) => String(r.id)}
            pagination={false}
            dataSource={rx.items}
            columns={[
              { title: t('drug'), dataIndex: 'drug_name' },
              { title: t('dosage'), dataIndex: 'dosage', render: (v) => v || '—' },
              { title: t('frequency'), dataIndex: 'frequency', render: (v) => v || '—' },
              { title: t('duration'), dataIndex: 'duration', render: (v) => v || '—' },
            ]}
          />
          {rx.notes && <p style={{ margin: '8px 0 0', color: '#64748b' }}>{t('instructions')}: {rx.notes}</p>}
        </Card>
      ))}
      {!data?.results.length && <p style={{ color: '#94a3b8' }}>{t('no_rx')}</p>}

      <Modal
        title={t('new_rx_title')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        okText={t('save')}
        cancelText={t('cancel')}
        width={680}
      >
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Form.Item name="dentist" label={t('dentist')}>
            <Select allowClear options={dentists?.map((d) => ({ value: d.id, label: d.full_name }))} />
          </Form.Item>
          <label>{t('drugs')}</label>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'drug_name']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <AutoComplete
                        placeholder={t('drug_placeholder')}
                        style={{ width: 200 }}
                        options={drugs?.map((d) => ({ value: d.name }))}
                        filterOption={(input, option) =>
                          (option?.value as string).toLowerCase().includes(input.toLowerCase())
                        }
                        onSelect={(v: string) => onDrugSelect(field.name, v)}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'dosage']} style={{ marginBottom: 0 }}>
                      <Input placeholder={t('dosage')} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'frequency']} style={{ marginBottom: 0 }}>
                      <Input placeholder={t('frequency')} style={{ width: 110 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'duration']} style={{ marginBottom: 0 }}>
                      <Input placeholder={t('duration')} style={{ width: 90 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <DeleteOutlined onClick={() => remove(field.name)} style={{ color: '#ef4444' }} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({})} block icon={<PlusOutlined />}>
                  {t('add_drug')}
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item name="notes" label={t('general_instructions')} style={{ marginTop: 12 }}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
