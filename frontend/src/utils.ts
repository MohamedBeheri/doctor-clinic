import type { AppointmentStatus, InvoiceStatus } from './types'

export function statusColor(status: AppointmentStatus | string): string {
  const map: Record<string, string> = {
    scheduled: 'blue',
    confirmed: 'cyan',
    completed: 'green',
    cancelled: 'red',
    no_show: 'orange',
  }
  return map[status] || 'default'
}

export function invoiceColor(status: InvoiceStatus | string): string {
  const map: Record<string, string> = {
    unpaid: 'red',
    partial: 'orange',
    paid: 'green',
    cancelled: 'default',
  }
  return map[status] || 'default'
}

import { currentLang } from './i18n'
import type { Appointment, ClinicSettings, Invoice } from './types'

export function money(value: string | number): string {
  const n = Number(value)
  return currentLang() === 'en'
    ? `${n.toLocaleString('en-EG')} EGP`
    : `${n.toLocaleString('ar-EG')} ج.م`
}

export function labStatusColor(status: string): string {
  const map: Record<string, string> = {
    sent: 'blue',
    in_progress: 'orange',
    received: 'cyan',
    delivered: 'green',
    cancelled: 'default',
  }
  return map[status] || 'default'
}

export function planStatusColor(status: string): string {
  const map: Record<string, string> = {
    proposed: 'default',
    accepted: 'blue',
    in_progress: 'orange',
    completed: 'green',
    cancelled: 'red',
  }
  return map[status] || 'default'
}

/** Open a print window (user can save as PDF from the browser dialog). */
export function printHtml(title: string, bodyHtml: string, opts?: { logoUrl?: string | null; clinicName?: string }) {
  const lang = currentLang()
  const rtl = lang === 'ar'
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  const brandName = opts?.clinicName || (rtl ? 'عيادة الطبيب' : 'Doctor Clinic')
  // Letterhead: big centered logo above the clinic name — clearly visible on prescriptions.
  const brandHtml = opts?.logoUrl
    ? `<img src="${opts.logoUrl}" alt="logo" class="brand-logo" /><div class="brand-name">${brandName}</div>`
    : `<div class="brand-name">🩺 ${brandName}</div>`
  win.document.write(`<!doctype html>
<html lang="${lang}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: Tahoma, sans-serif; margin: 32px; color: #1e293b; }
  .header { text-align: center; border-bottom: 3px solid #2563eb;
            padding-bottom: 14px; margin-bottom: 20px; position: relative; }
  .brand-logo { height: 110px; max-width: 320px; object-fit: contain; display: block; margin: 0 auto 6px; }
  .brand-name { font-size: 24px; font-weight: 700; color: #2563eb; }
  .print-date { position: absolute; top: 0; ${rtl ? 'left' : 'right'}: 0;
                color: #475569; font-size: 13px; }
  h2 { margin: 8px 0; font-size: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${rtl ? 'right' : 'left'}; font-size: 14px; }
  th { background: #f1f5f9; }
  .meta { color: #475569; font-size: 13px; }
  .totals { margin-top: 14px; font-size: 15px; }
  .totals div { margin: 4px 0; }
  .footer { margin-top: 36px; border-top: 1px dashed #cbd5e1; padding-top: 10px;
            font-size: 12px; color: #64748b; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    ${brandHtml}
    <div class="print-date">${new Date().toLocaleDateString(rtl ? 'ar-EG' : 'en-GB')}</div>
  </div>
  ${bodyHtml}
  <div class="footer">${brandName}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`)
  win.document.close()
}

/** Normalize a local phone to international (digits only) using the clinic country code. */
export function normalizePhone(phone: string, countryCode = '20'): string {
  let n = (phone || '').replace(/\D/g, '')
  if (n.startsWith('0')) n = countryCode + n.slice(1)
  else if (countryCode && !n.startsWith(countryCode)) n = countryCode + n
  return n
}

/** Replace {placeholders} in a template with values. */
export function fillTemplate(tpl: string, vars: Record<string, string | number>): string {
  return (tpl || '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))
}

/** Build a wa.me link. encodeURIComponent keeps emojis/Arabic intact. */
export function waLink(phone: string, message: string, countryCode = '20'): string {
  return `https://wa.me/${normalizePhone(phone, countryCode)}?text=${encodeURIComponent(message)}`
}

/** Localized human date/time parts for message templates. */
export function whenParts(iso: string, lang: 'ar' | 'en' = 'ar'): { date: string; time: string } {
  const d = new Date(iso)
  const loc = lang === 'ar' ? 'ar-EG' : 'en-GB'
  return {
    date: d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }),
  }
}

/** Build the appointment-reminder WhatsApp link from clinic settings + templates. */
export function appointmentWaLink(a: Appointment, settings?: ClinicSettings): string {
  const { date, time } = whenParts(a.scheduled_at, currentLang())
  const msg = fillTemplate(settings?.appointment_template || '', {
    patient: a.patient_name,
    date,
    time,
    clinic: settings?.clinic_name || '',
    phone: settings?.whatsapp_number || '',
  })
  return waLink(a.patient_phone, msg, settings?.whatsapp_country_code || '20')
}

/** Build the invoice WhatsApp link from clinic settings + templates. */
export function invoiceWaLink(inv: Invoice, settings?: ClinicSettings): string {
  const msg = fillTemplate(settings?.invoice_template || '', {
    patient: inv.patient_name,
    invoice: inv.number,
    total: inv.total,
    paid: inv.paid_amount,
    balance: inv.balance,
    clinic: settings?.clinic_name || '',
  })
  return waLink(inv.patient_phone, msg, settings?.whatsapp_country_code || '20')
}
