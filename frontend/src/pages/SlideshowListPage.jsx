import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteSlideshow, getFolder, listSlideshows, uploadSlideshow } from "../api";

export default function SlideshowListPage() {
  const { folderId } = useParams();
  const [folder, setFolder] = useState(null);
  const [slideshows, setSlideshows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState(null);

  useEffect(() => {
    refresh();
  }, [folderId]);

  function refresh() {
    setLoading(true);
    Promise.all([getFolder(folderId), listSlideshows(folderId)])
      .then(([f, s]) => {
        setFolder(f);
        setSlideshows(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      await uploadSlideshow(folderId, { title, files: Array.from(files) });
      setTitle("");
      setFiles(null);
      e.target.reset();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this slideshow?")) return;
    await deleteSlideshow(id);
    refresh();
  }

  return (
    <div>
      <Link to="/" className="font-body text-sm text-paper/60 hover:text-paper">
        ← All folders
      </Link>

      <h1 className="mt-2 font-heading text-3xl font-semibold text-paper">
        {folder ? folder.name : "…"}
      </h1>

      <form
        onSubmit={handleUpload}
        className="mt-6 flex flex-col gap-3 rounded-lg bg-paper p-5 text-ink sm:flex-row sm:items-center"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="rounded-md border border-ink/20 px-3 py-2 font-body sm:w-56"
        />
        <label className="group flex cursor-pointer items-center gap-2 rounded-md border-2 border-dashed border-ink/25 bg-ink/[0.03] px-4 py-2 font-body text-sm text-ink/70 transition-all duration-150 hover:border-chalk-gold hover:bg-chalk-gold/10 hover:text-ink active:scale-95">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5"
          >
            <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <span>
            {files && files.length > 0
              ? `${files.length} file${files.length === 1 ? "" : "s"} selected`
              : "Choose file(s)"}
          </span>
          <input
            type="file"
            multiple
            accept=".pptx,.pdf,image/*"
            onChange={(e) => setFiles(e.target.files)}
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="rounded-md bg-marker-coral px-4 py-2 font-body font-medium text-paper transition-colors hover:brightness-110 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload slideshow"}
        </button>
      </form>
      <p className="mt-1 font-body text-xs text-paper/50">
        One .pptx or .pdf file, or one or more image files.
      </p>

      {error && <p className="mt-4 text-rust">{error}</p>}
      {loading && <p className="mt-6 text-paper/70">Loading…</p>}

      {!loading && slideshows.length === 0 && (
        <p className="mt-10 text-paper/70">
          Upload your first slideshow to get started.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {slideshows.map((s) => (
          <div
            key={s.id}
            className="relative rounded-lg bg-paper p-5 text-ink shadow-[0_4px_0_0_rgba(22,36,31,0.15)]"
          >
            <Link to={`/slideshows/${s.id}`}>
              <h2 className="font-heading text-lg font-semibold">{s.title}</h2>
            </Link>
            <p className="mt-1 font-body text-sm text-ink/60">
              {s.slide_count} slide{s.slide_count === 1 ? "" : "s"} · {s.source_type}
            </p>
            <p className="mt-1 font-body text-xs text-ink/40">
              {new Date(s.upload_date).toLocaleDateString()}
            </p>
            <button
              onClick={() => handleDelete(s.id)}
              className="mt-3 font-body text-sm text-rust hover:brightness-90"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
