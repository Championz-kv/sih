(async () => {
  /* ---- Scenario A: DB row prefill via loadOrgProfile ---- */
  console.log('--- prefill from DB ---');
  sessionUser = { id: 'u-org-1', email: 'info@mmmut.ac.in', user_metadata: { role: 'org_member', full_name: 'MMMUT Gorakhpur' } };
  dbRow = { id: 'u-org-1', username: 'mmmut', full_name: 'MMMUT Gorakhpur', email: 'info@mmmut.ac.in',
    phone: '+91 551 234 5678', about: 'State university', address: 'Gorakhpur',
    link_other: 'https://mmmut.ac.in\nhttps://alumni.mmmut.ac.in',
    role: 'org_member', org_type: 'uni', expertise: 'IT / Computer Science & AI, Law & Public Policy',
    resources: 'Funding / Grants', preferences: 'Research & Publication',
    state: 'Bihar', district: 'Patna', funding_verified: 50000, funding_awaited: 0 };
  await sandbox.loadOrgProfile();
  T('org name filled', ids.oName.value === 'MMMUT Gorakhpur');
  T('type code selected (uni)', ids.oType.value === 'uni');
  T('about filled', ids.oAbout.value === 'State university');
  T('state restored to Bihar', ids.oState.value === 'Bihar');
  T('districts rebuilt for Bihar, Patna selected', ids.oDist.value === 'Patna' && ids.oDist.options.some(o => o.value === 'Patna'));
  T('district dropdown enabled after restore', ids.oDist.disabled === false);
  T('phone/email/address filled', ids.oPhone.value === '+91 551 234 5678' && ids.oEmail.value === 'info@mmmut.ac.in' && ids.oAddress.value === 'Gorakhpur');
  T('expertise chips restored (2 selected)', chipChildren('expChips', 'sel').length === 2 &&
      chipChildren('expChips', 'sel').map(c => c.chipText).includes('Law & Public Policy'));
  T('resource chip restored (1 selected)', chipChildren('resChips', 'sel').length === 1);
  T('preference chip restored (1 selected)', chipChildren('prefChips', 'sel').length === 1);
  T('session cache saved with org columns', !!getSessionProfile() && getSessionProfile().org_type === 'uni');

  /* ---- chip toggling (delegated document click) ---- */
  console.log('--- chips ---');
  const clickFns = docListeners['click'] || [];
  T('delegated click listener registered', clickFns.length === 1);
  const chip = chipChildren('expChips')[0];               // unselected chip
  clickFns.forEach(f => f({ target: chip }));
  T('click selects chip', chip._class.has('sel'));
  clickFns.forEach(f => f({ target: chip }));
  T('second click unselects (toggle off)', !chip._class.has('sel'));
  clickFns.forEach(f => f({ target: chip }));
  T('selected again for save test', chip._class.has('sel'));

  /* ---- saveOrgProfile ---- */
  console.log('--- save ---');
  await sandbox.saveOrgProfile();
  T('one update issued', updateCalls.length === 1);
  const p = updateCalls[0] || {};
  T('org columns in payload', p.org_type === 'uni' && typeof p.expertise === 'string' && typeof p.resources === 'string' && typeof p.preferences === 'string');
  T('expertise CSV includes clicked + saved chips', (p.expertise || '').indexOf('Civil & Structural Engineering') >= 0 && (p.expertise || '').indexOf('Law & Public Policy') >= 0);
  T('resources/preferences CSVs exact', p.resources === 'Funding / Grants' && p.preferences === 'Research & Publication');
  T('state/district saved from the two dropdowns', p.state === 'Bihar' && p.district === 'Patna');
  T('no is_anonymous / no fake fields', !('is_anonymous' in p));
  T('success toast shown', toasts.some(m => /saved successfully/i.test(m)));
  T('save button re-enabled', ids.orgSaveBtn.disabled === false && ids.orgSaveBtn.textContent === 'Save profile');
  T('cache updated with expertise CSV', (getSessionProfile().expertise || '').indexOf('Civil & Structural') >= 0);

  /* ---- Scenario B: missing profiles row → auto-create ---- */
  console.log('--- missing row ---');
  updateCalls.length = 0; upsertCalls.length = 0; delete store['ss_profile'];
  dbRow = null;
  await sandbox.loadOrgProfile();
  T('upsert issued for missing row', upsertCalls.length >= 1 && upsertCalls[0].id === 'u-org-1');
  T('form filled from auth metadata, no fake defaults', ids.oName.value === 'MMMUT Gorakhpur' && ids.oAbout.value === '');

  /* ---- Scenario C: no session → login redirect ---- */
  console.log('--- no session ---');
  navs.length = 0;
  sessionUser = null;
  await sandbox.loadOrgProfile();
  T('redirects to login.html', navs.includes('login.html'));

  console.log('--- RESULT: ' + pass + ' passed, ' + fail + ' failed ---');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('HARNESS ERROR:', e && (e.stack || e.message) || e); process.exitCode = 1; });
