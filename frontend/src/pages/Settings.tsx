import { useEffect, useState } from 'react'
import {
  App, Alert, Button, Card, Divider, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Upload,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WhatsAppOutlined, UploadOutlined, PictureOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons'
import {
  useCreateBranchMutation,
  useCreateDrugMutation,
  useCreateUserMutation,
  useDeleteDrugMutation,
  useUpdateDrugMutation,
  useDeleteBranchMutation,
  useDeleteUserMutation,
  useGetBranchesQuery,
  useGetDrugsQuery,
  useGetUsersQuery,
  useUpdateBranchMutation,
  useUpdateUserMutation,
  useGetClinicSettingsQuery,
  useUpdateClinicSettingsMutation,
  useGetVisitTypesQuery,
  useCreateVisitTypeMutation,
  useUpdateVisitTypeMutation,
  useDeleteVisitTypeMutation,
  useGetPlanTemplatesQuery,
  useCreatePlanTemplateMutation,
  useUpdatePlanTemplateMutation,
  useDeletePlanTemplateMutation,
} from '../app/api'
import RowActions from '../components/RowActions'
import { money } from '../utils'
import { useLang } from '../i18n'
import type { Branch, Drug, User, VisitTypeConfig, PlanTemplate } from '../types'

function WhatsAppTab() {
  const { data, isLoading } = useGetClinicSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateClinicSettingsMutation()
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      form.setFieldsValue(data)
      setLogoPreview(data.logo_url)
    }
  }, [data, form])

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      // Multipart when a new logo is chosen, otherwise plain JSON.
      if (logoFile) {
        const fd = new FormData()
        Object.entries(values).forEach(([k, v]) => fd.append(k, String(v ?? '')))
        fd.append('logo', logoFile)
        await updateSettings(fd).unwrap()
      } else {
        await updateSettings(values).unwrap()
      }
      setLogoFile(null)
      message.success(t('settings_saved'))
    } catch {
      message.error(t('admin_only_error'))
    }
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 620 }} disabled={isLoading}>
      <Alert type="info" showIcon icon={<WhatsAppOutlined />} message={t('whatsapp_note')} style={{ marginBottom: 16 }} />

      <Form.Item label={t('clinic_logo')} extra={t('logo_hint')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, border: '1px solid #e2e8f0', display: 'grid', placeItems: 'center', overflow: 'hidden', background: '#f8fafc' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
              <PictureOutlined style={{ fontSize: 28, color: '#94a3b8' }} />
            )}
          </div>
          <Upload
            accept="image/*"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              setLogoFile(file)
              setLogoPreview(URL.createObjectURL(file))
              return false
            }}
          >
            <Button icon={<UploadOutlined />}>{t('upload_logo')}</Button>
          </Upload>
        </div>
      </Form.Item>

      <Form.Item name="clinic_name" label={t('clinic_name_field')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <div style={{ display: 'flex', gap: 12 }}>
        <Form.Item name="whatsapp_country_code" label={t('country_code')} extra={t('country_code_hint')} style={{ width: 160 }}>
          <Input addonBefore="+" />
        </Form.Item>
        <Form.Item name="whatsapp_number" label={t('clinic_whatsapp_number')} style={{ flex: 1 }}>
          <Input placeholder="01000000000" />
        </Form.Item>
      </div>
      <Form.Item name="appointment_template" label={t('appointment_template')} extra={t('placeholders_appointment')}>
        <Input.TextArea rows={4} />
      </Form.Item>
      <Form.Item name="invoice_template" label={t('invoice_template')} extra={t('placeholders_invoice')}>
        <Input.TextArea rows={4} />
      </Form.Item>

      <Divider>{t('wa_bot_settings')}</Divider>

      <Form.Item name="wa_bot_enabled" label={t('wa_bot_enabled')} valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item name="wa_api_token" label={t('wa_api_token')}>
        <Input.Password placeholder="EAAxxxxxxx..." />
      </Form.Item>
      <Form.Item name="wa_phone_number_id" label={t('wa_phone_number_id')}>
        <Input placeholder="123456789012345" />
      </Form.Item>
      <Form.Item name="wa_verify_token" label={t('wa_verify_token')} extra="Webhook URL: https://yourdomain.com/api/chatbot/webhook/">
        <Input placeholder="my-secret-token" />
      </Form.Item>

      <Button type="primary" loading={saving} onClick={onSave}>
        {t('save')}
      </Button>
    </Form>
  )
}

const ROLE_CODES = ['admin', 'dentist', 'assistant', 'receptionist']

