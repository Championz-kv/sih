/* Headless verification harness for org-profile.html (part 1: stubs) */
let sessionUser = null;          // null => no session
let dbRow = null;                // profiles row returned by selects
const updateCalls = [], upsertCalls = [], toasts = [], navs = [];
const store = {};
const listeners = {};            // element listeners
const docListeners = {};         // document listeners

function El(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), children: [], options: [], id: '',
    value: '', textContent: '', disabled: false, _class: new Set(), _html: '',
    style: {}, readOnly: false, placeholder: '', lastElementChild: null,
    classList: {
      add(...c) { c.forEach(x => el._class.add(x)); },
      remove(...c) { c.forEach(x => el._class.delete(x)); },
      toggle(c, force) { const on = force === undefined ? !el._class.has(c) : !!force; if (on) el._class.add(c); else el._class.delete(c); return on; },
      contains(c) { return el._class.has(c); }
    },
    addEventListener(ev, fn) { (listeners[ev + '::' + el.id] = listeners[ev + '::' + el.id] || []).push(fn); },
    appendChild(c) { el.children.push(c); if (c.tagName === 'OPTION') el.options.push(c); return c; },
    insertAdjacentHTML(pos, html) {
      const row = { querySelector: () => ({ value: '' }) };
      el.children.push(row); el.lastElementChild = row;
      return row;
    },
    querySelector() { return { value: '' }; },
    closest() { return null; }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      el._html = v; el.children = []; el.options = [];
      if (el.tagName === 'SELECT' && v) {
        [...String(v).matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].forEach(m => {
          const val = (m[1].match(/value="([^"]*)"/) || [])[1] || '';
          el.options.push({ value: val, textContent: m[2] });
        });
      }
    }
  });
  return el;
}

const ids = {};
['oName','oType','oAbout','oState','oDist','oPhone','oEmail','oAddress',
 'orgLinkRows','orgSaveBtn','orgDonorBadge','orgFunding','expChips','resChips','prefChips']
  .forEach(id => {
    const el = El(/^(oState|oDist|oType)$/.test(id) ? 'select' : 'div');
    el.id = id; ids[id] = el;
  });
[['expChips', ['Civil & Structural Engineering', 'IT / Computer Science & AI', 'Law & Public Policy', 'Public Health & Medicine']],
 ['resChips', ['Student Teams', 'Funding / Grants', 'Research Laboratories']],
 ['prefChips', ['Research & Publication', 'Pilot Program Deployment']]]
 .forEach(([cid, chips]) => {
   chips.forEach(t => {
     const chip = El('span');
     chip.chipText = t; chip.textContent = t; chip.closest = () => chip;
     ids[cid].children.push(chip);
   });
 });

function chipChildren(id, selClass) {
  return ids[id].children.filter(c => c.chipText && (!selClass || c._class.has(selClass)));
}
function docSelectAll(sel) {
  if (/#orgLinkRows/.test(sel)) return [{ value: 'https://org.ac.in' }];
  const m = sel.match(/#(\w+)\.chip-opt(\.sel)?$/);
  if (m) return chipChildren(m[1], m[2] ? 'sel' : null);
  return [];
}

const document = {
  getElementById: id => ids[id] || null,
  querySelectorAll: docSelectAll,
  querySelector: () => null,
  createElement: t => El(t),
  title: '',
  addEventListener(ev, fn) { (docListeners[ev] = docListeners[ev] || []).push(fn); }
};
