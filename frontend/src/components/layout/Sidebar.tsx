import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Layers, Truck, FileText,
  ChevronLeft, ChevronDown, UserCog, Shield, BarChart2, ClipboardList,
} from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

type LeafItem = {
  label: string
  path: string
  icon: typeof LayoutDashboard
  // Permission path terpisah dari route path kalau suatu saat perlu berbeda.
  // Default-nya sama dengan `path` (lihat toPermissionPath).
  permissionPath?: string
}

type NavItem =
  | LeafItem
  | {
    label: string
    icon: typeof LayoutDashboard
    children: LeafItem[]
  }

const toPermissionPath = (item: LeafItem) => item.permissionPath ?? item.path

const hasPermission = (permissions: string[] | undefined, path: string) =>
  !permissions || permissions.includes('/*') || permissions.includes(path)

const getNavItems = (role?: string, permissions?: string[]): { group: string; items: NavItem[] }[] => {
  const operationsItems: NavItem[] = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Customer', path: ROUTES.CUSTOMERS, icon: Users },
    {
      label: 'Shipment',
      icon: Package,
      children: [
        { label: 'Dashboard', path: ROUTES.SHIPMENTS, icon: BarChart2 },
        { label: 'Daftar Resi', path: ROUTES.SHIPMENTS_LIST, icon: ClipboardList },
      ],
    },
    {
      label: 'Batch Marking',
      icon: Layers,
      children: [
        { label: 'Dashboard', path: ROUTES.SHIPMENT_BATCHES, icon: BarChart2 },
        { label: 'Daftar Batch', path: ROUTES.SHIPMENT_BATCHES_LIST, icon: ClipboardList },
      ],
    },
    { label: 'Delivery Order', path: ROUTES.DELIVERY_ORDERS, icon: Truck },
    { label: 'Billing', path: ROUTES.BILLING, icon: FileText },
  ]

  // Filter granular: item flat dicek langsung; item grup (punya children) difilter
  // per-child, dan grup itu sendiri disembunyikan total kalau tidak ada satupun
  // child yang boleh diakses (role !== 'admin' saja yang kena filter).
  let allowedOperations = operationsItems
  if (role !== 'admin') {
    allowedOperations = operationsItems
      .map((item) => {
        if ('children' in item) {
          const allowedChildren = item.children.filter((child) =>
            hasPermission(permissions, toPermissionPath(child))
          )
          if (allowedChildren.length === 0) return null
          return { ...item, children: allowedChildren }
        }
        return hasPermission(permissions, toPermissionPath(item)) ? item : null
      })
      .filter((item): item is NavItem => item !== null)
  }

  const groups: { group: string; items: NavItem[] }[] = []
  if (allowedOperations.length > 0) {
    groups.push({ group: 'OPERATIONS', items: allowedOperations })
  }

  if (role === 'admin') {
    groups.push({
      group: 'ADMIN',
      items: [
        { label: 'User Management', path: ROUTES.USERS, icon: UserCog },
        { label: 'Role Management', path: ROUTES.ROLES, icon: Shield },
      ],
    })
  }

  return groups
}

function NavLeaf({
  item,
  isActive,
  isSidebarCollapsed,
  onNavigate,
  indent = false,
}: {
  item: LeafItem
  isActive: boolean
  isSidebarCollapsed: boolean
  onNavigate: () => void
  indent?: boolean
}) {
  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'flex items-center rounded-[var(--radius-md)] text-sm font-medium transition-all duration-300 overflow-hidden',
        isActive
          ? 'bg-white/10 text-[var(--color-on-primary)] border-[var(--color-tertiary)]'
          : 'text-white/60 hover:text-white hover:bg-white/5',
        isActive && !isSidebarCollapsed && 'border-l-2',
        isSidebarCollapsed ? 'p-2.5 justify-center mx-2' : cn('px-3 py-2.5 gap-3', indent ? 'ml-4 mr-0' : 'mx-0')
      )}
      title={isSidebarCollapsed ? item.label : undefined}
    >
      <item.icon className="w-5 h-5 flex-shrink-0" />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-300',
          isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

