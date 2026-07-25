import { Statistic, Row, Col, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { useGetInvoicesQuery } from '../../app/api'
import { invoiceColor, money } from '../../utils'
import { useLang } from '../../i18n'

export default function InvoicesTab({ patientId }: { patientId: number }) {
  const { data, isFetching } = useGetInvoicesQuery({ patient: patientId })
  const { t, te } = useLang()
  const invoices = data?.results || []
  const totalBalance = invoices
    .filter((i) => i.status !== 'cancelled')
    .reduce((sum, i) => sum + Number(i.balance), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.paid_amount), 0)

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic title={t('total_paid')} value={totalPaid} suffix={t('egp')} valueStyle={{ color: '#22c55e' }} />
        </Col>
        <Col span={8}>
          <Statistic
            title={t('total_debt')}
            value={totalBalance}
            suffix={t('egp')}
            valueStyle={{ color: totalBalance > 0 ? '#ef4444' : '#22c55e' }}
          />
        </Col>
        <Col span={8}>
          <Statistic title={t('invoices_count')} value={invoices.length} />
        </Col>
      </Row>
      <Table
        rowKey="id"
        size="small"
        loading={isFetching}
        dataSource={invoices}
        pagination={false}
        locale={{ emptyText: t('no_invoices') }}
        columns={[
          { title: t('number_col'), dataIndex: 'number' },
          { title: t('date'), dataIndex: 'created_at', render: (v) => dayjs(v).format('YYYY-MM-DD') },
          { title: t('total'), dataIndex: 'total', render: (v) => money(v) },
          { title: t('paid'), dataIndex: 'paid_amount', render: (v) => money(v) },
          { title: t('balance'), dataIndex: 'balance', render: (v) => money(v) },
          {
            title: t('status'),
            dataIndex: 'status',
            render: (_, r) => <Tag color={invoiceColor(r.status)}>{te('inv', r.status)}</Tag>,
          },
        ]}
      />
      <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>{t('invoices_tab_hint')}</p>
    </div>
  )
}
