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
let obj = JSON.parse($response.body);

obj = {
  "error": false,
  "data": {
    "vip_expired": "2566584780",
    "is_vip_now": true,
    "is_vip": "1"
  },
  "status": 200
}
$done({body: JSON.stringify(obj)});

})();
