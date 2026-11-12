export type MediaType = "image" | "video";

export interface MediaAsset {
  _id?: string;
  id?: string;
  title: string;
  altText?: string;
  tags: string[];
  mediaType: MediaType;
  sourceType: "upload" | "url";
  url: string;
  mimeType: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMediaPayload {
  title: string;
  altText?: string;
  tags?: string[];
  url?: string;
  dataBase64?: string;
  mimeType?: string;
  mediaType?: MediaType;
}

export interface UpdateMediaPayload {
  title?: string;
  altText?: string;
  tags?: string[];
  url?: string;
  dataBase64?: string;
  mimeType?: string;
  mediaType?: MediaType;
}

export function getMediaAssetId(asset: MediaAsset): string {
  return asset._id || asset.id || "";
}
