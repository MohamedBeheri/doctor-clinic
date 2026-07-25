import { useState } from 'react'
import {
  App, Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal,
  Row, Select, Space, Statistic, Table, Tabs, Tag,
} from 'antd'
import { PlusOutlined, RiseOutlined, FallOutlined, WalletOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useGetFinanceSummaryQuery,
  useGetSuppliersQuery,
} from '../app/api'
import RowActions from '../components/RowActions'
import { money } from '../utils'
import { useLang } from '../i18n'
import type { Expense } from '../types'

const CATEGORY_CODES = ['supplier', 'rent', 'salaries', 'utilities', 'maintenance', 'other']

function ExpensesTab() {
  const [page, setPage] = useState(1)
  const { data, isFetching } = useGetExpensesQuery({ page })
  const { data: suppliers } = useGetSuppliersQuery()
  const [createExpense, { isLoading: saving }] = useCreateExpenseMutation()
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation()
  const [deleteExpense] = useDeleteExpenseMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form] = Form.useForm()
  const category = Form.useWatch('category', form)
  const { message } = App.useApp()
  const { t, te } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), category: 'other' })
    setOpen(true)
  }

  const startEdit = (ex: Expense) => {
    setEditing(ex)
    form.setFieldsValue({ ...ex, amount: Number(ex.amount), date: dayjs(ex.date) })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    const body = { ...values, date: dayjs(values.date).format('YYYY-MM-DD') }
    try {
      if (editing) {
        await updateExpense({ id: editing.id, body }).unwrap()
        message.success(t('updated'))
      } else {
        await createExpense(body).unwrap()
        message.success(t('expense_saved'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_expense')}
      </Button>
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={{ current: page, total: data?.count, pageSize: 20, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: t('date'), dataIndex: 'date' },
          { title: t('category'), dataIndex: 'category', render: (v) => <Tag>{te('cat', v)}</Tag> },
          { title: t('amount'), dataIndex: 'amount', render: (v) => money(v) },
          { title: t('entity'), render: (_, r) => r.supplier_name || '—' },
          { title: t('statement'), dataIndex: 'note', render: (v) => v || '—' },
          { title: t('by'), dataIndex: 'created_by_name', render: (v) => v || '—' },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteExpense(r.id)} />,
          },
        ]}
      />

      <Modal title={editing ? t('edit') : t('new_expense')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="date" label={t('date')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="category" label={t('category')} rules={[{ required: true }]}>
            <Select options={CATEGORY_CODES.map((c) => ({ value: c, label: te('cat', c) }))} />
          </Form.Item>
          {category === 'supplier' && (
            <Form.Item name="supplier" label={t('supplier')} rules={[{ required: true }]}>
              <Select options={suppliers?.results.map((s) => ({ value: s.id, label: s.name }))} />
            </Form.Item>
          )}
          <Form.Item name="amount" label={t('amount')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label={t('statement')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function Finance() {
  const [range, setRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().startOf('month'), dayjs()])
  const { data: summary } = useGetFinanceSummaryQuery({
    from: range[0].format('YYYY-MM-DD'),
    to: range[1].format('YYYY-MM-DD'),
  })
  const { t, te } = useLang()

  const net = summary?.month_net ?? 0

  return (
    <div>
      <h2 className="page-title">{t('clinic_account')}</h2>

      <Space style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={(v) => v && setRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
        />
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('period_revenue')}
              value={summary?.month_revenue ?? 0}
              suffix={t('egp')}
              prefix={<RiseOutlined style={{ color: '#22c55e' }} />}
              valueStyle={{ color: '#22c55e' }}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              {t('invoice_payments_col')}: {Number(summary?.invoice_payments ?? 0)} · {t('visit_fees_revenue')}: {Number(summary?.visit_fees ?? 0)}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('period_expenses')}
              value={summary?.month_expenses ?? 0}
              suffix={t('egp')}
              prefix={<FallOutlined style={{ color: '#ef4444' }} />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} lg={12}>
          <div
            className="tile"
            style={{
              background: net >= 0
                ? 'linear-gradient(135deg,#10b981,#059669)'
                : 'linear-gradient(135deg,#ef4444,#dc2626)',
            }}
          >
            <div>
              <div className="tile-label">{net >= 0 ? t('net_profit') : t('net_loss')}</div>
              <div className="tile-value">{money(Math.abs(net))}</div>
            </div>
            <span className="tile-icon"><WalletOutlined /></span>
          </div>
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            { key: 'expenses', label: t('expenses'), children: <ExpensesTab /> },
            {
              key: 'suppliers',
              label: t('supplier_accounts'),
              children: (
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={summary?.supplier_totals}
                  columns={[
                    { title: t('supplier'), dataIndex: 'name' },
                    { title: t('paid_to_supplier'), dataIndex: 'paid', render: (v) => money(v) },
                  ]}
                />
              ),
            },
            {
              key: 'byCategory',
              label: t('month_by_category'),
              children: (
                <Table
                  rowKey="category"
                  pagination={false}
                  dataSource={summary?.expenses_by_category}
                  columns={[
                    { title: t('category'), dataIndex: 'category', render: (v) => te('cat', v) },
                    { title: t('total'), dataIndex: 'total', render: (v) => money(v) },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