const checkIsActive = (pathname: string, path: string) => {
  if (path === ROUTES.DASHBOARD || path === ROUTES.SHIPMENTS || path === ROUTES.CUSTOMERS || path === ROUTES.SHIPMENT_BATCHES) {
    return pathname === path
  }
  return pathname.startsWith(path)
}

function NavGroupItem({
  item,
  pathname,
  isSidebarCollapsed,
  onNavigate,
}: {
  item: Extract<NavItem, { children: LeafItem[] }>
  pathname: string
  isSidebarCollapsed: boolean
  onNavigate: () => void
}) {
  const isChildActive = item.children.some((child) => checkIsActive(pathname, child.path))
  const [isExpanded, setIsExpanded] = useState(isChildActive)

  // Saat collapsed, grup ditampilkan dengan icon, lalu memunculkan submenu via hover
  if (isSidebarCollapsed) {
    return (
      <div className="group relative">
        <Link
          to={item.children[0].path}
          onClick={onNavigate}
          className={cn(
            'flex items-center justify-center p-2.5 mx-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-300',
            isChildActive
              ? 'bg-white/10 text-[var(--color-on-primary)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          )}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
        </Link>
        
        {/* Flyout Submenu */}
        <div className="absolute left-full top-0 ml-2 hidden group-hover:flex flex-col bg-[#1A1C1E] rounded-lg shadow-xl py-1.5 w-48 z-[100] border border-white/10">
          <div className="px-4 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-1">
            {item.label}
          </div>
          {item.children.map((child) => {
            const active = checkIsActive(pathname, child.path)
            return (
              <Link
                key={child.path}
                to={child.path}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors',
                  active ? 'text-white bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <child.icon className="w-4 h-4" />
                {child.label}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={cn(
          'flex w-full items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
          isChildActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
        <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-180')} />
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children.map((child) => (
            <NavLeaf
              key={child.path}
              item={child}
              isActive={checkIsActive(pathname, child.path)}
              isSidebarCollapsed={isSidebarCollapsed}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const { isSidebarCollapsed, toggleSidebarCollapse } = useUiStore()
  const { user } = useAuthStore()
  const navGroups = getNavItems(user?.role, user?.permissions)

  const handleNavigate = () => {
    if (window.innerWidth < 1024) onClose()
  }

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
          'flex h-[var(--topbar-height)] items-center font-[var(--font-display)] text-xl font-medium tracking-tight',
          isSidebarCollapsed ? 'justify-center px-0' : 'px-6'
        )}>
          {isSidebarCollapsed ? (
            <span>m<span className="text-[var(--color-tertiary)]">.</span></span>
          ) : (
            <span>mshipping<span className="text-[var(--color-tertiary)]">.</span></span>
          )}
        </div>

        <nav className={cn(
          "flex-1 space-y-6 px-3 py-6 scrollbar-none",
          isSidebarCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        )}>
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                  {group.group}
                </div>
              )}
              {isSidebarCollapsed && (
                <div className="mx-auto w-4 border-t border-white/10 mb-2 mt-4 first:mt-0" />
              )}
              {group.items.map((item) =>
                'children' in item ? (
                  <NavGroupItem
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onNavigate={handleNavigate}
                  />
                ) : (
                  <NavLeaf
                    key={item.path}
                    item={item}
                    isActive={checkIsActive(pathname, item.path)}
                    isSidebarCollapsed={isSidebarCollapsed}
                    onNavigate={handleNavigate}
                  />
                )
              )}
            </div>
          ))}
        </nav>

        {/* Toggle Collapse Button (Desktop Only) */}
        <div className="hidden lg:flex items-center p-3 border-t border-white/10">
          <button
            onClick={toggleSidebarCollapse}
            className="flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 p-2 rounded transition-colors w-full"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform duration-300', isSidebarCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  )
}
