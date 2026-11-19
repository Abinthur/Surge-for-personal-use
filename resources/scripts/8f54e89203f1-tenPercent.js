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
var body = $response.body;
var obj = JSON.parse(body);

obj.user.expiration_date = "05/05/2029, 05:13:20 PM UTC",
obj.user.plan_description = "1 year",
obj.user.subscription_end_date = "05/04/2029, 05:13:20 PM UTC",
obj.user.subscription_period = "P1Y",
obj.user.subscription_source = "62926",

body = JSON.stringify(obj);
$done({body});

})();
