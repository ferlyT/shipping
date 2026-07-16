import { prisma } from '../../config/database'
import { buildPagination, parsePagination } from '../../utils/pagination'

export async function getBillings(query: Record<string, string | undefined>) {
  const { page, limit } = parsePagination(query)
  const { skip, take, meta } = buildPagination({ page, limit })
  
  const search = query.search?.trim()
  const where = search
    ? {
        OR: [
          { fdInvNo: { contains: search } },
          { fdDescr: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      }
    : {}

  const [data, total] = await Promise.all([
    prisma.tbBilling.findMany({ 
      where, 
      skip, 
      take, 
      orderBy: { fdInvDate: 'desc' },
      select: {
        fdInvNo: true,
        fdInvDate: true,
        fdCustCode: true,
        fdDescr: true,
        fdJumlah1: true,
        fdTypeBilling: true,
        customer: { select: { fdCustName: true } },
        employee: { select: { fdEmpName: true } }
      }
    }),
    prisma.tbBilling.count({ where }),
  ])

  return { data, meta: meta(total) }
}

export async function getBillingById(id: string) {
  return prisma.tbBilling.findUnique({
    where: { fdInvNo: id },
    include: {
      details: true,
      customer: { select: { fdCustName: true, fdContact: true, fdAddr1: true } },
      employee: { select: { fdEmpName: true } }
    }
  })
}

export async function getBillingKPIs(query: Record<string, string | undefined>) {
  const search = query.search?.trim()
  const where = search
    ? {
        OR: [
          { fdInvNo: { contains: search } },
          { fdDescr: { contains: search } },
          { fdCustCode: { contains: search } },
        ],
      }
    : {}

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    totalInvoices,
    totalTagihanAgg,
    invoicesBulanIni,
    tagihanBulanIniAgg
  ] = await Promise.all([
    prisma.tbBilling.count({ where }),
    prisma.tbBilling.aggregate({
      where,
      _sum: { fdJumlah1: true }
    }),
    prisma.tbBilling.count({
      where: {
        ...where,
        fdInvDate: { gte: startOfMonth, lt: endOfMonth }
      }
    }),
    prisma.tbBilling.aggregate({
      where: {
        ...where,
        fdInvDate: { gte: startOfMonth, lt: endOfMonth }
      },
      _sum: { fdJumlah1: true }
    })
  ])

  return {
    totalInvoices,
    totalTagihan: totalTagihanAgg._sum.fdJumlah1 || 0,
    invoicesBulanIni,
    tagihanBulanIni: tagihanBulanIniAgg._sum.fdJumlah1 || 0
  }
}
