"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onSubmissionCreated = exports.uploadQuestImage = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
exports.uploadQuestImage = functions
    .region("asia-southeast1")
    .runWith({ secrets: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GOOGLE_DRIVE_FOLDER_ID"] })
    .https.onCall(async (data, context) => {
    var _a, _b, _c;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Must be authenticated");
    }
    const { questId, questTitle, fileBase64, fileName, mimeType } = data;
    if (!questId || !questTitle || !fileBase64 || !fileName || !mimeType) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
    }
    const privateKey = ((_a = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) !== null && _a !== void 0 ? _a : "").replace(/\\n/g, "\n");
    const serviceEmail = (_b = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) !== null && _b !== void 0 ? _b : "";
    const rootFolderId = (_c = process.env.GOOGLE_DRIVE_FOLDER_ID) !== null && _c !== void 0 ? _c : "";
    const auth = new googleapis_1.google.auth.JWT({
        email: serviceEmail,
        key: privateKey,
        scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = googleapis_1.google.drive({ version: "v3", auth });
    async function findOrCreateFolder(name, parentId) {
        const res = await drive.files.list({
            q: `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: "files(id)",
            spaces: "drive",
        });
        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id;
        }
        const folder = await drive.files.create({
            requestBody: {
                name,
                mimeType: "application/vnd.google-apps.folder",
                parents: [parentId],
            },
            fields: "id",
        });
        return folder.data.id;
    }
    const questImagesFolderId = await findOrCreateFolder("Quest Images", rootFolderId);
    const questFolderName = `${questId} - ${questTitle}`;
    const questSubfolderId = await findOrCreateFolder(questFolderName, questImagesFolderId);
    const buffer = Buffer.from(fileBase64, "base64");
    const stream = stream_1.Readable.from(buffer);
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
    const fileId = uploadRes.data.id;
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
exports.onSubmissionCreated = functions
    .region("asia-southeast1")
    .firestore.document("submissions/{submissionId}")
    .onCreate(async (snap) => {
    await snap.ref.update({
        driveStatus: "storage_only",
        driveNote: "File stored in Firebase Storage",
    });
    console.log(`onSubmissionCreated: marked ${snap.id} as storage_only`);
});
//# sourceMappingURL=index.js.map