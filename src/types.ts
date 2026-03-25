export type PatientStatus = 'ativo' | 'inativo' | 'alta';
export type SessionStatus = 'agendada' | 'realizada' | 'cancelada' | 'faltou';
export type PaymentStatus = 'pendente' | 'pago' | 'cancelado' | 'vencido';

export interface Patient {
  id: string;
  name: string;
  cpf?: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  occupation?: string;
  status: PatientStatus;
  session_value?: number;
  session_duration?: number;
  started_at?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PatientPresentation {
  id: string;
  patient_id: string;
  chief_complaint?: string;
  history?: string;
  family_history?: string;
  previous_treatments?: string;
  objectives?: string;
  created_at: string;
  updated_at?: string;
}

export interface Prontuario {
  id: string;
  patient_id: string;
  session_id?: string;
  date: string;
  session_number?: number;
  content: string;
  analyst_notes?: string;
  dreams?: string;
  themes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  patient_id: string;
  patient?: Patient;
  date_time: string;
  duration_min: number;
  status: SessionStatus;
  google_event_id?: string;
  meet_link?: string;
  calendar_link?: string;
  value?: number;
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  session_id?: string;
  session?: Session;
  patient_id: string;
  patient?: Patient;
  amount: number;
  status: PaymentStatus;
  mp_payment_id?: string;
  mp_link?: string;
  description?: string;
  due_date?: string;
  paid_at?: string;
  created_at: string;
}

export interface Settings {
  default_session_duration: number;
  default_session_value: number;
  google_calendar_connected: boolean;
  google_calendar_id?: string;
  mp_access_token?: string;
  mp_public_key?: string;
  clinic_name: string;
  analyst_name: string;
  analyst_crp?: string;
}

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
}
