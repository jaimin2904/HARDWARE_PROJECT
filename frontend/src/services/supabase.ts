import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://bvmvqjehmoahvwbtczye.supabase.co';
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_sXKjbz1sPGnQppYGcM-u5A_2106lQM5';

export const supabase =
  supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_SUPABASE')
    ? createClient(supabaseUrl, supabaseKey)
    : null;


export const subscribeToClinicSessions = (
  clinicId: string,
  onPayload: (payload: any) => void
) => {
  if (!supabase) return null;

  return supabase
    .channel('public:patient_sessions')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'patient_sessions',
        filter: `clinic_id=eq.${clinicId}`,
      },
      (payload) => {
        onPayload(payload);
      }
    )
    .subscribe();
};
