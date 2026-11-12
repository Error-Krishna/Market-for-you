import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit2,
  Film,
  Image as ImageIcon,
  Plus,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  getMediaAssetId,
  readFileAsDataUrl,
  useCreateMedia,
  useDeleteMedia,
  useMediaList,
  useUpdateMedia,
  type MediaAsset,
  type MediaType,
} from "@/features/media";
import { extractApiErrorMessage } from "@/lib/api/error-message";

export default function MediaLibraryPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<MediaType | "">("");

  const {
    data: assets = [],
    isLoading,
    isError,
    error,
  } = useMediaList({
    q: search,
    mediaType: filterType,
  });
  const createMedia = useCreateMedia();
  const updateMedia = useUpdateMedia();
  const deleteMedia = useDeleteMedia();

  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [dataBase64, setDataBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | undefined>(undefined);
  const [fileNameLabel, setFileNameLabel] = useState("");

  const resetForm = () => {
    setEditingAsset(null);
    setTitle("");
    setAltText("");
    setTagsInput("");
    setExternalUrl("");
    setDataBase64(null);
    setMimeType(undefined);
    setFileNameLabel("");
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setTitle(asset.title);
    setAltText(asset.altText || "");
    setTagsInput(asset.tags.join(", "));
    setExternalUrl(asset.sourceType === "url" ? asset.url : "");
    setDataBase64(null);
    setMimeType(undefined);
    setFileNameLabel("");
    setShowForm(true);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setBanner(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const encoded = await readFileAsDataUrl(file);
      setDataBase64(encoded);
      setMimeType(file.type);
      setFileNameLabel(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      if (!title.trim()) {
        setTitle(file.name.replace(/\.[^.]+$/, ""));
      }
    } catch (err) {
      setBanner({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to read file.",
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingAsset) {
        const id = getMediaAssetId(editingAsset);
        await updateMedia.mutateAsync({
          id,
          payload: {
            title: title.trim(),
            altText: altText.trim(),
            tags,
            ...(dataBase64 ? { dataBase64, mimeType } : {}),
            ...(!dataBase64 && externalUrl.trim() ? { url: externalUrl.trim() } : {}),
          },
        });
        setBanner({ type: "success", text: "Media asset updated." });
      } else {
        await createMedia.mutateAsync({
          title: title.trim(),
          altText: altText.trim(),
          tags,
          ...(dataBase64 ? { dataBase64, mimeType } : { url: externalUrl.trim() }),
        });
        setBanner({ type: "success", text: "Media asset added to library." });
      }
      resetForm();
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Could not save media asset."),
      });
    }
  };

  const handleDelete = async (id: string) => {
    setBanner(null);
    try {
      await deleteMedia.mutateAsync(id);
      setConfirmDeleteId(null);
      setBanner({ type: "success", text: "Media asset deleted." });
    } catch (err) {
      setBanner({
        type: "error",
        text: extractApiErrorMessage(err, "Failed to delete media asset."),
      });
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setBanner({ type: "success", text: "Media URL copied to clipboard." });
    } catch {
      setBanner({ type: "error", text: "Could not copy URL automatically." });
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="mt-1 text-text-secondary">
            Upload, organize, edit, and attach images or MP4 videos to any AI-generated or manual
            broadcast post.
          </p>
        </div>

        <Button
          leftIcon={<Plus className="size-4" />}
          onClick={() => (showForm ? resetForm() : openCreateForm())}
        >
          {showForm ? "Close Form" : "Add Media"}
        </Button>
      </div>

      {banner && (
        <div
          role="alert"
          className={
            banner.type === "success"
              ? "flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500"
              : "flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
          }
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span className="flex-1">{banner.text}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-lg font-semibold">
              {editingAsset ? `Edit Media: ${editingAsset.title}` : "Upload or Link New Media"}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="media-title">Title</Label>
                <Input
                  id="media-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Summer Campaign Banner"
                />
              </div>
              <div>
                <Label htmlFor="media-tags">Tags (comma-separated)</Label>
                <Input
                  id="media-tags"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="launch, promo, carousel"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="media-alt">Alt Text / Caption Accessibility Description</Label>
              <Input
                id="media-alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Clean flat-lay photo of our product box"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="media-file-upload">
                  {editingAsset
                    ? "Replace with File Upload (optional)"
                    : "Upload File (JPEG, PNG, WebP, GIF, MP4 up to 10 MB)"}
                </Label>
                <label
                  htmlFor="media-file-upload"
                  className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-surface-bright/40 px-4 py-3 text-sm text-text-secondary hover:border-primary"
                >
                  <UploadCloud className="size-5 text-primary" />
                  <span className="truncate">
                    {fileNameLabel || "Choose an image or MP4 video file..."}
                  </span>
                  <input
                    id="media-file-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <Label htmlFor="media-external-url">Or Public HTTPS Media URL</Label>
                <Input
                  id="media-external-url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://cdn.example.com/campaign.jpg"
                  disabled={Boolean(dataBase64)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" isLoading={createMedia.isPending || updateMedia.isPending}>
                {editingAsset ? "Save Changes" : "Save Media Asset"}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            aria-label="Search media assets"
            leftIcon={<Search className="size-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, alt text, or tag..."
          />
        </div>

        <div className="flex gap-2">
          {(
            [
              { value: "", label: "All" },
              { value: "image", label: "Images" },
              { value: "video", label: "Videos" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.label}
              size="sm"
              variant={filterType === tab.value ? "primary" : "outline"}
              onClick={() => setFilterType(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {extractApiErrorMessage(error, "Failed to load media library.")}
        </div>
      )}

      {isLoading ? (
        <p className="py-12 text-center text-sm text-text-secondary">Loading media assets...</p>
      ) : assets.length === 0 ? (
        <Card className="py-12 text-center space-y-3">
          <ImageIcon className="mx-auto size-10 text-text-muted" />
          <p className="text-base font-medium">No media assets yet</p>
          <p className="text-sm text-text-secondary">
            Upload your brand visuals or paste public CDN links to attach them to posts.
          </p>
          <Button size="sm" onClick={openCreateForm}>
            Add Your First Media Asset
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const id = getMediaAssetId(asset);
            return (
              <Card key={id} className="flex flex-col justify-between overflow-hidden p-0">
                <div>
                  <div className="aspect-video w-full bg-surface-bright overflow-hidden flex items-center justify-center">
                    {asset.mediaType === "video" ? (
                      <video src={asset.url} controls className="h-full w-full object-cover" />
                    ) : (
                      <img
                        src={asset.url}
                        alt={asset.altText || asset.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-1">{asset.title}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-bright px-2 py-0.5 text-[11px] text-text-secondary">
                        {asset.mediaType === "video" ? (
                          <Film className="size-3" />
                        ) : (
                          <ImageIcon className="size-3" />
                        )}
                        {asset.mediaType}
                      </span>
                    </div>

                    {asset.altText && (
                      <p className="text-xs text-text-secondary line-clamp-2">{asset.altText}</p>
                    )}

                    {asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-3">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Copy URL for ${asset.title}`}
                      onClick={() => handleCopyUrl(asset.url)}
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Edit ${asset.title}`}
                      onClick={() => openEditForm(asset)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                  </div>

                  {confirmDeleteId === id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(id)}
                        isLoading={deleteMedia.isPending}
                      >
                        Confirm
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${asset.title}`}
                      onClick={() => setConfirmDeleteId(id)}
                    >
                      <Trash2 className="size-4 text-danger" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
