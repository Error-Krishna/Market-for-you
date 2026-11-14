export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
];

export function resolveMimeType(file: File): string {
  if (file.type && ACCEPTED_MEDIA_TYPES.includes(file.type.toLowerCase())) {
    return file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type.toLowerCase();
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "mp4") return "video/mp4";
  return file.type || "";
}

export function readFileAsDataUrl(file: File): Promise<string> {
  const resolvedMime = resolveMimeType(file);
  if (!ACCEPTED_MEDIA_TYPES.includes(resolvedMime) && !ACCEPTED_MEDIA_TYPES.includes(file.type)) {
    return Promise.reject(new Error("Unsupported file type. Use JPEG, PNG, WebP, GIF, or MP4."));
  }
  if (file.size === 0 || file.size > MAX_MEDIA_BYTES) {
    return Promise.reject(new Error("File must be between 1 byte and 10 MB."));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file contents."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read selected file."));
    reader.readAsDataURL(file);
  });
}
