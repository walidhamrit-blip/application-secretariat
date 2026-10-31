/* تطبيق السكرتارية — شركة الصداقة
   إدارة نماذج الخطابات (إضافة / تعديل / حذف / إعادة استخدام) + حفظ وطباعة الخطابات
   البيانات تُحفظ محلياً في المتصفح (localStorage) */
'use strict';

const LS_TEMPLATES = 'sadaka_templates_v1';
const LS_LETTERS = 'sadaka_letters_v1';
const $ = (s) => document.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- النماذج الافتراضية (منها «تسليم قيمة» المطلوب) ---------- */
const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-taslim-qima', name: 'تسليم قيمة', category: 'مالي',
    subject: 'تسليم قيمة مالية',
    desc: 'نموذج إثبات تسليم مبلغ مالي إلى جهة أو شخص، مع توقيع المستلم — قابل لإعادة الاستخدام.',
    content:
`السيد/ {{اسم_المستلم}} المحترم،

تحية طيبة وبعد،

نفيدكم بأنه تم بموجب هذا الخطاب تسليم قيمة مالية قدرها ({{المبلغ}}) {{العملة}}، وذلك مقابل {{سبب_التسليم}}، بتاريخ {{تاريخ_التسليم}}.

نرجو منكم التكرم بالتوقيع أدناه بما يفيد الاستلام، وشاكرين لكم حسن تعاونكم.

وتفضلوا بقبول فائق الاحترام والتقدير،

المستلم: {{اسم_المستلم}}
التوقيع: ............................

إدارة شركة الصداقة
{{اسم_المدير}}`
  },
  {
    id: 'tpl-ijaza', name: 'طلب إجازة', category: 'موارد بشرية',
    subject: 'طلب إجازة',
    desc: 'نموذج طلب إجازة موظف مع تحديد المدة والبديل.',
    content:
`السيد/ مدير إدارة الموارد البشرية المحترم،

تحية طيبة وبعد،

أتقدم إليكم بطلب إجازة لمدة ({{عدد_الأيام}}) أيام، ابتداءً من تاريخ {{تاريخ_البداية}} وحتى تاريخ {{تاريخ_النهاية}}، وذلك بسبب {{سبب_الإجازة}}.

وسيقوم الزميل {{اسم_البديل}} بمتابعة مهامي خلال فترة الإجازة.

وتفضلوا بقبول فائق الاحترام،

الموظف: {{اسم_الموظف}}
التوقيع: ............................`
  },
  {
    id: 'tpl-shahada', name: 'شهادة عمل', category: 'موارد بشرية',
    subject: 'شهادة عمل',
    desc: 'شهادة تثبت أن شخصاً يعمل لدى الشركة بوظيفة محددة.',
    content:
`تشهد شركة الصداقة بأن السيد/ {{اسم_الموظف}} يعمل لديها بوظيفة ({{المسمى_الوظيفي}}) منذ تاريخ {{تاريخ_التعيين}} وحتى تاريخه.

وقد حُررت هذه الشهادة بناءً على طلبه لتقديمها إلى {{الجهة}}، دون أدنى مسؤولية على الشركة.

والله ولي التوفيق،

إدارة الموارد البشرية
{{اسم_المدير}}`
  },
  {
    id: 'tpl-taamim', name: 'تعميم إداري', category: 'إداري',
    subject: 'تعميم إداري',
    desc: 'تعميم داخلي موجه إلى جميع الموظفين أو إدارة محددة.',
    content:
`إلى: {{الجهة_المخاطبة}}

تحية طيبة وبعد،

نحيطكم علماً بأنه تقرر ما يلي: {{نص_القرار}}، على أن يدخل هذا القرار حيز التنفيذ اعتباراً من تاريخ {{تاريخ_التنفيذ}}.

يرجى من الجميع الالتزام بما ورد أعلاه، وشاكرين لكم تعاونكم.

إدارة شركة الصداقة
{{اسم_المدير}}`
  },
  {
    id: 'tpl-daawa', name: 'دعوة اجتماع', category: 'عام',
    subject: 'دعوة لحضور اجتماع',
    desc: 'دعوة رسمية لحضور اجتماع مع تحديد الزمان والمكان.',
    content:
`السادة/ {{المدعوون}} المحترمون،

تحية طيبة وبعد،

يسرنا دعوتكم لحضور اجتماع لمناقشة {{موضوع_الاجتماع}}، وذلك يوم {{يوم_الاجتماع}} الموافق {{تاريخ_الاجتماع}} عند الساعة {{ساعة_الاجتماع}}، في {{مكان_الاجتماع}}.

نأمل حضوركم في الموعد المحدد، وشاكرين لكم تعاونكم.

إدارة شركة الصداقة
{{اسم_المدير}}`
  }
];

/* ---------- الحالة ---------- */
let templates = load(LS_TEMPLATES, null);
if (!Array.isArray(templates) || !templates.length) { templates = [...DEFAULT_TEMPLATES]; save(LS_TEMPLATES, templates); }
// ضمان وجود نموذج «تسليم قيمة» حتى عند مستخدم لديه بيانات قديمة
if (!templates.some(t => t.name === 'تسليم قيمة')) { templates.unshift(DEFAULT_TEMPLATES[0]); save(LS_TEMPLATES, templates); }

let letters = load(LS_LETTERS, []);
let editingTemplateId = null;   // null = إنشاء نموذج جديد
let currentLetterId = null;

function load(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

/* ---------- تنقل بين الأقسام ---------- */
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  if (name === 'templates') renderTemplates();
  if (name === 'letters') renderLetters();
  if (name === 'tables') { renderCompaniesStrip(); renderTableTemplates(); renderSavedTables(); updateBadges(); }
  if (name === 'companies') renderCompanies();
}
document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => showView(n.dataset.view)));
document.querySelectorAll('[data-goto-editor]').forEach(b => b.addEventListener('click', () => showView('editor')));

/* ---------- رسائل تنبيه ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 3200);
}

/* =====================================================
   نماذج الخطابات — العرض + زر «إضافة نموذج جديد»
===================================================== */
function renderTemplates() {
  const q = ($('#templateSearch').value || '').trim();
  const cat = $('#templateCategory').value;
  const list = templates.filter(t =>
    (!q || t.name.includes(q) || (t.subject || '').includes(q) || (t.desc || '').includes(q)) &&
    (!cat || t.category === cat));

  $('#templatesGrid').innerHTML = list.map(t => `
    <article class="card">
      <div class="card-top"><h3>${esc(t.name)}</h3><span class="tag ${t.category === 'مالي' ? 'gold' : ''}">${esc(t.category || 'عام')}</span></div>
      <p class="desc">${esc(t.desc || t.subject || 'نموذج خطاب جاهز لإعادة الاستخدام')}</p>
      <div class="excerpt">${esc((t.content || '').slice(0, 220))}…</div>
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" data-use="${t.id}">✍️ استخدام النموذج</button>
        <button class="btn btn-outline btn-sm" data-edit="${t.id}">✏️ تعديل</button>
        <button class="btn btn-outline btn-sm" data-dup="${t.id}">📄 نسخ</button>
        <button class="btn btn-danger btn-sm" data-del="${t.id}">🗑️ حذف</button>
      </div>
    </article>`).join('');
  $('#templatesEmpty').hidden = list.length > 0;
  $('#statTemplates').textContent = templates.length;
  $('#statLetters').textContent = letters.length;
  $('#lettersCount').textContent = letters.length;
  fillTemplateSelect();
}

