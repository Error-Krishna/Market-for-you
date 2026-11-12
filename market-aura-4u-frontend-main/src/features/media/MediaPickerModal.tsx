import { useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Film, Image as ImageIcon, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { extractApiErrorMessage } from "@/lib/api/error-message";
import { readFileAsDataUrl } from "./file-reader";
import { getMediaAssetId, type MediaAsset } from "./media.types";
import { useCreateMedia, useMediaList } from "./useMedia";

interface MediaPickerModalProps {
  isOpen: boolean;
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (selectedAssets: MediaAsset[]) => void;
  maxSelection?: number;
}

export function MediaPickerModal(props: MediaPickerModalProps) {
  if (!props.isOpen) return null;
  return <MediaPickerDialog {...props} />;
}

function MediaPickerDialog({
  selectedIds,
  onClose,
  onConfirm,
  maxSelection = 10,
}: MediaPickerModalProps) {
  const [search, setSearch] = useState("");
  const [draftIds, setDraftIds] = useState<string[]>(() => selectedIds);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useMediaList({ q: search });
  const createMedia = useCreateMedia();

  const toggleId = (id: string) => {
    setDraftIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxSelection) {
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const encoded = await readFileAsDataUrl(file);
      setDataUrl(encoded);
      setMimeType(file.type);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not read file.");
    }
  };

  const handleQuickCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      const created = await createMedia.mutateAsync({
        title: title.trim(),
        ...(dataUrl ? { dataBase64: dataUrl, mimeType } : { url: externalUrl.trim() }),
      });
      const newId = getMediaAssetId(created);
      if (newId) {
        setDraftIds((prev) => [...prev.filter((id) => id !== newId), newId]);
      }
      setTitle("");
      setExternalUrl("");
      setDataUrl(null);
      setMimeType(undefined);
      setShowQuickAdd(false);
    } catch (err) {
      setLocalError(extractApiErrorMessage(err, "Could not add media asset."));
    }
  };

  const handleConfirm = () => {
    const selectedAssets = assets.filter((asset) => draftIds.includes(getMediaAssetId(asset)));
    onConfirm(selectedAssets);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select media from library"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Attach Media</h2>
            <p className="text-xs text-text-secondary">
              Choose up to {maxSelection} images or videos from your Media Library or upload one
              now.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close media picker"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-border/40 px-5 py-3">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search media by title or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Plus className="size-4" />}
            onClick={() => setShowQuickAdd((v) => !v)}
          >
            {showQuickAdd ? "Back to Library" : "Upload / Add URL"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {showQuickAdd ? (
            <form onSubmit={handleQuickCreate} className="space-y-4">
              {localError && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {localError}
                </p>
              )}

              <div>
                <Label htmlFor="quick-media-title">Title</Label>
                <Input
                  id="quick-media-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Product hero image"
                />
              </div>

              <div>
                <Label htmlFor="quick-media-file">Upload File (JPEG, PNG, WebP, GIF, MP4)</Label>
                <input
                  id="quick-media-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                  onChange={handleFileChange}
                  className="mt-1 block w-full text-sm text-text-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-primary/15 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
                />
              </div>

              {!dataUrl && (
                <div>
                  <Label htmlFor="quick-media-url">Or Public Media URL (HTTPS)</Label>
                  <Input
                    id="quick-media-url"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://cdn.example.com/banner.jpg"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={createMedia.isPending}>
                  Save &amp; Select
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowQuickAdd(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : isLoading ? (
            <p className="py-12 text-center text-sm text-text-secondary">Loading media...</p>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-secondary">
              No media found. Click &ldquo;Upload / Add URL&rdquo; to add your first visual asset.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {assets.map((asset) => {
                const id = getMediaAssetId(asset);
                const selected = draftIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleId(id)}
                    className={`group relative overflow-hidden rounded-xl border text-left transition ${
                      selected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border/50 hover:border-border"
                    }`}
                  >
                    <div className="aspect-video w-full bg-surface-bright overflow-hidden flex items-center justify-center">
                      {asset.mediaType === "video" ? (
                        <Film className="size-8 text-text-muted" />
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.altText || asset.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium">{asset.title}</p>
                      <p className="flex items-center gap-1 text-[11px] text-text-muted">
                        {asset.mediaType === "video" ? (
                          <Film className="size-3" />
                        ) : (
                          <ImageIcon className="size-3" />
                        )}
                        {asset.mediaType}
                      </p>
                    </div>
                    {selected && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-white shadow">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          <span className="text-xs text-text-secondary">{draftIds.length} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              Attach Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
