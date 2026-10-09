const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../dist/src/app").default;

function request(port, path, method = "GET", body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({
      hostname: "127.0.0.1", port, path, method,
      headers: data ? { "content-type": "application/json", "content-length": data.length } : {}
    }, (res) => {
      let response = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => response += chunk);
      res.on("end", () => {
        let json;
        try { json = JSON.parse(response); } catch {}
        resolve({ status: res.statusCode, body: response, json });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const server = app.listen(0, "127.0.0.1", async () => {
    const { port } = server.address();
    try {
      const checks = [
        ["/api/v1/health", "GET", 200],
        ["/api/v1/auth/login", "POST", 400, {}],
        ["/api/v1/auth/not-a-route", "GET", 404],
        ["/not-a-real-route", "GET", 404],
        ["/api/v1/cars", "GET", 401]
      ];
      for (const [path, method, expected, body] of checks) {
        const result = await request(port, path, method, body);
        assert.equal(result.status, expected, `${method} ${path}: expected ${expected}, received ${result.status}; body=${result.body}`);
        if (expected === 404) {
          assert.equal(result.json?.success, false);
          assert.equal(result.json?.code, "ENDPOINT_NOT_FOUND");
        }
      }
      console.log("Route tests passed.");
      server.close(() => process.exit(0));
    } catch (error) {
      console.error(error);
      server.close(() => process.exit(1));
    }
  });
})().catch((error) => { console.error(error); process.exit(1); });