$('#templateSearch').addEventListener('input', renderTemplates);
$('#templateCategory').addEventListener('change', renderTemplates);

$('#templatesGrid').addEventListener('click', (e) => {
  const use = e.target.closest('[data-use]'), edit = e.target.closest('[data-edit]'),
        dup = e.target.closest('[data-dup]'), del = e.target.closest('[data-del]');
  if (use) useTemplate(use.dataset.use);
  if (edit) openTemplateModal(edit.dataset.edit);
  if (dup) {
    const src = templates.find(t => t.id === dup.dataset.dup); if (!src) return;
    templates.unshift({ ...src, id: uid(), name: src.name + ' — نسخة' });
    save(LS_TEMPLATES, templates); renderTemplates(); toast('📄 تم نسخ النموذج بنجاح');
  }
  if (del) {
    const src = templates.find(t => t.id === del.dataset.del); if (!src) return;
    if (!confirm(`حذف نموذج «${src.name}» نهائياً؟`)) return;
    templates = templates.filter(t => t.id !== src.id);
    save(LS_TEMPLATES, templates); renderTemplates(); toast('🗑️ تم حذف النموذج');
  }
});

/* ---------- نافذة إضافة / تعديل نموذج ---------- */
function openTemplateModal(id = null, prefill = null) {
  editingTemplateId = id;
  const t = id ? templates.find(x => x.id === id) : null;
  $('#templateModalTitle').textContent = t ? `✏️ تعديل نموذج «${t.name}»` : '➕ إضافة نموذج خطاب جديد';
  $('#btnSubmitTemplate').textContent = t ? '💾 حفظ التعديلات' : '💾 حفظ النموذج';
  $('#templateError').hidden = true;
  $('#tName').value = t?.name ?? prefill?.name ?? '';
  $('#tCategory').value = t?.category ?? prefill?.category ?? 'عام';
  $('#tSubject').value = t?.subject ?? prefill?.subject ?? '';
  $('#tDesc').value = t?.desc ?? prefill?.desc ?? '';
  $('#tContent').value = t?.content ?? prefill?.content ?? '';
  $('#templateModal').hidden = false;
  setTimeout(() => $('#tName').focus(), 50);
}
function closeTemplateModal() { $('#templateModal').hidden = true; editingTemplateId = null; }

// زر «إضافة نموذج جديد» — موجود في أعلى الصفحة والشريط الجانبي وقسم النماذج والمحرر وحالة الفراغ
['btnNewTemplateTop', 'btnNewTemplateSide', 'btnNewTemplateMain', 'btnNewTemplateEmpty', 'btnNewTemplateEditor']
  .forEach(id => document.getElementById(id)?.addEventListener('click', () => openTemplateModal()));

$('#btnCloseModal').addEventListener('click', closeTemplateModal);
$('#btnCancelModal').addEventListener('click', closeTemplateModal);
$('#templateModal').addEventListener('click', (e) => { if (e.target.id === 'templateModal') closeTemplateModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTemplateModal(); });

// إدراج متغير داخل نص النموذج عند موضع المؤشر
document.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
  const ta = $('#tContent'), token = `{{${ch.dataset.var}}}`;
  const s = ta.selectionStart ?? ta.value.length;
  ta.value = ta.value.slice(0, s) + token + ta.value.slice(ta.selectionEnd ?? s);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + token.length;
}));

$('#templateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#tName').value.trim(), content = $('#tContent').value.trim();
  const err = $('#templateError');
  if (!name || !content) { err.textContent = '⚠️ يرجى كتابة اسم النموذج ونص النموذج.'; err.hidden = false; return; }
  if (templates.some(t => t.name === name && t.id !== editingTemplateId)) {
    err.textContent = `⚠️ يوجد نموذج بنفس الاسم «${name}» — اختر اسماً مختلفاً أو عدّل النموذج الموجود.`; err.hidden = false; return;
  }
  const data = { name, category: $('#tCategory').value, subject: $('#tSubject').value.trim(), desc: $('#tDesc').value.trim(), content };
  if (editingTemplateId) {
    templates = templates.map(t => t.id === editingTemplateId ? { ...t, ...data } : t);
    toast(`✅ تم تحديث نموذج «${name}» بنجاح`);
  } else {
    const created = { id: uid(), ...data };
    templates.unshift(created);
    toast(`✅ تم إنشاء نموذج «${name}» — يمكنك الآن استخدامه في أي خطاب`);
    editingTemplateId = created.id; // ليُختار تلقائياً عند الاستخدام
  }
  save(LS_TEMPLATES, templates);
  closeTemplateModal(); renderTemplates(); showView('templates');
  const createdId = templates.find(t => t.name === name)?.id;
  if (createdId && confirm(`تم حفظ نموذج «${name}» بنجاح.\nهل تريد استخدامه الآن لإنشاء خطاب جديد؟`)) useTemplate(createdId);
});

/* =====================================================
   محرر الخطاب
===================================================== */
function fillTemplateSelect(selectedId) {
  const sel = $('#fTemplate');
  const current = selectedId ?? sel.value;
  sel.innerHTML = '<option value="">— بدون نموذج (نص حر) —</option>' +
    templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  if (templates.some(t => t.id === current)) sel.value = current;
}

function extractVars(content) {
  return [...new Set([...String(content || '').matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m => m[1].trim()))];
}

function useTemplate(id) {
  const t = templates.find(x => x.id === id); if (!t) return;
  showView('editor');
  fillTemplateSelect(id);
  $('#fSubject').value = t.subject || '';
  $('#fContent').value = t.content || '';
  if (!$('#fDate').value) $('#fDate').value = today();
  currentLetterId = null;
  renderVarFields(); updatePreview();
  toast(`✍️ تم تحميل نموذج «${t.name}» — املأ الحقول ثم احفظ أو اطبع`);
}

$('#fTemplate').addEventListener('change', (e) => {
  const t = templates.find(x => x.id === e.target.value);
  if (t) { $('#fSubject').value = t.subject || ''; $('#fContent').value = t.content || ''; }
  renderVarFields(); updatePreview();
});

function renderVarFields() {
  const vars = extractVars($('#fContent').value);
  $('#varsBox').hidden = vars.length === 0;
  $('#varsFields').innerHTML = vars.map(v =>
    `<label>${esc(v.replaceAll('_', ' '))}<input data-var="${esc(v)}" placeholder="اكتب ${esc(v.replaceAll('_', ' '))} هنا…" /></label>`).join('');
  $('#varsFields').querySelectorAll('[data-var]').forEach(inp => inp.addEventListener('input', updatePreview));
}

function filledContent() {
  let txt = $('#fContent').value || '';
  document.querySelectorAll('#varsFields [data-var]').forEach(inp => {
    txt = txt.replaceAll(`{{${inp.dataset.var}}}`, inp.value.trim());
  });
  return txt;
}

function updatePreview() {
  $('#pRef').textContent = $('#fRef').value.trim() || '—';
  $('#pDate').textContent = $('#fDate').value || '—';
  $('#pRecipient').textContent = $('#fRecipient').value.trim() || '—';
  $('#pSubject').textContent = $('#fSubject').value.trim() || 'موضوع الخطاب';
  $('#pSign').textContent = $('#fRecipient').value.trim() || '—';
  const body = filledContent();
  $('#pBody').innerHTML = body.trim()
    ? esc(body).replace(/\{\{\s*([^}]+?)\s*\}\}/g, '<span class="unfilled">{{$1}}</span>')
    : 'اختر نموذجاً لبدء كتابة خطابك…';
}
['fRef', 'fDate', 'fRecipient', 'fSubject', 'fContent'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => { if (id === 'fContent') renderVarFields(); updatePreview(); }));

