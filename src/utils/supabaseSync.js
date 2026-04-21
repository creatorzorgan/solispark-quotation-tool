// Async sync layer on top of Supabase.
//
// The `quotations` table uses this shape:
//   id          text primary key    — the quotation id (q_xxx...)
//   data        jsonb               — the full quotation object
//   created_at  timestamptz
//   updated_at  timestamptz
//
// We store the whole quotation as a JSONB blob rather than normalising into
// columns because the quotation shape evolves frequently and JSONB lets us
// ship schema changes without a DB migration. Postgres indexes JSONB fine if
// we ever need to query inside it.
//
// The `app_config` table mirrors the same pattern for the single global
// config document (id = 'global').

import { supabase, isSupabaseEnabled } from '../lib/supabase.js';

// ---------- Quotations ------------------------------------------------------

// Fetch every quotation, newest first. Returns [] on failure so the caller can
// fall back to the localStorage cache gracefully.
export const fetchAllQuotations = async () => {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from('quotations')
    .select('data')
    .order('updated_at', { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] fetchAllQuotations failed:', error.message);
    return null;
  }
  return (data || []).map((row) => row.data);
};

// Upsert a quotation. Fire-and-forget from the caller's perspective — failure
// is logged but doesn't block the UI because localStorage already has it.
export const upsertQuotation = async (q) => {
  if (!isSupabaseEnabled || !q?.id) return;
  const { error } = await supabase
    .from('quotations')
    .upsert(
      {
        id: q.id,
        data: q,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] upsertQuotation failed:', error.message);
  }
};

export const deleteQuotationRemote = async (id) => {
  if (!isSupabaseEnabled || !id) return;
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] deleteQuotationRemote failed:', error.message);
  }
};

// ---------- Config ----------------------------------------------------------

const CONFIG_ID = 'global';

export const fetchConfig = async () => {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from('app_config')
    .select('data')
    .eq('id', CONFIG_ID)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] fetchConfig failed:', error.message);
    return null;
  }
  return data?.data || null;
};

export const upsertConfig = async (config) => {
  if (!isSupabaseEnabled || !config) return;
  const { error } = await supabase
    .from('app_config')
    .upsert(
      { id: CONFIG_ID, data: config, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] upsertConfig failed:', error.message);
  }
};
