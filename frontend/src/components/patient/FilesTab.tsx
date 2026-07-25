import { useState } from 'react'
import {
  App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Tag, Upload,
} from 'antd'
import type { UploadFile } from 'antd'
import { DeleteOutlined, FileOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useDeleteFileMutation, useGetFilesQuery, useUploadFileMutation } from '../../app/api'
import { useLang } from '../../i18n'

const CATEGORY_CODES = ['xray', 'photo', 'lab', 'document', 'other']

const isImage = (url: string) => /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.test(url)

export default function FilesTab({ patientId }: { patientId: number }) {
  const { data } = useGetFilesQuery({ patient: patientId })
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation()
  const [deleteFile] = useDeleteFileMutation()
  const [open, setOpen] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const { t, te } = useLang()

  const onSave = async () => {
    const values = await form.validateFields()
    const raw = fileList[0]?.originFileObj
    if (!raw) {
      message.warning(t('choose_file_first'))
      return
    }
    const fd = new FormData()
    fd.append('patient', String(patientId))
    fd.append('file', raw)
    fd.append('title', values.title)
    fd.append('category', values.category)
    try {
      await uploadFile(fd).unwrap()
      message.success(t('file_uploaded'))
      setOpen(false)
      setFileList([])
      form.resetFields()
    } catch {
      message.error(t('upload_error'))
    }
  }

  return (
    <div>
      <Button type="primary" icon={<UploadOutlined />} onClick={() => setOpen(true)} style={{ marginBottom: 16 }}>
        {t('upload_attachment')}
      </Button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {data?.results.map((f) => (
          <Card
            key={f.id}
            size="small"
            cover={
              isImage(f.file_url) ? (
                <a href={f.file_url} target="_blank" rel="noreferrer">
                  <img src={f.file_url} alt={f.title} style={{ height: 130, objectFit: 'cover', width: '100%' }} />
                </a>
              ) : (
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ height: 130, display: 'grid', placeItems: 'center', background: '#f1f5f9', fontSize: 40 }}
                >
                  <FileOutlined />
                </a>
              )
            }
            actions={[
              <Popconfirm key="del" title={t('delete_file_confirm')} okText={t('yes')} cancelText={t('no')} onConfirm={() => deleteFile(f.id)}>
                <DeleteOutlined style={{ color: '#ef4444' }} />
              </Popconfirm>,
            ]}
          >
            <Card.Meta
              title={f.title}
              description={
                <>
                  <Tag>{te('file', f.category)}</Tag>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {dayjs(f.uploaded_at).format('YYYY-MM-DD')}
                  </div>
                </>
              }
            />
          </Card>
        ))}
      </div>
      {!data?.results.length && <Empty description={t('no_files')} />}

      <Modal
        title={t('upload_attachment')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onSave}
        confirmLoading={uploading}
        okText={t('upload')}
        cancelText={t('cancel')}
      >
        <Form form={form} layout="vertical" initialValues={{ category: 'xray' }}>
          <Form.Item name="title" label={t('title_field')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label={t('file_category')}>
            <Select options={CATEGORY_CODES.map((c) => ({ value: c, label: te('file', c) }))} />
          </Form.Item>
          <Upload
            beforeUpload={() => false}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl.slice(-1))}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>{t('choose_file')}</Button>
          </Upload>
        </Form>
      </Modal>
    </div>
  )
}