function clearEditor() {
  currentLetterId = null;
  ['fRef', 'fRecipient', 'fSubject', 'fContent'].forEach(id => document.getElementById(id).value = '');
  $('#fDate').value = today(); $('#fTemplate').value = '';
  renderVarFields(); updatePreview();
}
$('#btnClear').addEventListener('click', clearEditor);
$('#btnNewLetterTop').addEventListener('click', () => { clearEditor(); showView('editor'); });
$('#btnNewLetter2').addEventListener('click', () => { clearEditor(); showView('editor'); });

// حفظ الخطاب الحالي
$('#letterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('#fContent').value.trim() && !$('#fSubject').value.trim()) { toast('⚠️ اكتب موضوع الخطاب أو نصه قبل الحفظ'); return; }
  const data = {
    ref: $('#fRef').value.trim(), date: $('#fDate').value || today(),
    recipient: $('#fRecipient').value.trim(), subject: $('#fSubject').value.trim() || 'بدون موضوع',
    content: $('#fContent').value,
    vars: Object.fromEntries([...document.querySelectorAll('#varsFields [data-var]')].map(i => [i.dataset.var, i.value])),
    templateId: $('#fTemplate').value || ''
  };
  if (currentLetterId) {
    letters = letters.map(l => l.id === currentLetterId ? { ...l, ...data } : l);
    toast('✅ تم تحديث الخطاب المحفوظ');
  } else {
    currentLetterId = uid();
    letters.unshift({ id: currentLetterId, ...data });
    toast('✅ تم حفظ الخطاب في «الخطابات المحفوظة»');
  }
  save(LS_LETTERS, letters); renderTemplates();
});

// حفظ نص المحرر الحالي كقالب جديد قابل لإعادة الاستخدام
$('#btnSaveAsTemplate').addEventListener('click', () => {
  if (!$('#fContent').value.trim()) { toast('⚠️ اكتب نص الخطاب أولاً ثم احفظه كنموذج'); return; }
  openTemplateModal(null, {
    name: $('#fSubject').value.trim(), subject: $('#fSubject').value.trim(),
    content: $('#fContent').value
  });
});

$('#btnPrint').addEventListener('click', () => { document.body.classList.remove('printing-table'); updatePreview(); window.print(); });

/* =====================================================
   الخطابات المحفوظة
===================================================== */
function renderLetters() {
  const q = ($('#letterSearch').value || '').trim();
  const list = letters.filter(l => !q || (l.subject || '').includes(q) || (l.recipient || '').includes(q) || (l.ref || '').includes(q));
  $('#lettersList').innerHTML = list.map(l => `
    <div class="letter-row">
      <div>
        <h4>${esc(l.subject)}</h4>
        <p>إلى: ${esc(l.recipient || '—')} &nbsp;•&nbsp; الرقم: ${esc(l.ref || '—')} &nbsp;•&nbsp; التاريخ: ${esc(l.date || '—')}</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-primary btn-sm" data-open="${l.id}">✍️ فتح وتعديل</button>
        <button class="btn btn-outline btn-sm" data-print="${l.id}">🖨️ طباعة</button>
        <button class="btn btn-danger btn-sm" data-del-letter="${l.id}">🗑️ حذف</button>
      </div>
    </div>`).join('');
  $('#lettersEmpty').hidden = list.length > 0;
}
$('#letterSearch').addEventListener('input', renderLetters);

function openLetter(id, printAfter = false) {
  const l = letters.find(x => x.id === id); if (!l) return;
  showView('editor'); currentLetterId = id;
  fillTemplateSelect(l.templateId || '');
  $('#fRef').value = l.ref || ''; $('#fDate').value = l.date || today();
  $('#fRecipient').value = l.recipient || ''; $('#fSubject').value = l.subject || '';
  $('#fContent').value = l.content || '';
  renderVarFields();
  Object.entries(l.vars || {}).forEach(([k, v]) => {
    const inp = document.querySelector(`#varsFields [data-var="${CSS.escape(k)}"]`); if (inp) inp.value = v;
  });
  updatePreview();
  if (printAfter) setTimeout(() => window.print(), 150);
}

$('#lettersList').addEventListener('click', (e) => {
  const open = e.target.closest('[data-open]'), pr = e.target.closest('[data-print]'), del = e.target.closest('[data-del-letter]');
  if (open) openLetter(open.dataset.open);
  if (pr) openLetter(pr.dataset.print, true);
  if (del) {
    if (!confirm('حذف هذا الخطاب نهائياً؟')) return;
    letters = letters.filter(l => l.id !== del.dataset.delLetter);
    save(LS_LETTERS, letters); renderLetters(); renderTemplates(); toast('🗑️ تم حذف الخطاب');
  }
});

/* =====================================================
   جداول البيانات الداخلية — الشركات والشعارات + نماذج الجداول
===================================================== */
const LS_COMPANIES = 'sadaka_companies_v1';
const LS_TABLE_TEMPLATES = 'sadaka_table_templates_v1';
const LS_TABLES = 'sadaka_tables_v1';
const dateOffset = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

const DEFAULT_COMPANIES = [
  { id: 'co-sadaka', name: 'شركة الصداقة', sub: 'للتجارة والمقاولات العامة', emoji: '🏢', logo: '', owner: false },
  { id: 'co-sister', name: 'الشركة الشقيقة — عدّل اسمها', sub: 'الشركة الثانية في المجموعة', emoji: '🏭', logo: '', owner: false },
  { id: 'co-owner', name: 'المالك — سيارة خاصة', sub: 'سيارة المالك الشخصية', emoji: '👤', logo: '', owner: true }
];

