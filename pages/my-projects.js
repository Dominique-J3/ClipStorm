
// /pages/my-projects.js
// ClipStorm My Projects Page

import { useEffect, useState } from 'react';
import { useUser, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export default function MyProjects() {
  const { user } = useUser();
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (!user) return;
    const fetchClips = async () => {
      setLoading(true);
      const res = await fetch(`/api/my-projects?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setClips(data.clips);
      else setError(data.error);
      setLoading(false);
    };
    fetchClips();

    const saved = localStorage.getItem('theme') || 'dark';
    setTheme(saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, [user]);

  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(window.location.origin + url);
    alert("Link copied to clipboard!");
  };

  const handleDelete = async (url) => {
    if (!user) return;
    const res = await fetch('/api/delete-clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, url })
    });
    if (res.ok) {
      setClips(clips.filter(c => c.url !== url));
    } else {
      alert('Failed to delete clip');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white dark:bg-gray-950 dark:text-white text-black p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">📁 My ClipStorm Projects</h1>
        <Button onClick={toggleTheme}>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</Button>
      </div>

      <SignedOut>
        <p className="text-center text-gray-300 mb-4">Please sign in to view your clips.</p>
        <div className="flex justify-center">
          <SignInButton mode="modal">
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        {loading && <p className="text-gray-400 text-center">Loading clips...</p>}
        {error && <p className="text-red-500 text-center">{error}</p>}

        {clips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {clips.map((clip, idx) => (
              <div key={idx} className="bg-gray-800 p-4 rounded-xl shadow">
                <video src={clip.url} controls className="rounded w-full mb-2" />
                <p className="text-sm text-gray-200 italic mb-2">{clip.caption}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <a href={clip.url} download className="text-blue-400 underline">Download</a>
                  <button onClick={() => handleCopyLink(clip.url)} className="text-green-400 underline">Copy Link</button>
                  <button onClick={() => handleDelete(clip.url)} className="text-red-400 underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && <p className="text-center text-gray-400">No clips found. Upload a video to get started.</p>
        )}
      </SignedIn>
    </main>
  );
}
