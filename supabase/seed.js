/**
 * Seed script – run once after applying 001_schema.sql
 *   node supabase/seed.js
 */
require("dotenv").config({ path: "../backend/.env" });
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SALT_ROUNDS = 12;
const MANAGER_DEFAULT_PW = "ConsultAdd@2024";
const ADMIN_DEFAULT_PW = "Admin@ConsultAdd2024";

const TEAM = [
  { name: "Aashima Soni",               email: "aashima@consultadd.com" },
  { name: "Adarsh Kaushal",             email: "adarsh@consultadd.com" },
  { name: "Ayush Singh",                email: "ayush@consultadd.com" },
  { name: "Arpeet Sahoo",               email: "arpeet@consultadd.com" },
  { name: "Sakshi Jaiswal",             email: "sakshi@consultadd.com" },
  { name: "Karishma Sankhala",          email: "karishma@consultadd.com" },
  { name: "Trupti Sudheerkumar Nair",   email: "trupti@consultadd.com" },
  { name: "Eureka Baranwal",            email: "eureka@consultadd.com" },
  { name: "Ishita Verma",               email: "ishita@consultadd.com" },
  { name: "Mohit Nilesh Borole",        email: "mohit@consultadd.com" },
  { name: "Pallavi Bharti",             email: "pallavi@consultadd.com" },
  { name: "Sumit Rameshbhai Gangavati", email: "sumit@consultadd.com" },
  { name: "Himanshu Malviya",           email: "himanshu@consultadd.com" },
  { name: "Chandramani Pillay",         email: "chandramani@consultadd.com" },
];

const DEFAULT_PORTALS = [
  { name: "LinkedIn",    url: "https://linkedin.com" },
  { name: "Naukri",      url: "https://naukri.com" },
  { name: "Indeed",      url: "https://indeed.com" },
  { name: "Internshala", url: "https://internshala.com" },
];

// Upsert with fallback: try full row, retry without optional columns if schema is partial
async function upsertWithFallback(rows, optionalCols = []) {
  const { error } = await supabase.from("users").upsert(rows, { onConflict: "email" });
  if (!error) return null;

  const missingCol = optionalCols.find(c => error.message.includes(`'${c}'`));
  if (missingCol) {
    const stripped = rows.map(r => { const c = { ...r }; delete c[missingCol]; return c; });
    return upsertWithFallback(stripped, optionalCols.filter(c => c !== missingCol));
  }
  return error;
}

async function seed() {
  console.log("🌱 Seeding database…");

  const adminHash = await bcrypt.hash(ADMIN_DEFAULT_PW, SALT_ROUNDS);
  const adminErr = await upsertWithFallback(
    [{ name: "Alok Kumar Singh", email: "alok@consultadd.com", role: "admin", password_hash: adminHash, must_change_password: false }],
    ["must_change_password"]
  );
  if (adminErr) console.error("❌ Admin insert error:", adminErr.message);
  else console.log("✅ Admin created           → alok@consultadd.com  /  Admin@ConsultAdd2024");

  const mgHash = await bcrypt.hash(MANAGER_DEFAULT_PW, SALT_ROUNDS);
  const teamRows = TEAM.map(u => ({ ...u, role: "account_manager", password_hash: mgHash, must_change_password: true }));
  const teamErr = await upsertWithFallback(teamRows, ["must_change_password"]);
  if (teamErr) console.error("❌ Team insert error:", teamErr.message);
  else console.log(`✅ ${TEAM.length} account managers created  → default pw: ConsultAdd@2024`);

  const { error: portalErr } = await supabase.from("portals").upsert(DEFAULT_PORTALS, { onConflict: "name" });
  if (portalErr) console.error("❌ Portals insert error:", portalErr.message);
  else console.log(`✅ ${DEFAULT_PORTALS.length} portals created`);

  if (adminErr || teamErr) {
    console.log("\n⚠️  Some columns are missing from the 'users' table.");
    console.log("   Run the SQL migration in Supabase SQL Editor, then re-run this script:");
    console.log("   https://supabase.com/dashboard/project/gjuynieqwujaijjitugo/sql/new\n");
  } else {
    console.log("\n🎉 Done. All users seeded successfully.");
  }
}

seed().catch(console.error);