const C = (key, label, type = 'text', options = null) => ({ key, label, type, options });
const DEFAULT_TABLE_TEMPLATES = [
  {
    id: 'tt-vehicles-validity', name: 'كشف صلاحية السيارات — مجموعة الشركات والمالك', icon: '🚗', category: 'السيارات والأسطول',
    desc: 'الكشف المطلوب: كل سيارات شركات المجموعة وحتى سيارة المالك، مع انتهاء الترخيص والتأمين والفحص وتنبيه تلقائي قبل الانتهاء بـ30 يوماً.',
    expiryKeys: ['license', 'insurance', 'inspection'],
    columns: [
      C('company', 'الشركة / المالك', 'company'), C('vehicle', 'نوع السيارة'), C('model', 'الموديل / سنة الصنع'),
      C('plate', 'رقم اللوحة'), C('chassis', 'رقم الهيكل'), C('color', 'اللون'), C('driver', 'السائق / المستخدم'),
      C('license', 'انتهاء الترخيص', 'date'), C('insurance', 'انتهاء التأمين', 'date'), C('inspection', 'انتهاء الفحص الدوري', 'date'),
      C('notes', 'ملاحظات')
    ],
    sample: () => ([
      { company: 'شركة الصداقة', vehicle: 'تويوتا لاندكروزر', model: '2022', plate: 'ط 12345', chassis: 'JTJ...8841', color: 'أبيض', driver: 'سائق الإدارة', license: dateOffset(210), insurance: dateOffset(160), inspection: dateOffset(90), notes: 'سيارة إدارة عامة' },
      { company: 'الشركة الشقيقة — عدّل اسمها', vehicle: 'هيونداي H1', model: '2021', plate: 'ط 67890', chassis: 'KMH...2210', color: 'فضي', driver: 'مندوب التوزيع', license: dateOffset(45), insurance: dateOffset(18), inspection: dateOffset(120), notes: 'التأمين ينتهي قريباً — بادر بالتجديد' },
      { company: 'المالك — سيارة خاصة', vehicle: 'مرسيدس S450', model: '2023', plate: 'خ 1001', chassis: 'WDD...9073', color: 'أسود', driver: 'المالك', license: dateOffset(300), insurance: dateOffset(-5), inspection: dateOffset(240), notes: 'مثال: تأمين منتهٍ — يحتاج تجديداً فورياً' },
      { company: 'شركة الصداقة', vehicle: 'نيسان باترول بيك أب', model: '2020', plate: 'ط 44521', chassis: 'JN1...3355', color: 'أبيض', driver: 'فريق المواقع', license: dateOffset(12), insurance: dateOffset(75), inspection: dateOffset(60), notes: 'الترخيص ينتهي قريباً' }
    ])
  },
  {
    id: 'tt-vehicles-maintenance', name: 'سجل صيانة ووقود السيارات', icon: '🛠️', category: 'السيارات والأسطول',
    desc: 'متابعة صيانة الأسطول: نوع الصيانة، العداد، التكلفة، الوقود، وموعد الصيانة القادمة مع تنبيه بانتهائها.',
    expiryKeys: ['nextDate'],
    columns: [
      C('company', 'الشركة / المالك', 'company'), C('vehicle', 'السيارة'), C('plate', 'رقم اللوحة'),
      C('date', 'تاريخ الصيانة', 'date'), C('type', 'نوع الصيانة', 'select', ['تغيير زيت وفلتر', 'فرامل', 'إطارات', 'بطارية', 'فحص دوري', 'تكييف', 'أخرى']),
      C('odometer', 'عداد الكم', 'number'), C('cost', 'تكلفة الصيانة', 'number'), C('fuel', 'وقود (لتر)', 'number'),
      C('nextDate', 'الصيانة القادمة', 'date'), C('workshop', 'الورشة / الفني'), C('notes', 'ملاحظات')
    ],
    sample: () => ([
      { company: 'شركة الصداقة', vehicle: 'تويوتا لاندكروزر', plate: 'ط 12345', date: dateOffset(-20), type: 'تغيير زيت وفلتر', odometer: 84500, cost: 450, fuel: 60, nextDate: dateOffset(70), workshop: 'ورشة النور', notes: '' }
    ])
  },
  {
    id: 'tt-attendance', name: 'كشف الحضور والانصراف الشهري', icon: '🕘', category: 'موارد بشرية',
    desc: 'ملخص حضور شهري لكل موظف عبر شركات المجموعة: أيام الحضور والغياب والتأخير والإضافي والإجازات — أساس إعداد الرواتب.',
    columns: [
      C('employee', 'اسم الموظف'), C('company', 'الشركة', 'company'), C('job', 'الوظيفة'),
      C('present', 'أيام الحضور', 'number'), C('absent', 'أيام الغياب', 'number'), C('late', 'مرات التأخير', 'number'),
      C('overtime', 'ساعات إضافي', 'number'), C('leave', 'أيام إجازة', 'number'), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ employee: 'مثال — اسم الموظف', company: 'شركة الصداقة', job: 'سكرتارية', present: 24, absent: 1, late: 2, overtime: 6, leave: 1, notes: '' }])
  },
  {
    id: 'tt-employees', name: 'سجل بيانات الموظفين', icon: '👥', category: 'موارد بشرية',
    desc: 'قاعدة بيانات موظفي المجموعة مع تواريخ التعيين وانتهاء العقود والوثائق وتنبيه قبل انتهائها.',
    expiryKeys: ['contractExpiry', 'idExpiry'],
    columns: [
      C('employee', 'اسم الموظف'), C('company', 'الشركة', 'company'), C('job', 'الوظيفة'), C('dept', 'القسم'),
      C('phone', 'رقم الهاتف'), C('hire', 'تاريخ التعيين', 'date'), C('contractExpiry', 'انتهاء العقد', 'date'),
      C('idExpiry', 'انتهاء الوثيقة', 'date'), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ employee: 'مثال — اسم الموظف', company: 'شركة الصداقة', job: 'محاسب', dept: 'المالية', phone: '09xxxxxxxx', hire: dateOffset(-700), contractExpiry: dateOffset(25), idExpiry: dateOffset(200), notes: 'العقد ينتهي قريباً' }])
  },
  {
    id: 'tt-payroll', name: 'كشف الرواتب الشهرية', icon: '💰', category: 'مالية',
    desc: 'رواتب موظفي المجموعة: الأساسي والبدلات والخصومات مع حساب الصافي تلقائياً وإجمالي الكشف.',
    columns: [
      C('employee', 'اسم الموظف'), C('company', 'الشركة', 'company'), C('job', 'الوظيفة'),
      C('basic', 'الراتب الأساسي', 'number'), C('allowances', 'البدلات', 'number'), C('deductions', 'الخصومات', 'number'),
      C('net', 'الصافي', 'formula-net'), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ employee: 'مثال — اسم الموظف', company: 'شركة الصداقة', job: 'سكرتارية', basic: 2500, allowances: 400, deductions: 100, notes: '' }])
  },
  {
    id: 'tt-expenses', name: 'سجل المصروفات التشغيلية', icon: '🧾', category: 'مالية',
    desc: 'تسجيل مصروفات شركات المجموعة حسب البند والتصنيف مع إجمالي تلقائي للمصروفات.',
    expiryKeys: [],
    columns: [
      C('date', 'التاريخ', 'date'), C('company', 'الشركة', 'company'), C('item', 'بيان المصروف'),
      C('cat', 'التصنيف', 'select', ['وقود', 'صيانة', 'قرطاسية', 'اتصالات', 'إيجار', 'ضيافة', 'أخرى']),
      C('amount', 'المبلغ', 'number'), C('paidBy', 'صُرف بواسطة'), C('doc', 'رقم المستند'), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ date: today(), company: 'شركة الصداقة', item: 'وقود سيارات', cat: 'وقود', amount: 300, paidBy: 'السكرتارية', doc: '001', notes: '' }])
  },
  {
    id: 'tt-assets', name: 'سجل الأصول والمعدات والجرد', icon: '🖥️', category: 'مخزون وأصول',
    desc: 'جرد أصول ومعدات المجموعة: الموقع والعهدة وتاريخ الشراء وانتهاء الضمان وحالة الأصل.',
    expiryKeys: ['warranty'],
    columns: [
      C('asset', 'الأصل / المعدة'), C('code', 'كود الأصل'), C('company', 'الشركة', 'company'), C('location', 'الموقع'),
      C('custodian', 'بعهدة'), C('purchase', 'تاريخ الشراء', 'date'), C('warranty', 'انتهاء الضمان', 'date'),
      C('condition', 'الحالة', 'select', ['ممتازة', 'جيدة', 'تحتاج صيانة', 'تالفة']), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ asset: 'طابعة ليزر', code: 'AST-001', company: 'شركة الصداقة', location: 'المقر الرئيسي', custodian: 'السكرتارية', purchase: dateOffset(-400), warranty: dateOffset(20), condition: 'جيدة', notes: '' }])
  },
  {
    id: 'tt-inventory', name: 'كشف حركة المخزون', icon: '📦', category: 'مخزون وأصول',
    desc: 'حركة أصناف المخزون: رصيد أول المدة والوارد والمنصرف مع حساب الرصيد الحالي تلقائياً.',
    columns: [
      C('item', 'الصنف'), C('code', 'الكود'), C('unit', 'الوحدة', 'select', ['قطعة', 'علبة', 'لتر', 'كجم', 'كرتونة']),
      C('opening', 'رصيد أول المدة', 'number'), C('incoming', 'وارد', 'number'), C('outgoing', 'منصرف', 'number'),
      C('balance', 'الرصيد الحالي', 'formula-stock'), C('min', 'حد إعادة الطلب', 'number'), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ item: 'ورق تصوير A4', code: 'ST-001', unit: 'كرتونة', opening: 20, incoming: 10, outgoing: 7, min: 5, notes: '' }])
  },
  {
    id: 'tt-correspondence', name: 'سجل الصادر والوارد', icon: '📨', category: 'إداري',
    desc: 'سجل السكرتارية الكلاسيكي: أرشفة المراسلات الصادرة والواردة لكل شركات المجموعة ومتابعة حالتها.',
    columns: [
      C('ref', 'رقم القيد'), C('date', 'التاريخ', 'date'), C('type', 'النوع', 'select', ['صادر', 'وارد']),
      C('fromTo', 'من / إلى'), C('subject', 'الموضوع'), C('company', 'الشركة', 'company'),
      C('handler', 'المتابع'), C('status', 'الحالة', 'select', ['جديد', 'قيد المتابعة', 'تم الرد', 'محفوظ']), C('notes', 'ملاحظات')
    ],
    sample: () => ([{ ref: 'ص/001', date: today(), type: 'صادر', fromTo: 'وزارة الاقتصاد', subject: 'تجديد ترخيص', company: 'شركة الصداقة', handler: 'السكرتارية', status: 'قيد المتابعة', notes: '' }])
  }
];

