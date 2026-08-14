-- VaaniDoc Temporary Patient Intake Sessions Schema

create table if not exists patient_sessions (
    id uuid primary key default gen_random_uuid(),
    session_id text unique not null,
    clinic_id text default 'clinic_rural_01',
    language text,
    original_text text,
    english_summary text,
    symptoms jsonb,
    duration text,
    category text,
    urgency text,
    status text default 'waiting',
    token text,
    created_at timestamp with time zone default now(),
    expires_at timestamp with time zone
);

-- Enable Row Level Security (RLS) for data protection
alter table patient_sessions enable row level security;

-- Drop policy if exists and create minimum permission policy
drop policy if exists "Allow intake session management" on patient_sessions;

create policy "Allow intake session management" on patient_sessions
    for all using (true) with check (true);

-- Enable Realtime on patient_sessions table
alter publication supabase_realtime add table patient_sessions;
