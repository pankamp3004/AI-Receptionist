export interface Organization {
  id: string
  name: string
  type: string
  phone: string
  email: string
  address: string
  timezone: string
  created_at: string
}

export interface Specialty {
  id: string
  organization_id: string
  spec_name: string
}

export interface Doctor {
  id: string
  organization_id: string
  name: string
  experiences?: number
  degree_doc?: string
  status: 'Active' | 'Inactive' | 'Retired'
  is_active: boolean
  specialties: Specialty[]
  created_at: string
  updated_at: string
}

export interface DocShift {
  id: string
  organization_id: string
  doc_id: string
  day_of_week: string
  start_time: string
  end_time: string
  status: 'Active' | 'Inactive' | 'OnLeave'
  doctor?: Doctor
}

export interface PatientAccount {
  id: string
  organization_id: string
  mobile_no: string
  created_at: string
}

export interface Patient {
  id: string
  organization_id: string
  account_id: string
  name: string
  gender?: 'Male' | 'Female' | 'Other'
  dob?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  organization_id: string
  account_id: string
  doctor_id: string
  patient_id: string
  reason?: string
  date_time: string
  app_status: 'Booked' | 'Scheduled' | 'Completed' | 'Cancelled' | 'NoShow' | 'Rescheduled'
  is_active: boolean
  created_at: string
  updated_at: string
  doctor?: Doctor
  patient?: Patient
}

export interface AIConfiguration {
  id: string
  organization_id: string
  specialty_mappings: Record<string, string[]>
  symptom_mappings: Record<string, string>
}

export interface CallLog {
  session_id: string
  organization_id: string
  phone_number: string
  transcript: string
  intent: string
  started_at: string
}

export interface DashboardStats {
  total_doctors: number
  total_patients: number
  total_appointments: number
  total_calls: number
  scheduled_appointments: number
  cancelled_appointments: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}
