import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function server(t, options = {}) {
  const instance = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => instance.once('listening', resolve));
  t.after(() => new Promise(resolve => instance.close(resolve)));
  return `http://127.0.0.1:${instance.address().port}`;
}
test('serves the editor and reports missing AI configuration', async t => {
  const base = await server(t, { apiKey: '' });
  assert.match(await (await fetch(base)).text(), /Atelier de lettres/);
  assert.deepEqual(await (await fetch(base + '/api/status')).json(), { configured: false });
  const response = await fetch(base + '/api/chat', { method: 'POST' });
  assert.equal(response.status, 503);
});
test('chat validates input and sends conversation to provider', async t => {
  let sent;
  const base = await server(t, { apiKey: 'test', fetchImpl: async (url, options) => { sent = JSON.parse(options.body); assert.equal(options.headers.Authorization, 'Bearer test'); return Response.json({ choices: [{ message: { content: 'Bonjour !' } }] }); } });
  const post = body => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post({ messages: [{ role: 'system', content: 'invalid' }] })).status, 400);
  const response = await post({ messages: [{ role: 'user', content: 'Bonjour' }], letter: 'Courrier de référence' });
  assert.deepEqual(await response.json(), { reply: 'Bonjour !' });
  assert.match(sent.messages[1].content, /Courrier de référence/);
});
test('audio transcription validates files and uses multipart provider request', async t => {
  let called = false;
  const base = await server(t, { apiKey: 'test', fetchImpl: async (url, options) => { called = true; assert.match(url, /audio\/transcriptions$/); assert.equal(options.body.get('model'), 'whisper-1'); assert.equal(options.body.get('file').name, 'message.ogg'); return Response.json({ text: 'Mon message vocal' }); } });
  const bad = new FormData(); bad.append('audio', new Blob(['text'], { type: 'text/plain' }), 'bad.txt');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: bad })).status, 400);
  assert.equal(called, false);
  const audio = new FormData(); audio.append('audio', new Blob(['test audio'], { type: 'audio/ogg' }), 'recording.ogg');
  const response = await fetch(base + '/api/transcribe', { method: 'POST', body: audio });
  assert.deepEqual(await response.json(), { text: 'Mon message vocal' });
});
test('provider errors do not expose provider details or secrets', async t => {
  const base = await server(t, { apiKey: 'secret', fetchImpl: async () => Response.json({ error: 'secret' }, { status: 401 }) });
  const response = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }] }) });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /secret/);
});
test('rejects cross-origin requests and malformed JSON', async t => {
  const base = await server(t, { apiKey: 'test' });
  const cross = await fetch(base + '/api/chat', { method: 'POST', headers: { Origin: 'https://untrusted.example' } });
  assert.equal(cross.status, 403);
  const malformed = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
});
