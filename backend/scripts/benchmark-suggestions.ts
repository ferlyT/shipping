/**
 * Autocomplete Suggestions Benchmark Script
 * Tests cold latency (< 100ms) and cached latency (< 5ms) across all suggestion services:
 * - Shipments: getShipmentSuggestions
 * - Billing (Standard): getBillingSuggestions(keyword, false)
 * - Billing (Draft Only): getBillingSuggestions(keyword, true)
 * - Delivery Orders: getDeliveryOrderSuggestions
 * - Customers: getCustomerSuggestions
 * - Marking: getMarkingSuggestions
 */

import { performance } from 'perf_hooks'
import { prisma } from '../src/config/database'
import { suggestionCache } from '../src/utils/cache'
import { getShipmentSuggestions } from '../src/modules/shipments/shipments.service'
import { getBillingSuggestions } from '../src/modules/billing/billing.service'
import { getDeliveryOrderSuggestions } from '../src/modules/delivery-orders/deliveryOrders.service'
import { getCustomerSuggestions } from '../src/modules/customers/customers.service'
import { getMarkingSuggestions } from '../src/modules/marking/marking.service'

interface BenchmarkTestCase {
  name: string
  keyword: string
  fn: (keyword: string) => Promise<any[]>
}

interface BenchmarkResult {
  name: string
  keyword: string
  coldMs: number
  cachedMs: number
  avgCachedMs: number
  resultsCount: number
  sampleTitle: string
  coldPassed: boolean
  cachedPassed: boolean
}

const TEST_CASES: BenchmarkTestCase[] = [
  {
    name: 'Shipments (getShipmentSuggestions)',
    keyword: 'GZ',
    fn: (q) => getShipmentSuggestions(q),
  },
  {
    name: 'Billing Standard (getBillingSuggestions, draftOnly=false)',
    keyword: 'INV',
    fn: (q) => getBillingSuggestions(q, false),
  },
  {
    name: 'Billing Draft Only (getBillingSuggestions, draftOnly=true)',
    keyword: 'INV',
    fn: (q) => getBillingSuggestions(q, true),
  },
  {
    name: 'Delivery Orders (getDeliveryOrderSuggestions)',
    keyword: 'SJ',
    fn: (q) => getDeliveryOrderSuggestions(q),
  },
  {
    name: 'Customers (getCustomerSuggestions)',
    keyword: 'PT',
    fn: (q) => getCustomerSuggestions(q),
  },
  {
    name: 'Marking (getMarkingSuggestions)',
    keyword: 'GZ',
    fn: (q) => getMarkingSuggestions(q),
  },
]

async function runBenchmark(): Promise<boolean> {
  console.log('='.repeat(80))
  console.log('🚀 RUNNING AUTOCOMPLETE SUGGESTIONS BENCHMARK')
  console.log('='.repeat(80))

  // 1. Warm up Prisma connection
  console.log('Connecting to SQL Server and warming up connection pool...')
  const startConnect = performance.now()
  await prisma.$queryRaw`SELECT 1 as ping`
  console.log(`Connection ready (${(performance.now() - startConnect).toFixed(2)} ms)\n`)

  const results: BenchmarkResult[] = []
  let allPassed = true

  for (const testCase of TEST_CASES) {
    // A. Evict cache completely to test true cold performance
    suggestionCache.clear()

    // B. Measure COLD query
    const coldStart = performance.now()
    const coldResults = await testCase.fn(testCase.keyword)
    const coldDuration = performance.now() - coldStart

    // C. Measure CACHED query (1st hit)
    const cachedStart = performance.now()
    const cachedResults = await testCase.fn(testCase.keyword)
    const cachedDuration = performance.now() - cachedStart

    // D. Measure repeated cached queries (average over 5 iterations)
    const repeatTimes: number[] = []
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now()
      await testCase.fn(testCase.keyword)
      repeatTimes.push(performance.now() - t0)
    }
    const avgCachedDuration = repeatTimes.reduce((a, b) => a + b, 0) / repeatTimes.length

    // E. Assert criteria: cold < 100ms, cached < 5ms
    const coldPassed = coldDuration < 100
    const cachedPassed = cachedDuration < 5 && avgCachedDuration < 5

    if (!coldPassed || !cachedPassed) {
      allPassed = false
    }

    const sampleTitle = coldResults.length > 0 
      ? (coldResults[0].title || coldResults[0].value || JSON.stringify(coldResults[0])) 
      : '(0 results)'

    results.push({
      name: testCase.name,
      keyword: testCase.keyword,
      coldMs: coldDuration,
      cachedMs: cachedDuration,
      avgCachedMs: avgCachedDuration,
      resultsCount: coldResults.length,
      sampleTitle: sampleTitle.slice(0, 35),
      coldPassed,
      cachedPassed,
    })

    console.log(`  • ${testCase.name} ["${testCase.keyword}"]:`)
    console.log(`      Cold Latency:   ${coldDuration.toFixed(3)} ms ${coldPassed ? '✅ (<100ms)' : '❌ (FAIL >=100ms)'}`)
    console.log(`      Cached Latency: ${cachedDuration.toFixed(3)} ms (avg ${avgCachedDuration.toFixed(3)} ms) ${cachedPassed ? '✅ (<5ms)' : '❌ (FAIL >=5ms)'}`)
    console.log(`      Items Returned: ${coldResults.length} (Sample: "${sampleTitle.slice(0, 30)}")`)
    console.log('')
  }

  console.log('='.repeat(80))
  console.log('BENCHMARK SUMMARY TABLE')
  console.log('='.repeat(80))
  console.log(
    '| Service | Keyword | Cold (ms) | Cached (ms) | Avg Cache | Count | Status |'
  )
  console.log(
    '|---|---|---|---|---|---|---|'
  )
  for (const r of results) {
    const status = (r.coldPassed && r.cachedPassed) ? 'PASS ✅' : 'FAIL ❌'
    console.log(
      `| ${r.name} | "${r.keyword}" | ${r.coldMs.toFixed(2)} | ${r.cachedMs.toFixed(3)} | ${r.avgCachedMs.toFixed(3)} | ${r.resultsCount} | ${status} |`
    )
  }
  console.log('='.repeat(80))

  if (allPassed) {
    console.log('🎉 ALL BENCHMARK CRITERIA SATISFIED! (All cold < 100ms, all cached < 5ms)')
  } else {
    console.error('⚠️ SOME BENCHMARK CRITERIA WERE NOT MET!')
  }

  await prisma.$disconnect()
  return allPassed
}

runBenchmark()
  .then((passed) => {
    process.exit(passed ? 0 : 1)
  })
  .catch(async (err) => {
    console.error('FATAL ERROR DURING BENCHMARK:', err)
    await prisma.$disconnect()
    process.exit(1)
  })
