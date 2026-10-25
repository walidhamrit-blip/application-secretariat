(() => {
const $ = id => document.getElementById(id);
let history = [], configured = false, audioReady = false, busy = false, recorder, recordingTimer, recordingStream, recordingCancelled = false;
function openChat() { $('chat').classList.remove('hidden'); $('chat-input').focus(); refreshStatus(); }
['chat-launcher'].forEach(id => $(id).onclick = openChat);
$('close-chat').onclick = () => { $('chat').classList.add('hidden'); if (recorder?.state === 'recording') { recordingCancelled = true; recorder.stop(); } };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('close-chat').click(); });
function feedback(text) { $('chat-feedback').textContent = text; }
function setBusy(value) { busy = value; $('send').disabled = value || !configured; $('record').disabled = value || !audioReady; $('audio-file').disabled = value || !audioReady; document.querySelectorAll('[data-prompt]').forEach(b => b.disabled = value || !configured); }
async function refreshStatus() {
  try {
    const response = await fetch('/api/status'); const data = await response.json();
    configured = data.configured; audioReady = data.configured;
    $('ai-status').textContent = configured ? 'Groq · المفتاح مُعدّ، الاتصال غير مختبر' : 'يلزم إعداد مفتاح Groq';
    feedback(configured ? '' : 'أضف GROQ_API_KEY في متغيرات بيئة الخادم ثم أعد النشر. الخطة المجانية لها حدود استخدام.');
  } catch { configured = false; audioReady = false; feedback('تعذر الاتصال بخادم التطبيق.'); }
  setBusy(busy);
}
refreshStatus();
function addMessage(role, text, allowApply = false) {
  const node = document.createElement('div'); node.className = `message ${role}`; node.dir = 'auto';
  const content = document.createElement('span'); content.textContent = text; node.append(content);
  if (allowApply) { const applyButton = document.createElement('button'); applyButton.className = 'apply-reply'; applyButton.textContent = 'تطبيق الرد على نص الخطاب'; applyButton.onclick = () => { window.secretariatAI.apply(text); }; node.append(applyButton); }
  $('messages').append(node); $('messages').scrollTop = $('messages').scrollHeight;
}
async function request(url, options) { const response = await fetch(url, { ...options, signal: AbortSignal.timeout(65000) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'La demande a échoué.'); return data; }
$('chat-form').onsubmit = async event => {
  event.preventDefault(); const text = $('chat-input').value.trim(); if (!text || busy || !configured) return;
  setBusy(true); feedback('المساعد يُحضّر الرد…'); addMessage('user', text); $('chat-input').value = '';
  const messages = [...history, { role: 'user', content: text }].slice(-19);
  try { const data = await request('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages, letter: window.secretariatAI.letter() }) }); addMessage('assistant', data.reply, true); $('ai-status').textContent = 'متصل بـ Groq'; history = [...messages, { role: 'assistant', content: data.reply }].slice(-18); feedback(''); }
  catch (error) { feedback(error.name === 'TimeoutError' ? 'Délai dépassé. Réessayez.' : error.message); $('chat-input').value = text; }
  finally { setBusy(false); }
};
$('chat-input').onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('chat-form').requestSubmit(); } };
document.querySelectorAll('[data-prompt]').forEach(b => b.onclick = () => { $('chat-input').value = b.dataset.prompt; $('chat-form').requestSubmit(); });
async function transcribe(blob) {
  if (!audioReady || busy) return;
  if (!blob.size) return feedback('Aucun son enregistré. Réessayez.');
  if (blob.size > 3 * 1024 * 1024) return feedback('Le fichier dépasse la limite de 3 Mo.');
  setBusy(true); feedback('جارٍ تفريغ الرسالة الصوتية عبر Groq…');
  try { const form = new FormData(); form.append('audio', blob, 'message'); const data = await request('/api/transcribe', { method: 'POST', body: form }); $('chat-input').value = [$('chat-input').value, data.text].filter(Boolean).join('\n'); feedback('التفريغ جاهز. راجعه ثم اضغط إرسال.'); $('chat-input').focus(); }
  catch (error) { feedback(error.name === 'TimeoutError' ? 'La transcription a pris trop de temps.' : error.message); }
  finally { setBusy(false); }
}
$('record').onclick = async () => {
  if (recorder?.state === 'recording') { recorder.stop(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { feedback('Enregistrement non pris en charge. Utilisez le bouton + pour joindre un audio.'); return; }
  if (!confirm('Autoriser l’enregistrement ? Votre audio sera envoyé à Groq pour transcription lorsque vous l’arrêterez (maximum 2 minutes).')) return;
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
$('audio-file').onchange = async event => { const file = event.target.files[0]; if (file && confirm('Envoyer ce fichier audio à Groq pour transcription ?')) await transcribe(file); event.target.value = ''; };
window.addEventListener('pagehide', () => { recordingCancelled = true; recordingStream?.getTracks().forEach(t => t.stop()); clearTimeout(recordingTimer); });
setBusy(false);

})();
