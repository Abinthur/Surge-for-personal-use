// Subscription credentials stay in the installed module's local parameters.
(function () {
  "use strict";
  var DAY = 86400000;
  var names = { xlink: "Xlink", shandian1: "闪电 1", shandian2: "闪电 2", youtu: "悠兔" };
  var raw = typeof $argument === "string" ? $argument : "";
  // The URL is the final argument: its own & and = must remain intact.
  var args = /^(?:id=)(\w+)&account=([^&]*)&url=([\s\S]*)$/.exec(raw);
  var id = args && args[1];
  var title = names[id] || "订阅用量";
  var account = args ? args[2].trim() : "";
  if (account) title += " " + account;
  var url = args ? args[3].trim() : "";
  var finished = false;
  function done(content, style) {
    if (finished) return;
    finished = true;
    $done({ title: title, content: content, style: style || "info" });
  }
  if (!names[id] || !url || url.indexOf("{{{") !== -1) {
    done("请在模块参数中填写本账号的 HTTPS 订阅链接", "info");
    return;
  }
  if (!/^https:\/\/[^\s"<>]+$/i.test(url)) {
    done("订阅链接格式无效：请填写完整的 HTTPS 地址", "error");
    return;
  }
  var hash = 2166136261;
  for (var i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  var key = "subscription_panels_v1_" + id + "_" + (hash >>> 0).toString(16);
  var cached = null;
  try { cached = JSON.parse($persistentStore.read(key) || "null"); } catch (_) {}
  function valid(s) {
    return s && [s.upload, s.download, s.total, s.fetchedAt].every(function (n) {
      return typeof n === "number" && isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
    }) && (s.expire === null || (typeof s.expire === "number" && isFinite(s.expire) && s.expire > 0 && s.expire < 253402300800));
  }
  if (!valid(cached)) cached = null;
  function stamp(ms) {
    return new Date(ms + 8 * 3600000).toISOString().slice(0, 16).replace("T", " ");
  }
  function render(s) {
    var used = s.upload + s.download;
    var reset = "暂未获取";
    if (Number.isInteger(s.resetDays) && s.resetDays >= 0) {
      // shortcut: the provider supplies whole days only; exact reset time is unknown.
      reset = Math.max(0, s.resetDays - Math.floor((Date.now() - s.fetchedAt) / DAY)) + " 天（机场返回）";
    }
    var lines = ["剩余 " + (Math.max(0, s.total - used) / Math.pow(1024, 3)).toFixed(2) + " GB",
      "已用 " + (used / Math.pow(1024, 3)).toFixed(2) + " GB",
      "距离重置 " + reset];
    if (s.expire) {
      var days = Math.ceil((s.expire * 1000 - Date.now()) / DAY);
      lines.push(days > 0 ? "距离到期 " + days + " 天" : "套餐已到期");
      lines.push("到期 " + stamp(s.expire * 1000).slice(0, 10));
    } else lines.push("到期时间 暂未提供");
    lines.push("更新 " + stamp(s.fetchedAt) + "（北京时间）");
    return lines.join("\n");
  }
  function fail(message) {
    done((cached ? render(cached) + "\n" : "") + "刷新失败：" + message + (cached ? "；当前为上次成功数据" : ""), "error");
  }
  function get(target, agent, callback) {
    try {
      $httpClient.get({ url: target, headers: { "User-Agent": agent }, timeout: 8,
        "auto-redirect": false, "auto-cookie": false }, function (error, response, body) {
        if (error || !response) { callback("网络或 TLS 请求失败"); return; }
        if (Number(response.status) !== 200) { callback("HTTP " + Number(response.status)); return; }
        callback(null, response, typeof body === "string" ? body : "");
      });
    } catch (_) { callback("请求无法发起"); }
  }
  function parse(headers) {
    var text = "";
    Object.keys(headers || {}).some(function (k) {
      if (k.toLowerCase() === "subscription-userinfo") { text = String(headers[k]); return true; }
      return false;
    });
    var fields = {};
    text.split(";").forEach(function (part) {
      var match = /^\s*(upload|download|total|expire)\s*=\s*(\d+)\s*$/i.exec(part);
      if (match) fields[match[1].toLowerCase()] = Number(match[2]);
    });
    var stats = { upload: fields.upload, download: fields.download, total: fields.total,
      expire: fields.expire > 0 ? fields.expire : null, fetchedAt: Date.now() };
    return valid(stats) ? stats : null;
  }
  function resetDays(body) {
    var text = body.trim();
    // Decode URI-list subscriptions without depending on browser-only atob().
    if (/^[A-Za-z0-9+/_=\s-]+$/.test(text)) {
      var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var input = text.replace(/\s|=/g, "").replace(/-/g, "+").replace(/_/g, "/");
      var bits = 0, value = 0, escaped = "";
      for (var j = 0; j < input.length; j++) {
        value = (value << 6) | alphabet.indexOf(input[j]); bits += 6;
        if (bits >= 8) { bits -= 8; escaped += "%" + ("0" + ((value >> bits) & 255).toString(16)).slice(-2); }
      }
      try { text = decodeURIComponent(escaped); } catch (_) { return null; }
    }
    try { text = decodeURIComponent(text); } catch (_) {}
    var match = /距离(?:下次)?重置(?:剩余)?[：:\s]*(\d+)\s*天/.exec(text);
    return match ? Number(match[1]) : null;
  }
  function save(stats) {
    var saved = false;
    try { saved = $persistentStore.write(JSON.stringify(stats), key); } catch (_) {}
    var style = stats.total <= stats.upload + stats.download || (stats.expire && stats.expire * 1000 <= Date.now()) ? "alert" : "info";
    done(render(stats) + (saved ? "" : "\n缓存保存失败，下次离线可能无数据显示"), style);
  }
  var queryURL = url;
  if (id === "youtu") {
    queryURL = /([?&])flag=[^&#]*/.test(url) ? url.replace(/([?&])flag=[^&#]*/, "$1flag=clash") : url + (url.indexOf("?") === -1 ? "?" : "&") + "flag=clash";
  }
  get(queryURL, id === "xlink" ? "Surge/5.0" : "ClashforWindows/0.20.39", function (error, response) {
    if (error) { fail(error); return; }
    var stats = parse(response.headers);
    if (!stats) { fail("订阅未返回有效用量字段"); return; }
    if (id !== "youtu") { save(stats); return; }
    var originalURL = url.replace(/([?&])flag=[^&#]*&?/, "$1").replace(/[?&]$/, "");
    get(originalURL, "Surge/5.0", function (resetError, unused, body) {
      stats.resetDays = resetError ? null : resetDays(body);
      save(stats);
    });
  });
})();
