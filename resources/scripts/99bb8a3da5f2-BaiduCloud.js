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

[rewrite_local]

^https:\/\/pan\.baidu\.com\/rest\/\d\.\d\/membership\/user url script-response-body https://raw.githubusercontent.com/510004015/Quantumult_X/Remote/Premium/BaiduCloud.js

[mitm] 

hostname = pan.baidu.com

*/

let Premium = $response.body;
var modified = JSON.parse(Premium);
modified = {
  "product_infos" : [
    {
      "cur_svip_type" : "Crack",
      "product_name" : "svip2_nd",
      "product_description" : "解锁倍速+画质",
      "function_num" : 510004015,
      "start_time" : 1672502400,
      "buy_description" : "无下载加速",
      "buy_time" : 980784000,
      "product_id" : "问好",
      "auto_upgrade_to_svip" : 0,
      "end_time" : 4070880000,
      "cluster" : "vip",
      "detail_cluster" : "svip",
      "status" : 0
    }
  ],
  "level_info" : {
    "current_level" : 10,
  }
};
$done({body:JSON.stringify(modified)});

})();
