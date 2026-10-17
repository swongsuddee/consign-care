import {
  Activity,
  BarChart3,
  Boxes,
  CheckSquare,
  ClipboardList,
  Database,
  FileText,
  FolderKanban,
  HardDrive,
  type LucideIcon,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
} from "lucide-react";

export interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
  badge?: "approvals" | "pos" | "billing";
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "a.navg.overview",
    items: [
      { href: "/admin", key: "a.nav.dashboard", icon: BarChart3 },
      { href: "/admin/approvals", key: "a.nav.approvals", icon: CheckSquare, badge: "approvals" },
      { href: "/admin/activity", key: "a.nav.activity", icon: Activity },
    ],
  },
  {
    group: "a.navg.sales",
    items: [
      { href: "/admin/cases", key: "a.nav.cases", icon: FolderKanban },
      { href: "/admin/usage/new", key: "a.nav.newUsage", icon: PlusCircle },
      { href: "/admin/quotations", key: "a.nav.quotations", icon: FileText },
      { href: "/admin/pos", key: "a.nav.pos", icon: ClipboardList, badge: "pos" },
      { href: "/admin/billing", key: "a.nav.billing", icon: Receipt, badge: "billing" },
    ],
  },
  {
    group: "a.navg.inventory",
    items: [
      { href: "/admin/inventory", key: "a.nav.inventory", icon: Boxes },
      { href: "/admin/requisitions", key: "a.nav.requisitions", icon: Truck },
      { href: "/admin/purchase-requests", key: "a.nav.prs", icon: ShoppingCart },
    ],
  },
  {
    group: "a.navg.admin",
    items: [
      { href: "/admin/master", key: "a.nav.master", icon: Database },
      { href: "/admin/database", key: "a.nav.database", icon: HardDrive },
      { href: "/admin/settings", key: "a.nav.settings", icon: Settings },
    ],
  },
];

export function activeNav(path: string): NavItem | undefined {
  const all = NAV.flatMap((g) => g.items);
  if (path === "/admin") return all[0];
  return all
    .filter((i) => i.href !== "/admin" && (path === i.href || path.startsWith(i.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
