const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../scripts/subscription-panels.js'), 'utf8');
const moduleText = fs.readFileSync(path.join(__dirname, '../modules/subscription-panels.sgmodule'), 'utf8');
const header = 'upload=1073741824; download=2147483648; total=10737418240; expire=1900000000';
const ok = (body = '', headers = { 'Subscription-UserInfo': header }) => ({ status: 200, headers, body });
function run(argument, responses = [], store = {}) {
  const requests = [], results = [];
  vm.runInNewContext(source, {
    $argument: argument,
    $httpClient: { get(options, callback) {
      requests.push(options);
      const r = responses.shift();
      assert.ok(r, 'unexpected HTTP request');
      assert.equal(options['auto-redirect'], false);
      assert.equal(options['auto-cookie'], false);
      callback(r.error || null, r, r.body || '');
    } },
    $persistentStore: { read: key => store[key] || null, write(value, key) { store[key] = value; return true; } },
    $done: result => results.push(result),
  });
  assert.equal(results.length, 1, '$done must be called exactly once');
  return { result: results[0], requests, store };
}
const argument = 'id=xlink&account=test@example.com&url=https://example.com/sub?token=FAKE&extra=a=b';
let r = run(argument, [ok()]);
assert.equal(r.requests[0].url, 'https://example.com/sub?token=FAKE&extra=a=b');
assert.equal(r.requests[0].headers['User-Agent'], 'Surge/5.0');
assert.match(r.result.title, /Xlink test@example.com/);
assert.match(r.result.content, /剩余 7.00 GB\n已用 3.00 GB/);
assert.match(r.result.content, /距离重置 暂未获取/);
assert.doesNotMatch(JSON.stringify(r.store), /FAKE|https:|test@example/);
const escaped = 'id=xlink&account=test@example.com&url=https\\:\\/\\/example\\.com/sub\\?token\\=FAKE\\&extra=a=b';
assert.equal(run(escaped, [ok()]).requests[0].url, r.requests[0].url);
for (const url of ['https://666.youtu6.shop/login', 'https://666.youtu6.shop/', 'https://example.com/auth/login?ref=demo']) {
  const login = run('id=youtu&account=&url=' + url);
  assert.equal(login.requests.length, 0);
  assert.match(login.result.content, /这是机场登录地址/);
}
const store = r.store;
r = run(argument, [{ error: 'network error with SECRET URL' }], store);
assert.match(r.result.content, /剩余 7.00 GB/);
assert.match(r.result.content, /当前为上次成功数据/);
assert.doesNotMatch(r.result.content, /SECRET/);
assert.equal(r.result.style, 'error');
r = run(argument.replace('FAKE', 'CHANGED'), [{ error: 'offline' }], store);
assert.doesNotMatch(r.result.content, /剩余/);
r = run(argument, [ok('<html>error</html>', {})], store);
assert.match(r.result.content, /未返回有效用量字段/);
r = run(argument, [{ status: 302, headers: {} }]);
assert.match(r.result.content, /HTTP 302/);
assert.equal(r.requests.length, 1);
for (const suffix of ['expire=0', '', 'expire=1700000000']) {
  r = run(argument, [ok('', { 'subscription-userinfo': header.replace('expire=1900000000', suffix) })]);
  assert.match(r.result.content, suffix.includes('1700000000') ? /套餐已到期/ : /到期时间 暂未提供/);
}
r = run(argument, [ok('', { 'subscription-userinfo': 'upload=NaN;download=0;total=20' })]);
assert.equal(r.result.style, 'error');
for (const input of ['', 'id=xlink&account=&url=', 'id=xlink&account=&url=http://example.com']) {
  r = run(input);
  assert.equal(r.requests.length, 0);
}
const label = 'trojan://fake@example.com:443#' + encodeURIComponent('距离下次重置剩余：3 天');
for (const body of [label, Buffer.from(label).toString('base64')]) {
  r = run('id=youtu&account=&url=https://example.com/sub?a=1', [ok(), ok(body)]);
  assert.equal(r.requests[0].url, 'https://example.com/sub?a=1&flag=clash');
  assert.equal(r.requests[1].url, 'https://example.com/sub?a=1');
  assert.match(r.result.content, /距离重置 3 天（机场返回）/);
}
r = run('id=youtu&account=&url=https://example.com/sub?flag=surge&a=1', [ok(), { error: 'offline' }]);
assert.equal(r.requests[0].url, 'https://example.com/sub?flag=clash&a=1');
assert.equal(r.requests[1].url, 'https://example.com/sub?a=1');
assert.match(r.result.content, /剩余 7.00 GB/);
assert.match(r.result.content, /距离重置 暂未获取/);
for (const id of ['xlink', 'shandian1', 'shandian2', 'youtu']) {
  const line = moduleText.split('\n').find(x => x.startsWith('subscription_' + id + ' = type='));
  assert.ok(line);
  let input = /argument="([^"]*)"/.exec(line)[1];
  input = input.replace(/\{\{\{\w+_account\}\}\}/g, '').replace(/\{\{\{\w+_url\}\}\}/g, 'https://example.com/sub');
  r = run(input, id === 'youtu' ? [ok(), ok(label)] : [ok()]);
  assert.match(r.result.content, /剩余 7.00 GB/);
}
const declared = /^#!arguments=(.*)$/m.exec(moduleText)[1].split(',');
const used = [...moduleText.matchAll(/\{\{\{(\w+)\}\}\}/g)].map(x => x[1]);
assert.deepEqual([...declared].sort(), [...used].sort());
assert.equal((moduleText.match(/script-name=subscription_/g) || []).length, 4);
assert.doesNotMatch(moduleText, /\[(?:Proxy|Proxy Group|Rule|MITM|General)\]/);
console.log('PASS: parsing, module wiring, four accounts, reset metadata, failures, cache and privacy');
