/* ===================================================================
   SolveSamaj — shared Supabase client (vanilla JS, no bundler)
   Load order on any page that talks to Supabase:
     1) <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
     2) <script src="js/supabase-client.js"></script>
     3) data.js / app.js / shell.js (only what the page already uses)
     4) inline page-specific <script> blocks
   The CDN bundle only sets window.supabase — the NAMESPACE object
   (its only useful member is .createClient). The actual client is
   created here and exposed as the global `sbClient`; page scripts
   must call sbClient.* and never window.supabase.*.
   =================================================================== */

const SUPABASE_URL = 'https://chwvtrcxnfqfkwlaxxbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3Z0cmN4bmZxZmt3bGF4eGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDczNjUsImV4cCI6MjEwMzI4MzM2NX0.RS5UcZDMG4hYV4ksztZvxDIO51LJVP9GkRjpJQD1ZoY';

if(!window.supabase || typeof window.supabase.createClient !== 'function'){
  console.error('[SolveSamaj] Supabase UMD bundle not found — the CDN <script> for supabase.min.js must load BEFORE js/supabase-client.js.');
}

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client ready:', typeof sbClient.from);