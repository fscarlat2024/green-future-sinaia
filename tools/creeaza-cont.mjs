// Creeaza un cont pentru panoul de rezervari si afiseaza parola o singura data.
//   node tools/creeaza-cont.mjs email@firma.ro admin [--remote]
//   node tools/creeaza-cont.mjs proprietar@firma.ro owner [studio-dandelion] [--remote]
//   fara apartament, proprietarul isi adauga singur apartamentul din panou
import { webcrypto as crypto } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const [email, role = "owner", slug] = args.filter((a) => a !== "--remote");
if (!email || !["admin", "owner"].includes(role)) {
  console.error("Folosire: node tools/creeaza-cont.mjs <email> <admin|owner> [slug] [--remote]");
  process.exit(1);
}

const abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const password = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => abc[b % abc.length]).join("");
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
const b64 = (b) => Buffer.from(b).toString("base64");
const hash = `pbkdf2$100000$${b64(salt)}$${b64(bits)}`;

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
let sql = `INSERT INTO admins (email, pass_hash, role) VALUES (${q(email.toLowerCase())}, ${q(hash)}, ${q(role)})
  ON CONFLICT(email) DO UPDATE SET pass_hash = excluded.pass_hash, role = excluded.role;\n`;
if (slug) sql += `INSERT OR IGNORE INTO admin_properties (admin_id, property_slug)
  SELECT id, ${q(slug)} FROM admins WHERE email = ${q(email.toLowerCase())};\n`;

const file = join(mkdtempSync(join(tmpdir(), "gf-")), "cont.sql");
writeFileSync(file, sql);
try {
  const wrangler = join("node_modules", "wrangler", "bin", "wrangler.js");
  execFileSync(process.execPath, [wrangler, "d1", "execute", "green-future", remote ? "--remote" : "--local", `--file=${file}`], { stdio: "ignore" });
} finally {
  unlinkSync(file);
}
console.log(`Cont ${role}: ${email}\nParola: ${password}`);
