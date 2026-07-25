import { useState } from 'react'
import {
  Button, Card, Input, Table, Space, Modal, Form, Select, DatePicker, App,
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  useGetPatientsQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
} from '../app/api'
import RowActions from '../components/RowActions'
import { useLang } from '../i18n'
import type { Patient } from '../types'

export default function Patients() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Patient | null>(null)
  const { data, isFetching } = useGetPatientsQuery({ search, page })
  const [createPatient, { isLoading: saving }] = useCreatePatientMutation()
  const [updatePatient, { isLoading: updating }] = useUpdatePatientMutation()
  const [deletePatient] = useDeletePatientMutation()
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const startCreate = () => {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  const startEdit = (p: Patient) => {
    setEditing(p)
    form.setFieldsValue({ ...p, date_of_birth: p.date_of_birth ? dayjs(p.date_of_birth) : null })
    setOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const body = {
      ...values,
      date_of_birth: values.date_of_birth ? dayjs(values.date_of_birth).format('YYYY-MM-DD') : null,
    }
    try {
      if (editing) {
        await updatePatient({ id: editing.id, body }).unwrap()
        message.success(t('updated'))
      } else {
        await createPatient(body).unwrap()
        message.success(t('patient_added'))
      }
      setOpen(false)
      form.resetFields()
    } catch {
      message.error(t('error_generic'))
    }
  }

  const onDelete = async (id: number) => {
    try {
      await deletePatient(id).unwrap()
      message.success(t('deleted'))
    } catch {
      message.error(t('error_generic'))
    }
  }

  return (
    <Card
      title={t('patients')}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={startCreate}>
          {t('new_patient')}
        </Button>
      }
    >
      <Input
        placeholder={t('search_patients')}
        prefix={<SearchOutlined />}
        allowClear
        style={{ maxWidth: 340, marginBottom: 16 }}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      <Table<Patient>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.results}
        onRow={(r) => ({ onClick: () => navigate(`/patients/${r.id}`), style: { cursor: 'pointer' } })}
        pagination={{
          current: page,
          total: data?.count,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
        }}
        columns={[
          { title: t('file_number'), dataIndex: 'file_number', width: 110 },
          { title: t('name'), dataIndex: 'full_name' },
          { title: t('gender'), dataIndex: 'gender', width: 90, render: (v) => te('gender', v) },
          { title: t('age'), dataIndex: 'age', width: 70, render: (v) => v ?? '—' },
          { title: t('phone'), dataIndex: 'phone' },
          {
            title: t('actions'),
            width: 130,
            render: (_, r) => (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => navigate(`/patients/${r.id}`)}>
                  {t('open_file')}
                </Button>
                <RowActions onEdit={() => startEdit(r)} onDelete={() => onDelete(r.id)} />
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? `${t('edit')} — ${editing.full_name}` : t('new_patient')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSubmit}
        confirmLoading={saving || updating}
        okText={t('save')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="full_name" label={t('full_name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item name="gender" label={t('gender')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select
                style={{ width: 120 }}
                options={[
                  { value: 'male', label: t('gender_male') },
                  { value: 'female', label: t('gender_female') },
                ]}
              />
            </Form.Item>
            <Form.Item name="phone" label={t('phone')} rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="date_of_birth" label={t('date_of_birth')}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="allergies" label={t('allergies')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="chronic_diseases" label={t('chronic_diseases')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}
