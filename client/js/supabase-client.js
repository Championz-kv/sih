/* ===================================================================
   SolveSamaj — shared Supabase client (vanilla JS, no bundler)
   Load order on any page that talks to Supabase:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
     <script src="js/supabase-client.js"></script>
     ... page-specific auth scripts ...
   The top-level `const supabase` creates one global client shared by
   every script on the page — do NOT redeclare it in page scripts.
   =================================================================== */

const SUPABASE_URL = 'https://chwvtrcxnfqfkwlaxxbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3Z0cmN4bmZxZmt3bGF4eGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDczNjUsImV4cCI6MjEwMzI4MzM2NX0.RS5UcZDMG4hYV4ksztZvxDIO51LJVP9GkRjpJQD1ZoY';

if(!window.supabase){
  console.error('[SolveSamaj] Supabase UMD bundle not found — the CDN <script> for supabase.min.js must load BEFORE js/supabase-client.js.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);