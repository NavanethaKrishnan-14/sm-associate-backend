module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({
    success: true,
    message: "SM Associate API is running.",
    environment: process.env.NODE_ENV || "production"
  }));
};
