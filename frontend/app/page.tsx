import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="px-8 py-5 flex items-center justify-between border-b border-zinc-800">
        <span className="text-lg font-semibold tracking-tight">Marketing Agent</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-white text-zinc-900 px-4 py-2 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
            AI-powered content,<br />
            <span className="text-zinc-400">built around your brand</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
            Generate, review, and publish social media content that matches your strategy.
            From brand setup to daily review — all in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="bg-white text-zinc-900 px-6 py-3 rounded-lg font-medium hover:bg-zinc-100 transition-colors"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="text-zinc-400 hover:text-white px-6 py-3 transition-colors"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-8 py-5 border-t border-zinc-800 text-center text-sm text-zinc-600">
        © {new Date().getFullYear()} Marketing Agent
      </footer>
    </div>
  );
}
