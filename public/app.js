const $ = id => document.getElementById(id);
const fields = ['company', 'tagline', 'meta', 'body', 'signature', 'footer'];
const controls = ['template', 'font', 'fontSize', 'lineHeight', 'margin', 'align', 'direction', 'accent', 'model-name'];
const initialContent = Object.fromEntries(fields.map(id => [id, $(id).innerText]));
const defaults = { template: 'official', font: 'serif', fontSize: '16', lineHeight: '1.8', margin: '22', align: 'right', direction: 'rtl', accent: '#216b60', 'model-name': 'Lettre officielle — Classique', style: 'classic', content: initialContent };
let style = 'classic', saved = [], history = [], configured = false, busy = false, recorder, recordingTimer, recordingStream, recordingCancelled = false;
function toast(text) { $('toast').textContent = text; $('toast').style.display = 'block'; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').style.display = 'none', 3500); }
function readStorage(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function store(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { toast('Stockage local indisponible ou plein. Votre modification n’est pas sauvegardée.'); return false; } }
function snapshot() { return { ...Object.fromEntries(controls.map(id => [id, $(id).value])), style, content: Object.fromEntries(fields.map(id => [id, $(id).innerText])) }; }
function renderLayout() {
  const letter = $('letter');
  letter.className = `paper ${style}`;
  letter.style.fontFamily = $('font').value;
  letter.style.fontSize = `${$('fontSize').value}px`;
  letter.style.setProperty('--print-size', `${$('fontSize').value}px`);
  letter.style.lineHeight = $('lineHeight').value;
  letter.style.setProperty('--margin', `${$('margin').value}mm`);
  letter.style.setProperty('--accent', $('accent').value);
  letter.style.textAlign = $('align').value;
  letter.dir = $('direction').value;
  letter.lang = $('direction').value === 'rtl' ? 'ar' : 'fr';
  $('line-output').value = $('lineHeight').value;
  $('margin-output').value = `${$('margin').value} mm`;
  document.querySelectorAll('[data-style]').forEach(b => { b.classList.toggle('chosen', b.dataset.style === style); b.setAttribute('aria-pressed', String(b.dataset.style === style)); });
  document.querySelectorAll('[data-color]').forEach(b => { b.classList.toggle('chosen', b.dataset.color === $('accent').value); b.setAttribute('aria-pressed', String(b.dataset.color === $('accent').value)); });
}
function persistDraft() { if (store('sadaqa-draft', snapshot())) $('save-status').textContent = '● Brouillon sauvegardé'; }
function apply(data) {
  if (!data || typeof data !== 'object') return;
  for (const id of controls) if (typeof data[id] === 'string') $(id).value = data[id];
  style = ['classic', 'modern', 'minimal'].includes(data.style) ? data.style : 'classic';
  for (const id of fields) if (typeof data.content?.[id] === 'string') $(id).innerText = data.content[id];
  renderLayout();
}
controls.forEach(id => $(id).addEventListener('input', () => { renderLayout(); persistDraft(); }));
fields.forEach(id => {
  $(id).addEventListener('input', persistDraft);
  $(id).addEventListener('paste', event => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0); range.deleteContents();
    const node = document.createTextNode(text); range.insertNode(node); range.setStartAfter(node); range.collapse(true); selection.removeAllRanges(); selection.addRange(range); persistDraft();
  });
});
document.querySelectorAll('[data-style]').forEach(b => b.onclick = () => { style = b.dataset.style; renderLayout(); persistDraft(); });
document.querySelectorAll('[data-color]').forEach(b => b.onclick = () => { $('accent').value = b.dataset.color; renderLayout(); persistDraft(); });
const templates = {
  official: initialContent.body,
  invitation: 'السيد / المحترم\n\nالموضوع: دعوة لحضور اجتماع\n\nتحية طيبة وبعد،\n\nيسرّ شركة الصداقة دعوتكم لحضور اجتماع لمناقشة آفاق التعاون المشترك.\n\nالتاريخ: [يُرجى تحديد التاريخ]\nالمكان: [يُرجى تحديد المكان]\n\nنأمل تأكيد حضوركم، ونتطلع إلى لقائكم.\n\nوتفضلوا بقبول فائق الاحترام والتقدير.',
  attestation: 'شهادة عمل\n\nتشهد شركة الصداقة بأن السيد / السيدة [الاسم الكامل] يعمل / تعمل لدينا بوظيفة [المسمى الوظيفي] منذ تاريخ [تاريخ الالتحاق].\n\nوقد أُعطيت له / لها هذه الشهادة بناءً على طلبه / طلبها لتقديمها إلى من يهمه الأمر.\n\nوتفضلوا بقبول فائق الاحترام والتقدير.'
};
$('template').onchange = () => {
  if (confirm('Remplacer le texte du courrier par ce modèle ? Votre brouillon actuel sera remplacé.')) { $('body').innerText = templates[$('template').value]; $('model-name').value = $('template').selectedOptions[0].text; persistDraft(); }
};
$('reset').onclick = () => { if (confirm('Réinitialiser uniquement la mise en page ? Le texte sera conservé.')) { apply({ ...defaults, content: snapshot().content, 'model-name': $('model-name').value, template: $('template').value }); persistDraft(); } };
function switchView(view) {
  $('editor-view').classList.toggle('hidden', view !== 'editor'); $('saved-view').classList.toggle('hidden', view !== 'saved');
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('selected', b.dataset.view === view));
  $('nav-editor').classList.toggle('active', view === 'editor'); $('nav-saved').classList.toggle('active', view === 'saved');
  if (view === 'saved') renderSaved();
}
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => switchView(b.dataset.view));
$('nav-editor').onclick = () => switchView('editor'); $('nav-saved').onclick = () => switchView('saved');
$('print').onclick = () => { switchView('editor'); window.print(); };
function renderSaved() {
  $('saved-count').textContent = $('saved-tab-count').textContent = saved.length;
  $('saved-list').replaceChildren();
  if (!saved.length) { const empty = document.createElement('div'); empty.className = 'empty-state'; empty.textContent = 'Aucun modèle pour le moment. Personnalisez votre lettre puis enregistrez-la.'; $('saved-list').append(empty); }
  saved.forEach(item => {
    const row = document.createElement('div'); row.className = 'saved-item';
    const info = document.createElement('div'), title = document.createElement('strong'), date = document.createElement('small');
    title.textContent = item.data?.['model-name'] || 'Modèle sans nom'; date.textContent = new Date(item.date).toLocaleString('fr-FR'); info.append(title, date);
    const load = document.createElement('button'); load.textContent = 'Ouvrir'; load.onclick = () => { if (!confirm('Ouvrir ce modèle et remplacer le brouillon actuel ?')) return; apply(item.data); persistDraft(); switchView('editor'); toast('Modèle chargé'); };
    const remove = document.createElement('button'); remove.textContent = 'Supprimer'; remove.onclick = () => { if (!confirm('Supprimer ce modèle enregistré ?')) return; const next = saved.filter(s => s.id !== item.id); if (store('sadaqa-models', next)) { saved = next; renderSaved(); } };
    row.append(info, load, remove); $('saved-list').append(row);
  });
}
$('save').onclick = () => {
  if (!$('model-name').value.trim()) return toast('Donnez un nom à votre modèle.');
  const next = [...saved, { id: crypto.randomUUID(), date: new Date().toISOString(), data: snapshot() }];
  if (store('sadaqa-models', next)) { saved = next; renderSaved(); toast('Votre modèle a été enregistré sur cet appareil.'); }
};
const loadedModels = readStorage('sadaqa-models', []);
saved = Array.isArray(loadedModels) ? loadedModels.filter(m => m && typeof m.id === 'string' && m.data && typeof m.data === 'object') : [];
apply(readStorage('sadaqa-draft', defaults)); renderLayout(); renderSaved();
function openChat() { $('chat').classList.remove('hidden'); $('chat-input').focus(); }
['chat-launcher', 'nav-assistant', 'discover'].forEach(id => $(id).onclick = openChat);
$('close-chat').onclick = () => { $('chat').classList.add('hidden'); if (recorder?.state === 'recording') { recordingCancelled = true; recorder.stop(); } };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('close-chat').click(); });
function feedback(text) { $('chat-feedback').textContent = text; }
function setBusy(value) { busy = value; $('send').disabled = value || !configured; $('record').disabled = value || !configured; $('audio-file').disabled = value || !configured; document.querySelectorAll('[data-prompt]').forEach(b => b.disabled = value || !configured); }
fetch('/api/status').then(r => r.json()).then(data => { configured = data.configured; $('ai-status').textContent = configured ? 'Prêt à vous aider · Google Gemini' : 'Connexion IA à configurer'; if (!configured) feedback('Ajoutez GEMINI_API_KEY dans le fichier .env du serveur pour activer les messages et la transcription.'); setBusy(false); }).catch(() => { feedback('Impossible de joindre le serveur.'); setBusy(false); });
function addMessage(role, text, allowApply = false) {
  const node = document.createElement('div'); node.className = `message ${role}`; node.dir = 'auto';
  const content = document.createElement('span'); content.textContent = text; node.append(content);
  if (allowApply) { const applyButton = document.createElement('button'); applyButton.className = 'apply-reply'; applyButton.textContent = 'Remplacer le corps du courrier par cette réponse'; applyButton.onclick = () => { if (confirm('Remplacer le corps du courrier par cette réponse ? Relisez le texte avant impression.')) { $('body').innerText = text; persistDraft(); toast('Réponse appliquée. Relisez le courrier avant de l’imprimer.'); } }; node.append(applyButton); }
  $('messages').append(node); $('messages').scrollTop = $('messages').scrollHeight;
}
async function request(url, options) { const response = await fetch(url, { ...options, signal: AbortSignal.timeout(70000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La demande a échoué.'); return data; }
$('chat-form').onsubmit = async event => {
  event.preventDefault(); const text = $('chat-input').value.trim(); if (!text || busy || !configured) return;
  setBusy(true); feedback('L’assistant prépare sa réponse…'); addMessage('user', text); $('chat-input').value = '';
  const messages = [...history, { role: 'user', content: text }].slice(-19);
  try { const data = await request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, letter: $('letter').innerText }) }); addMessage('assistant', data.reply, true); history = [...messages, { role: 'assistant', content: data.reply }].slice(-18); feedback(''); }
  catch (error) { feedback(error.name === 'TimeoutError' ? 'Délai dépassé. Réessayez.' : error.message); $('chat-input').value = text; }
  finally { setBusy(false); }
};
$('chat-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('chat-form').requestSubmit(); } };
document.querySelectorAll('[data-prompt]').forEach(b => b.onclick = () => { $('chat-input').value = b.dataset.prompt; $('chat-form').requestSubmit(); });
async function transcribe(blob) {
  if (!configured || busy) return;
  if (!blob.size) return feedback('Aucun son enregistré. Réessayez.');
  if (blob.size > 3 * 1024 * 1024) return feedback('Le fichier dépasse la limite de 3 Mo.');
  setBusy(true); feedback('Transcription du message vocal…');
  try { const form = new FormData(); form.append('audio', blob, 'message'); const data = await request('/api/transcribe', { method: 'POST', body: form }); $('chat-input').value = [$('chat-input').value, data.text].filter(Boolean).join('\n'); feedback('Transcription prête. Relisez-la puis cliquez sur Envoyer.'); $('chat-input').focus(); }
  catch (error) { feedback(error.name === 'TimeoutError' ? 'La transcription a pris trop de temps.' : error.message); }
  finally { setBusy(false); }
}
$('record').onclick = async () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { feedback('Enregistrement non pris en charge. Utilisez le bouton + pour joindre un audio.'); return; }
  if (!confirm('Autoriser l’enregistrement ? Votre audio sera envoyé à Google Gemini pour transcription lorsque vous l’arrêterez (maximum 2 minutes).')) return;
  $('record').disabled = true;
  try {
    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if ($('chat').classList.contains('hidden')) { recordingStream.getTracks().forEach(t => t.stop()); $('record').disabled = false; return; }
    const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(type => MediaRecorder.isTypeSupported(type));
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : {}); const chunks = []; recordingCancelled = false;
    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => { clearTimeout(recordingTimer); recordingStream.getTracks().forEach(t => t.stop()); $('record').classList.remove('recording'); $('record').innerHTML = '♩ <span>Message vocal</span>'; setBusy(false); if (!recordingCancelled) transcribe(new Blob(chunks, { type: recorder.mimeType })); else feedback('Enregistrement annulé.'); };
    recorder.onerror = () => { recordingCancelled = true; feedback('L’enregistrement a échoué.'); if (recorder.state !== 'inactive') recorder.stop(); recordingStream.getTracks().forEach(t => t.stop()); clearTimeout(recordingTimer); $('record').classList.remove('recording'); $('record').innerHTML = '♩ <span>Message vocal</span>'; setBusy(false); };
    recorder.start(); setBusy(true); $('record').disabled = false; $('record').classList.add('recording'); $('record').innerHTML = '■ <span>Arrêter le vocal</span>'; feedback('Enregistrement en cours… Cliquez sur Arrêter pour transcrire (2 min maximum).');
    recordingTimer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 120000);
  } catch { recordingStream?.getTracks().forEach(t => t.stop()); setBusy(false); feedback('Microphone inaccessible. Vérifiez l’autorisation du navigateur ou joignez un fichier audio avec +.'); }
};
$('audio-file').onchange = async event => { const file = event.target.files[0]; if (file && confirm('Envoyer ce fichier audio à Google Gemini pour transcription ?')) await transcribe(file); event.target.value = ''; };
window.addEventListener('pagehide', () => { recordingCancelled = true; recordingStream?.getTracks().forEach(t => t.stop()); clearTimeout(recordingTimer); });
setBusy(false);
