import { Button, Popconfirm, Space } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useLang } from '../i18n'

interface Props {
  onEdit?: () => void
  onDelete?: () => void
  editTitle?: string
  deleteTitle?: string
}

/** Standard edit + delete actions cell used across all entity tables. */
export default function RowActions({ onEdit, onDelete, editTitle, deleteTitle }: Props) {
  const { t } = useLang()
  return (
    <Space size={4} onClick={(e) => e.stopPropagation()}>
      {onEdit && (
        <Button size="small" type="text" icon={<EditOutlined />} title={editTitle || t('edit')} onClick={onEdit} />
      )}
      {onDelete && (
        <Popconfirm
          title={deleteTitle || t('delete_confirm')}
          okText={t('yes')}
          cancelText={t('no')}
          okButtonProps={{ danger: true }}
          onConfirm={onDelete}
        >
          <Button size="small" type="text" danger icon={<DeleteOutlined />} title={t('delete')} />
        </Popconfirm>
      )}
    </Space>
  )
}
