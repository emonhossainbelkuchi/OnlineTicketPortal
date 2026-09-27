import { useState } from "react"
import { Menu, LogOut, Bell, Search } from "lucide-react"
import { useAuth } from "@/lib/auth"

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button className="btn-ghost !px-2 md:hidden" onClick={onToggleSidebar}><Menu className="h-5 w-5" /></button>
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input className="input w-64 pl-8" placeholder="Quick search..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-ghost !px-2"><Bell className="h-5 w-5" /></button>
        <div className="relative">
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100" onClick={() => setMenuOpen((o) => !o)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {(user?.userName ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="hidden text-sm font-medium sm:block">{user?.userName}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <div className="px-3 py-2 text-xs text-gray-500">Roles: {user?.roles.join(", ") || "—"}</div>
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50" onClick={logout}>
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
