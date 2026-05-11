/**
 * One-time migration: fix reviewedByName in submissions where it shows
 * stale/incorrect name. Looks up the reviewer's current teamName from users.
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

async function getDoc(collection, docId) {
  const res = await fetch(`${BASE}/${collection}/${docId}?key=${API_KEY}`);
  return res.json();
}

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
  if (!res.ok) throw new Error(`PATCH failed: ${JSON.stringify(await res.json())}`);
}

(async () => {
  console.log("Fix reviewedByName migration\n");

  // 1. Load all users into a map uid → teamName/email
  const userMap = new Map();
  let pageToken;
  do {
    const data = await listDocs("users", pageToken);
    if (data.error) throw new Error(`List users failed: ${JSON.stringify(data.error)}`);
    for (const d of data.documents ?? []) {
      const uid = d.name.split("/").pop();
      const teamName = d.fields?.teamName?.stringValue ?? "";
      const email = d.fields?.email?.stringValue ?? "";
      userMap.set(uid, teamName || email || "แอดมิน AOT SLES");
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`Loaded ${userMap.size} users\n`);

  // 2. Scan submissions
  let updated = 0;
  let skipped = 0;
  pageToken = undefined;

  do {
    const data = await listDocs("submissions", pageToken);
    if (data.error) {
      if (data.error.status === "NOT_FOUND") { console.log("No submissions found."); break; }
      throw new Error(`List submissions failed: ${JSON.stringify(data.error)}`);
    }

    for (const d of data.documents ?? []) {
      const docId = d.name.split("/").pop();
      const reviewedByName = d.fields?.reviewedByName?.stringValue ?? "";
      const reviewedByUid = d.fields?.reviewedBy?.stringValue ?? "";

      // Only fix docs with the wrong name (stale or "แอดมินหมาบิน")
      if (reviewedByName !== "แอดมินหมาบิน") {
        skipped++;
        continue;
      }

      const correctName = reviewedByUid
        ? (userMap.get(reviewedByUid) ?? "แอดมิน AOT SLES")
        : "แอดมิน AOT SLES";

      await patchField("submissions", docId, "reviewedByName", correctName);
      console.log(`  ✓ submissions/${docId}: "${reviewedByName}" → "${correctName}"`);
      updated++;
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.log(`\n${updated} updated, ${skipped} skipped`);
  console.log("Done.");
})();
