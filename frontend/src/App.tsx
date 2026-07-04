import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import UploadPage from './pages/UploadPage';
import VideoListPage from './pages/VideoListPage';
import VideoPlayerPage from './pages/VideoPlayerPage';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4zm0 2.18l6 3v5.82c0 4.28-2.87 8.28-6 9.47-3.13-1.19-6-5.19-6-9.47V7.18l6-3z"/>
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight">Falcon</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `btn-ghost ${isActive ? '!text-white !bg-white/[0.08]' : ''}`
              }
            >
              Library
            </NavLink>
            <NavLink
              to="/upload"
              className={({ isActive }) =>
                isActive ? 'btn-primary' : 'btn-primary ml-2'
              }
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">{children}</main>

      <footer className="border-t border-white/[0.04] py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-zinc-600">
          <span>Falcon · Distributed Video Pipeline</span>
          <span>HLS Adaptive Streaming</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<VideoListPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/videos/:id" element={<VideoPlayerPage />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
