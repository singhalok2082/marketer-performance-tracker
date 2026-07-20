/**
 * Storage bucket setup – run once after applying 002_tracking.sql
 *   node supabase/setup-storage.js
 */
require("dotenv").config({ path: "../backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = "resumes";
const BUCKET_OPTS = {
  public: false,
  fileSizeLimit: "25MB",
  allowedMimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};

async function setup() {
  console.log("🪣 Setting up storage…");

  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error("❌ Could not list buckets:", listErr.message);
    return;
  }

  if (buckets.some(b => b.name === BUCKET)) {
    const { error: updateErr } = await supabase.storage.updateBucket(BUCKET, BUCKET_OPTS);
    if (updateErr) console.error("❌ Bucket update error:", updateErr.message);
    else console.log(`✅ Bucket "${BUCKET}" already existed — limits updated to ${BUCKET_OPTS.fileSizeLimit}`);
    return;
  }

  const { error: createErr } = await supabase.storage.createBucket(BUCKET, BUCKET_OPTS);

  if (createErr) console.error("❌ Bucket creation error:", createErr.message);
  else console.log(`🎉 Bucket "${BUCKET}" created`);
}

setup().catch(console.error);
