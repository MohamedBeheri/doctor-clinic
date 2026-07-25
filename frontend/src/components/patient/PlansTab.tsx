import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Progress,
  Select, Space, Table, Tag, Tooltip,
} from 'antd'
import { DeleteOutlined, PlusOutlined, SnippetsOutlined, FileTextOutlined } from '@ant-design/icons'
import {
  useCreatePlanMutation,
  useDeletePlanMutation,
  useGetDentistsQuery,
  useGetPlansQuery,
  useTogglePlanItemMutation,
  useUpdatePlanMutation,
  useGetPlanTemplatesQuery,
  useApplyPlanTemplateMutation,
} from '../../app/api'
import { money, planStatusColor } from '../../utils'
import { useLang } from '../../i18n'
import type { TreatmentPlan } from '../../types'

const PLAN_STATUS_CODES = ['proposed', 'accepted', 'in_progress', 'completed', 'cancelled']

export default function PlansTab({ patientId }: { patientId: number }) {
  const { data } = useGetPlansQuery({ patient: patientId })
  const { data: dentists } = useGetDentistsQuery()
  const [createPlan, { isLoading: saving }] = useCreatePlanMutation()
  const [updatePlan] = useUpdatePlanMutation()
  const [deletePlan] = useDeletePlanMutation()
  const [toggleItem] = useTogglePlanItemMutation()
  const { data: templates } = useGetPlanTemplatesQuery({ is_active: true })
  const [applyTemplate, { isLoading: applying }] = useApplyPlanTemplateMutation()
  const [open, setOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [tplId, setTplId] = useState<number | undefined>()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()
  const navigate = useNavigate()

  const onToggle = async (plan: number, item: number) => {
    try {
      await toggleItem({ plan, item }).unwrap()
    } catch (e: any) {
      message.error(e?.data?.detail || t('error_generic'))
    }
  }

  const onApplyTemplate = async () => {
    if (!tplId) return
    try {
      await applyTemplate({ id: tplId, patient: patientId }).unwrap()
      message.success(t('template_applied'))
      setTplOpen(false)
      setTplId(undefined)
    } catch {
      message.error(t('error_generic'))
    }
  }

  const statusOptions = PLAN_STATUS_CODES.map((c) => ({ value: c, label: te('plan', c) }))

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      await createPlan({ ...values, patient: patientId }).unwrap()
      message.success(t('plan_created'))
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          {t('new_plan')}
        </Button>
        <Button icon={<SnippetsOutlined />} onClick={() => setTplOpen(true)}>
          {t('use_template')}
        </Button>
      </Space>

      {data?.results.map((plan: TreatmentPlan) => (
        <Card
          key={plan.id}
          size="small"
          style={{ marginBottom: 12 }}
          title={
            <Space>
              {plan.title}
              <Tag color={planStatusColor(plan.status)}>{te('plan', plan.status)}</Tag>
            </Space>
          }
          extra={
            <Space>
              <Progress
                type="circle"
                size={36}
                percent={plan.items.length ? Math.round((plan.done_count / plan.items.length) * 100) : 0}
              />
              <Select
                size="small"
                value={plan.status}
                style={{ width: 130 }}
                options={statusOptions}
                onChange={(v) => updatePlan({ id: plan.id, body: { status: v } })}
              />
              <Popconfirm title={t('delete_confirm')} okText={t('yes')} cancelText={t('no')} okButtonProps={{ danger: true }} onConfirm={() => deletePlan(plan.id)}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          }
        >
          {plan.invoice && (
            <div
              style={{
                display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
                background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
                padding: '8px 12px', marginBottom: 12,
              }}
            >
              <Button
                type="link"
                size="small"
                icon={<FileTextOutlined />}
                style={{ padding: 0 }}
                onClick={() => navigate('/invoices')}
              >
                {t('plan_invoice')}: {plan.invoice_number}
              </Button>
              <span style={{ color: '#64748b' }}>
                {t('billed_amount')}: <b>{money(plan.billed_total)}</b>
              </span>
              <span style={{ color: '#16a34a' }}>
                {t('paid')}: <b>{money(plan.paid_amount)}</b>
              </span>
              <span style={{ color: plan.balance > 0 ? '#dc2626' : '#64748b' }}>
                {t('balance')}: <b>{money(plan.balance)}</b>
              </span>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>
                ({t('plan_total')}: {money(plan.total_cost)})
              </span>
            </div>
          )}
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={plan.items}
            columns={[
              {
                title: '',
                width: 40,
                render: (_, item) => (
                  <Tooltip title={item.is_done ? t('billed_hint_done') : t('billed_hint')}>
                    <Checkbox
                      checked={item.is_done}
                      onChange={() => onToggle(plan.id, item.id!)}
                    />
                  </Tooltip>
                ),
              },
              {
                title: t('procedure'),
                dataIndex: 'description',
                render: (v, item) => (
                  <Space size={6}>
                    <span style={{ textDecoration: item.is_done ? 'line-through' : undefined }}>{v}</span>
                    {item.is_billed && <Tag color="green" style={{ margin: 0 }}>{t('billed')}</Tag>}
                  </Space>
                ),
              },
              { title: t('cost'), dataIndex: 'cost', width: 120, render: (v) => money(v) },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <b>{t('total')}</b>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <b>{money(plan.total_cost)}</b>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      ))}
      {!data?.results.length && <p style={{ color: '#94a3b8' }}>{t('no_plans')}</p>}

      <Modal
        title={t('new_plan')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        okText={t('save')}
        cancelText={t('cancel')}
        width={640}
      >
        <Form form={form} layout="vertical" initialValues={{ items: [{}] }}>
          <Form.Item name="title" label={t('plan_title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="dentist" label={t('dentist')}>
            <Select allowClear options={dentists?.map((d) => ({ value: d.id, label: d.full_name }))} />
          </Form.Item>
          <label>{t('procedures')}</label>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item name={[field.name, 'description']} rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <Input placeholder={t('procedure')} style={{ width: 260 }} />
                    </Form.Item>
                    <Form.Item name={[field.name, 'cost']} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} placeholder={t('cost')} style={{ width: 110 }} />
                    </Form.Item>
                    {fields.length > 1 && (
                      <DeleteOutlined onClick={() => remove(field.name)} style={{ color: '#ef4444' }} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({})} block icon={<PlusOutlined />}>
                  {t('add_procedure')}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={t('use_template')}
        open={tplOpen}
        onCancel={() => setTplOpen(false)}
        onOk={onApplyTemplate}
        confirmLoading={applying}
        okText={t('apply_template')}
        cancelText={t('cancel')}
        okButtonProps={{ disabled: !tplId }}
      >
        <p style={{ color: '#64748b' }}>{t('choose_template')}</p>
        <Select
          style={{ width: '100%' }}
          value={tplId}
          onChange={setTplId}
          placeholder={t('choose_template')}
          options={templates?.results.map((tp) => ({
            value: tp.id,
            label: `${tp.name} · ${tp.items_count} ${t('steps_count')} · ${money(tp.total_cost)}`,
          }))}
        />
      </Modal>
    </div>
  )
}
