import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';

async function server(t, options = {}) {
  const instance = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => instance.once('listening', resolve));
  t.after(() => new Promise(resolve => instance.close(resolve)));
  return `http://127.0.0.1:${instance.address().port}`;
}
function chat(base, body = { messages: [{ role: 'user', content: 'Bonjour' }], letter: 'Courrier de référence' }) {
  return fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
test('editor remains Arabic; missing Groq configuration is explicit', async t => {
  const base = await server(t, { apiKey: '' });
  assert.match(await (await fetch(base)).text(), /نظام المراسلات والأرشفة/);
  assert.deepEqual(await (await fetch(base + '/api/status')).json(), { configured: false });
  const response = await chat(base); assert.equal(response.status, 503); assert.match(await response.text(), /GROQ_API_KEY/);
});
test('chat sends Groq messages and reference document with server-side bearer authentication', async t => {
  let sent;
  const base = await server(t, { apiKey: '  private-key  ', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer private-key');
    sent = JSON.parse(options.body);
    return Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Bonjour !' } }] });
  } });
  assert.equal((await chat(base, { messages: [{ role: 'system', content: 'invalid' }] })).status, 400);
  const response = await chat(base); assert.deepEqual(await response.json(), { reply: 'Bonjour !' });
  assert.equal(sent.model, 'openai/gpt-oss-20b'); assert.equal(sent.messages[0].role, 'system');
  assert.match(sent.messages[1].content, /Courrier de référence/); assert.equal(sent.messages[2].content, 'Bonjour');
});
test('audio uses Groq multipart transcription with correct filename and no JSON content type', async t => {
  let calls = 0;
  const base = await server(t, { apiKey: 'test', fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://api.groq.com/openai/v1/audio/transcriptions');
    assert.equal(options.headers.Authorization, 'Bearer test'); assert.equal(options.headers['Content-Type'], undefined);
    assert.equal(options.body.get('model'), 'whisper-large-v3-turbo'); assert.equal(options.body.get('file').name, 'message.ogg');
    assert.equal(await options.body.get('file').text(), 'test audio'); return Response.json({ text: 'Mon message vocal' });
  } });
  const bad = new FormData(); bad.append('audio', new Blob(['text'], { type: 'text/plain' }), 'bad.txt');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: bad })).status, 400); assert.equal(calls, 0);
  const audio = new FormData(); audio.append('audio', new Blob(['test audio'], { type: 'audio/ogg' }), 'recording.ogg');
  const response = await fetch(base + '/api/transcribe', { method: 'POST', body: audio });
  assert.deepEqual(await response.json(), { text: 'Mon message vocal' });
});
test('Groq diagnostics never expose credentials or raw provider messages', async t => {
  let status = 401, payload = {};
  const base = await server(t, { apiKey: 'private-key', fetchImpl: async () => Response.json(payload, { status }) });
  for (const [http, providerCode, code] of [
    [401, '', 'GROQ_KEY_INVALID'], [403, '', 'GROQ_PERMISSION'], [404, '', 'GROQ_MODEL_NOT_FOUND'],
    [429, 'insufficient_quota', 'GROQ_QUOTA'], [429, 'rate_limit_exceeded', 'GROQ_RATE_LIMIT'],
    [400, '', 'GROQ_REQUEST_INVALID'], [500, '', 'GROQ_UNAVAILABLE']
  ]) {
    status = http; payload = { error: { code: providerCode, message: 'private-key sensitive-provider-detail' } };
    const response = await chat(base); const data = await response.json();
    assert.equal(response.status, 502); assert.equal(data.code, code);
    assert.doesNotMatch(data.error, /private-key|sensitive-provider-detail/);
  }
});
test('rejects cross-origin requests and malformed JSON', async t => {
  const base = await server(t, { apiKey: 'test' });
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
});
test('rejects oversized audio without calling Groq', async t => {
  const base = await server(t, { apiKey: 'test', fetchImpl: async () => assert.fail('Provider must not be called') });
  const form = new FormData(); form.append('audio', new Blob([new Uint8Array(3 * 1024 * 1024 + 1)], { type: 'audio/webm' }), 'large.webm');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: form })).status, 400);
});
test('rejects empty or incomplete assistant responses and empty transcriptions', async t => {
  let result = { choices: [] };
  const base = await server(t, { apiKey: 'test', fetchImpl: async () => Response.json(result) });
  assert.equal((await chat(base)).status, 502);
  result = { choices: [{ finish_reason: 'length', message: { content: 'partial' } }] };
  assert.equal((await chat(base)).status, 502);
  result = { text: '  ' };
  const audio = new FormData(); audio.append('audio', new Blob(['audio'], { type: 'audio/webm' }), 'voice.webm');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: audio })).status, 502);
});
