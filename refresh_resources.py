#!/usr/bin/env python3
"""Refresh Surge scripts/rules from upstream and commit (GitHub Actions weekly).

Keeps the user's own repo as a stable mirror: each week re-downloads the listed
resources from upstream and commits only what changed. This is the "自有仓库
自动随上游更新" mechanism for Surge-for-personal-use.
"""
import hashlib
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen

SCRIPTS = {
    "BaiduCloud.js": "https://raw.githubusercontent.com/510004015/Quantumult_X/Remote/Premium/BaiduCloud.js",
    "Craft.js": "https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/Craft.js",
    "Drafts.js": "https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/Drafts.js",
    "GrammarlyPremiumCrack.js": "https://raw.githubusercontent.com/yqc007/QuantumultX/master/GrammarlyPremiumCrack.js",
    "Revenuecat.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/44e1afd4fb9015dcb1dd16a9e6930b415d965983/Surge/Revenuecat.js",
    "UnblockURLinWeChat.js": "https://raw.githubusercontent.com/zZPiglet/Task/master/asset/UnblockURLinWeChat.js",
    "alidrive.js": "https://raw.githubusercontent.com/chxm1023/Rewrite/main/alidrive.js",
    "ceo.js": "https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/ceo.js",
    "cxzk.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/main/scripts/cxzk.js",
    "duet.js": "https://raw.githubusercontent.com/Alex0510/Eric/master/surge/Script/duet.js",
    "fantastical.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/main/scripts/fantastical.js",
    "iTunes.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/44e1afd4fb9015dcb1dd16a9e6930b415d965983/Surge/iTunes.js",
    "jinrirebang.js": "https://raw.githubusercontent.com/Alex0510/Eric/master/surge/Script/jinrirebang.js",
    "mate.js": "https://raw.githubusercontent.com/Alex0510/Eric/master/surge/Script/mate.js",
    "peak.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/main/scripts/peak.js",
    "startup.js": "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/script/startup/startup.js",
    "tenPercent.js": "https://raw.githubusercontent.com/Marol62926/MarScrpt/main/tenPercent.js",
    "tieba-json.js": "https://raw.githubusercontent.com/app2smile/rules/master/js/tieba-json.js",
    "tieba-proto.js": "https://raw.githubusercontent.com/app2smile/rules/master/js/tieba-proto.js",
    "wnyd.js": "https://raw.githubusercontent.com/NobyDa/Script/master/QuantumultX/File/wnyd.js",
    "xunjie.js": "https://raw.githubusercontent.com/Abinthur/Quantumult-X-For-Personal-Use/main/scripts/xunjie.js",
}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    root = Path(__file__).resolve().parent
    changed = []
    for name, url in SCRIPTS.items():
        dest = root / "scripts" / name
        try:
            data = urlopen(Request(url, headers={"User-Agent": "Surge-resource-refresh"}), timeout=30).read()
            if not data:
                raise ValueError("empty body")
        except Exception as exc:  # 404/网络/格式异常：保留上一份
            print(f"skip {name}: {exc}")
            continue
        old = dest.read_bytes() if dest.exists() else b""
        if sha256(data) != sha256(old):
            dest.parent.mkdir(exist_ok=True)
            dest.write_bytes(data)
            changed.append(name)
    if changed:
        subprocess.run(["git", "add", "scripts"], check=True)
        subprocess.run(
            ["git", "-c", "user.name=github-actions", "-c", "user.email=actions@github.com",
             "commit", "-m", "refresh scripts: " + ", ".join(changed)], check=True)
        subprocess.run(["git", "push"], check=True)
    print("changed:", changed)


if __name__ == "__main__":
    main()
