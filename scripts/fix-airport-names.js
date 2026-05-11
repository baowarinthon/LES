/**
 * One-time migration: update short airport names to full Thai names
 * in users and submissions collections via Firestore REST API.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

const AIRPORT_MAP = {
  "สุวรรณภูมิ":    "ท่าอากาศยานสุวรรณภูมิ",
  "ดอนเมือง":      "ท่าอากาศยานดอนเมือง",
  "ภูเก็ต":        "ท่าอากาศยานภูเก็ต",
  "หาดใหญ่":      "ท่าอากาศยานหาดใหญ่",
  "เชียงราย":      "ท่าอากาศยานเชียงรายแม่ฟ้าหลวง",
  "เชียงใหม่":     "ท่าอากาศยานเชียงใหม่",
  "กระบี่":        null, // removed from new list — leave as-is
  "สมุย":          null, // removed from new list — leave as-is
};

async function listDocs(collection, pageToken) {
  const url = `${BASE}/${collection}?key=${API_KEY}&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`;
  const res = await fetch(url);
  return res.json();
}

async function patchField(collection, docId, field, value) {
  const url = `${BASE}/${collection}/${docId}?key=${API_KEY}&updateMask.fieldPaths=${field}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { [field]: { stringValue: value } } }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`PATCH ${collection}/${docId} failed: ${JSON.stringify(err)}`);
  }
}

async function migrateCollection(collectionName, fieldName) {
  let pageToken = undefined;
  let updated = 0;
  let skipped = 0;

  do {
    const data = await listDocs(collectionName, pageToken);

    if (data.error) {
      if (data.error.status === "NOT_FOUND") {
        console.log(`  Collection ${collectionName} not found — skipping`);
        return { updated: 0, skipped: 0 };
      }
      throw new Error(`List ${collectionName} failed: ${JSON.stringify(data.error)}`);
    }

    const docs = data.documents ?? [];

    for (const d of docs) {
      const docId = d.name.split("/").pop();
      const current = d.fields?.[fieldName]?.stringValue ?? "";
      const mapped = AIRPORT_MAP[current];

      if (mapped === undefined) {
        // Not a short name (either already full or unrecognised) — skip
        skipped++;
        continue;
      }
      if (mapped === null) {
        // Old airport removed from list — skip without error
        skipped++;
        continue;
      }

      await patchField(collectionName, docId, fieldName, mapped);
      console.log(`  ✓ ${collectionName}/${docId}: "${current}" → "${mapped}"`);
      updated++;
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { updated, skipped };
}

(async () => {
  console.log("Fix airport names migration\n");

  console.log("── users ──");
  const u = await migrateCollection("users", "airport");
  console.log(`  ${u.updated} updated, ${u.skipped} skipped\n`);

  console.log("── submissions ──");
  const s = await migrateCollection("submissions", "airport");
  console.log(`  ${s.updated} updated, ${s.skipped} skipped\n`);

  console.log("Done.");
})();
