#!/usr/bin/env python3
"""Refresh public Surge resources; validate before publication and retain known-good copies."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

MAX_BYTES = 32 * 1024 * 1024
HOSTS = {'raw.githubusercontent.com', 'gist.githubusercontent.com'}
RULE_TYPES = {'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD', 'IP-CIDR', 'IP-CIDR6', 'IP-ASN', 'GEOIP', 'USER-AGENT', 'URL-REGEX', 'PROCESS-NAME', 'PROCESS-PATH', 'AND', 'OR', 'NOT', 'DEST-PORT', 'SRC-PORT', 'SRC-IP'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def public_url(url):
    p = urlsplit(url)
    if p.scheme != 'https' or p.hostname not in HOSTS or p.username or p.password or p.query or p.fragment:
        raise ValueError('source is not an approved public raw URL')
    return url


def fetch(url):
    with urlopen(Request(public_url(url), headers={'User-Agent': 'Surge-resource-refresh'}), timeout=30) as response:
        public_url(response.url)
        if response.status != 200:
            raise ValueError('unexpected HTTP status')
        if 'html' in response.headers.get('Content-Type', '').lower():
            raise ValueError('HTML response')
        return response.read(MAX_BYTES + 1)


def transform(data, mode):
    if mode != 'clash-payload':
        return data
    out = []
    payload = False
    for raw in data.decode('utf-8-sig').splitlines():
        s = raw.strip()
        if not s or s.startswith('#'):
            out.append(raw if s.startswith('#') else '')
            continue
        if s == 'payload:':
            payload = True
            continue
        if not payload or not s.startswith('- '):
            raise ValueError('unsupported YAML structure')
        rule = s[2:].strip().strip("\"'")
        if not re.fullmatch(r'DOMAIN(?:-SUFFIX)?,[^,\s#]+', rule):
            raise ValueError('unsupported YAML rule')
        out.append(rule)
    if not payload:
        raise ValueError('missing payload')
    return ('\n'.join(out) + '\n').encode()


def validate(data, kind):
    if not data or len(data) > MAX_BYTES:
        raise ValueError('empty or oversized response')
    text = data.decode('utf-8-sig')
    if re.search(r'<(?:!doctype|html|head|body)\b', text[:1024], re.I):
        raise ValueError('HTML response')
    if kind == 'script':
        with tempfile.NamedTemporaryFile(suffix='.js') as f:
            f.write(data)
            f.flush()
            checked = subprocess.run(['node', '--check', f.name], capture_output=True)
        if checked.returncode:
            raise ValueError('JavaScript syntax check failed')
        return 0
    rows = [l.strip() for l in text.splitlines() if l.strip() and not l.lstrip().startswith(('#', ';', '//'))]
    if not rows:
        raise ValueError('empty rule set')
    for line in rows:
        rule_type, sep, tail = line.partition(',')
        if not sep or rule_type not in RULE_TYPES or not tail.strip():
            raise ValueError('unexpected rule format')
    return len(rows)


def load_sources(script_root):
    items = json.loads((script_root / 'sources.json').read_text())
    seen = set()
    for item in items:
        public_url(item['url'])
        path = Path(item['path'])
        if path.is_absolute() or '..' in path.parts or path.parts[:2] not in (('resources', 'scripts'), ('resources', 'rules')) or item['path'] in seen:
            raise ValueError('invalid or duplicate destination')
        seen.add(item['path'])
    return items


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=path.parent, prefix='.' + path.name)
    try:
        with os.fdopen(fd, 'wb') as out:
            out.write(data)
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-root', type=Path)
    parser.add_argument('--cache-report', type=Path, help='Offline audit cache for local verification only')
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    script_root = Path(__file__).resolve().parent
    root = (args.output_root or script_root).resolve()
    items = load_sources(script_root)
    inventory_path = root / 'resources' / 'inventory.json'
    previous = json.loads(inventory_path.read_text()) if inventory_path.exists() else {}
    if args.check_only:
        for item in items:
            data = (root / item['path']).read_bytes()
            validate(data, item['kind'])
            if digest(data) != previous[item['path']]['sha256']:
                raise ValueError('cached checksum mismatch: ' + item['path'])
        print('Verified resources:', len(items))
        return
    cache = {}
    if args.cache_report:
        for entry in json.loads(args.cache_report.read_text())['resources']:
            if entry.get('cache'):
                cache[entry['url']] = entry['cache']
            if entry.get('replacement_source'):
                cache[entry['replacement_source']] = str(args.cache_report.parent / 'Ai.yaml')

    def update(item):
        path = root / item['path']
        old = None
        old_meta = previous.get(item['path'])
        if path.exists() and old_meta:
            candidate = path.read_bytes()
            if digest(candidate) == old_meta['sha256']:
                validate(candidate, item['kind'])
                old = candidate
        try:
            source = Path(cache[item['url']]).read_bytes() if args.cache_report else fetch(item['url'])
            data = transform(source, item.get('transform', 'identity'))
            count = validate(data, item['kind'])
            if old is None and digest(data) != item['bootstrap_sha256']:
                raise ValueError('bootstrap checksum changed; review source before publication')
            prior_count = old_meta['entries'] if old_meta else item.get('bootstrap_entries', 0)
            if item['kind'] == 'rule-set' and count * 2 < prior_count:
                raise ValueError('rule count fell by more than half')
            return item, data, {'sha256': digest(data), 'bytes': len(data), 'entries': count}, None
        except Exception as error:
            if old is None:
                return item, None, None, str(error)
            return item, old, old_meta, 'retained: ' + str(error)

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(update, items))
    failed = [item['path'] + ': ' + error for item, data, meta, error in results if data is None]
    if failed:
        raise SystemExit('No publication; missing verified resources:\n' + '\n'.join(failed))
    inventory = {}
    changed = 0
    retained = []
    for item, data, meta, error in results:
        target = root / item['path']
        if not target.exists() or target.read_bytes() != data:
            atomic_write(target, data)
            changed += 1
        inventory[item['path']] = meta
        if error:
            retained.append(item['path'] + ': ' + error)
    atomic_write(inventory_path, (json.dumps(inventory, ensure_ascii=False, indent=2, sort_keys=True) + '\n').encode())
    print('Resources:', len(items), 'Changed:', changed, 'Retained:', len(retained))
    for message in retained:
        print(message)


if __name__ == '__main__':
    main()
