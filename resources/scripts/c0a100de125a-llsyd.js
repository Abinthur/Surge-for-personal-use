/*
 * 流利说·阅读 — Surge 响应脚本
 * 原作者：彭于晏（89996462），原版更新日期：2022-10-17
 * 来源：https://raw.githubusercontent.com/89996462/Quantumult-X/main/ycdz/llsyd.js
 * 原声明：仅供学习与交流，请勿转载与贩卖。
 * Surge 适配：2026-11-19。保留原版响应字段和值。
 */

(function () {
  // Surge cannot attach a replacement body to a bodyless response.
  // Keep failed, empty, or non-JSON upstream responses untouched.
  const status = Number($response.status);
  const responseBody = $response.body;
  if (String($request.method || "").toUpperCase() === "HEAD" ||
      !Number.isFinite(status) || status < 200 || status >= 300 ||
      status === 204 || status === 205 ||
      typeof responseBody !== "string" || responseBody.trim() === "") {
    $done({});
    return;
  }
  try {
    JSON.parse(responseBody);
  } catch (_) {
    $done({});
    return;
  }

  const url = $request.url;
  let body;

  if (/^https?:\/\/vira\.llsapp\.com\/api\/v2\/member\/subscription\/?(?:\?.*)?$/.test(url)) {
    body = {
      expiredAt: 0x70db6800,
      remainDays: 999,
      active: true,
      startedAt: 0x61ec29ff
    };
  } else if (/^https?:\/\/vira\.llsapp\.com\/api\/v2\/user_goods_subscriptions\/overall\/?(?:\?.*)?$/.test(url)) {
    body = {
      items: [{
        startedAt: 0x61e2ef80,
        category: 4,
        status: 2,
        expiredAt: 0x61ec29ff,
        goodsTitle: "member",
        remainDays: 999,
        goodsUid: "XnV1EW",
        firstStartedAt: 0x70db6800
      }]
    };
  }

  $done(body === undefined ? {} : { body: JSON.stringify(body) });
})();
