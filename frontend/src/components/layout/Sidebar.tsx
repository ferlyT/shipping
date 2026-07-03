import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Package, Layers, Truck, FileText, ChevronLeft, UserCog, Shield } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

const getNavItems = (role?: string, permissions?: string[]) => {
  const operationsItems = [
    { label: 'Dashboard',      path: ROUTES.DASHBOARD,        icon: LayoutDashboard },
    { label: 'Customer',       path: ROUTES.CUSTOMERS,        icon: Users },
    { label: 'Shipment',       path: ROUTES.SHIPMENTS,        icon: Package },
    { label: 'Batch Marking',  path: ROUTES.SHIPMENT_BATCHES, icon: Layers },
    { label: 'Delivery Order', path: ROUTES.DELIVERY_ORDERS,  icon: Truck },
    { label: 'Billing',        path: ROUTES.BILLING,          icon: FileText },
  ]
  
  let allowedOperations = operationsItems

  if (role !== 'admin' && permissions) {
    allowedOperations = operationsItems.filter(item => permissions.includes(item.path) || permissions.includes('/*'))
  }

  const groups = []
  if (allowedOperations.length > 0) {
    groups.push({
      group: 'OPERATIONS',
      items: allowedOperations
    })
  }

  if (role === 'admin') {
    groups.push({
      group: 'ADMIN',
      items: [
        { label: 'User Management', path: ROUTES.USERS, icon: UserCog },
        { label: 'Role Management', path: ROUTES.ROLES, icon: Shield }
      ]
    })
  }
  
  return groups
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const { isSidebarCollapsed, toggleSidebarCollapse } = useUiStore()
  const { user } = useAuthStore()
  const navItems = getNavItems(user?.role, user?.permissions)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 bg-[var(--color-primary)] text-white transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isSidebarCollapsed ? 'w-[var(--sidebar-mini-width)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        <div className={cn(
          "flex h-[var(--topbar-height)] items-center font-[var(--font-display)] text-xl font-medium tracking-tight",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          {isSidebarCollapsed ? (
            <span>m<span className="text-[var(--color-tertiary)]">.</span></span>
          ) : (
            <span>mshipping<span className="text-[var(--color-tertiary)]">.</span></span>
          )}
        </div>

        <nav className="flex-1 space-y-6 px-3 py-6 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navItems.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                  {group.group}
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="mx-auto w-4 border-t border-white/10 mb-2 mt-4 first:mt-0" />
              )}
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose()
                    }}
                    className={cn(
                      'flex items-center rounded-[var(--radius-md)] text-sm font-medium transition-all duration-300 overflow-hidden',
                      isActive
                        ? 'bg-white/10 text-[var(--color-on-primary)] border-[var(--color-tertiary)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5',
                      isActive && !isSidebarCollapsed && 'border-l-2',
                      isSidebarCollapsed ? 'p-2.5 justify-center mx-2' : 'px-3 py-2.5 gap-3 mx-0'
                    )}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className={cn(
                      "whitespace-nowrap transition-all duration-300",
                      isSidebarCollapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100"
                    )}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Toggle Collapse Button (Desktop Only) */}
        <div className="hidden lg:flex items-center p-3 border-t border-white/10">
          <button
            onClick={toggleSidebarCollapse}
            className="flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 p-2 rounded transition-colors w-full"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={cn("w-5 h-5 transition-transform duration-300", isSidebarCollapsed && "rotate-180")} />
          </button>
        </div>
      </aside>
    </>
  )
}
