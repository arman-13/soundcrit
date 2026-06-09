"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navLinks = user
    ? [...publicLinks, { href: "/my-music", label: "My Music" }]
    : publicLinks;

  return (
    <header className="border-b border-white/10 sticky top-0 z-40 backdrop-blur-md bg-[#0a0a0a]/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-widest uppercase text-white/90 hover:text-white transition-colors">
          Collective
        </Link>

        <nav className="flex items-center gap-8">
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
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 group">
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
                className="text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/50 hover:text-white/80 transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm border border-white/20 hover:border-white/50 px-3 py-1.5 rounded transition-colors text-white/70 hover:text-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
