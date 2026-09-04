import { useModalEscape } from '@/hooks/useModalEscape'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Layers, Truck, FileText,
  ChevronLeft, ChevronDown, UserCog, Shield, BarChart2, Target, Search, Upload, History,
  Activity, PieChart, LineChart, ListOrdered, Table, ScrollText, ClipboardCheck, Tags, Landmark, FileSearch, FileUp, BookOpen, Tag
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
        {
          label: t('nav.deliveryOrder'),
          icon: Truck,
          children: [
            { label: t('nav.dashboard'), path: ROUTES.DELIVERY_ORDERS, icon: LayoutDashboard },
            { label: t('nav.deliveryOrderList'), path: ROUTES.DELIVERY_ORDERS_LIST, icon: ListOrdered },
          ],
        },
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
        {
          label: t('nav.commodityMapping'),
          path: ROUTES.COMMODITY_MAPPING,
          icon: Tag,
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

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps = {}) {
  const { isSidebarOpen: storeOpen, setSidebarOpen } = useUiStore()
  const isSidebarOpen = isOpen ?? storeOpen
  const handleClose = onClose ?? (() => setSidebarOpen(false))
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const location = useLocation()

  useModalEscape(isSidebarOpen, handleClose)

  // Track expanded groups per module-item combination
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'logistics-nav.shipment': true,
    'logistics-nav.batchMarking': true,
    'logistics-nav.deliveryOrder': true,
    'finance-nav.billing': true,
    'finance-nav.priceList': true,
    'finance-nav.customerPriceList': true,
  })

  const navModules = getERPNavModules(t, user?.role, user?.permissions)

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const isChildActive = (item: NavItem): boolean => {
    if ('children' in item) {
      return item.children.some((child) => location.pathname === child.path)
    }
    return location.pathname === item.path
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 flex flex-col',
          'bg-[var(--color-surface)] border-r border-[var(--color-border)]',
          'transition-all duration-300 ease-in-out shrink-0 overflow-hidden',
          isSidebarOpen
            ? 'translate-x-0 lg:static lg:translate-x-0 lg:w-64'
            : '-translate-x-full lg:w-0 lg:-translate-x-full lg:border-r-0'
        )}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--color-border)] shrink-0">
          <Link
            to={ROUTES.DASHBOARD}
            className="flex items-center gap-3 font-semibold text-lg text-[var(--color-primary)] truncate"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setSidebarOpen(false)
              }
            }}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)] text-[var(--color-surface)] shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <span className="tracking-tight font-bold truncate">M-Shipping</span>
          </Link>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)] transition-colors cursor-pointer shrink-0"
            aria-label="Sembunyikan sidebar"
            title="Sembunyikan Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navModules.map((mod) => (
            <div key={mod.module} className="space-y-1">
              {/* Module Header Pill */}
              <div className="px-3 mb-2 flex items-center gap-2">
                <span
                  className="w-1.5 h-3.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: mod.accentColor ?? '#6B7280' }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-secondary)] opacity-75">
                  {mod.label}
                </span>
              </div>

              {/* Module Items */}
              {mod.items.map((item) => {
                if ('children' in item) {
                  const groupKey = `${mod.module}-${item.label}`
                  const isOpen = openGroups[groupKey] ?? isChildActive(item)
                  const hasActiveChild = isChildActive(item)
                  const Icon = item.icon

                  return (
                    <div key={item.label} className="space-y-0.5">
                      {/* Parent expandable button */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(groupKey)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                          hasActiveChild
                            ? 'text-[var(--color-primary)] font-semibold bg-[var(--color-neutral)]/60'
                            : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-4 h-4 transition-transform duration-200 text-[var(--color-secondary)]',
                            isOpen && 'rotate-180'
                          )}
                        />
                      </button>

                      {/* Sub-items */}
                      {isOpen && (
                        <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l-2 border-[var(--color-border)] ml-5">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            const isCurrent = location.pathname === child.path

                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                    setSidebarOpen(false)
                                  }
                                }}
                                className={cn(
                                  'flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                                  isCurrent
                                    ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                                    : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                                )}
                              >
                                <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>{child.label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                // Single Leaf Item
                const Icon = item.icon
                const isCurrent = location.pathname === item.path

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setSidebarOpen(false)
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isCurrent
                        ? 'bg-[var(--color-primary)] text-[var(--color-surface)] shadow-xs'
                        : 'text-[var(--color-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-neutral)]'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
