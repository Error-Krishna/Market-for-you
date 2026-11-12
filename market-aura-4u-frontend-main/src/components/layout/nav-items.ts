import {
  CalendarClock,
  CreditCard,
  FileText,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";

export const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/content/create", label: "Create & Publish", icon: FileText },
  { to: "/posts/scheduled", label: "Schedule Queue", icon: CalendarClock },
  { to: "/media", label: "Media Library", icon: ImageIcon },
  { to: "/content/history", label: "History", icon: History },
  { to: "/social-accounts", label: "Connected Platforms", icon: Users },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
];