function BranchesTab() {
  const { data, isFetching } = useGetBranchesQuery()
  const [createBranch, { isLoading: saving }] = useCreateBranchMutation()
  const [updateBranch, { isLoading: updating }] = useUpdateBranchMutation()
  const [deleteBranch] = useDeleteBranchMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (b: Branch) => {
    setEditing(b)
    form.setFieldsValue(b)
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateBranch({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createBranch(values).unwrap()
        message.success(t('branch_added'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('admin_only_error'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_branch')}
      </Button>
      <Table<Branch>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={false}
        columns={[
          { title: t('branch'), dataIndex: 'name' },
          { title: t('address'), dataIndex: 'address', render: (v) => v || '—' },
          { title: t('phone'), dataIndex: 'phone', render: (v) => v || '—' },
          {
            title: t('active'),
            dataIndex: 'is_active',
            width: 80,
            render: (v, r) => (
              <Switch checked={v} onChange={(checked) => updateBranch({ id: r.id, body: { is_active: checked } })} />
            ),
          },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteBranch(r.id)} />,
          },
        ]}
      />
      <Modal title={editing ? t('edit') : t('new_branch')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('branch_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('address')}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function UsersTab() {
  const { data, isFetching } = useGetUsersQuery({})
  const { data: branches } = useGetBranchesQuery()
  const [createUser, { isLoading: saving }] = useCreateUserMutation()
  const [updateUser] = useUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const [editing, setEditing] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (u: User) => {
    setEditing(u)
    form.setFieldsValue({ ...u, password: undefined })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    if (!values.password) delete values.password
    try {
      if (editing) {
        await updateUser({ id: editing.id, body: values }).unwrap()
        message.success(t('user_updated'))
      } else {
        await createUser(values).unwrap()
        message.success(t('user_created'))
      }
      setOpen(false)
    } catch (e: any) {
      message.error(e?.data?.username?.[0] || t('admin_only_error'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_user')}
      </Button>
      <Table<User>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: t('username'), dataIndex: 'username' },
          { title: t('name'), dataIndex: 'full_name' },
          { title: t('role'), dataIndex: 'role', render: (v) => <Tag color="blue">{te('role', v)}</Tag> },
          { title: t('phone'), dataIndex: 'phone', render: (v) => v || '—' },
          { title: t('specialty'), dataIndex: 'specialty', render: (v) => v || '—' },
          { title: t('branch'), dataIndex: 'branch_name', render: (v) => v || '—' },
          {
            title: t('active'),
            dataIndex: 'is_active',
            width: 80,
            render: (v) => (v ? <Tag color="green">{t('active')}</Tag> : <Tag color="red">{t('suspended')}</Tag>),
          },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => (
              <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteUser(r.id)} />
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `${t('edit')} ${editing.username}` : t('new_user')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={saving}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical" initialValues={{ role: 'receptionist', is_active: true }}>
          <Form.Item name="username" label={t('username')} rules={[{ required: true }]}>
            <Input disabled={!!editing} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? t('password_new_hint') : t('password')}
            rules={editing ? [] : [{ required: true, min: 6 }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="full_name" label={t('full_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label={t('role')}>
            <Select options={ROLE_CODES.map((r) => ({ value: r, label: te('role', r) }))} />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input placeholder="01000000000" />
          </Form.Item>
          <Form.Item name="specialty" label={t('specialty_hint')}>
            <Input />
          </Form.Item>
          <Form.Item name="branch" label={t('branch')}>
            <Select allowClear options={branches?.results.map((b) => ({ value: b.id, label: b.name }))} />
          </Form.Item>
          <Form.Item name="is_active" label={t('active')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function DrugsTab() {
  const { data, isFetching } = useGetDrugsQuery()
  const [createDrug, { isLoading: saving }] = useCreateDrugMutation()
  const [updateDrug, { isLoading: updating }] = useUpdateDrugMutation()
  const [deleteDrug] = useDeleteDrugMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Drug | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (d: Drug) => {
    setEditing(d)
    form.setFieldsValue(d)
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateDrug({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createDrug(values).unwrap()
        message.success(t('drug_added'))
      }
      setOpen(false)
      form.resetFields()
    } catch (e: any) {
      message.error(e?.data?.name?.[0] || t('error_generic'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_drug')}
      </Button>
      <Table<Drug>
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        columns={[
          { title: t('drug'), dataIndex: 'name' },
          { title: t('dosage'), dataIndex: 'default_dosage', render: (v) => v || '—' },
          { title: t('frequency'), dataIndex: 'default_frequency', render: (v) => v || '—' },
          { title: t('duration'), dataIndex: 'default_duration', render: (v) => v || '—' },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => (
              <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteDrug(r.id)} deleteTitle={t('delete_drug_confirm')} />
            ),
          },
        ]}
      />
      <Modal title={editing ? t('edit') : t('new_drug')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('drug_name')} rules={[{ required: true }]}>
            <Input placeholder="Augmentin 1g" />
          </Form.Item>
          <Form.Item name="default_dosage" label={t('default_dosage')}>
            <Input />
          </Form.Item>
          <Form.Item name="default_frequency" label={t('default_frequency')}>
            <Input />
          </Form.Item>
          <Form.Item name="default_duration" label={t('default_duration')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function VisitTypesTab() {
  const { data, isFetching } = useGetVisitTypesQuery()
  const [createVT, { isLoading: saving }] = useCreateVisitTypeMutation()
  const [updateVT, { isLoading: updating }] = useUpdateVisitTypeMutation()
  const [deleteVT] = useDeleteVisitTypeMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VisitTypeConfig | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, price: 0, order: (data?.length || 0) + 1 })
    setOpen(true)
  }

  const startEdit = (v: VisitTypeConfig) => {
    setEditing(v)
    form.setFieldsValue({ ...v, price: Number(v.price) })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateVT({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createVT(values).unwrap()
        message.success(t('saved'))
      }
      setOpen(false)
      form.resetFields()
    } catch (e: any) {
      message.error(e?.data?.code?.[0] || t('admin_only_error'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_visit_type')}
      </Button>
      <Table<VisitTypeConfig>
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        columns={[
          { title: t('order_col'), dataIndex: 'order', width: 80 },
          { title: t('visit_type_name'), dataIndex: 'name' },
          { title: t('visit_type_code'), dataIndex: 'code', render: (v) => <Tag>{v}</Tag> },
          { title: t('price'), dataIndex: 'price', render: (v) => (Number(v) > 0 ? money(v) : t('free')) },
          {
            title: t('active'),
            dataIndex: 'is_active',
            width: 80,
            render: (v, r) => (
              <Switch checked={v} onChange={(checked) => updateVT({ id: r.id, body: { is_active: checked } })} />
            ),
          },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteVT(r.id)} />,
          },
        ]}
      />
      <Modal title={editing ? t('edit') : t('new_visit_type')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('visit_type_name')} rules={[{ required: true }]}>
            <Input placeholder="كشف" />
          </Form.Item>
          <Form.Item name="code" label={t('visit_type_code')} rules={[{ required: true }]} extra="exam / re_exam / consultation …">
            <Input placeholder="exam" disabled={!!editing} />
          </Form.Item>
          <Form.Item name="name_en" label={`${t('visit_type_name')} (EN)`}>
            <Input placeholder="Exam" />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="price" label={t('price')} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} addonAfter={t('egp')} />
            </Form.Item>
            <Form.Item name="order" label={t('order_col')}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label={t('active')} valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

function PlanTemplatesTab() {
  const { data, isFetching } = useGetPlanTemplatesQuery()
  const [createTpl, { isLoading: saving }] = useCreatePlanTemplateMutation()
  const [updateTpl, { isLoading: updating }] = useUpdatePlanTemplateMutation()
  const [deleteTpl] = useDeletePlanTemplateMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PlanTemplate | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_active: true, items: [{ description: '', cost: 0 }] })
    setOpen(true)
  }

  const startEdit = (tpl: PlanTemplate) => {
    setEditing(tpl)
    form.setFieldsValue({
      ...tpl,
      items: tpl.items.map((i) => ({ description: i.description, cost: Number(i.cost) })),
    })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateTpl({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createTpl(values).unwrap()
        message.success(t('saved'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('admin_only_error'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} style={{ marginBottom: 16 }}>
        {t('new_template')}
      </Button>
      <Table<PlanTemplate>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={false}
        columns={[
          { title: t('template_name'), dataIndex: 'name' },
          { title: t('statement'), dataIndex: 'description', render: (v) => v || '—' },
          { title: t('steps_count'), dataIndex: 'items_count', width: 100 },
          { title: t('total'), dataIndex: 'total_cost', render: (v) => money(v) },
          {
            title: t('active'),
            dataIndex: 'is_active',
            width: 80,
            render: (v, r) => (
              <Switch checked={v} onChange={(checked) => updateTpl({ id: r.id, body: { is_active: checked } })} />
            ),
          },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteTpl(r.id)} />,
          },
        ]}
      />
      <Modal
        title={editing ? t('edit') : t('new_template')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={saving || updating}
        okText={t('save')}
        cancelText={t('cancel')}
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('template_name')} rules={[{ required: true }]}>
            <Input placeholder="علاج عصب + تركيبة" />
          </Form.Item>
          <Form.Item name="description" label={t('statement')}>
            <Input />
          </Form.Item>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('template_items')}</div>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...rest} name={[name, 'description']} rules={[{ required: true }]} style={{ flex: 1, marginBottom: 0, minWidth: 300 }}>
                      <Input placeholder={t('template_items')} />
                    </Form.Item>
                    <Form.Item {...rest} name={[name, 'cost']} style={{ marginBottom: 0 }}>
                      <InputNumber min={0} placeholder="0" addonAfter={t('egp')} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ef4444' }} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add({ description: '', cost: 0 })} icon={<PlusOutlined />} block>
                  {t('add_step')}
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item name="is_active" label={t('active')} valuePropName="checked" style={{ marginTop: 12 }}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function Settings() {
  const { t } = useLang()
  return (
    <Card title={t('settings')}>
      <Tabs
        items={[
          { key: 'users', label: t('tab_users'), children: <UsersTab /> },
          { key: 'visit_types', label: t('visit_types'), children: <VisitTypesTab /> },
          { key: 'plan_templates', label: t('plan_templates'), children: <PlanTemplatesTab /> },
          { key: 'whatsapp', label: t('tab_whatsapp'), children: <WhatsAppTab /> },
          { key: 'branches', label: t('tab_branches'), children: <BranchesTab /> },
          { key: 'drugs', label: t('tab_drugs'), children: <DrugsTab /> },
        ]}
      />
    </Card>
  )
}
