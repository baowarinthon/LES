import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function uploadFile(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
    task.on(
      "state_changed",
      (snap) => {
        if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      reject,
      async () => {
        try { resolve(await getDownloadURL(task.snapshot.ref)); } catch (err) { reject(err); }
      },
    );
  });
}

export async function uploadQuestThumbnail(
  questId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const compressed = await compressImage(file, 1280, 720, 0.85);
  return uploadFile(`quests/${questId}/thumbnail.jpg`, compressed, onProgress);
}

export async function uploadSubmissionFile(
  questId: string,
  teamId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; path: string }> {
  const compressed = await compressImage(file, 1920, 1080, 0.85);
  const path = `submissions/${questId}/${teamId}/${Date.now()}_${file.name}`;
  const url = await uploadFile(path, compressed, onProgress);
  return { url, path };
}

export async function uploadRewardImage(
  questId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const compressed = await compressImage(file, 800, 800, 0.85);
  return uploadFile(`rewards/${questId}/reward.jpg`, compressed, onProgress);
}

export async function uploadProfileImage(
  uid: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const compressed = await compressImage(file, 400, 400, 0.8);
  return uploadFile(`profiles/${uid}/avatar.jpg`, compressed, onProgress);
}
