import { Button, Form, Input, Typography, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useLoginMutation, useGetClinicBrandingQuery } from '../app/api'
import { useAppDispatch } from '../app/store'
import { setCredentials } from '../app/authSlice'
import { useLang } from '../i18n'
import ClinicLogo from '../components/ClinicLogo'

export default function Login() {
  const [login, { isLoading }] = useLoginMutation()
  const { data: branding } = useGetClinicBrandingQuery()
  const dispatch = useAppDispatch()
  const { message } = App.useApp()
  const { t } = useLang()

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      const res = await login(values).unwrap()
      dispatch(setCredentials(res))
    } catch {
      message.error(t('login_error'))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Brand panel */}
      <div
        className="login-brand"
        style={{
          flex: 1,
          background: 'linear-gradient(150deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
          color: '#fff',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 8%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 2px, transparent 2px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            {branding?.logo_url ? (
              <div style={{ background: '#fff', borderRadius: 18, padding: 10, boxShadow: '0 4px 18px rgba(0,0,0,0.18)' }}>
                <img
                  src={branding.logo_url}
                  alt="logo"
                  style={{ height: 84, maxWidth: 220, objectFit: 'contain', display: 'block' }}
                />
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 16, padding: 12 }}>
                <ClinicLogo size={40} />
              </div>
            )}
            <span style={{ fontSize: 24, fontWeight: 800 }}>{branding?.clinic_name || t('app_name')}</span>
          </div>
          <Typography.Title level={1} style={{ color: '#fff', margin: 0, fontSize: 40, lineHeight: 1.25 }}>
            {t('login_title')}
          </Typography.Title>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', maxWidth: 460, marginTop: 18 }}>
            {t('login_hero')}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form" style={{ width: 460, maxWidth: '100%', display: 'grid', placeItems: 'center', padding: 32, background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>
            {t('login_subtitle')}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 28 }}>
            {t('login_prompt')}
          </Typography.Text>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false} initialValues={{ username: 'admin', password: 'admin123' }}>
            <Form.Item name="username" label={t('username')} rules={[{ required: true }]}>
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} size="large" />
            </Form.Item>
            <Form.Item name="password" label={t('password')} rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={isLoading} style={{ height: 46, fontSize: 15 }}>
              {t('login_btn')}
            </Button>
          </Form>
        </div>
      </div>
    </div>
  )
}
