import {
  Clock,
  FileText,
  Home,
  Landmark,
  MoreHorizontal,
  Package,
  PackagePlus,
  Receipt,
  Settings,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Bottom nav ke liye chhota label (mobile) */
  shortLabel?: string;
};

/**
 * Mobile bottom bar — sirf 5 fixed items.
 */
export const NAV_ITEMS: NavItem[] = [
  { title: "Home", href: "/", icon: Home },
  { title: "Stock", href: "/stock", icon: Package, shortLabel: "Stock" },
  { title: "Sale", href: "/sale", icon: ShoppingCart, shortLabel: "Sale" },
  { title: "Pending", href: "/pending", icon: Clock, shortLabel: "Pending" },
  { title: "More", href: "/more", icon: MoreHorizontal, shortLabel: "More" },
];

/**
 * Desktop sidebar — bottom bar items + Products + Settings.
 */
export const SIDEBAR_ITEMS: NavItem[] = [
  NAV_ITEMS[0],
  { title: "Stock In", href: "/stock-in", icon: PackagePlus },
  NAV_ITEMS[1],
  NAV_ITEMS[2],
  { title: "Sales", href: "/sales", icon: Receipt },
  { title: "Purchases", href: "/purchases", icon: Landmark },
  { title: "Closing", href: "/closing", icon: Wallet },
  { title: "Products", href: "/products", icon: Package },
  { title: "Reports", href: "/reports", icon: FileText },
  NAV_ITEMS[3],
  { title: "Settings", href: "/settings", icon: Settings },
  NAV_ITEMS[4],
];

export const APP_NAME = "NASEEB DAILY NEEDS & AGENCIES";
export const APP_SHORT_NAME = "NASEEB";
