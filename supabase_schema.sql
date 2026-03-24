-- ============================================
-- Clínica de Psicanálise Aline Herts — Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Patients
create table if not exists patients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  cpf text,
  birth_date date,
  phone text,
  email text,
  address text,
  emergency_contact text,
  emergency_phone text,
  occupation text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'alta')),
  session_value numeric(10,2),
  session_duration integer default 50,
  started_at date,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Patient Presentation (queixa, histórico, etc.)
create table if not exists patient_presentation (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references patients(id) on delete cascade,
  chief_complaint text,
  history text,
  family_history text,
  previous_treatments text,
  objectives text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Sessions
create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references patients(id) on delete cascade,
  date_time timestamp with time zone not null,
  duration_min integer not null default 50,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'cancelada', 'faltou')),
  google_event_id text,
  value numeric(10,2),
  notes text,
  created_at timestamp with time zone default now()
);

-- Prontuário Psicanalítico
create table if not exists prontuario (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references patients(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  date date not null,
  session_number integer,
  content text not null,
  analyst_notes text,
  dreams text,
  themes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Payments
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references patients(id) on delete cascade,
  session_id uuid references sessions(id) on delete set null,
  amount numeric(10,2) not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado', 'vencido')),
  mp_payment_id text,
  mp_link text,
  description text,
  due_date date,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- ── Row Level Security ──
alter table patients enable row level security;
alter table patient_presentation enable row level security;
alter table sessions enable row level security;
alter table prontuario enable row level security;
alter table payments enable row level security;

-- For now, allow all operations (tighten with auth later)
create policy "allow_all_patients" on patients for all using (true) with check (true);
create policy "allow_all_presentation" on patient_presentation for all using (true) with check (true);
create policy "allow_all_sessions" on sessions for all using (true) with check (true);
create policy "allow_all_prontuario" on prontuario for all using (true) with check (true);
create policy "allow_all_payments" on payments for all using (true) with check (true);

-- ── Indexes ──
create index if not exists idx_sessions_patient_id on sessions(patient_id);
create index if not exists idx_sessions_date_time on sessions(date_time);
create index if not exists idx_payments_patient_id on payments(patient_id);
create index if not exists idx_prontuario_patient_id on prontuario(patient_id);
create index if not exists idx_prontuario_date on prontuario(date);
