import { useState, useEffect } from 'react'
import { PhoneOutlined, GlobalOutlined, CloseOutlined } from '@ant-design/icons'

/** Kaffo branding splash — shows once per session for 10s, dismissible. */
export default function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fadeOut, setFadeOut] = useState(false)
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    if (sessionStorage.getItem('splash-shown')) {
      setVisible(false)
      return
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          dismiss()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss() {
    setFadeOut(true)
    sessionStorage.setItem('splash-shown', '1')
    setTimeout(() => setVisible(false), 500)
  }

  if (!visible) return null

  const phoneBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8, direction: 'ltr',
    background: 'rgba(16,185,129,0.16)', color: '#34d399',
    padding: '8px 16px', borderRadius: 10, fontSize: 17, fontWeight: 700,
    letterSpacing: '.5px', textDecoration: 'none', fontFamily: 'monospace',
  }

  return (
    <div
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        transition: 'opacity .5s', opacity: fadeOut ? 0 : 1,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        style={{
          position: 'relative', margin: '0 16px', width: '100%', maxWidth: 520,
          borderRadius: 20, padding: 32, textAlign: 'center',
          background: 'linear-gradient(135deg,#0f172a,#1e293b 55%,#0f172a)',
          border: '1px solid rgba(245,158,11,0.3)',
          boxShadow: '0 30px 60px rgba(0,0,0,.5)',
          transition: 'all .5s', transform: fadeOut ? 'scale(0.9)' : 'scale(1)',
          opacity: fadeOut ? 0 : 1,
        }}
      >
        <button
          onClick={dismiss}
          style={{ position: 'absolute', top: 14, insetInlineStart: 14, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}
          aria-label="تخطي"
        >
          <CloseOutlined />
        </button>
        <div style={{ position: 'absolute', top: 12, insetInlineEnd: 14, width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.5)', display: 'grid', placeItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 700 }}>{countdown}</span>
        </div>

        <div style={{ margin: '0 auto 24px', height: 4, width: 64, borderRadius: 99, background: 'linear-gradient(90deg,#f59e0b,#facc15)' }} />
        <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>أهلاً بكم في شركة</h2>
        <h1 style={{ fontSize: 52, fontWeight: 900, margin: '0 0 4px', background: 'linear-gradient(90deg,#fbbf24,#fde68a,#f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#fbbf24' }}>كفو</h1>
        <p style={{ fontSize: 17, color: 'rgba(253,230,138,0.8)', margin: '0 0 24px' }}>لتطوير البرمجيات والتسويق</p>
        <a href="https://kaffo.co" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: 20, fontWeight: 700, marginBottom: 28, textDecoration: 'none' }}>
          <GlobalOutlined /> Kaffo.co
        </a>

        <div style={{ borderTop: '1px solid #334155', margin: '20px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 8px' }}>🇪🇬 لطلب المنتج من داخل مصر</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              <a href="tel:01121214614" style={phoneBtn}><PhoneOutlined /> 01121214614</a>
              <a href="tel:01147617485" style={phoneBtn}><PhoneOutlined /> 01147617485</a>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 8px' }}>🇸🇦 للطلب من داخل السعودية</p>
            <a href="tel:+966500026103" style={phoneBtn}><PhoneOutlined /> +966 50 002 6103</a>
          </div>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#64748b' }}>اضغط في أي مكان للتخطي</p>
      </div>
    </div>
  )
}