let companies = load(LS_COMPANIES, null);
if (!Array.isArray(companies) || !companies.length) { companies = [...DEFAULT_COMPANIES]; save(LS_COMPANIES, companies); }

let tableTemplates = load(LS_TABLE_TEMPLATES, null);
if (!Array.isArray(tableTemplates) || !tableTemplates.length) { tableTemplates = [...DEFAULT_TABLE_TEMPLATES]; save(LS_TABLE_TEMPLATES, tableTemplates); }
else { // إضافة أي نماذج افتراضية جديدة لمستخدم قديم دون حذف نماذجه الخاصة
  const missing = DEFAULT_TABLE_TEMPLATES.filter(d => !tableTemplates.some(t => t.id === d.id));
  if (missing.length) { tableTemplates = [...missing, ...tableTemplates]; save(LS_TABLE_TEMPLATES, tableTemplates); }
}
let savedTables = load(LS_TABLES, []);
let currentTableTemplate = null, currentTableId = null, currentRows = [];

const cloneTableTemplate = (t) => ({ id: t.id, name: t.name, icon: t.icon, category: t.category, desc: t.desc, expiryKeys: [...(t.expiryKeys || [])], columns: structuredClone(t.columns || []) });
const companyNames = () => companies.map(c => c.name);
const isFormula = (col) => col.type === 'formula-net' || col.type === 'formula-stock';
function cellValue(row, col) {
  if (col.type === 'formula-net') return (Number(row.basic) || 0) + (Number(row.allowances) || 0) - (Number(row.deductions) || 0);
  if (col.type === 'formula-stock') return (Number(row.opening) || 0) + (Number(row.incoming) || 0) - (Number(row.outgoing) || 0);
  return row[col.key] ?? '';
}
function dayDiff(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  const now = new Date();
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}
function rowStatus(row, tpl = currentTableTemplate) {
  if (!tpl?.expiryKeys?.length) return null;
  const dates = tpl.expiryKeys.map(k => row[k]).filter(Boolean).sort();
  if (!dates.length) return { label: '—', cls: 'status-none', days: null };
  const days = dayDiff(dates[0]);
  if (days < 0) return { label: '🔴 منتهية', cls: 'status-bad', days };
  if (days <= 30) return { label: `🟡 تنتهي خلال ${days} يوم`, cls: 'status-warn', days };
  return { label: '🟢 سارية', cls: 'status-ok', days };
}
function dateState(value) {
  if (!value) return '';
  const days = dayDiff(value);
  return days < 0 ? 'expired' : days <= 30 ? 'expiring' : '';
}
function updateBadges() {
  $('#tablesCount').textContent = savedTables.length;
  const st = $('#statTables'); if (st) st.textContent = savedTables.length;
  const sc = $('#statCompanies'); if (sc) sc.textContent = companies.length;
}

