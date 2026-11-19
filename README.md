# Surge for personal use

## 流利说·阅读

将原 Quantumult X 脚本适配为 Surge 响应脚本和可安装模块。

### 安装

在 Surge 的“模块”页面选择通过 URL 安装，粘贴以下地址并启用模块。

```text
https://raw.githubusercontent.com/Abinthur/Surge-for-personal-use/main/modules/llsyd.sgmodule
```

开启 MITM，并在使用设备上安装、信任 Surge 的 CA 证书。模块会向 MITM 域名列表追加 `vira.llsapp.com`。如已有处理相同接口的脚本，请停用旧模块以避免冲突。

### 适配内容

- 使用 Surge 的 `http-response` 和 `requires-body=true`。
- 仅匹配两个原脚本处理的接口，兼容查询参数和末尾斜杠。
- 每次执行只调用一次 `$done()`。
- 保留原脚本全部响应字段和值，包括原有时间戳。

本地检查覆盖响应数据与原版一致性、URL 匹配和单次完成回调。App 内实际效果需在安装后验证，接口或服务端校验发生变化时可能失效。

### 来源与署名

原作者为彭于晏（GitHub 用户 `89996462`），原脚本标注更新日期为 2022-10-17、App 版本为 2.28.0。

[原始脚本](https://github.com/89996462/Quantumult-X/blob/main/ycdz/llsyd.js)

原作者声明“仅供学习与交流，请勿转载与贩卖”。使用和传播请尊重原作者要求。
