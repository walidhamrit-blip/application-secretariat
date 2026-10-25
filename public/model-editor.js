/* Extensions of the original application: no template or archive replacement. */
(() => {
  const limits = { size: [9, 24, 12.4], spacing: [1.1, 3, 1.95], side: [5, 40, 16], top: [0, 150, 7], bottom: [0, 100, 9] };
  function normalized(value = {}) {
    const result = {};
    for (const [key, [min, max, fallback]] of Object.entries(limits)) result[key] = Math.min(max, Math.max(min, Number.isFinite(Number(value[key])) ? Number(value[key]) : fallback));
    result.font = ['Cairo', 'Tahoma', 'Arial', 'serif'].includes(value.font) ? value.font : 'Cairo';
    result.align = ['right', 'justify', 'center', 'left'].includes(value.align) ? value.align : 'justify';
    result.direction = value.direction === 'ltr' ? 'ltr' : 'rtl';
    return result;
  }
  const keyFor = () => `${activeCompany().id}:${composerState.tplId}`;
  function layout() { return normalized(composerState.values._layout || DB.settings.modelLayouts?.[keyFor()]); }
  const originalSheet = renderSheetHTML;
  renderSheetHTML = function(tpl, values, options = {}) {
    const host = document.createElement('div'); host.innerHTML = originalSheet(tpl, values, options);
    const settings = normalized(values._layout || DB.settings.modelLayouts?.[`${(options.company || activeCompany()).id}:${tpl.id}`]);
    const content = host.querySelector('.sheet-content');
    if (content) {
      Object.assign(content.style, { fontFamily: settings.font, fontSize: `${settings.size}pt`, lineHeight: settings.spacing, textAlign: settings.align, direction: settings.direction, paddingLeft: `${settings.side}mm`, paddingRight: `${settings.side}mm`, paddingTop: `${settings.top}mm`, paddingBottom: `${settings.bottom}mm` });
      const inner = host.querySelector('.sheet-inner'); if (inner) inner.dir = settings.direction;
      const body = host.querySelector('.l-body');
      if (body) { body.style.textAlign = settings.align; if (typeof values._bodyOverride === 'string') { body.textContent = values._bodyOverride; body.style.whiteSpace = 'pre-wrap'; } }
    }
    return host.innerHTML;
  };
  const originalValues = currentValues;
  currentValues = function() { return { ...originalValues(), _layout: layout() }; };
  const originalView = viewComposer;
  viewComposer = function() {
    const result = originalView(); const l = layout();
    const input = (key, label, step = 1) => `<div class="field"><label>${label}</label><input data-layout="${key}" type="number" min="${limits[key][0]}" max="${limits[key][1]}" step="${step}" value="${l[key]}"></div>`;
    const select = (key, label, options) => `<div class="field"><label>${label}</label><select data-layout="${key}">${options.map(([value, text]) => `<option value="${value}" ${l[key] === value ? 'selected' : ''}>${text}</option>`).join('')}</select></div>`;
    const panel = `<details class="model-layout"><summary>✎ تعديل تنسيق النموذج الحالي</summary><p class="small muted">تبقى الترويسة والشعار والنموذج الأصلي كما هي. يمكنك أيضاً النقر على نص الخطاب في المعاينة لتعديله مباشرة.</p><div class="grid2">${input('size', 'حجم الخط (نقطة)', .1)}${input('spacing', 'تباعد السطور', .05)}${input('side', 'الهامش الجانبي (مم)')}${input('top', 'الهامش العلوي للنص (مم)')}${input('bottom', 'الهامش السفلي للنص (مم)')}${select('font', 'الخط', [['Cairo', 'Cairo — عربي'], ['Tahoma', 'Tahoma'], ['Arial', 'Arial'], ['serif', 'Serif']])}${select('align', 'المحاذاة', [['justify', 'ضبط'], ['right', 'يمين'], ['center', 'وسط'], ['left', 'يسار']])}${select('direction', 'اتجاه القراءة', [['rtl', 'من اليمين إلى اليسار'], ['ltr', 'من اليسار إلى اليمين']])}</div><div class="actions"><button type="button" class="btn btn-primary btn-sm" id="save-model-layout">حفظ التنسيق لهذا النموذج</button><button type="button" class="btn btn-sm" id="restore-model-text">استعادة النص الأصلي من الحقول</button></div><p class="small muted">يحفظ التنسيق لكل شركة ونموذج على هذا المتصفح. التعديل اليدوي للنص ثابت حتى استعادته من الحقول. أرشف الخطاب أو احفظه كمسودة للاحتفاظ بالنص والتنسيق.</p></details>`;
    return result.replace('<form id="letterForm"', panel + '<form id="letterForm"');
  };
  function bindDirectText() {
    const body = document.querySelector('#preview .l-body'); if (!body) return;
    body.contentEditable = 'true'; body.setAttribute('aria-label', 'تعديل نص الخطاب الحالي'); body.spellcheck = false;
    body.addEventListener('input', () => { composerState.values._bodyOverride = body.innerText; fitSheet(); });
    body.addEventListener('paste', e => { e.preventDefault(); const text = e.clipboardData.getData('text/plain'); const sel = window.getSelection(); if (!sel.rangeCount) return; const range = sel.getRangeAt(0); range.deleteContents(); const node = document.createTextNode(text); range.insertNode(node); range.setStartAfter(node); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); body.dispatchEvent(new Event('input')); });
  }
  const originalUpdate = updatePreview;
  updatePreview = function() { originalUpdate(); bindDirectText(); };
  const originalBind = bindComposer;
  bindComposer = function() {
    originalBind(); bindDirectText();
    document.querySelectorAll('.model-layout [data-layout]').forEach(input => input.oninput = () => { const next = layout(); next[input.dataset.layout] = input.value; composerState.values._layout = normalized(next); updatePreview(); });
    document.getElementById('save-model-layout').onclick = async () => { const modelLayouts = { ...(DB.settings.modelLayouts || {}), [keyFor()]: layout() }; await persistSettings({ modelLayouts }); toast('تم حفظ تنسيق النموذج دون تغيير الترويسة'); };
    document.getElementById('restore-model-text').onclick = () => { if (!confirm('استعادة نص النموذج من الحقول وإلغاء التعديل اليدوي؟')) return; delete composerState.values._bodyOverride; updatePreview(); };
  };
  window.secretariatAI = {
    letter: () => document.querySelector('#preview .sheet')?.innerText || '',
    apply: text => { if (currentRoute !== 'new') { toast('افتح خطاباً أولاً', 'err'); return; } if (!confirm('استبدال نص الخطاب برد المساعد مع الاحتفاظ بالنموذج والترويسة؟')) return; composerState.values._bodyOverride = text; updatePreview(); toast('تم تطبيق النص — راجعه ثم احفظ الخطاب'); }
  };
})();
