"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/studio/sessions", label: "Sessions" },
  { href: "/my-music", label: "Studio" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
    setMenuOpen(false);
  };

  const navLinks = publicLinks;

  return (
    <header className="border-b border-white/[0.07] sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a0a]/85">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between relative">
        <Link href="/" className="text-sm font-semibold tracking-widest uppercase text-white/90 hover:text-white transition-colors">
          Soundcritic
        </Link>

        {/* Current page name (mobile, centered) */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm tracking-wide text-white/70 hover:text-white transition-colors"
        >
          {navLinks.find((l) => pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/")))?.label ?? "Menu"}
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm tracking-wide transition-colors ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-white"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/search" className="text-white/40 hover:text-white/70 transition-colors" aria-label="Search">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </Link>
          {user ? (
            <>
              <Link href={`/artists/${user.username}`} className="flex items-center gap-2 group" onClick={() => setMenuOpen(false)}>
                {user.avatarUrl ? (
                  <div className="relative w-7 h-7 rounded-full overflow-hidden">
                    <Image src={user.avatarUrl} alt={user.displayName} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                    {user.displayName[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-white/60 group-hover:text-white/90 transition-colors hidden md:block">
                  {user.displayName}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-white/40 hover:text-white/70 transition-colors hidden md:block"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm border border-white/20 hover:border-white/50 px-3 py-1.5 rounded transition-colors text-white/70 hover:text-white"
              >
                Sign up
              </Link>
            </div>
          )}

        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-full z-50">
        <div className="min-w-[120px] bg-[#0a0a0a]/60 backdrop-blur-xl px-4 pt-2 pb-3 flex flex-col items-center gap-1 rounded-b-lg animate-[listReveal_0.2s_ease_both]">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`py-3 text-sm tracking-wide transition-colors border-b border-white/5 last:border-0 ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "text-white"
                  : "text-white/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-3">
            {user ? (
              <button onClick={handleLogout} className="text-sm text-white/40 text-left">
                Logout
              </button>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-sm text-white/50">Login</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="text-sm border border-white/20 px-3 py-1.5 rounded text-white/70 text-center">Sign up</Link>
              </>
            )}
          </div>
        </div>
        </div>
      )}
    </header>
  );
}
