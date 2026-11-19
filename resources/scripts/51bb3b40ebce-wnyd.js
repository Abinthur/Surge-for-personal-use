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
网易蜗牛读书 解锁特权
原作者: yxiaocai & JO2EY

***************************
QuantumultX:

[rewrite_local]
^https?:\/\/p\.du\.163\.com\/gain\/readtime\/info\.json url script-response-body https://raw.githubusercontent.com/NobyDa/Script/master/QuantumultX/File/wnyd.js

[mitm]
hostname = p.du.163.com

***************************
Surge4 or Loon:

[Script]
http-response ^https?:\/\/p\.du\.163\.com\/gain\/readtime\/info\.json requires-body=1,max-size=0,script-path=https://raw.githubusercontent.com/NobyDa/Script/master/QuantumultX/File/wnyd.js

[MITM]
hostname = p.du.163.com

**************************/
var body = $response.body;
var obj = JSON.parse(body);

obj.tradeEndTime = 1879685290000;
body = JSON.stringify(obj);
$done({body});

})();
