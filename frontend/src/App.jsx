import { Link, Route, Routes } from "react-router-dom";
import FolderListPage from "./pages/FolderListPage";
import SlideshowListPage from "./pages/SlideshowListPage";
import SlideViewerPage from "./pages/SlideViewerPage";

function App() {
  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="h-1 w-full bg-marker-coral/40" />

      <header className="border-b border-paper/10 px-6 py-4">
        <Link to="/" className="font-heading text-2xl font-semibold text-paper">
          AI Slide Tutor
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Routes>
          <Route path="/" element={<FolderListPage />} />
          <Route path="/folders/:folderId" element={<SlideshowListPage />} />
          <Route path="/slideshows/:slideshowId" element={<SlideViewerPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
