import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import arEG from 'antd/locale/ar_EG'
import enUS from 'antd/locale/en_US'
import 'antd/dist/reset.css'
import App from './App'
import { store } from './app/store'
import { LanguageProvider, useLang } from './i18n'
import './index.css'

const FONT = "'Cairo', 'Inter', 'Segoe UI', Tahoma, sans-serif"

function ThemedApp() {
  const { lang } = useLang()
  return (
    <ConfigProvider
      direction={lang === 'ar' ? 'rtl' : 'ltr'}
      locale={lang === 'ar' ? arEG : enUS}
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorInfo: '#2563eb',
          colorSuccess: '#16a34a',
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          colorTextBase: '#0f172a',
          colorBgLayout: '#eef2f9',
          borderRadius: 10,
          borderRadiusLG: 14,
          fontFamily: FONT,
          fontSize: 14,
          controlHeight: 38,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: '#1e3a8a',
            headerHeight: 66,
            headerPadding: '0 28px',
            bodyBg: '#eef2f9',
          },
          Menu: {
            horizontalItemHoverColor: '#ffffff',
            horizontalItemSelectedColor: '#ffffff',
            darkItemBg: 'transparent',
            darkSubMenuItemBg: '#1e3a8a',
            darkItemColor: 'rgba(226,232,240,0.82)',
            darkItemHoverColor: '#ffffff',
            darkItemHoverBg: 'rgba(255,255,255,0.12)',
            darkItemSelectedBg: 'rgba(255,255,255,0.16)',
            darkItemSelectedColor: '#ffffff',
            itemHeight: 46,
            itemMarginInline: 6,
            itemBorderRadius: 8,
            fontSize: 15,
          },
          Card: {
            borderRadiusLG: 14,
            boxShadowTertiary: '0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)',
            headerFontSize: 16,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            headerSplitColor: 'transparent',
            borderColor: '#eef2f6',
            rowHoverBg: '#f0fdfa',
            cellPaddingBlock: 12,
          },
          Button: { fontWeight: 600, primaryShadow: 'none', defaultShadow: 'none' },
          Statistic: { titleFontSize: 14 },
          Modal: { borderRadiusLG: 16 },
          Segmented: { itemSelectedBg: '#2563eb', itemSelectedColor: '#ffffff' },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </Provider>
  </React.StrictMode>,
)
