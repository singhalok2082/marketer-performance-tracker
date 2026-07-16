const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

function parseUserAgent(uaString) {
  const parser = new UAParser(uaString);
  const result = parser.getResult();
  return {
    browser: [result.browser.name, result.browser.version].filter(Boolean).join(" ") || "Unknown",
    os: [result.os.name, result.os.version].filter(Boolean).join(" ") || "Unknown",
    device: result.device.type || "Desktop",
  };
}

function getCountry(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return "Local";
  }
  const geo = geoip.lookup(ip);
  return geo ? geo.country : "Unknown";
}

function getRealIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket.remoteAddress ||
    "Unknown"
  );
}

module.exports = { parseUserAgent, getCountry, getRealIp };
