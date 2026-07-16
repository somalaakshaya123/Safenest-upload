import Image from "next/image";
import Link from "next/link";

export default function Logo({ size = 40, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.png" alt="SafeNest AI" width={size} height={size} className="rounded-md" priority />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-nest-700">
          SafeNest <span className="text-nestwarm-500">AI</span>
        </span>
      )}
    </Link>
  );
}
