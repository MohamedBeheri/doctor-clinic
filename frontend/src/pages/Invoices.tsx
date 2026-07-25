import { useState } from 'react'
import {
  Card, Button, Table, Tag, Modal, Form, Input, InputNumber, Select, Space,
  App, Drawer, Descriptions, Divider, Statistic, Row, Col,
} from 'antd'
import {
  PlusOutlined, DollarOutlined, DeleteOutlined, PrinterOutlined, ScheduleOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useAddPaymentMutation,
  useCreateInstallmentsMutation,
  usePayInstallmentMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useGetClinicSettingsQuery,
} from '../app/api'
import PatientSelect from '../components/PatientSelect'
import RowActions from '../components/RowActions'
import { invoiceColor, money, printHtml, invoiceWaLink } from '../utils'
import { useLang, currentLang } from '../i18n'
import type { Invoice } from '../types'

function printInvoice(inv: Invoice, settings?: { logo_url: string | null; clinic_name: string }) {
  const en = currentLang() === 'en'
  const L = {
    item: en ? 'Item' : 'البند',
    qty: en ? 'Qty' : 'الكمية',
    price: en ? 'Price' : 'السعر',
    total: en ? 'Total' : 'الإجمالي',
    patient: en ? 'Patient' : 'المريض',
    date: en ? 'Date' : 'التاريخ',
    status: en ? 'Status' : 'الحالة',
    invoice: en ? 'Invoice' : 'فاتورة',
    subtotal: en ? 'Subtotal' : 'الإجمالي قبل الخصم',
    discount: en ? 'Discount' : 'الخصم',
    paid: en ? 'Paid' : 'المدفوع',
    balance: en ? 'Balance' : 'المتبقي',
    egp: en ? 'EGP' : 'ج.م',
  }
  const rows = inv.items
    .map((i) => `<tr><td>${i.description}</td><td>${i.quantity}</td><td>${i.unit_price}</td><td>${i.total}</td></tr>`)
    .join('')
  printHtml(
    `${L.invoice} ${inv.number}`,
    `<h2>${L.invoice} ${inv.number}</h2>
     <div class="meta">
       ${L.patient}: <b>${inv.patient_name}</b> (${inv.patient_file})<br>
       ${L.date}: ${dayjs(inv.created_at).format('YYYY-MM-DD')}
     </div>
     <table>
       <tr><th>${L.item}</th><th>${L.qty}</th><th>${L.price}</th><th>${L.total}</th></tr>
       ${rows}
     </table>
     <div class="totals">
       <div>${L.subtotal}: <b>${inv.subtotal}</b> ${L.egp}</div>
       ${Number(inv.discount) ? `<div>${L.discount}: ${inv.discount} ${L.egp}</div>` : ''}
       <div>${L.total}: <b>${inv.total}</b> ${L.egp}</div>
       <div>${L.paid}: ${inv.paid_amount} ${L.egp} — ${L.balance}: <b>${inv.balance}</b> ${L.egp}</div>
     </div>`,
    { logoUrl: settings?.logo_url, clinicName: settings?.clinic_name },
  )
}

function InvoiceDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data: invoice } = useGetInvoiceQuery(id!, { skip: !id })
  const { data: settings } = useGetClinicSettingsQuery()
  const [addPayment, { isLoading }] = useAddPaymentMutation()
  const [createInstallments, { isLoading: splitting }] = useCreateInstallmentsMutation()
  const [payInstallment] = usePayInstallmentMutation()
  const [months, setMonths] = useState(3)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const onSplit = async () => {
    try {
      await createInstallments({ invoice: id!, months }).unwrap()
      message.success(t('installments_created'))
    } catch (e: any) {
      message.error(e?.data?.months || e?.data?.detail || t('error_generic'))
    }
  }

  const onPay = async () => {
    const values = await form.validateFields()
    try {
      await addPayment({ invoice: id!, ...values }).unwrap()
      message.success(t('payment_recorded'))
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <Drawer
      title={invoice ? `${t('invoice')} ${invoice.number}` : ''}
      width={560}
      open={!!id}
      onClose={onClose}
      extra={
        invoice && (
          <Space>
            <Button
              style={{ background: '#25D366', color: '#fff', border: 'none' }}
              icon={<WhatsAppOutlined />}
              href={invoiceWaLink(invoice, settings)}
              target="_blank"
            >
              {t('send_whatsapp')}
            </Button>
            <Button icon={<PrinterOutlined />} onClick={() => printInvoice(invoice, settings)}>
              {t('print_pdf')}
            </Button>
          </Space>
        )
      }
    >
      {invoice && (
        <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={t('patient')}>{invoice.patient_name}</Descriptions.Item>
            <Descriptions.Item label={t('status')}>
              <Tag color={invoiceColor(invoice.status)}>{te('inv', invoice.status)}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Table
            size="small"
            style={{ marginTop: 12 }}
            rowKey={(_, i) => String(i)}
            pagination={false}
            dataSource={invoice.items}
            columns={[
              { title: t('item'), dataIndex: 'description' },
              { title: t('qty'), dataIndex: 'quantity', width: 60 },
              { title: t('unit_price'), dataIndex: 'unit_price', render: (v) => money(v) },
              { title: t('total'), dataIndex: 'total', render: (v) => money(v) },
            ]}
          />

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}><Statistic title={t('total')} value={Number(invoice.total)} suffix={t('egp')} /></Col>
            <Col span={8}><Statistic title={t('paid')} value={Number(invoice.paid_amount)} suffix={t('egp')} valueStyle={{ color: '#22c55e' }} /></Col>
            <Col span={8}><Statistic title={t('balance')} value={Number(invoice.balance)} suffix={t('egp')} valueStyle={{ color: '#ef4444' }} /></Col>
          </Row>

          <Divider>{t('installments')}</Divider>
          {invoice.installments.length ? (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={invoice.installments}
              columns={[
                { title: t('due_date'), dataIndex: 'due_date' },
                { title: t('amount'), dataIndex: 'amount', render: (v) => money(v) },
                {
                  title: t('status'),
                  render: (_, r) =>
                    r.is_paid ? (
                      <Tag color="green">{t('installment_paid')}</Tag>
                    ) : r.is_overdue ? (
                      <Tag color="red">{t('overdue')}</Tag>
                    ) : (
                      <Tag color="blue">{t('due')}</Tag>
                    ),
                },
                {
                  title: '',
                  width: 80,
                  render: (_, r) =>
                    !r.is_paid && (
                      <Button
                        size="small"
                        type="primary"
                        onClick={async () => {
                          try {
                            await payInstallment({ id: r.id }).unwrap()
                            message.success(t('installment_settled'))
                          } catch {
                            message.error(t('error_generic'))
                          }
                        }}
                      >
                        {t('settle')}
                      </Button>
                    ),
                },
              ]}
            />
          ) : invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
            <Space>
              <InputNumber min={2} max={36} value={months} onChange={(v) => setMonths(v || 3)} />
              <Button icon={<ScheduleOutlined />} loading={splitting} onClick={onSplit}>
                {t('split_prefix')} {months} {t('months_word')}
              </Button>
            </Space>
          ) : (
            <p style={{ color: '#94a3b8' }}>{t('no_installments')}</p>
          )}

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <>
              <Divider>{t('add_payment')}</Divider>
              <Form form={form} layout="inline" onFinish={onPay}>
                <Form.Item name="amount" rules={[{ required: true }]}>
                  <InputNumber min={1} max={Number(invoice.balance)} placeholder={t('amount')} />
                </Form.Item>
                <Form.Item name="method" initialValue="cash">
                  <Select
                    style={{ width: 110 }}
                    options={['cash', 'card', 'transfer'].map((m) => ({ value: m, label: t(`method_${m}`) }))}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={isLoading} icon={<DollarOutlined />}>
                  {t('pay')}
                </Button>
              </Form>
            </>
          )}
        </>
      )}
    </Drawer>
  )
}

export default function Invoices() {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const { data, isFetching } = useGetInvoicesQuery({})
  const [createInvoice, { isLoading: saving }] = useCreateInvoiceMutation()
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation()
  const [deleteInvoice] = useDeleteInvoiceMutation()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (inv: Invoice) => {
    setEditing(inv)
    form.setFieldsValue({
      patient: inv.patient,
      discount: Number(inv.discount),
      items: inv.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
      })),
    })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateInvoice({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createInvoice(values).unwrap()
        message.success(t('invoice_created'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  const onDelete = async (id: number) => {
    try {
      await deleteInvoice(id).unwrap()
      message.success(t('deleted'))
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <Card
      title={t('invoices')}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>
          {t('new_invoice')}
        </Button>
      }
    >
      <Table<Invoice>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        onRow={(r) => ({ onClick: () => setDetailId(r.id), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: t('number_col'), dataIndex: 'number', width: 110 },
          { title: t('patient'), dataIndex: 'patient_name' },
          { title: t('total'), dataIndex: 'total', render: (v) => money(v) },
          { title: t('paid'), dataIndex: 'paid_amount', render: (v) => money(v) },
          { title: t('balance'), dataIndex: 'balance', render: (v) => money(v) },
          { title: t('status'), dataIndex: 'status', render: (_, r) => <Tag color={invoiceColor(r.status)}>{te('inv', r.status)}</Tag> },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => onDelete(r.id)} />,
          },
        ]}
      />

      <Modal title={editing ? `${t('edit')} ${editing.number}` : t('new_invoice')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')} width={620}>
        <Form form={form} layout="vertical" initialValues={{ items: [{ quantity: 1 }], discount: 0 }}>
          <Form.Item name="patient" label={t('patient')} rules={[{ required: true, message: t('choose_patient') }]}>
            <PatientSelect />
          </Form.Item>

          <label>{t('items')}</label>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'description']} rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0 }}>
                      <Input placeholder={t('description')} style={{ width: 240 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={1} placeholder={t('qty')} style={{ width: 70 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'unit_price']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} placeholder={t('unit_price')} style={{ width: 100 }} />
                    </Form.Item>
                    {fields.length > 1 && <DeleteOutlined onClick={() => remove(field.name)} style={{ color: '#ef4444' }} />}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1 })} block icon={<PlusOutlined />} style={{ marginBottom: 12 }}>
                  {t('add_item')}
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name="discount" label={t('discount')}>
            <InputNumber min={0} style={{ width: 160 }} />
          </Form.Item>
        </Form>
      </Modal>

      <InvoiceDrawer id={detailId} onClose={() => setDetailId(null)} />
    </Card>
  )
}
