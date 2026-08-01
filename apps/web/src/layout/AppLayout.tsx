import {
  CalendarClock,
  CarFront,
  FileBarChart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  UserRound,
  UserRoundCheck,
  UsersRound,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { ActionButton } from "../components/admin-ui";
import { useAuth } from "../features/auth/useAuth";

interface SidebarLink {
  to: string;
  label: string;
  icon: LucideIcon;
}

const operationLinks: SidebarLink[] = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/bookings", label: "الحجوزات", icon: CalendarClock },
  { to: "/customers", label: "العملاء", icon: UserRound },
  { to: "/reports", label: "التقارير", icon: FileBarChart }
];

const fleetLinks: SidebarLink[] = [
  { to: "/vehicles", label: "المركبات", icon: CarFront },
  { to: "/drivers", label: "السائقون", icon: UserRoundCheck }
];

const accountLinks: SidebarLink[] = [{ to: "/change-password", label: "تغيير كلمة المرور", icon: KeyRound }];

const adminLinks: SidebarLink[] = [
  { to: "/staff", label: "إدارة الموظفين", icon: UsersRound },
  { to: "/settings", label: "إعدادات النظام", icon: Settings }
];

interface SidebarItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}

function SidebarItem({ to, label, icon: Icon, onClick }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 focus:ring-gold/25 ${
          isActive
            ? "bg-white/95 text-ink shadow-lg shadow-black/10 before:absolute before:right-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-gold"
            : "text-white/68 hover:bg-white/10 hover:text-white focus:bg-white/10"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
              isActive ? "bg-gold/15 text-gold" : "bg-white/5 text-white/70 group-hover:text-gold"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className="truncate">{label}</span>
          {isActive ? <span className="sr-only">الصفحة الحالية</span> : null}
        </>
      )}
    </NavLink>
  );
}

function SidebarBrand() {
  return (
    <div className="border-b border-white/10 px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 text-base font-black text-gold shadow-lg shadow-black/10">
          أ
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">الأنصاري للسياحة</p>
          <p className="mt-0.5 truncate text-xs font-medium text-white/58">إدارة الأسطول والحجوزات</p>
        </div>
      </div>
    </div>
  );
}

function SidebarProfileCard() {
  const { user } = useAuth();

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur">
      <p className="text-[0.7rem] font-bold text-gold/90">أهلا بك</p>
      <p className="mt-1 truncate text-sm font-bold leading-6 text-white">{user?.fullName}</p>
      <p className="truncate text-xs font-medium text-white/55">
        {user?.role === "ADMIN" ? "مدير النظام" : "موظف"}
      </p>
    </div>
  );
}

function SidebarSection({
  title,
  links,
  onNavigate
}: {
  title: string;
  links: SidebarLink[];
  onNavigate?: () => void;
}) {
  return (
    <section className="space-y-1.5">
      <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-white/38">{title}</p>
      <div className="space-y-1">
        {links.map((item) => (
          <SidebarItem key={item.to} {...item} onClick={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="border-t border-white/10 p-4">
      <button
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-bold text-red-100/90 transition hover:bg-red-500/12 hover:text-red-50 focus:outline-none focus:ring-4 focus:ring-red-300/20"
        onClick={onLogout}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-100">
          <LogOut size={18} aria-hidden="true" />
        </span>
        <span>خروج آمن</span>
      </button>
    </div>
  );
}

function Sidebar({
  onNavigate,
  onLogout
}: {
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[linear-gradient(160deg,#16241f_0%,#18231f_46%,#10262d_100%)] text-white">
      <SidebarBrand />
      <SidebarProfileCard />

      <nav className="sidebar-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3.5">
        <SidebarSection title="التشغيل" links={operationLinks} onNavigate={onNavigate} />
        <SidebarSection title="إدارة الأسطول" links={fleetLinks} onNavigate={onNavigate} />
        {user?.role === "ADMIN" ? (
          <SidebarSection title="الإدارة" links={adminLinks} onNavigate={onNavigate} />
        ) : null}
        <SidebarSection title="الحساب" links={accountLinks} onNavigate={onNavigate} />
      </nav>

      <SidebarFooter onLogout={onLogout} />
    </div>
  );
}

export function AppLayout() {
  const { logout } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const drawer = drawerRef.current;
      if (!drawer) {
        return;
      }

      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    const firstFocusableElement = drawerRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    firstFocusableElement?.focus();
  }, [isDrawerOpen]);

  async function handleLogout(): Promise<void> {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-dvh bg-[linear-gradient(135deg,#fbf7ee_0%,#f4f0e7_48%,#eef5f2_100%)] text-ink">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[19rem] border-l border-ink/10 shadow-2xl shadow-ink/15 lg:block xl:w-80">
        <Sidebar onLogout={() => void handleLogout()} />
      </aside>

      <header className="sticky top-0 z-20 border-b border-olive/15 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gold">الأنصاري للسياحة</p>
            <p className="text-base font-bold text-ink">إدارة الأسطول والحجوزات</p>
          </div>
          <ActionButton
            type="button"
            variant="secondary"
            className="h-11 w-11 px-0"
            aria-label="فتح القائمة"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </ActionButton>
        </div>
      </header>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 h-full w-full bg-ink/55 backdrop-blur-sm"
            aria-label="إغلاق القائمة"
            onClick={() => setIsDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            className="absolute inset-y-0 right-0 w-[min(88vw,20rem)] shadow-2xl shadow-ink/30"
          >
            <div className="absolute left-3 top-3 z-10">
              <ActionButton
                type="button"
                variant="ghost"
                className="h-11 w-11 bg-white/10 px-0 text-white hover:bg-white/15 hover:text-white"
                aria-label="إغلاق القائمة"
                onClick={() => setIsDrawerOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </ActionButton>
            </div>
            <Sidebar onNavigate={() => setIsDrawerOpen(false)} onLogout={() => void handleLogout()} />
          </aside>
        </div>
      ) : null}

      <main className="px-4 py-6 sm:px-6 lg:mr-[19rem] lg:px-8 lg:py-8 xl:mr-80">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
