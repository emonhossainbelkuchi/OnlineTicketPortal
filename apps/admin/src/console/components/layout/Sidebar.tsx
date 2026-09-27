import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users2 } from "lucide-react"
import { NAV_GROUPS, RESOURCES } from "@/config/resources.generated"

export default function Sidebar({ open }: { open: boolean }) {
  return (
    <aside className={`${open ? "block" : "hidden"} md:block w-64 shrink-0 border-r border-gray-200 bg-white`}>
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4 font-bold text-brand-700">
        <LayoutDashboard className="h-5 w-5" /> Management Console
      </div>
      <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto p-3 text-sm">
        {/* Plain <a> = full page load back to the main admin app (separate stylesheet). */}
        <a href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2 border border-gray-200 text-gray-700 hover:bg-gray-100">
          <LayoutDashboard className="h-4 w-4" /> Back to Admin Home
        </a>
        <NavLink to="/admin" end className={({isActive}) => `flex items-center gap-2 rounded-lg px-3 py-2 mb-1 ${isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </NavLink>
        <NavLink to="/admin/users" className={({isActive}) => `flex items-center gap-2 rounded-lg px-3 py-2 mb-1 ${isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-100"}`}>
          <Users2 className="h-4 w-4" /> Staff & Roles
        </NavLink>
        {NAV_GROUPS.filter(g => g.title !== "Dashboard").map((group) => (
          <div key={group.title} className="mt-4">
            <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{group.title}</div>
            {group.keys.filter(k => RESOURCES[k]).map((key) => (
              <NavLink key={key} to={`/admin/resource/${key}`} className={({isActive}) => `block truncate rounded-lg px-3 py-1.5 mb-0.5 ${isActive ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}>
                {RESOURCES[key].label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
