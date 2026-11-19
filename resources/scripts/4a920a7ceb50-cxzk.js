// Surge bodyless/empty response safety guard, 2026-11-19. Upstream logic follows unchanged.
(function () {
  const responseStatus = Number($response.status);
  const responseBody = $response.body;
  if (String($request.method || "").toUpperCase() === "HEAD" ||
      (responseStatus >= 100 && responseStatus < 200) ||
      responseStatus === 204 || responseStatus === 205 || responseStatus === 304 ||
      responseBody === undefined || responseBody === null ||
      (typeof responseBody === "string" && responseBody.trim() === "") ||
      (responseBody instanceof Uint8Array && responseBody.byteLength === 0)) {
    $done({});
    return;
  }
/*
Unlocks by Cuttlefish 公众号：墨鱼手记
*/
var body = $response.body.replace(/\u0069\u0073\u0066\u0072\u0065\u0065\u0022\u003a\u0030/g, '\u0069\u0073\u0066\u0072\u0065\u0065\u0022\u003a\u0031');
$done({ body });

})();
