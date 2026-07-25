import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type {
  Appointment,
  Branch,
  ClinicSettings,
  DashboardStats,
  DentistReport,
  DoctorDayStatement,
  Drug,
  Expense,
  FinanceSummary,
  PatientReport,
  Installment,
  Invoice,
  NotificationAlert,
  Paginated,
  Patient,
  PatientFile,
  Payment,
  Prescription,
  Product,
  ReportsSummary,
  StockMovement,
  Supplier,
  TreatmentPlan,
  TreatmentRecord,
  User,
  VisitTypeConfig,
  PlanTemplate,
} from '../types'
import { logout, setCredentials } from './authSlice'
import type { RootState } from './store'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.access
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  },
})

// Auto-refresh the access token on 401, then retry once.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiCtx, extra) => {
  let result = await rawBaseQuery(args, apiCtx, extra)
  if (result.error?.status === 401) {
    const refresh = (apiCtx.getState() as RootState).auth.refresh
    if (refresh) {
      const refreshResult = await rawBaseQuery(
        { url: 'auth/refresh/', method: 'POST', body: { refresh } },
        apiCtx,
        extra,
      )
      const data = refreshResult.data as { access?: string } | undefined
      if (data?.access) {
        const state = apiCtx.getState() as RootState
        apiCtx.dispatch(
          setCredentials({
            access: data.access,
            refresh,
            user: state.auth.user!,
          }),
        )
        result = await rawBaseQuery(args, apiCtx, extra)
      } else {
        apiCtx.dispatch(logout())
      }
    } else {
      apiCtx.dispatch(logout())
    }
  }
  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Patient', 'Appointment', 'Record', 'Invoice', 'Dashboard', 'User',
    'Branch', 'Plan', 'Prescription', 'File', 'Installment',
    'Product', 'Supplier', 'Movement', 'Alerts',
    'Expense', 'Drug', 'ClinicSettings', 'VisitType', 'PlanTemplate',
  ],
  endpoints: (b) => ({
    login: b.mutation<
      { access: string; refresh: string; user: User },
      { username: string; password: string }
    >({
      query: (body) => ({ url: 'auth/login/', method: 'POST', body }),
    }),
    dashboard: b.query<DashboardStats, { from?: string; to?: string } | void>({
      query: (p) => ({ url: 'dashboard/stats/', params: p || {} }),
      providesTags: ['Dashboard'],
    }),

    // Patients
    getPatients: b.query<Paginated<Patient>, { search?: string; page?: number }>({
      query: (p) => ({ url: 'patients/', params: p }),
      providesTags: ['Patient'],
    }),
    getPatient: b.query<Patient, number>({
      query: (id) => `patients/${id}/`,
      providesTags: ['Patient'],
    }),
    patientRecords: b.query<TreatmentRecord[], number>({
      query: (id) => `patients/${id}/records/`,
      providesTags: ['Record'],
    }),
    patientAppointments: b.query<Appointment[], number>({
      query: (id) => `patients/${id}/appointments/`,
      providesTags: ['Appointment'],
    }),
    createPatient: b.mutation<Patient, Partial<Patient>>({
      query: (body) => ({ url: 'patients/', method: 'POST', body }),
      invalidatesTags: ['Patient', 'Dashboard'],
    }),
    updatePatient: b.mutation<Patient, { id: number; body: Partial<Patient> }>({
      query: ({ id, body }) => ({ url: `patients/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Patient'],
    }),
    deletePatient: b.mutation<void, number>({
      query: (id) => ({ url: `patients/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Patient', 'Dashboard'],
    }),

    // Dentists
    getDentists: b.query<User[], void>({
      query: () => 'auth/users/dentists/',
      providesTags: ['User'],
    }),

    // Appointments
    getAppointments: b.query<
      Paginated<Appointment>,
      { search?: string; date?: string; status?: string; page?: number }
    >({
      query: (p) => ({ url: 'appointments/', params: p }),
      providesTags: ['Appointment'],
    }),
    createAppointment: b.mutation<Appointment, Partial<Appointment>>({
      query: (body) => ({ url: 'appointments/', method: 'POST', body }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    updateAppointment: b.mutation<Appointment, { id: number; body: Partial<Appointment> }>({
      query: ({ id, body }) => ({ url: `appointments/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    deleteAppointment: b.mutation<void, number>({
      query: (id) => ({ url: `appointments/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    collectFee: b.mutation<Appointment, { id: number; amount?: number }>({
      query: ({ id, amount }) => ({
        url: `appointments/${id}/collect-fee/`,
        method: 'POST',
        body: amount != null ? { amount } : {},
      }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    checkInAppointment: b.mutation<Appointment, number>({
      query: (id) => ({ url: `appointments/${id}/check-in/`, method: 'POST' }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    setQueueState: b.mutation<Appointment, { id: number; state: string }>({
      query: ({ id, state }) => ({
        url: `appointments/${id}/queue-state/`,
        method: 'POST',
        body: { state },
      }),
      invalidatesTags: ['Appointment', 'Dashboard'],
    }),
    moveQueue: b.mutation<Appointment, { id: number; dir: 'up' | 'down' }>({
      query: ({ id, dir }) => ({
        url: `appointments/${id}/queue-move/`,
        method: 'POST',
        body: { dir },
      }),
      invalidatesTags: ['Appointment'],
    }),

    // Records
    createRecord: b.mutation<TreatmentRecord, Partial<TreatmentRecord>>({
      query: (body) => ({ url: 'records/', method: 'POST', body }),
      invalidatesTags: ['Record'],
    }),

    // Billing
    getInvoices: b.query<Paginated<Invoice>, { search?: string; status?: string; page?: number; patient?: number }>({
      query: (p) => ({ url: 'billing/invoices/', params: p }),
      providesTags: ['Invoice'],
    }),
    getInvoice: b.query<Invoice, number>({
      query: (id) => `billing/invoices/${id}/`,
      providesTags: ['Invoice'],
    }),
    createInvoice: b.mutation<Invoice, Partial<Invoice>>({
      query: (body) => ({ url: 'billing/invoices/', method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    addPayment: b.mutation<Payment, Partial<Payment>>({
      query: (body) => ({ url: 'billing/payments/', method: 'POST', body }),
      invalidatesTags: ['Invoice', 'Dashboard', 'Installment', 'Alerts'],
    }),

    // Installments
    createInstallments: b.mutation<Invoice, { invoice: number; months: number }>({
      query: ({ invoice, months }) => ({
        url: `billing/invoices/${invoice}/create-installments/`,
        method: 'POST',
        body: { months },
      }),
      invalidatesTags: ['Invoice', 'Installment', 'Alerts'],
    }),
    payInstallment: b.mutation<Installment, { id: number; method?: string }>({
      query: ({ id, method }) => ({
        url: `billing/installments/${id}/pay/`,
        method: 'POST',
        body: { method: method || 'cash' },
      }),
      invalidatesTags: ['Invoice', 'Installment', 'Dashboard', 'Alerts'],
    }),

    // Branches
    getBranches: b.query<Paginated<Branch>, void>({
      query: () => 'clinic/branches/',
      providesTags: ['Branch'],
    }),
    createBranch: b.mutation<Branch, Partial<Branch>>({
      query: (body) => ({ url: 'clinic/branches/', method: 'POST', body }),
      invalidatesTags: ['Branch'],
    }),
    updateBranch: b.mutation<Branch, { id: number; body: Partial<Branch> }>({
      query: ({ id, body }) => ({ url: `clinic/branches/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Branch'],
    }),

    // Users management
    getUsers: b.query<Paginated<User>, { search?: string; role?: string }>({
      query: (p) => ({ url: 'auth/users/', params: p }),
      providesTags: ['User'],
    }),
    createUser: b.mutation<User, Partial<User> & { password?: string }>({
      query: (body) => ({ url: 'auth/users/', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),
    updateUser: b.mutation<User, { id: number; body: Partial<User> & { password?: string } }>({
      query: ({ id, body }) => ({ url: `auth/users/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),

    // Treatment plans
    getPlans: b.query<Paginated<TreatmentPlan>, { patient?: number }>({
      query: (p) => ({ url: 'records/plans/', params: p }),
      providesTags: ['Plan'],
    }),
    createPlan: b.mutation<TreatmentPlan, Partial<TreatmentPlan>>({
      query: (body) => ({ url: 'records/plans/', method: 'POST', body }),
      invalidatesTags: ['Plan'],
    }),
    updatePlan: b.mutation<TreatmentPlan, { id: number; body: Partial<TreatmentPlan> }>({
      query: ({ id, body }) => ({ url: `records/plans/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Plan'],
    }),
    togglePlanItem: b.mutation<TreatmentPlan, { plan: number; item: number }>({
      query: ({ plan, item }) => ({
        url: `records/plans/${plan}/toggle-item/${item}/`,
        method: 'POST',
      }),
      // Checking an item bills it into the plan invoice → refresh invoices/finance too.
      invalidatesTags: ['Plan', 'Invoice', 'Dashboard'],
    }),

    // Prescriptions
    getPrescriptions: b.query<Paginated<Prescription>, { patient?: number }>({
      query: (p) => ({ url: 'prescriptions/', params: p }),
      providesTags: ['Prescription'],
    }),
    createPrescription: b.mutation<Prescription, Partial<Prescription>>({
      query: (body) => ({ url: 'prescriptions/', method: 'POST', body }),
      invalidatesTags: ['Prescription'],
    }),

    // Patient files
    getFiles: b.query<Paginated<PatientFile>, { patient?: number; category?: string }>({
      query: (p) => ({ url: 'files/', params: p }),
      providesTags: ['File'],
    }),
    uploadFile: b.mutation<PatientFile, FormData>({
      query: (body) => ({ url: 'files/', method: 'POST', body }),
      invalidatesTags: ['File'],
    }),
    deleteFile: b.mutation<void, number>({
      query: (id) => ({ url: `files/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['File'],
    }),

    // Inventory
    getProducts: b.query<Paginated<Product>, { search?: string }>({
      query: (p) => ({ url: 'inventory/products/', params: p }),
      providesTags: ['Product'],
    }),
    createProduct: b.mutation<Product, Partial<Product>>({
      query: (body) => ({ url: 'inventory/products/', method: 'POST', body }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: b.mutation<Product, { id: number; body: Partial<Product> }>({
      query: ({ id, body }) => ({ url: `inventory/products/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Product'],
    }),
    getSuppliers: b.query<Paginated<Supplier>, void>({
      query: () => 'inventory/suppliers/',
      providesTags: ['Supplier'],
    }),
    createSupplier: b.mutation<Supplier, Partial<Supplier>>({
      query: (body) => ({ url: 'inventory/suppliers/', method: 'POST', body }),
      invalidatesTags: ['Supplier'],
    }),
    getMovements: b.query<Paginated<StockMovement>, { product?: number }>({
      query: (p) => ({ url: 'inventory/movements/', params: p }),
      providesTags: ['Movement'],
    }),
    createMovement: b.mutation<StockMovement, Partial<StockMovement>>({
      query: (body) => ({ url: 'inventory/movements/', method: 'POST', body }),
      invalidatesTags: ['Movement', 'Product', 'Alerts'],
    }),

    // Finance
    getFinanceSummary: b.query<FinanceSummary, { from?: string; to?: string } | void>({
      query: (p) => ({ url: 'finance/summary/', params: p || undefined }),
      providesTags: ['Expense', 'Invoice', 'Appointment'],
    }),

    // Detailed reports
    getPatientReport: b.query<PatientReport, { id: number; from?: string; to?: string }>({
      query: ({ id, ...p }) => ({ url: `reports/patient/${id}/`, params: p }),
    }),
    getDentistReport: b.query<DentistReport, { id: number; from?: string; to?: string }>({
      query: ({ id, ...p }) => ({ url: `reports/dentist/${id}/`, params: p }),
    }),
    getDoctorDay: b.query<DoctorDayStatement, { date?: string; dentist?: number }>({
      query: (p) => ({ url: 'reports/doctor-day/', params: p }),
      providesTags: ['Appointment', 'Invoice'],
    }),
    getExpenses: b.query<Paginated<Expense>, { category?: string; page?: number }>({
      query: (p) => ({ url: 'finance/expenses/', params: p }),
      providesTags: ['Expense'],
    }),
    createExpense: b.mutation<Expense, Partial<Expense>>({
      query: (body) => ({ url: 'finance/expenses/', method: 'POST', body }),
      invalidatesTags: ['Expense'],
    }),

    // Drug catalog
    getDrugs: b.query<Drug[], void>({
      query: () => 'prescriptions/drugs/',
      providesTags: ['Drug'],
    }),
    createDrug: b.mutation<Drug, Partial<Drug>>({
      query: (body) => ({ url: 'prescriptions/drugs/', method: 'POST', body }),
      invalidatesTags: ['Drug'],
    }),
    deleteDrug: b.mutation<void, number>({
      query: (id) => ({ url: `prescriptions/drugs/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Drug'],
    }),
    updateDrug: b.mutation<Drug, { id: number; body: Partial<Drug> }>({
      query: ({ id, body }) => ({ url: `prescriptions/drugs/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Drug'],
    }),

    // ---- CRUD extras (edit/delete across entities) ----
    updateRecord: b.mutation<TreatmentRecord, { id: number; body: Partial<TreatmentRecord> }>({
      query: ({ id, body }) => ({ url: `records/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Record'],
    }),
    deleteRecord: b.mutation<void, number>({
      query: (id) => ({ url: `records/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Record'],
    }),
    deletePlan: b.mutation<void, number>({
      query: (id) => ({ url: `records/plans/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Plan'],
    }),
    updatePrescription: b.mutation<Prescription, { id: number; body: Partial<Prescription> }>({
      query: ({ id, body }) => ({ url: `prescriptions/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Prescription'],
    }),
    deletePrescription: b.mutation<void, number>({
      query: (id) => ({ url: `prescriptions/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Prescription'],
    }),
    updateInvoice: b.mutation<Invoice, { id: number; body: Partial<Invoice> }>({
      query: ({ id, body }) => ({ url: `billing/invoices/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    deleteInvoice: b.mutation<void, number>({
      query: (id) => ({ url: `billing/invoices/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Invoice', 'Dashboard'],
    }),
    deleteBranch: b.mutation<void, number>({
      query: (id) => ({ url: `clinic/branches/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Branch'],
    }),
    deleteUser: b.mutation<void, number>({
      query: (id) => ({ url: `auth/users/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
    deleteProduct: b.mutation<void, number>({
      query: (id) => ({ url: `inventory/products/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Product'],
    }),
    updateSupplier: b.mutation<Supplier, { id: number; body: Partial<Supplier> }>({
      query: ({ id, body }) => ({ url: `inventory/suppliers/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Supplier'],
    }),
    deleteSupplier: b.mutation<void, number>({
      query: (id) => ({ url: `inventory/suppliers/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Supplier'],
    }),
    updateExpense: b.mutation<Expense, { id: number; body: Partial<Expense> }>({
      query: ({ id, body }) => ({ url: `finance/expenses/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['Expense'],
    }),
    deleteExpense: b.mutation<void, number>({
      query: (id) => ({ url: `finance/expenses/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['Expense'],
    }),

    // Clinic settings (WhatsApp + templates)
    getClinicSettings: b.query<ClinicSettings, void>({
      query: () => 'clinic/settings/',
      providesTags: ['ClinicSettings'],
    }),
    getClinicBranding: b.query<{ clinic_name: string; logo_url: string | null }, void>({
      query: () => 'clinic/branding/',
      providesTags: ['ClinicSettings'],
    }),
    updateClinicSettings: b.mutation<ClinicSettings, Partial<ClinicSettings> | FormData>({
      query: (body) => ({ url: 'clinic/settings/', method: 'PUT', body }),
      invalidatesTags: ['ClinicSettings'],
    }),

    // Visit types catalog (Settings)
    getVisitTypes: b.query<VisitTypeConfig[], void>({
      query: () => 'clinic/visit-types/',
      providesTags: ['VisitType'],
    }),
    createVisitType: b.mutation<VisitTypeConfig, Partial<VisitTypeConfig>>({
      query: (body) => ({ url: 'clinic/visit-types/', method: 'POST', body }),
      invalidatesTags: ['VisitType'],
    }),
    updateVisitType: b.mutation<VisitTypeConfig, { id: number; body: Partial<VisitTypeConfig> }>({
      query: ({ id, body }) => ({ url: `clinic/visit-types/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['VisitType'],
    }),
    deleteVisitType: b.mutation<void, number>({
      query: (id) => ({ url: `clinic/visit-types/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['VisitType'],
    }),

    // Treatment plan templates (presets)
    getPlanTemplates: b.query<Paginated<PlanTemplate>, { is_active?: boolean } | void>({
      query: (p) => ({ url: 'records/plan-templates/', params: p || undefined }),
      providesTags: ['PlanTemplate'],
    }),
    createPlanTemplate: b.mutation<PlanTemplate, Partial<PlanTemplate>>({
      query: (body) => ({ url: 'records/plan-templates/', method: 'POST', body }),
      invalidatesTags: ['PlanTemplate'],
    }),
    updatePlanTemplate: b.mutation<PlanTemplate, { id: number; body: Partial<PlanTemplate> }>({
      query: ({ id, body }) => ({ url: `records/plan-templates/${id}/`, method: 'PATCH', body }),
      invalidatesTags: ['PlanTemplate'],
    }),
    deletePlanTemplate: b.mutation<void, number>({
      query: (id) => ({ url: `records/plan-templates/${id}/`, method: 'DELETE' }),
      invalidatesTags: ['PlanTemplate'],
    }),
    applyPlanTemplate: b.mutation<TreatmentPlan, { id: number; patient: number; title?: string }>({
      query: ({ id, ...body }) => ({
        url: `records/plan-templates/${id}/apply/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Plan'],
    }),

    // Notifications & reports
    getAlerts: b.query<{ count: number; alerts: NotificationAlert[] }, string | void>({
      query: (lang) => ({ url: 'notifications/', params: { lang: lang || 'ar' } }),
      providesTags: ['Alerts'],
    }),
    getReports: b.query<ReportsSummary, void>({
      query: () => 'reports/summary/',
      providesTags: ['Dashboard'],
    }),
  }),
})

export const {
  useLoginMutation,
  useDashboardQuery,
  useGetPatientsQuery,
  useGetPatientQuery,
  usePatientRecordsQuery,
  usePatientAppointmentsQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetDentistsQuery,
  useGetAppointmentsQuery,
  useCreateAppointmentMutation,
  useUpdateAppointmentMutation,
  useDeleteAppointmentMutation,
  useCreateRecordMutation,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useAddPaymentMutation,
  useCreateInstallmentsMutation,
  usePayInstallmentMutation,
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useTogglePlanItemMutation,
  useGetPrescriptionsQuery,
  useCreatePrescriptionMutation,
  useGetFilesQuery,
  useUploadFileMutation,
  useDeleteFileMutation,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useGetMovementsQuery,
  useCreateMovementMutation,
  useGetAlertsQuery,
  useGetReportsQuery,
  useGetFinanceSummaryQuery,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useGetDrugsQuery,
  useCreateDrugMutation,
  useDeleteDrugMutation,
  useUpdateDrugMutation,
  useUpdateRecordMutation,
  useDeleteRecordMutation,
  useDeletePlanMutation,
  useUpdatePrescriptionMutation,
  useDeletePrescriptionMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useDeleteBranchMutation,
  useDeleteUserMutation,
  useDeleteProductMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetClinicSettingsQuery,
  useGetClinicBrandingQuery,
  useUpdateClinicSettingsMutation,
  useCollectFeeMutation,
  useCheckInAppointmentMutation,
  useSetQueueStateMutation,
  useMoveQueueMutation,
  useGetVisitTypesQuery,
  useCreateVisitTypeMutation,
  useUpdateVisitTypeMutation,
  useDeleteVisitTypeMutation,
  useGetPlanTemplatesQuery,
  useCreatePlanTemplateMutation,
  useUpdatePlanTemplateMutation,
  useDeletePlanTemplateMutation,
  useApplyPlanTemplateMutation,
  useGetPatientReportQuery,
  useGetDentistReportQuery,
  useGetDoctorDayQuery,
} = api
