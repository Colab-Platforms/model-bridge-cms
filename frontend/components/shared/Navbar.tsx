import Link from "next/link";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white text-black flex items-center justify-center font-bold">
            O
          </div>
          <span className="font-semibold text-white text-lg">
            ModelBridge CMS
          </span>
        </Link>

        {/* Search */}
        <div className="hidden lg:flex flex-1 max-w-sm mx-10">
          <input
            type="text"
            placeholder="Search"
            className="w-full bg-[#111111] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
          />
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
          <Link href="/models" className="hover:text-white transition">
            Models
          </Link>
          <Link href="/fusion" className="hover:text-white transition">
            Fusion
          </Link>
          <Link href="/chat" className="hover:text-white transition">
            Chat
          </Link>
          <Link href="/rankings" className="hover:text-white transition">
            Rankings
          </Link>
          <Link href="/apps" className="hover:text-white transition">
            Apps
          </Link>
          <Link href="/docs" className="hover:text-white transition">
            Docs
          </Link>
        </nav>

    
      </div>
    </header>
  );
}