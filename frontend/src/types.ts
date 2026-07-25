export type Role = 'admin' | 'dentist' | 'assistant' | 'receptionist'

export interface User {
  id: number
  username: string
  full_name: string
  role: Role
  role_display: string
  phone: string
  specialty: string
  branch?: number | null
  branch_name?: string | null
  is_active: boolean
}

export interface Patient {
  id: number
  file_number: string
  full_name: string
  gender: 'male' | 'female'
  gender_display: string
  date_of_birth: string | null
  age: number | null
  phone: string
  email: string
  address: string
  medical_history: string
  allergies: string
  chronic_diseases: string
  blood_type: string
  notes: string
  created_at: string
  updated_at: string
}

export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export type VisitType = 'exam' | 're_exam' | 'consultation' | 'procedure'

export interface Appointment {
  id: number
  patient: number
  patient_name: string
  patient_file: string
  patient_phone: string
  dentist: number | null
  dentist_name: string | null
  branch: number | null
  branch_name: string | null
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  status_display: string
  visit_type: VisitType
  visit_type_display: string
  fee: string
  fee_paid_at: string | null
  checked_in_at: string | null
  queue_status: '' | 'waiting' | 'in_room' | 'done'
  queue_status_display: string
  queue_order: number
  source: 'walk_in' | 'phone' | 'whatsapp' | 'online'
  source_display: string
  reason: string
  notes: string
}

export interface VisitTypeConfig {
  id: number
  code: string
  name: string
  name_en: string
  price: string
  order: number
  is_active: boolean
}

export interface PlanTemplateItem {
  id?: number
  description: string
  cost: string | number
  order?: number
}

export interface PlanTemplate {
  id: number
  name: string
  description: string
  is_active: boolean
  items: PlanTemplateItem[]
  items_count: number
  total_cost: number
  created_at: string
}

export interface TreatmentRecord {
  id: number
  patient: number
  patient_name: string
  appointment: number | null
  dentist: number | null
  dentist_name: string | null
  complaint: string
  diagnosis: string
  treatment: string
  prescription: string
  cost: string
  notes: string
  created_at: string
}

export interface InvoiceItem {
  id?: number
  description: string
  quantity: number
  unit_price: string
  total?: string
}

