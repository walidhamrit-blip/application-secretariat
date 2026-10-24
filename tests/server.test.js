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
  assert.match(await (await fetch(base)).text(), /نظام المراسلات والأرشفة/);
  assert.deepEqual(await (await fetch(base + '/api/status')).json(), { configured: false });
  const response = await fetch(base + '/api/chat', { method: 'POST' });
  assert.equal(response.status, 503);
});
test('chat validates input and sends conversation to provider', async t => {
  let sent;
  const base = await server(t, { apiKey: 'test', fetchImpl: async (url, options) => { sent = JSON.parse(options.body); assert.equal(options.headers['x-goog-api-key'], 'test'); return Response.json({ candidates: [{ content: { parts: [{ text: 'Bonjour !' }] }, finishReason: 'STOP' }] }); } });
  const post = body => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post({ messages: [{ role: 'system', content: 'invalid' }] })).status, 400);
  const response = await post({ messages: [{ role: 'user', content: 'Bonjour' }], letter: 'Courrier de référence' });
  assert.deepEqual(await response.json(), { reply: 'Bonjour !' });
  assert.match(sent.contents[0].parts[0].text, /Courrier de référence/);
});
test('audio transcription validates files and sends inline audio to Gemini', async t => {
  let called = false;
  const base = await server(t, { apiKey: 'test', fetchImpl: async (url, options) => { called = true; assert.match(url, /generativelanguage\.googleapis\.com/); const body = JSON.parse(options.body); assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'audio/ogg'); assert.equal(Buffer.from(body.contents[0].parts[1].inlineData.data, 'base64').toString(), 'test audio'); return Response.json({ candidates: [{ content: { parts: [{ text: 'Mon message vocal' }] }, finishReason: 'STOP' }] }); } });
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
test('Gemini quota and blocked or empty responses are handled', async t => {
  let mode = 'quota';
  const base = await server(t, { apiKey: 'test', fetchImpl: async () => mode === 'quota' ? Response.json({}, { status: 429 }) : Response.json({ candidates: [{ finishReason: mode === 'blocked' ? 'SAFETY' : 'STOP', content: { parts: [] } }] }) });
  const post = () => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }] }) });
  assert.match(await (await post()).text(), /GEMINI_QUOTA/);
  mode = 'blocked'; assert.equal((await post()).status, 502);
  mode = 'empty'; assert.equal((await post()).status, 502);
});
test('rejects oversized audio before calling Gemini', async t => {
  const base = await server(t, { apiKey: 'test', fetchImpl: async () => { assert.fail('Provider must not be called'); } });
  const form = new FormData(); form.append('audio', new Blob([new Uint8Array(3 * 1024 * 1024 + 1)], { type: 'audio/webm' }), 'too-large.webm');
  const response = await fetch(base + '/api/transcribe', { method: 'POST', body: form });
  assert.equal(response.status, 400); assert.match(await response.text(), /3 Mo/);
});
test('safe Gemini diagnostics identify key, permission, region, model and request errors', async t => {
  let status = 400, payload;
  const base = await server(t, { apiKey: '  private-key  ', fetchImpl: async (url, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'private-key');
    return Response.json(payload, { status });
  } });
  for (const [http, upstream, code] of [
    [400, { message: 'API key not valid: private-key', details: [{ reason: 'API_KEY_INVALID' }] }, 'GEMINI_KEY_INVALID'],
    [403, { message: 'private-key denied' }, 'GEMINI_PERMISSION'],
    [400, { message: 'User location is not supported for the API use. private-key' }, 'GEMINI_REGION'],
    [404, { message: 'model missing private-key' }, 'GEMINI_MODEL_NOT_FOUND'],
    [400, { message: 'private-key bad request' }, 'GEMINI_REQUEST_INVALID']
  ]) {
    status = http; payload = { error: upstream };
    const response = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }] }) });
    assert.equal(response.status, 502);
    const data = await response.json(); assert.equal(data.code, code); assert.match(data.error, new RegExp(`HTTP ${http}`)); assert.doesNotMatch(data.error, /private-key/);
  }
});
test('404 diagnostics query actual Google model catalog without retrying generation', async t => {
  let catalogCalls = 0, generationCalls = 0;
  const base = await server(t, { apiKey: 'private-key', fetchImpl: async (url, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'private-key');
    if (url.includes(':generateContent')) { generationCalls++; return Response.json({}, { status: 404 }); }
    catalogCalls++;
    return Response.json({ models: [
      { name: 'models/gemini-example-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-example-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-embedding', supportedGenerationMethods: ['embedContent'] }
    ] });
  } });
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }] }) });
    const data = await response.json();
    assert.equal(data.code, 'GEMINI_MODEL_NOT_FOUND');
    assert.match(data.error, /gemini-example-flash/);
    assert.doesNotMatch(data.error, /gemini-example-tts|gemini-embedding|private-key/);
  }
  assert.equal(generationCalls, 2); assert.equal(catalogCalls, 1);
});
test('404 includes requested model and bounded redacted Google detail', async t => {
  const key = 'AIza-private-key-for-test';
  const base = await server(t, { apiKey: key, fetchImpl: async url => {
    if (!url.includes(':generateContent')) return Response.json({ models: [{ name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] });
    return Response.json({ error: { message: `models/gemini-2.5-flash is not supported for generateContent. key=${key} https://example.test?key=another-key Bearer another-token ${'x'.repeat(2000)}` } }, { status: 404 });
  } });
  const response = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Bonjour' }] }) });
  const data = await response.json();
  assert.match(data.error, /Détail Google : models\/gemini-2.5-flash is not supported/);
  assert.match(data.error, /Modèle demandé : gemini-2.5-flash/);
  assert.doesNotMatch(data.error, /AIza|private-key|another-key|another-token/);
  assert.ok(data.error.length < 1500);
});
