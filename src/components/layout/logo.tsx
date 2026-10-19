import Image from "next/image";

/**
 * Brand logo — public/image.png used everywhere (header, bills, reports).
 */
export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/image.png"
      alt="Naseeb Daily Needs & Agencies"
      width={height}
      height={height}
      className={`block shrink-0 rounded-lg object-contain ${className}`}
      priority
      unoptimized
    />
  );
}
