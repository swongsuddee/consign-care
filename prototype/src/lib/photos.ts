"use client";

import { originals } from "./extract";
import { uid } from "./ops";
import type { CasePhoto } from "./types";

/** Downscale an image file to a small JPEG data URL (keeps localStorage small). */
export function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 640 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Photos taken with the camera in this session, by photo id: offered for saving to the phone's gallery. */
export const captured = new Set<string>();

/** Turn picked or captured files into case photos; the full-resolution file is kept in memory for reading. */
export async function toCasePhotos(files: File[], fromCamera = false): Promise<CasePhoto[]> {
  const urls = await Promise.all(files.map(readPhoto));
  return urls.map((url, i) => {
    const id = uid("ph");
    originals.set(id, files[i]);
    if (fromCamera) captured.add(id);
    return { id, url };
  });
}

/**
 * Save a photo to the phone's gallery. A web page cannot write to the gallery itself, so this opens the share sheet
 * (iOS: "Save Image", Android: the gallery or Files) and falls back to downloading the file.
 */
export async function saveToGallery(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name || `usage-${Date.now()}.jpg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}
