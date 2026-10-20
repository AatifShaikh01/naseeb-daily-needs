import Image from "next/image";

/**
 * Brand logo — icon-*.png (asli Naseeb logo) header/login/favicon me.
 * (image.png bada banner hai — sirf PDF bills/reports me use hota hai.)
 */
export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/icon-192.png"
      alt="Naseeb Daily Needs & Agencies"
      width={height}
      height={height}
      className={`block shrink-0 rounded-xl object-cover ${className}`}
      priority
    />
  );
}
