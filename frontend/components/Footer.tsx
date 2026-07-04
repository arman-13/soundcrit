export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-32">
      <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start gap-6">
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase text-white/90">Soundcritic</p>
          <p className="text-sm text-white/40 mt-1">Where music meets critique.</p>
          <a href="/about" className="text-xs text-white/25 hover:text-white/50 transition-colors mt-2 inline-block">Made by ↗</a>
        </div>
        <div className="text-sm text-white/40 space-y-1">
          <p>studio@soundcrit.com</p>
          <p>© {new Date().getFullYear()} Soundcritic. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
