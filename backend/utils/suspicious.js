const supabase = require("../db/supabase");

const FAILED_LOGIN_THRESHOLD = 5;
// Off-hours in UTC: before 03:30 or after 17:30 (covers outside 9am–11pm IST)
const OFF_HOURS_START = 17;
const OFF_HOURS_END = 3;

function isOffHours() {
  const hour = new Date().getUTCHours();
  return hour >= OFF_HOURS_START || hour < OFF_HOURS_END;
}

async function checkSuspicious(userId, ip, browser, os) {
  const flags = [];

  // 1. Failed login count in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("login_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "failed")
    .gte("created_at", oneHourAgo);

  if ((count || 0) >= FAILED_LOGIN_THRESHOLD) {
    flags.push(`${count} failed login attempts in the last hour`);
  }

  // 2. New device / browser compared to last 10 successful logins
  const { data: recentLogins } = await supabase
    .from("login_logs")
    .select("browser, os, ip_address")
    .eq("user_id", userId)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(10);

  if (recentLogins && recentLogins.length > 0) {
    const knownBrowsers = new Set(recentLogins.map(l => l.browser));
    const knownIps = new Set(recentLogins.map(l => l.ip_address));
    if (!knownBrowsers.has(browser)) flags.push(`New browser detected: ${browser}`);
    if (!knownIps.has(ip) && ip !== "Local" && ip !== "Unknown") flags.push(`New IP address: ${ip}`);
  }

  // 3. Off-hours login
  if (isOffHours()) {
    flags.push("Login outside normal business hours (IST)");
  }

  return flags;
}

module.exports = { checkSuspicious, isOffHours };
