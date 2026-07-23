import {
  CalendarClock,
  CarFront,
  FileBarChart,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
  UserRound,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/useAuth";

const baseLinks = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/bookings", label: "الحجوزات", icon: CalendarClock },
  { to: "/customers", label: "العملاء", icon: UserRound },
  { to: "/vehicles", label: "المركبات", icon: CarFront },
  { to: "/drivers", label: "السائقون", icon: UserRoundCheck },
  { to: "/reports", label: "التقارير", icon: FileBarChart },
  { to: "/change-password", label: "تغيير كلمة المرور", icon: KeyRound }
];

const adminLinks = [
  { to: "/staff", label: "إدارة الموظفين", icon: UsersRound },
  { to: "/settings", label: "إعدادات النظام", icon: Settings }
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.role === "ADMIN" ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="border-b border-olive/20 bg-white px-4 py-3 lg:fixed lg:inset-y-0 lg:right-0 lg:w-64 lg:border-b-0 lg:border-l">
        <div className="mb-4 lg:mb-8">
          <p className="text-lg font-bold">الأنصاري للسياحة</p>
          <p className="text-sm text-olive">{user?.fullName}</p>
        </div>

        <nav className="flex gap-2 overflow-x-auto lg:flex-col">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-ink text-white" : "text-olive hover:bg-olive/10 hover:text-ink"
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
          <button
            className="flex min-w-max items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={18} aria-hidden="true" />
            خروج آمن
          </button>
        </nav>
      </aside>

      <main className="p-4 lg:mr-64 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