export interface Payment {
  id: number
  invoice: number
  amount: string
  method: 'cash' | 'card' | 'transfer'
  method_display: string
  paid_at: string
  notes: string
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled'

export interface Invoice {
  id: number
  number: string
  patient: number
  patient_name: string
  patient_file: string
  patient_phone: string
  discount: string
  status: InvoiceStatus
  status_display: string
  notes: string
  items: InvoiceItem[]
  payments: Payment[]
  installments: Installment[]
  subtotal: string
  total: string
  paid_amount: string
  balance: string
  created_at: string
}

export interface DashboardStats {
  from: string
  to: string
  patients_total: number
  appointments_today: number
  appointments_today_list: {
    id: number
    patient_name: string
    scheduled_at: string
    status: AppointmentStatus
    visit_type: VisitType
    fee: string
    fee_paid: boolean
    dentist_name: string | null
  }[]
  unpaid_invoices: number
  outstanding_balance: number
  month_revenue: number
  prescriptions_total: number
  records_total: number
  dentists_total: number
  revenue_by_day: { date: string; total: number }[]
  visit_counts_today: Record<string, number>
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ---- extended modules ----

export interface Branch {
  id: number
  name: string
  address: string
  phone: string
  is_active: boolean
}

export interface TreatmentPlanItem {
  id?: number
  description: string
  cost: string | number
  is_done: boolean
  is_billed?: boolean
  order?: number
}

export type PlanStatus = 'proposed' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'

export interface TreatmentPlan {
  id: number
  patient: number
  patient_name: string
  dentist: number | null
  dentist_name: string | null
  title: string
  status: PlanStatus
  status_display: string
  notes: string
  items: TreatmentPlanItem[]
  total_cost: number
  done_count: number
  invoice: number | null
  invoice_number: string | null
  billed_total: number
  paid_amount: number
  balance: number
  created_at: string
}

export interface PrescriptionItem {
  id?: number
  drug_name: string
  dosage: string
  frequency: string
  duration: string
}

export interface Prescription {
  id: number
  patient: number
  patient_name: string
  patient_age: number | null
  patient_phone: string
  dentist: number | null
  dentist_name: string | null
  notes: string
  items: PrescriptionItem[]
  created_at: string
}

export interface PatientFile {
  id: number
  patient: number
  file_url: string
  title: string
  category: 'xray' | 'photo' | 'lab' | 'document' | 'other'
  category_display: string
  uploaded_by_name: string | null
  uploaded_at: string
}

export interface Installment {
  id: number
  invoice: number
  invoice_number: string
  patient_name: string
  due_date: string
  amount: string
  paid_at: string | null
  is_paid: boolean
  is_overdue: boolean
  notes: string
}

export interface Supplier {
  id: number
  name: string
  phone: string
  address: string
  notes: string
}

export interface Product {
  id: number
  name: string
  unit: string
  quantity: number
  min_quantity: number
  price: string
  supplier: number | null
  supplier_name: string | null
  is_low: boolean
}

export interface StockMovement {
  id: number
  product: number
  product_name: string
  movement_type: 'in' | 'out'
  movement_type_display: string
  quantity: number
  note: string
  created_by_name: string | null
  created_at: string
}

export interface NotificationAlert {
  type: string
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  link: string
}

export interface ReportsSummary {
  tiles: {
    total_appointments: number
    total_patients: number
    total_dentists: number
    cancelled: number
    completed: number
    today: number
  }
  revenue_by_month: { month: string; total: number }[]
  patients_by_month: { month: string; total: number }[]
  appointments_by_status: { status: string; total: number }[]
  top_dentists: { dentist__full_name: string; total: number }[]
}

// ---- finance & drugs ----

export interface Expense {
  id: number
  date: string
  amount: string
  category: 'supplier' | 'rent' | 'salaries' | 'utilities' | 'maintenance' | 'other'
  category_display: string
  supplier: number | null
  supplier_name: string | null
  note: string
  created_by_name: string | null
}

export interface FinanceSummary {
  from: string
  to: string
  invoice_payments: number
  visit_fees: number
  month_revenue: number
  month_expenses: number
  month_net: number
  expenses_by_category: { category: string; category_display: string; total: number }[]
  supplier_totals: { id: number; name: string; paid: number }[]
}

export interface Drug {
  id: number
  name: string
  default_dosage: string
  default_frequency: string
  default_duration: string
  notes: string
}

export interface ClinicSettings {
  clinic_name: string
  whatsapp_country_code: string
  whatsapp_number: string
  appointment_template: string
  invoice_template: string
  logo_url: string | null
  default_exam_fee: string
  default_reexam_fee: string
  default_consultation_fee: string
  consultation_valid_days: number
  updated_at?: string
}

// ---- report payloads ----

export interface PatientReport {
  patient: {
    id: number
    file_number: string
    full_name: string
    phone: string
    age: number | null
    gender: string
    allergies: string
    chronic_diseases: string
  }
  from: string
  to: string
  records: {
    date: string
    diagnosis: string
    treatment: string
    cost: string
    dentist: string | null
  }[]
  appointments: {
    date: string
    visit_type: VisitType
    status: AppointmentStatus
    fee: string
    fee_paid: boolean
    dentist: string | null
  }[]
  invoices: {
    number: string
    date: string
    total: string
    paid: string
    balance: string
    status: InvoiceStatus
  }[]
  prescriptions_count: number
  totals: {
    records_cost: string
    invoiced: number
    paid: number
    balance: number
    visit_fees_paid: string
  }
}

export interface DentistReport {
  dentist: { id: number; name: string; specialty: string }
  from: string
  to: string
  visits: {
    date: string
    patient: string
    visit_type: VisitType
    status: AppointmentStatus
    fee: string
    fee_paid: boolean
    reason: string
  }[]
  by_type: Record<string, { count: number; fees: number }>
  totals: {
    visits: number
    unique_patients: number
    fees_collected: string | number
    fees_uncollected: string | number
    treatments: number
    treatments_value: string | number
  }
}

export interface DoctorDayStatement {
  date: string
  visits: {
    time: string
    patient: string
    dentist: string | null
    visit_type: VisitType
    status: AppointmentStatus
    fee: string
    fee_paid: boolean
  }[]
  totals: {
    visits: number
    fees_collected: string | number
    fees_uncollected: string | number
    invoice_payments: string | number
    total_cash: number
  }
}
