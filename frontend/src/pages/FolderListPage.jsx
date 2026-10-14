import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createFolder, deleteFolder, listFolders, renameFolder } from "../api";

export default function FolderListPage() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setLoading(true);
    listFolders()
      .then(setFolders)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName("");
    refresh();
  }

  async function handleRename(id) {
    if (!editingName.trim()) return;
    await renameFolder(id, editingName.trim());
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this folder and everything in it?")) return;
    await deleteFolder(id);
    refresh();
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold text-paper">Folders</h1>

      <form onSubmit={handleCreate} className="mt-6 flex gap-2">
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="e.g. CS 2114"
          className="flex-1 rounded-md bg-paper px-4 py-2 font-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marker-coral"
        />
        <button
          type="submit"
          className="rounded-md bg-marker-coral px-4 py-2 font-body font-medium text-paper transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marker-coral"
        >
          Create folder
        </button>
      </form>

      {error && <p className="mt-4 text-rust">{error}</p>}
      {loading && <p className="mt-6 text-paper/70">Loading…</p>}

      {!loading && folders.length === 0 && (
        <p className="mt-10 text-paper/70">
          Create your first folder to get started.
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="rounded-lg border-t-4 border-chalk-gold bg-paper p-5 text-ink shadow-md"
          >
            {editingId === folder.id ? (
              <div className="flex gap-2">
                <input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1 rounded-md border border-ink/20 px-2 py-1 font-body text-ink"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(folder.id)}
                  className="rounded-md bg-sage px-2 py-1 text-sm font-medium text-ink"
                >
                  Save
                </button>
              </div>
            ) : (
              <Link to={`/folders/${folder.id}`}>
                <h2 className="font-heading text-xl font-semibold">{folder.name}</h2>
              </Link>
            )}

            <p className="mt-2 font-body text-sm text-ink/60">
              {folder.slideshow_count} slideshow
              {folder.slideshow_count === 1 ? "" : "s"}
            </p>

            {editingId !== folder.id && (
              <div className="mt-4 flex gap-3 text-sm font-body">
                <button
                  onClick={() => {
                    setEditingId(folder.id);
                    setEditingName(folder.name);
                  }}
                  className="text-ink/60 hover:text-ink"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(folder.id)}
                  className="text-rust hover:brightness-90"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
