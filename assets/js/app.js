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

$('#btnPrint').addEventListener('click', () => { updatePreview(); window.print(); });

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

/* ---------- بدء التشغيل ---------- */
$('#fDate').value = today();
fillTemplateSelect();
renderTemplates();
renderLetters();
updatePreview();
