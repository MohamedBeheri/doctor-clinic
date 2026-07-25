import { useState } from 'react'
import {
  App, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs, Tag,
} from 'antd'
import { PlusOutlined, SwapOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  useCreateMovementMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetMovementsQuery,
  useGetProductsQuery,
  useGetSuppliersQuery,
} from '../app/api'
import RowActions from '../components/RowActions'
import { money } from '../utils'
import { useLang } from '../i18n'
import type { Product, Supplier } from '../types'

function ProductsTab() {
  const [search, setSearch] = useState('')
  const { data, isFetching } = useGetProductsQuery({ search })
  const { data: suppliers } = useGetSuppliersQuery()
  const [createProduct, { isLoading: saving }] = useCreateProductMutation()
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation()
  const [deleteProduct] = useDeleteProductMutation()
  const [createMovement, { isLoading: moving }] = useCreateMovementMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [moveProduct, setMoveProduct] = useState<number | null>(null)
  const [form] = Form.useForm()
  const [moveForm] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (p: Product) => {
    setEditing(p)
    form.setFieldsValue({ ...p, price: Number(p.price) })
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateProduct({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createProduct(values).unwrap()
        message.success(t('product_added'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  const onMove = async () => {
    const values = await moveForm.validateFields()
    try {
      await createMovement({ ...values, product: moveProduct! }).unwrap()
      message.success(t('movement_recorded'))
      setMoveProduct(null)
      moveForm.resetFields()
    } catch (e: any) {
      message.error(e?.data?.quantity?.[0] || t('error_generic'))
    }
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search placeholder={t('search_product')} allowClear onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>
          {t('new_product')}
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: t('product'), dataIndex: 'name' },
          { title: t('unit'), dataIndex: 'unit', width: 90 },
          {
            title: t('quantity'),
            dataIndex: 'quantity',
            width: 110,
            render: (v, r) => (
              <Space>
                {v}
                {r.is_low && <Tag color="red">{t('low_stock')}</Tag>}
              </Space>
            ),
          },
          { title: t('reorder_level'), dataIndex: 'min_quantity', width: 100 },
          { title: t('purchase_price'), dataIndex: 'price', render: (v) => money(v), width: 130 },
          { title: t('supplier'), dataIndex: 'supplier_name', render: (v) => v || '—' },
          {
            title: t('actions'),
            width: 160,
            render: (_, r) => (
              <Space size={4}>
                <Button size="small" icon={<SwapOutlined />} onClick={() => setMoveProduct(r.id)}>
                  {t('movement')}
                </Button>
                <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteProduct(r.id)} />
              </Space>
            ),
          },
        ]}
      />

      <Modal title={editing ? t('edit') : t('new_product')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical" initialValues={{ min_quantity: 5 }}>
          <Form.Item name="name" label={t('product_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="unit" label={t('unit')}>
              <Input style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="min_quantity" label={t('reorder_level_full')}>
              <InputNumber min={0} />
            </Form.Item>
            <Form.Item name="price" label={t('purchase_price')}>
              <InputNumber min={0} style={{ width: 120 }} />
            </Form.Item>
          </Space>
          <Form.Item name="supplier" label={t('supplier')}>
            <Select allowClear options={suppliers?.results.map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={t('stock_movement')} open={moveProduct !== null} onCancel={() => setMoveProduct(null)} onOk={onMove} confirmLoading={moving} okText={t('save')} cancelText={t('cancel')}>
        <Form form={moveForm} layout="vertical" initialValues={{ movement_type: 'in' }}>
          <Form.Item name="movement_type" label={t('movement_type')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'in', label: t('mov_in_full') },
                { value: 'out', label: t('mov_out_full') },
              ]}
            />
          </Form.Item>
          <Form.Item name="quantity" label={t('quantity')} rules={[{ required: true }]}>
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

function MovementsTab() {
  const { data, isFetching } = useGetMovementsQuery({})
  const { t, te } = useLang()
  return (
    <Table
      rowKey="id"
      loading={isFetching}
      dataSource={data?.results}
      pagination={{ pageSize: 20 }}
      columns={[
        { title: t('date'), dataIndex: 'created_at', render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
        { title: t('product'), dataIndex: 'product_name' },
        {
          title: t('movement_type'),
          dataIndex: 'movement_type',
          render: (v) => <Tag color={v === 'in' ? 'green' : 'orange'}>{te('mov', v)}</Tag>,
        },
        { title: t('quantity'), dataIndex: 'quantity' },
        { title: t('statement'), dataIndex: 'note', render: (v) => v || '—' },
        { title: t('by'), dataIndex: 'created_by_name', render: (v) => v || '—' },
      ]}
    />
  )
}

function SuppliersTab() {
  const { data, isFetching } = useGetSuppliersQuery()
  const [createSupplier, { isLoading: saving }] = useCreateSupplierMutation()
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation()
  const [deleteSupplier] = useDeleteSupplierMutation()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (s: Supplier) => {
    setEditing(s)
    form.setFieldsValue(s)
    setOpen(true)
  }

  const onSave = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await updateSupplier({ id: editing.id, body: values }).unwrap()
        message.success(t('updated'))
      } else {
        await createSupplier(values).unwrap()
        message.success(t('supplier_added'))
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
        {t('new_supplier')}
      </Button>
      <Table<Supplier>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        pagination={false}
        columns={[
          { title: t('supplier'), dataIndex: 'name' },
          { title: t('phone'), dataIndex: 'phone', render: (v) => v || '—' },
          { title: t('address'), dataIndex: 'address', render: (v) => v || '—' },
          {
            title: t('actions'),
            width: 90,
            render: (_, r) => <RowActions onEdit={() => startEdit(r)} onDelete={() => deleteSupplier(r.id)} />,
          },
        ]}
      />
      <Modal title={editing ? t('edit') : t('new_supplier')} open={open} onCancel={() => setOpen(false)} onOk={onSave} confirmLoading={saving || updating} okText={t('save')} cancelText={t('cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('supplier_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label={t('phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label={t('address')}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default function Inventory() {
  const { t } = useLang()
  return (
    <Card title={t('inventory_title')}>
      <Tabs
        items={[
          { key: 'products', label: t('tab_products'), children: <ProductsTab /> },
          { key: 'movements', label: t('tab_movements'), children: <MovementsTab /> },
          { key: 'suppliers', label: t('tab_suppliers'), children: <SuppliersTab /> },
        ]}
      />
    </Card>
  )
}
