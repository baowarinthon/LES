import * as functions from "firebase-functions/v1";
import { google } from "googleapis";
import { Readable } from "stream";

interface UploadQuestImageData {
  questId: string;
  questTitle: string;
  fileBase64: string;
  fileName: string;
  mimeType: string;
}

interface UploadQuestImageResult {
  driveFileId: string;
  driveFileUrl: string;
}

export const uploadQuestImage = functions
  .region("asia-southeast1")
  .runWith({ secrets: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GOOGLE_DRIVE_FOLDER_ID"] })
  .https.onCall(async (data: UploadQuestImageData, context): Promise<UploadQuestImageResult> => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }

    const { questId, questTitle, fileBase64, fileName, mimeType } = data;

    if (!questId || !questTitle || !fileBase64 || !fileName || !mimeType) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }

    const privateKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";

    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
      const res = await drive.files.list({
        q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id)",
        spaces: "drive",
      });
      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
      }
      const folder = await drive.files.create({
        requestBody: {
          name,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });
      return folder.data.id!;
    }

    const questImagesFolderId = await findOrCreateFolder("Quest Images", rootFolderId);
    const questFolderName = `${questId} - ${questTitle}`;
    const questSubfolderId = await findOrCreateFolder(questFolderName, questImagesFolderId);

    const buffer = Buffer.from(fileBase64, "base64");
    const stream = Readable.from(buffer);

    const uploadRes = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [questSubfolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id",
    });

    const fileId = uploadRes.data.id!;

    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const driveFileUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return { driveFileId: fileId, driveFileUrl };
  });

// ── Firestore trigger: mark submission as stored in Firebase Storage ──────────
export const onSubmissionCreated = functions
  .region("asia-southeast1")
  .firestore.document("submissions/{submissionId}")
  .onCreate(async (snap) => {
    await snap.ref.update({
      driveStatus: "storage_only",
      driveNote: "File stored in Firebase Storage",
    });
    console.log(`onSubmissionCreated: marked ${snap.id} as storage_only`);
  });
