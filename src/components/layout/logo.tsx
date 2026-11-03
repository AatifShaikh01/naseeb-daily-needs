import Image from "next/image";

/** Codrenix brand icon used in the header and login screen. */
export function Logo({ className = "", height = 40 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/icon-192.png"
      alt="CODRENIX Agency ERP"
      width={height}
      height={height}
      className={`block shrink-0 rounded-xl object-cover ${className}`}
      priority
    />
  );
}
