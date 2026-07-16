import Link from "next/link";
import Logo from "./Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-nest-100/80 bg-nest-50/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink/70 md:flex">
          <a href="#features" className="hover:text-nest-600">Features</a>
          <a href="#languages" className="hover:text-nest-600">Languages</a>
          <a href="#trust" className="hover:text-nest-600">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">Log in</Link>
          <Link href="/signup" className="btn-primary !px-4 !py-2 text-sm">Get started</Link>
        </div>
      </div>
    </header>
  );
}
