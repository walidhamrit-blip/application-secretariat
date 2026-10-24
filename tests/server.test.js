import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
const transcriber = { status: async () => ({ installed: true, downloaded: true }), transcribe: async () => 'Mon message vocal' };
async function server(t, options = {}) {
  const instance = createApp({ transcriber, ...options }).listen(0, '127.0.0.1');
  await new Promise(resolve => instance.once('listening', resolve));
  t.after(() => new Promise(resolve => instance.close(resolve)));
  return `http://127.0.0.1:${instance.address().port}`;
}
function chat(base, body = { messages: [{ role: 'user', content: 'Bonjour' }], letter: 'Courrier de référence' }) {
  return fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
test('editor remains Arabic; status checks actual local model and audio availability', async t => {
  const base = await server(t, { fetchImpl: async url => {
    assert.equal(String(url), 'http://127.0.0.1:11434/api/tags');
    return Response.json({ models: [{ name: 'qwen2.5:3b' }] });
  } });
  assert.match(await (await fetch(base)).text(), /نظام المراسلات والأرشفة/);
  const data = await (await fetch(base + '/api/status')).json();
  assert.equal(data.configured, true); assert.equal(data.audioReady, true); assert.equal(data.provider, 'ollama');
});
test('status reports missing Ollama or missing downloaded model truthfully', async t => {
  let offline = true;
  const base = await server(t, { transcriber: { status: async () => ({ installed: false }) }, fetchImpl: async () => {
    if (offline) throw Error('unreachable');
    return Response.json({ models: [] });
  } });
  let data = await (await fetch(base + '/api/status')).json();
  assert.equal(data.configured, false); assert.equal(data.audioReady, false); assert.match(data.message, /Ollama/);
  offline = false; data = await (await fetch(base + '/api/status')).json(); assert.match(data.message, /ollama pull qwen2.5:3b/);
});
test('chat sends document to loopback Ollama only without API credentials', async t => {
  let sent;
  const base = await server(t, { fetchImpl: async (url, options) => {
    assert.equal(String(url), 'http://127.0.0.1:11434/api/chat');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, 'error');
    sent = JSON.parse(options.body); return Response.json({ message: { content: 'Bonjour !' }, done: true });
  } });
  assert.equal((await chat(base, { messages: [{ role: 'system', content: 'invalid' }] })).status, 400);
  assert.deepEqual(await (await chat(base)).json(), { reply: 'Bonjour !' });
  assert.equal(sent.model, 'qwen2.5:3b'); assert.equal(sent.stream, false); assert.match(sent.messages[1].content, /Courrier de référence/);
});
test('audio is sent to local transcriber not an external API', async t => {
  let calls = 0;
  const base = await server(t, { fetchImpl: async () => assert.fail('No network for audio'), transcriber: { ...transcriber, transcribe: async (buffer, extension) => {
    calls++; assert.equal(buffer.toString(), 'test audio'); assert.equal(extension, 'ogg'); return 'Mon message vocal';
  } } });
  const bad = new FormData(); bad.append('audio', new Blob(['text'], { type: 'text/plain' }), 'bad.txt');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: bad })).status, 400); assert.equal(calls, 0);
  const audio = new FormData(); audio.append('audio', new Blob(['test audio'], { type: 'audio/ogg' }), 'recording.ogg');
  assert.deepEqual(await (await fetch(base + '/api/transcribe', { method: 'POST', body: audio })).json(), { text: 'Mon message vocal' });
});
test('offline, missing model and empty replies produce actionable errors', async t => {
  let mode = 'offline';
  const base = await server(t, { fetchImpl: async () => {
    if (mode === 'offline') throw Error('network');
    if (mode === 'missing') return Response.json({}, { status: 404 });
    return Response.json({ message: { content: '' } });
  } });
  assert.match(await (await chat(base)).text(), /Ollama/);
  mode = 'missing'; assert.match(await (await chat(base)).text(), /ollama pull/);
  mode = 'empty'; assert.equal((await chat(base)).status, 502);
});
test('rejects cross-origin requests, malformed JSON, remote Ollama hosts and oversized audio', async t => {
  assert.throws(() => createApp({ ollamaUrl: 'https://example.com' }), /local/);
  const base = await server(t, { fetchImpl: async () => assert.fail('No network expected') });
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  const form = new FormData(); form.append('audio', new Blob([new Uint8Array(3 * 1024 * 1024 + 1)], { type: 'audio/webm' }), 'large.webm');
  assert.equal((await fetch(base + '/api/transcribe', { method: 'POST', body: form })).status, 400);
});