/* ---------- الشركات والشعارات ---------- */
function brandHTML(c, center = false) {
  if (!c) return '';
  return `<div class="brand-block ${center ? 'center' : ''}">
    <div class="brand-logo lg">${c.logo ? `<img src="${c.logo}" alt="شعار ${esc(c.name)}">` : esc(c.emoji || '🏢')}</div>
    <div><strong>${esc(c.name)}</strong><span>${esc(c.sub || '')}</span></div></div>`;
}
function renderSheetHeader() {
  const mode = $('#tbCompanyMode').value;
  const head = $('#tbSheetHeader');
  const business = companies.filter(c => !c.owner);
  if (mode === 'group') {
    const shown = (business.length ? business : companies).slice(0, 2);
    head.classList.remove('single');
    head.innerHTML = shown.map(c => brandHTML(c)).join('<div class="dual-vs">×</div>') +
      `<div class="group-title"><strong>مجموعة الشركات</strong><span>سجل داخلي موحّد</span></div>`;
  } else {
    const c = companies.find(x => x.name === $('#tbCompany').value) || companies[0];
    head.classList.add('single');
    head.innerHTML = brandHTML(c, true);
  }
}
function renderCompaniesStrip() {
  $('#companiesStrip').innerHTML = `<span class="strip-label">🏢 جهات المجموعة المشمولة:</span>` +
    companies.map(c => `<span class="company-chip"><span class="brand-logo">${c.logo ? `<img src="${c.logo}" alt="">` : esc(c.emoji || '🏢')}</span><span>${esc(c.name)}<small>${esc(c.sub || '')}</small></span></span>`).join('') +
    `<button class="btn btn-outline btn-sm" type="button" onclick="document.querySelector('[data-view=companies]').click()">⚙️ إدارة الشركات والشعارات</button>`;
}
function renderCompanies() {
  renderCompaniesStrip(); updateBadges();
  $('#companiesGrid').innerHTML = companies.map(c => `
    <article class="card company-card">
      <div class="logo-edit">
        <div class="brand-logo lg">${c.logo ? `<img src="${c.logo}" alt="">` : esc(c.emoji || '🏢')}</div>
        <div><h3>${esc(c.name)}</h3><span class="tag">${c.owner ? 'المالك / خاص' : 'شركة في المجموعة'}</span></div>
      </div>
      <label>اسم الشركة / الجهة <input data-co-name="${c.id}" value="${esc(c.name)}" /></label>
      <label>الوصف / النشاط <input data-co-sub="${c.id}" value="${esc(c.sub || '')}" /></label>
      <label>الرمز التعبيري <input data-co-emoji="${c.id}" maxlength="4" value="${esc(c.emoji || '🏢')}" /></label>
      <label>تغيير الشعار <input type="file" accept="image/*" data-co-logo="${c.id}" /></label>
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" data-co-save="${c.id}">💾 حفظ</button>
        ${c.logo ? `<button class="btn btn-outline btn-sm" data-co-clearlogo="${c.id}">إزالة الشعار</button>` : ''}
        <button class="btn btn-danger btn-sm" data-co-del="${c.id}">🗑️ حذف</button>
      </div>
    </article>`).join('');
}
function resizeLogo(file, cb) {
  const img = new Image();
  img.onload = () => {
    const max = 220, scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src); cb(canvas.toDataURL('image/png'));
  };
  img.src = URL.createObjectURL(file);
}
$('#companiesGrid').addEventListener('change', (e) => {
  const f = e.target.closest('[data-co-logo]'); if (!f || !f.files?.[0]) return;
  resizeLogo(f.files[0], (dataUrl) => {
    companies = companies.map(c => c.id === f.dataset.coLogo ? { ...c, logo: dataUrl } : c);
    save(LS_COMPANIES, companies); renderCompanies(); fillCompanySelects(); toast('✅ تم حفظ شعار الشركة');
  });
});
$('#companiesGrid').addEventListener('click', (e) => {
  const s = e.target.closest('[data-co-save]'), d = e.target.closest('[data-co-del]'), cl = e.target.closest('[data-co-clearlogo]');
  if (s) {
    const id = s.dataset.coSave;
    const name = document.querySelector(`[data-co-name="${id}"]`).value.trim();
    if (!name) { toast('⚠️ اسم الشركة مطلوب'); return; }
    companies = companies.map(c => c.id === id ? { ...c, name,
      sub: document.querySelector(`[data-co-sub="${id}"]`).value.trim(),
      emoji: document.querySelector(`[data-co-emoji="${id}"]`).value.trim() || '🏢' } : c);
    save(LS_COMPANIES, companies); renderCompanies(); fillCompanySelects(); toast(`✅ تم حفظ «${name}»`);
  }
  if (cl) { companies = companies.map(c => c.id === cl.dataset.coClearlogo ? { ...c, logo: '' } : c); save(LS_COMPANIES, companies); renderCompanies(); fillCompanySelects(); }
  if (d) {
    if (companies.length <= 1) { toast('⚠️ يجب إبقاء جهة واحدة على الأقل'); return; }
    const c = companies.find(x => x.id === d.dataset.coDel);
    if (!confirm(`حذف «${c?.name}» من المجموعة؟`)) return;
    companies = companies.filter(x => x.id !== c.id);
    save(LS_COMPANIES, companies); renderCompanies(); fillCompanySelects(); toast('🗑️ تم حذف الجهة');
  }
});
$('#companyForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#cName').value.trim(); if (!name) return;
  if (companies.some(c => c.name === name)) { toast('⚠️ توجد جهة بنفس الاسم'); return; }
  const add = (logo = '') => {
    companies.push({ id: uid(), name, sub: $('#cSub').value.trim(), emoji: $('#cEmoji').value.trim() || '🏢', logo, owner: /مالك|خاص/.test(name) });
    save(LS_COMPANIES, companies); e.target.reset(); renderCompanies(); fillCompanySelects(); toast(`✅ تمت إضافة «${name}» إلى المجموعة`);
  };
  const file = $('#cLogo').files?.[0];
  if (file) resizeLogo(file, add); else add();
});
$('#btnCompaniesMain').addEventListener('click', () => showView('companies'));
document.querySelector('[data-view="companies"]')?.addEventListener('click', () => showView('companies'));

/* ---------- مكتبة نماذج الجداول ---------- */
function renderTableTemplates() {
  const q = ($('#tableTemplateSearch').value || '').trim(), cat = $('#tableTemplateCategory').value;
  const list = tableTemplates.filter(t => (!q || t.name.includes(q) || (t.desc || '').includes(q)) && (!cat || t.category === cat));
  $('#tableTemplatesGrid').innerHTML = list.map(t => `
    <article class="card">
      <div class="card-top"><h3>${esc(t.icon || '📋')} ${esc(t.name)}</h3><span class="tag ${t.category.includes('سيارات') ? 'gold' : ''}">${esc(t.category)}</span></div>
      <p class="desc">${esc(t.desc || '')}</p>
      <div class="excerpt">${esc((t.columns || []).map(c => c.label).join(' • '))}</div>
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" data-use-table="${t.id}">📊 فتح وتعبئة</button>
        <button class="btn btn-outline btn-sm" data-dup-table="${t.id}">📄 نسخ</button>
        <button class="btn btn-danger btn-sm" data-del-table="${t.id}">🗑️ حذف</button>
      </div>
    </article>`).join('');
  $('#tableTemplatesEmpty').hidden = list.length > 0;
  updateBadges();
}
$('#tableTemplateSearch').addEventListener('input', renderTableTemplates);
$('#tableTemplateCategory').addEventListener('change', renderTableTemplates);
$('#tableTemplatesGrid').addEventListener('click', (e) => {
  const use = e.target.closest('[data-use-table]'), dup = e.target.closest('[data-dup-table]'), del = e.target.closest('[data-del-table]');
  if (use) openTableTemplate(use.dataset.useTable);
  if (dup) {
    const src = tableTemplates.find(t => t.id === dup.dataset.dupTable); if (!src) return;
    tableTemplates.unshift({ ...cloneTableTemplate(src), id: uid(), name: src.name + ' — نسخة' });
    save(LS_TABLE_TEMPLATES, tableTemplates); renderTableTemplates(); toast('📄 تم نسخ نموذج الجدول');
  }
  if (del) {
    const src = tableTemplates.find(t => t.id === del.dataset.delTable); if (!src) return;
    if (!confirm(`حذف نموذج «${src.name}»؟ (الجداول المحفوظة منه لن تُحذف)`)) return;
    tableTemplates = tableTemplates.filter(t => t.id !== src.id);
    save(LS_TABLE_TEMPLATES, tableTemplates); renderTableTemplates(); toast('🗑️ تم حذف نموذج الجدول');
  }
});

/* ---------- نموذج جدول جديد ---------- */
function openTableTemplateModal() { $('#tableTemplateError').hidden = true; $('#tableTemplateModal').hidden = false; setTimeout(() => $('#ttName').focus(), 50); }
function closeTableTemplateModal() { $('#tableTemplateModal').hidden = true; }
['btnNewTableTemplate', 'btnNewTableTemplateEmpty'].forEach(id => document.getElementById(id)?.addEventListener('click', openTableTemplateModal));
$('#btnCloseTableModal').addEventListener('click', closeTableTemplateModal);
$('#btnCancelTableModal').addEventListener('click', closeTableTemplateModal);
$('#tableTemplateModal').addEventListener('click', (e) => { if (e.target.id === 'tableTemplateModal') closeTableTemplateModal(); });
$('#tableTemplateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#ttName').value.trim();
  const labels = $('#ttColumns').value.split(/\n|،|,/).map(s => s.trim()).filter(Boolean);
  const err = $('#tableTemplateError');
  if (!name || labels.length < 2) { err.textContent = '⚠️ اكتب اسم النموذج وعمودين على الأقل.'; err.hidden = false; return; }
  if (tableTemplates.some(t => t.name === name)) { err.textContent = '⚠️ يوجد نموذج جدول بنفس الاسم.'; err.hidden = false; return; }
  const columns = labels.map((label, i) => ({
    key: 'col' + (i + 1), label,
    type: label === 'الشركة' || label.includes('الشركة / المالك') ? 'company'
      : /تاريخ|انتهاء|بداية|تعيين|شراء/.test(label) ? 'date'
      : /مبلغ|راتب|تكلفة|سعر|كمية|عدد|أساسي|بدلات|خصومات|عداد|وقود|رصيد|حضور|غياب/.test(label) ? 'number' : 'text'
  }));
  const tpl = { id: uid(), name, icon: '📋', category: $('#ttCategory').value, desc: $('#ttDesc').value.trim(),
    expiryKeys: columns.filter(c => c.type === 'date' && /انتهاء/.test(c.label)).map(c => c.key),
    columns, sample: () => ([Object.fromEntries(columns.map(c => [c.key, c.type === 'company' ? (companyNames()[0] || '') : '']))]) };
  tableTemplates.unshift(tpl); save(LS_TABLE_TEMPLATES, tableTemplates);
  e.target.reset(); closeTableTemplateModal(); renderTableTemplates();
  toast(`✅ تم إنشاء نموذج «${name}»`);
  if (confirm(`تم حفظ نموذج «${name}».\nهل تريد فتحه الآن وتعبئته؟`)) openTableTemplate(tpl.id);
});

