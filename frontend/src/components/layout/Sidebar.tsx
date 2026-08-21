import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Layers, Truck, FileText,
  ChevronLeft, ChevronDown, UserCog, Shield, BarChart2, Target, Search, Upload, History,
  Activity, PieChart, LineChart, ListOrdered, Table, ScrollText, ClipboardCheck, Tags, Landmark, FileSearch, FileUp, BookOpen
} from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

type LeafItem = {
  label: string
  path: string
  icon: typeof LayoutDashboard
  permissionPath?: string
}

type NavItem =
  | LeafItem
  | {
      label: string
      icon: typeof LayoutDashboard
      children: LeafItem[]
    }

interface ModuleGroup {
  module: string
  label: string
  accentColor?: string
  items: NavItem[]
}

const toPermissionPath = (item: LeafItem) => item.permissionPath ?? item.path

const hasPermission = (permissions: string[] | undefined, path: string) =>
  !permissions || permissions.includes('/*') || permissions.includes(path)

const getERPNavModules = (t: (key: string) => string, role?: string, permissions?: string[]): ModuleGroup[] => {
  const allModules: ModuleGroup[] = [
    {
      module: 'overview',
      label: t('module.overview'),
      accentColor: '#3B82F6',
      items: [
        { label: t('nav.dashboard'), path: ROUTES.DASHBOARD, icon: LayoutDashboard },
      ],
    },
    {
      module: 'logistics',
      label: t('module.logistics'),
      accentColor: '#F59E0B',
      items: [
        {
          label: t('nav.shipment'),
          icon: Package,
          children: [
            { label: t('nav.dashboard'), path: ROUTES.SHIPMENTS, icon: Activity },
            { label: t('nav.shipmentList'), path: ROUTES.SHIPMENTS_LIST, icon: ListOrdered },
          ],
        },
        {
          label: t('nav.batchMarking'),
          icon: Layers,
          children: [
            { label: t('nav.dashboard'), path: ROUTES.SHIPMENT_BATCHES, icon: PieChart },
            { label: t('nav.batchList'), path: ROUTES.SHIPMENT_BATCHES_LIST, icon: Table },
          ],
        },
        { label: t('nav.deliveryOrder'), path: ROUTES.DELIVERY_ORDERS, icon: Truck },
      ],
    },
    {
      module: 'finance',
      label: t('module.finance'),
      accentColor: '#10B981',
      items: [
        {
          label: t('nav.billing'),
          icon: FileText,
          children: [
            { label: t('nav.dashboard'), path: ROUTES.BILLING, icon: LineChart },
            { label: t('nav.targetBill'), path: ROUTES.BILLING_TARGET, icon: Target },
            { label: t('nav.billingList'), path: ROUTES.BILLING_LIST, icon: ScrollText },
            { label: t('nav.validationList'), path: ROUTES.BILLING_VALIDATION_LIST, icon: ClipboardCheck },
          ],
        },
        {
          label: t('nav.priceList'),
          icon: Tags,
          children: [
            { label: t('nav.priceListDashboard'), path: ROUTES.PRICE_LIST, icon: BarChart2 },
            { label: t('nav.priceListLookup'), path: ROUTES.PRICE_LIST_LOOKUP, icon: Search },
            { label: t('nav.priceListUpload'), path: ROUTES.PRICE_LIST_UPLOAD, icon: Upload },
            { label: t('nav.priceListHistory'), path: ROUTES.PRICE_LIST_HISTORY, icon: History },
          ],
        },
        {
          label: t('nav.customerPriceList'),
          icon: Landmark,
          children: [
            { label: t('nav.customerPriceListList'), path: ROUTES.CUSTOMER_PRICE_LIST, icon: BookOpen },
            { label: t('nav.customerPriceListLookup'), path: ROUTES.CUSTOMER_PRICE_LIST_LOOKUP, icon: FileSearch },
            { label: t('nav.customerPriceListUpload'), path: ROUTES.CUSTOMER_PRICE_LIST_UPLOAD, icon: FileUp },
          ],
        },
      ],
    },
    {
      module: 'masterdata',
      label: t('module.masterdata'),
      accentColor: '#8B5CF6',
      items: [
        { label: t('nav.customer'), path: ROUTES.CUSTOMERS, icon: Users },
      ],
    },
  ]

  if (role === 'admin') {
    allModules.push({
      module: 'admin',
      label: t('module.admin'),
      accentColor: '#6B7280',
      items: [
        { label: t('nav.userManagement'), path: ROUTES.USERS, icon: UserCog },
        { label: t('nav.roleManagement'), path: ROUTES.ROLES, icon: Shield },
      ],
    })
  }

  // Filter granular permissions if not admin
  if (role !== 'admin') {
    return allModules
      .map((mod) => {
        const allowedItems = mod.items
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

        if (allowedItems.length === 0) return null
        return { ...mod, items: allowedItems }
      })
      .filter((mod): mod is ModuleGroup => mod !== null)
  }

  return allModules
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
        'flex items-center rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 overflow-hidden',
        isActive
          ? 'bg-[var(--color-tertiary)]/15 text-white border-l-2 border-[var(--color-tertiary)] font-semibold shadow-xs'
          : 'text-white/70 hover:text-white hover:bg-white/5',
        isSidebarCollapsed ? 'p-2.5 justify-center mx-2' : cn('px-3 py-2 gap-3', indent ? 'ml-4 mr-0 text-xs' : 'mx-0')
      )}
      title={isSidebarCollapsed ? item.label : undefined}
    >
      <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-[var(--color-tertiary)]" : "text-white/70")} />
      <span
        className={cn(
          'whitespace-nowrap transition-all duration-200',
          isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

const checkIsActive = (pathname: string, path: string) => {
  if (
    path === ROUTES.DASHBOARD ||
    path === ROUTES.SHIPMENTS ||
    path === ROUTES.CUSTOMERS ||
    path === ROUTES.SHIPMENT_BATCHES ||
    path === ROUTES.BILLING ||
    path === ROUTES.PRICE_LIST ||
    path === ROUTES.PRICE_LIST_LOOKUP ||
    path === ROUTES.PRICE_LIST_UPLOAD ||
    path === ROUTES.CUSTOMER_PRICE_LIST ||
    path === ROUTES.CUSTOMER_PRICE_LIST_LOOKUP ||
    path === ROUTES.CUSTOMER_PRICE_LIST_UPLOAD ||
    path === ROUTES.DELIVERY_ORDERS
  ) {
    return pathname === path
  }
  if (path === ROUTES.PRICE_LIST_HISTORY) {
    return pathname.startsWith(path) || pathname.startsWith('/mshipping/finance/price-list/uploads')
  }
  return pathname === path || pathname.startsWith(path + '/')
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

  if (isSidebarCollapsed) {
    return (
      <div className="group relative hover:z-50">
        <Link
          to={item.children[0].path}
          onClick={onNavigate}
          className={cn(
            'flex items-center justify-center p-2.5 mx-2 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200',
            isChildActive
              ? 'bg-[var(--color-tertiary)]/15 text-white border-l-2 border-[var(--color-tertiary)]'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          )}
        >
          <item.icon className={cn("w-5 h-5 flex-shrink-0", isChildActive ? "text-[var(--color-tertiary)]" : "text-white/70")} />
        </Link>
        
        {/* Flyout Submenu */}
        <div 
          className="absolute left-full top-0 ml-2 hidden group-hover:flex flex-col bg-[#1A1C1E] rounded-xl shadow-2xl py-2 w-52 border border-white/10"
          style={{ zIndex: 100 }}
        >
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
                  'flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors',
                  active ? 'text-white bg-[var(--color-tertiary)]/15 font-semibold' : 'text-white/70 hover:text-white hover:bg-white/5'
                )}
              >
                <child.icon className={cn("w-4 h-4", active ? "text-[var(--color-tertiary)]" : "text-white/70")} />
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
          'flex w-full items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors cursor-pointer',
          isChildActive ? 'text-white font-semibold bg-white/5' : 'text-white/70 hover:text-white hover:bg-white/5'
        )}
      >
        <item.icon className={cn("w-4 h-4 flex-shrink-0", isChildActive ? "text-[var(--color-tertiary)]" : "text-white/70")} />
        <span className="flex-1 text-left whitespace-nowrap text-xs font-medium tracking-wide">{item.label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200 opacity-60', isExpanded && 'rotate-180')} />
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
  const { t } = useTranslation()
  const modules = getERPNavModules(t, user?.role, user?.permissions)

  const handleNavigate = () => {
    if (window.innerWidth < 1024) onClose()
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 lg:z-20 bg-[var(--color-sidebar-bg)] text-white transition-all duration-300 ease-in-out flex flex-col shadow-xl shrink-0 border-r border-white/10',
          'lg:relative lg:translate-x-0 lg:h-full',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isSidebarCollapsed ? 'w-[var(--sidebar-mini-width)]' : 'w-[var(--sidebar-width)]'
        )}
      >
        <div className={cn(
          'flex h-[var(--topbar-height)] items-center font-[var(--font-display)] text-xl font-semibold tracking-tight border-b border-white/5',
          isSidebarCollapsed ? 'justify-center px-0' : 'px-6'
        )}>
          {isSidebarCollapsed ? (
            <span>m<span className="text-[var(--color-tertiary)]">.</span></span>
          ) : (
            <span>mshipping<span className="text-[var(--color-tertiary)]">.</span></span>
          )}
        </div>

        <nav className={cn(
          "flex-1 space-y-6 px-3 py-5 scrollbar-none dark-scrollbar",
          isSidebarCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        )}>
          {modules.map((group) => (
            <div key={group.module} className="space-y-1">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                  {group.accentColor && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.accentColor }} />
                  )}
                  {group.label}
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
            className="flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors w-full"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform duration-300', isSidebarCollapsed && 'rotate-180')} />
          </button>
        </div>
      </aside>
    </>
  )
}
