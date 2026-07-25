import { Layout, Menu, Avatar, Dropdown, Badge, Popover, List, Tag, Button } from 'antd'
import {
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  DollarOutlined,
  LogoutOutlined,
  UserOutlined,
  InboxOutlined,
  BarChartOutlined,
  SettingOutlined,
  BellOutlined,
  TranslationOutlined,
  WalletOutlined,
  ContactsOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/store'
import { logout } from '../app/authSlice'
import { useGetAlertsQuery, useGetClinicSettingsQuery } from '../app/api'
import { useLang } from '../i18n'
import ClinicLogo from './ClinicLogo'

const { Header, Content } = Layout

const SEVERITY_COLOR: Record<string, string> = { info: 'blue', warning: 'orange', error: 'red' }

function NotificationsBell() {
  const navigate = useNavigate()
  const { lang, t } = useLang()
  const { data } = useGetAlertsQuery(lang, { pollingInterval: 60_000 })

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      content={
        <List
          size="small"
          style={{ width: 340, maxHeight: 380, overflowY: 'auto' }}
          dataSource={data?.alerts || []}
          locale={{ emptyText: t('no_alerts') }}
          renderItem={(a) => (
            <List.Item style={{ cursor: 'pointer' }} onClick={() => navigate(a.link)}>
              <List.Item.Meta
                title={<Tag color={SEVERITY_COLOR[a.severity]}>{a.title}</Tag>}
                description={a.message}
              />
            </List.Item>
          )}
        />
      }
    >
      <Badge count={data?.count || 0} size="small">
        <BellOutlined style={{ fontSize: 19, cursor: 'pointer', color: 'rgba(255,255,255,0.9)' }} />
      </Badge>
    </Popover>
  )
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const { lang, setLang, t } = useLang()
  const { data: settings } = useGetClinicSettingsQuery()

  const isAdmin = user?.role === 'admin'
  const isReception = user?.role === 'receptionist'

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: t('dashboard') },
    ...(isReception || isAdmin
      ? [{ key: '/reception', icon: <ContactsOutlined />, label: t('reception') }]
      : []),
    { key: '/waiting-room', icon: <ClockCircleOutlined />, label: t('waiting_room') },
    { key: '/patients', icon: <TeamOutlined />, label: t('patients') },
    { key: '/appointments', icon: <CalendarOutlined />, label: t('appointments') },
    { key: '/invoices', icon: <DollarOutlined />, label: t('invoices') },
    { key: '/finance', icon: <WalletOutlined />, label: t('finance') },
    { key: '/inventory', icon: <InboxOutlined />, label: t('inventory') },
    { key: '/reports', icon: <BarChartOutlined />, label: t('reports') },
    ...(isAdmin ? [{ key: '/settings', icon: <SettingOutlined />, label: t('settings') }] : []),
  ]

  const selectedKey =
    items
      .filter((i) => i.key !== '/')
      .sort((a, b) => b.key.length - a.key.length)
      .find((i) => location.pathname.startsWith(i.key))?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-navbar">
        <div className="app-brand" onClick={() => navigate('/')}>
          <div className="app-brand-mark">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="logo" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <ClinicLogo size={22} color="#ffffff" />
            )}
          </div>
          <span className="app-brand-title">{settings?.clinic_name || t('app_name')}</span>
        </div>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          onClick={({ key }) => navigate(key)}
          className="app-nav-menu"
          overflowedIndicator={<span style={{ color: '#fff' }}>•••</span>}
        />

        <div className="app-navbar-actions">
          <span
            className="lang-switch"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            title={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
          >
            <TranslationOutlined style={{ fontSize: 16 }} />
            <span className="lang-code">{lang === 'ar' ? 'EN' : 'ع'}</span>
          </span>
          <NotificationsBell />
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: t('logout'), danger: true }],
              onClick: () => dispatch(logout()),
            }}
          >
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fff' }}>
              <Avatar size="small" style={{ background: 'rgba(255,255,255,0.2)' }} icon={<UserOutlined />} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.full_name}</span>
            </span>
          </Dropdown>
        </div>
      </Header>

      <Content>
        <div className="app-content">
          <Outlet />
        </div>
      </Content>
    </Layout>
  )
}