/* ---------- محرر الجدول ---------- */
function fillCompanySelects() {
  const names = companyNames();
  const single = $('#tbCompany'); if (!single) return;
  const keep = single.value;
  single.innerHTML = names.map(n => `<option>${esc(n)}</option>`).join('');
  if (names.includes(keep)) single.value = keep;
  const filter = $('#tbFilterCompany'), keepF = filter.value;
  filter.innerHTML = '<option value="">كل الشركات والمالك</option>' + names.map(n => `<option>${esc(n)}</option>`).join('');
  if (names.includes(keepF)) filter.value = keepF;
  renderSheetHeader(); syncSheetMeta();
}
function openTableTemplate(id, saved = null) {
  const tpl = tableTemplates.find(t => t.id === id) || saved?.templateSnapshot;
  if (!tpl) { toast('⚠️ نموذج هذا الجدول محذوف — افتح جدولاً آخر'); return; }
  currentTableTemplate = tpl;
  currentTableId = saved?.id || null;
  currentRows = saved ? structuredClone(saved.rows || []) : structuredClone(tpl.sample ? tpl.sample() : [{}]);
  showView('tables');
  $('#tableEditor').hidden = false;
  $('#tbEditorTitle').textContent = `${tpl.icon || '📋'} ${tpl.name}`;
  $('#tbTitle').value = saved?.title || tpl.name;
  $('#tbPeriod').value = saved?.period || new Date().toLocaleDateString('ar', { month: 'long', year: 'numeric' });
  $('#tbDate').value = saved?.date || today();
  $('#tbPrepared').value = saved?.prepared || ''; $('#tbApproved').value = saved?.approved || '';
  $('#tbSearch').value = ''; $('#tbFilterStatus').value = '';
  fillCompanySelects();
  $('#tbCompanyMode').value = saved?.companyMode || 'group';
  if (saved?.company) $('#tbCompany').value = saved.company;
  $('#tbFilterCompany').value = '';
  renderDataTable();
  $('#tableEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`📊 تم فتح «${tpl.name}» — عدّل الخلايا ثم احفظ أو اطبع`);
}
function visibleRows() {
  const q = ($('#tbSearch').value || '').trim(), fc = $('#tbFilterCompany').value, fs = $('#tbFilterStatus').value;
  return currentRows.map((row, idx) => ({ row, idx })).filter(({ row }) => {
    if (fc && row.company !== fc && !Object.values(row).includes(fc)) return false;
    if (q && !Object.values(row).join(' ').includes(q)) return false;
    if (fs) { const s = rowStatus(row); if (!s || !s.label.includes(fs.replace(' قريباً', '').replace('منتهية', 'منتهية'))) {
      if (fs === 'سارية' && !(s && s.cls === 'status-ok')) return false;
      if (fs === 'تنتهي قريباً' && !(s && s.cls === 'status-warn')) return false;
      if (fs === 'منتهية' && !(s && s.cls === 'status-bad')) return false;
    }}
    return true;
  });
}
function renderDataTable() {
  const tpl = currentTableTemplate; if (!tpl) return;
  const hasStatus = !!tpl.expiryKeys?.length;
  $('#dataHead').innerHTML = '<tr><th>#</th>' + tpl.columns.map(c => `<th>${esc(c.label)}</th>`).join('') +
    (hasStatus ? '<th>حالة الصلاحية</th>' : '') + '<th class="no-print"></th></tr>';
  const rows = visibleRows();
  $('#dataBody').innerHTML = rows.map(({ row, idx }) => {
    const s = rowStatus(row, tpl);
    return '<tr>' + `<td class="row-num">${idx + 1}</td>` + tpl.columns.map(col => {
      if (isFormula(col)) return `<td class="computed">${esc(cellValue(row, col))}</td>`;
      if (col.type === 'company') return `<td><select data-cell="${col.key}" data-row="${idx}">${companyNames().map(n => `<option ${row[col.key] === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></td>`;
      if (col.type === 'select') return `<td><select data-cell="${col.key}" data-row="${idx}"><option value=""></option>${(col.options || []).map(o => `<option ${row[col.key] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></td>`;
      if (col.type === 'date') return `<td><input type="date" class="${dateState(row[col.key])}" data-cell="${col.key}" data-row="${idx}" value="${esc(row[col.key] || '')}"></td>`;
      return `<td><input type="${col.type === 'number' ? 'number' : 'text'}" data-cell="${col.key}" data-row="${idx}" value="${esc(row[col.key] ?? '')}" placeholder="…"></td>`;
    }).join('') + (hasStatus ? `<td><span class="status-pill ${s.cls}">${s.label}</span></td>` : '') +
      `<td class="no-print"><button class="row-del" data-del-row="${idx}" title="حذف الصف">🗑️</button></td></tr>`;
  }).join('') || `<tr><td colspan="${tpl.columns.length + 3}" style="text-align:center;padding:22px">لا توجد صفوف مطابقة — اضغط «إضافة صف» أو غيّر التصفية</td></tr>`;
  syncSheetMeta(); renderAlerts();
}
function renderAlerts() {
  const tpl = currentTableTemplate; if (!tpl) return;
  let html = `<span class="alert-pill info">📋 إجمالي السجلات: ${currentRows.length}</span>`;
  if (tpl.expiryKeys?.length) {
    const counts = { ok: 0, warn: 0, bad: 0 };
    currentRows.forEach(r => { const s = rowStatus(r, tpl); if (s) counts[s.cls === 'status-ok' ? 'ok' : s.cls === 'status-warn' ? 'warn' : s.cls === 'status-bad' ? 'bad' : 'ok']++; });
    html += `<span class="alert-pill ok">🟢 سارية: ${counts.ok}</span><span class="alert-pill warn">🟡 تنتهي خلال 30 يوماً: ${counts.warn}</span><span class="alert-pill bad">🔴 منتهية وتحتاج تجديداً: ${counts.bad}</span>`;
  }
  const moneyCol = tpl.columns.find(c => ['amount', 'cost'].includes(c.key));
  if (moneyCol) html += `<span class="alert-pill info">💰 الإجمالي: ${currentRows.reduce((a, r) => a + (Number(r[moneyCol.key]) || 0), 0).toLocaleString('ar')}</span>`;
  if (tpl.id === 'tt-payroll') html += `<span class="alert-pill info">💰 إجمالي الصافي: ${currentRows.reduce((a, r) => a + (Number(cellValue(r, tpl.columns.find(c => c.type === 'formula-net'))) || 0), 0).toLocaleString('ar')}</span>`;
  $('#tbAlerts').innerHTML = html;
  $('#tbSheetStats').innerHTML = html;
}
function syncSheetMeta() {
  $('#tbSheetTitle').textContent = $('#tbTitle').value.trim() || currentTableTemplate?.name || 'جدول بيانات داخلي';
  $('#tbSheetPeriod').textContent = $('#tbPeriod').value.trim() || '—';
  $('#tbSheetDate').textContent = $('#tbDate').value || '—';
  $('#tbSheetCount').textContent = currentRows.length;
  $('#tbSheetPrepared').textContent = $('#tbPrepared').value.trim() || '—';
  $('#tbSheetApproved').textContent = $('#tbApproved').value.trim() || '—';
  renderSheetHeader();
}
$('#dataBody')?.addEventListener('input', (e) => {
  const inp = e.target.closest('[data-cell]'); if (!inp) return;
  currentRows[Number(inp.dataset.row)][inp.dataset.cell] = inp.value;
  if (inp.type === 'date') inp.className = dateState(inp.value);
  renderAlerts(); $('#tbSheetCount').textContent = currentRows.length;
  const tr = inp.closest('tr');
  if (tr && currentTableTemplate?.expiryKeys?.length) {
    const s = rowStatus(currentRows[Number(inp.dataset.row)]);
    const pill = tr.querySelector('.status-pill');
    if (pill && s) { pill.className = 'status-pill ' + s.cls; pill.textContent = s.label; }
  }
  // تحديث الخلايا المحسوبة في نفس الصف (الصافي / الرصيد)
  if (tr) currentTableTemplate.columns.forEach((col, ci) => {
    if (isFormula(col)) { const td = tr.children[ci + 1]; if (td) td.textContent = cellValue(currentRows[Number(inp.dataset.row)], col); }
  });
});
$('#dataBody')?.addEventListener('click', (e) => {
  const del = e.target.closest('[data-del-row]'); if (!del) return;
  if (!confirm('حذف هذا الصف من الجدول؟')) return;
  currentRows.splice(Number(del.dataset.delRow), 1); renderDataTable(); toast('🗑️ تم حذف الصف');
});
$('#btnAddRow').addEventListener('click', () => {
  if (!currentTableTemplate) return;
  const row = Object.fromEntries(currentTableTemplate.columns.map(c => [c.key, c.type === 'company' ? ($('#tbFilterCompany').value || companyNames()[0] || '') : '']));
  currentRows.push(row); renderDataTable();
  document.querySelector('#dataBody tr:last-child input, #dataBody tr:last-child select')?.focus();
});
['tbTitle', 'tbPeriod', 'tbDate', 'tbPrepared', 'tbApproved'].forEach(id => document.getElementById(id).addEventListener('input', syncSheetMeta));
['tbCompanyMode', 'tbCompany'].forEach(id => document.getElementById(id).addEventListener('change', renderSheetHeader));
['tbSearch', 'tbFilterCompany', 'tbFilterStatus'].forEach(id => document.getElementById(id).addEventListener('input', renderDataTable));
$('#btnCloseTableEditor').addEventListener('click', () => { $('#tableEditor').hidden = true; currentTableTemplate = null; });
$('#btnVehiclesSide').addEventListener('click', () => openTableTemplate('tt-vehicles-validity'));
$('#btnNewTableTop').addEventListener('click', () => showView('tables'));

$('#btnSaveTable').addEventListener('click', () => {
  if (!currentTableTemplate) return;
  const data = {
    templateId: currentTableTemplate.id, templateSnapshot: cloneTableTemplate(currentTableTemplate),
    title: $('#tbTitle').value.trim() || currentTableTemplate.name, period: $('#tbPeriod').value.trim(),
    date: $('#tbDate').value || today(), companyMode: $('#tbCompanyMode').value, company: $('#tbCompany').value,
    prepared: $('#tbPrepared').value.trim(), approved: $('#tbApproved').value.trim(),
    rows: structuredClone(currentRows)
  };
  if (currentTableId) savedTables = savedTables.map(t => t.id === currentTableId ? { ...t, ...data } : t);
  else { currentTableId = uid(); savedTables.unshift({ id: currentTableId, ...data }); }
  save(LS_TABLES, savedTables); renderSavedTables(); updateBadges(); toast('✅ تم حفظ الجدول في «الجداول المحفوظة»');
});
function renderSavedTables() {
  const list = $('#savedTablesList'); if (!list) return;
  list.innerHTML = savedTables.map(t => `
    <div class="letter-row">
      <div><h4>${esc(t.templateSnapshot?.icon || '📋')} ${esc(t.title)}</h4>
      <p>الفترة: ${esc(t.period || '—')} • التاريخ: ${esc(t.date || '—')} • الصفوف: ${(t.rows || []).length} • الترويسة: ${t.companyMode === 'group' ? 'الشركتين معاً' : esc(t.company || 'شركة واحدة')}</p></div>
      <div class="row-actions">
        <button class="btn btn-primary btn-sm" data-open-table="${t.id}">📊 فتح وتعديل</button>
        <button class="btn btn-outline btn-sm" data-print-saved="${t.id}">🖨️ طباعة</button>
        <button class="btn btn-danger btn-sm" data-del-saved="${t.id}">🗑️ حذف</button>
      </div>
    </div>`).join('');
  $('#savedTablesEmpty').hidden = savedTables.length > 0;
}
$('#savedTablesList').addEventListener('click', (e) => {
  const open = e.target.closest('[data-open-table]'), pr = e.target.closest('[data-print-saved]'), del = e.target.closest('[data-del-saved]');
  const item = savedTables.find(t => t.id === (open?.dataset.openTable || pr?.dataset.printSaved || del?.dataset.delSaved));
  if (open && item) openTableTemplate(item.templateId, item);
  if (pr && item) { openTableTemplate(item.templateId, item); setTimeout(() => $('#btnPrintTable').click(), 200); }
  if (del && item) {
    if (!confirm(`حذف جدول «${item.title}» نهائياً؟`)) return;
    savedTables = savedTables.filter(t => t.id !== item.id);
    save(LS_TABLES, savedTables); renderSavedTables(); updateBadges(); toast('🗑️ تم حذف الجدول');
  }
});
$('#btnPrintTable').addEventListener('click', () => {
  document.body.classList.add('printing-table'); syncSheetMeta(); renderDataTable(); window.print();
  setTimeout(() => document.body.classList.remove('printing-table'), 300);
});
$('#btnExportCsv').addEventListener('click', () => {
  const tpl = currentTableTemplate; if (!tpl) return;
  const hasStatus = !!tpl.expiryKeys?.length;
  const head = ['#', ...tpl.columns.map(c => c.label), ...(hasStatus ? ['حالة الصلاحية'] : [])];
  const q = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const lines = [head.map(q).join(','), ...currentRows.map((r, i) => [i + 1, ...tpl.columns.map(c => cellValue(r, c)), ...(hasStatus ? [rowStatus(r, tpl).label] : [])].map(q).join(','))];
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = ($('#tbTitle').value.trim() || tpl.name) + '.csv'; a.click();
  URL.revokeObjectURL(a.href); toast('📥 تم تصدير الجدول — يفتح مباشرة في Excel');
});

/* ---------- بدء التشغيل ---------- */
$('#fDate').value = today();
fillTemplateSelect();
renderTemplates();
renderLetters();
updatePreview();
fillCompanySelects();
renderCompaniesStrip();
renderTableTemplates();
renderSavedTables();
updateBadges();
