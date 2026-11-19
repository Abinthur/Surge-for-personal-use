# Surge for personal use

个人自用的 Surge 模块，通过 Surge「模块 → 从 URL 安装」远程引用，地址稳定，升级用「更新模块」即可。

## 模块列表

| 模块 | 用途 | 安装地址 |
| --- | --- | --- |
| `llsyd` | 流利说·阅读 会员解锁（改写 vira.llsapp.com 两个会员接口） | `https://raw.githubusercontent.com/Abinthur/Surge-for-personal-use/main/modules/llsyd.sgmodule` |
| `liulishuo-networking` | 流利说阅读正常联网（让 rengine-platform.llsapp.com 走原始 TLS） | `https://raw.githubusercontent.com/Abinthur/Surge-for-personal-use/main/modules/liulishuo-networking.sgmodule` |
| `xiaoyuzhou-feed-filter` | 小宇宙首页信息流推广横幅过滤 | `https://raw.githubusercontent.com/Abinthur/Surge-for-personal-use/main/modules/xiaoyuzhou-feed-filter.sgmodule` |
| `quora-ads` | Quora 网页去广告（首页/回答/文章底部） | `https://raw.githubusercontent.com/Abinthur/Surge-for-personal-use/main/modules/quora-ads.sgmodule` |

## 流利说·阅读

`llsyd` 与 `liulishuo-networking` 搭配使用：

- `llsyd` 做会员解锁，需要开启 MITM 并信任 CA，模块会向 MITM 域名追加 `vira.llsapp.com`；只在响应有正文时改写两个会员接口，每次只调用一次 `$done()`，保留原脚本全部字段和值。
- `liulishuo-networking` 让 `rengine-platform.llsapp.com` 完全绕过 HTTP 引擎/MITM/脚本，避免第三方模块对该域名的拒绝重写打断 App。

原作者为彭于晏（GitHub 用户 `89996462`），原脚本标注更新日期为 2022-10-17、App 版本为 2.28.0。

[原始脚本](https://github.com/89996462/Quantumult-X/blob/main/ycdz/llsyd.js)

原作者声明“仅供学习与交流，请勿转载与贩卖”。使用和传播请尊重原作者要求。

## 其他模块来源

- 小宇宙：ddgksf2013 / 小宇宙FM去广告[墨鱼版]
- Quora：blackmatrix7/ios_rule_script（GPL-2.0），脚本仍引用上游 Gist；如需完全自托管，可把 `quora.min.js` 收入本仓库 `scripts/` 再改指向。
