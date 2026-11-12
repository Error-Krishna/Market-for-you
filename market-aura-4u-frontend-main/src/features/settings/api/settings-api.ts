import { apiClient } from "@/lib/api/client";
import type { SettingsData, BrandSettings, NotificationSettings } from "../types/settings.types";

export async function getSettings(): Promise<SettingsData> {
  const res = await apiClient.get<{ success: boolean; data: SettingsData }>("/v1/settings");
  return res.data.data;
}

export async function updateProfile(data: {
  name?: string;
  appearance?: { theme: string };
  notifications?: NotificationSettings;
}): Promise<void> {
  await apiClient.put("/v1/settings/profile", data);
}

export async function updateBrand(data: Partial<BrandSettings>): Promise<void> {
  await apiClient.put("/v1/settings/brand", data);
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiClient.post("/v1/settings/password/change", data);
}
