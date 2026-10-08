/* ============================================================
   Taqdom — Supabase client bootstrap (publishable key only)
   ============================================================ */
window.TAQDOM_SUPABASE_URL = "https://adlajwbaygnwfwxbnsle.supabase.co";
window.TAQDOM_SUPABASE_KEY = "sb_publishable_wMKkGnXIkuHLUJ2ZoaYJEQ_MZycm9ru";
window.TAQDOM = window.TAQDOM || {};
(function () {
  if (!window.supabase) { console.warn("[taqdom] supabase-js not loaded"); return; }
  window.TAQDOM.db = window.supabase.createClient(
    window.TAQDOM_SUPABASE_URL,
    window.TAQDOM_SUPABASE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
})();
