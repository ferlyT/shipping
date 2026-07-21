const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('src/pages/ShipmentBatchesPage.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Header Halaman
code = code.replace(
  /<div className="flex flex-col gap-4 lg:gap-8 bg-\[#F8FAFC\] p-3 sm:p-4 lg:p-8 min-h-full">([\s\S]*?)<p className="text-\[13\.5px\] sm:text-\[15\.2px\] text-\[var\(--color-secondary\)\] m-0 mb-4 sm:mb-8">/g,
  `<div className="flex flex-col gap-4 lg:gap-8 bg-[#F8FAFC] p-3 sm:p-4 lg:p-8 min-h-full">
      {/* Header Container */}
      <div className="flex flex-shrink-0 flex-col">
        <h1 className="font-[var(--font-display)] font-medium text-[26px] sm:text-[32px] lg:text-[40px] m-0 mb-1 tracking-[-0.02em] text-[var(--color-primary)]">Shipment Batches</h1>
        <p className="text-[13.5px] sm:text-[15.2px] text-[var(--color-secondary)] m-0 mb-4 sm:mb-8">`
);

// 2. Filter Card padding
// Before: <div className="bg-white border border-[#E4E1DA] rounded-xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
// Wait, is it p-6 or p-4? I need to find the exact string. Let's just use regex on the div before the tabs.
// We will rely on multi_replace_file_content for exact edits.

console.log('Script ran. (Note: use multi_replace instead for safety)');
