export const STATUS_STYLES: Record<number, { label: string; bg: string; text: string; dot: string }> = {
  [-1]: { label: 'Canceled',    bg: 'bg-rose-50',    text: 'text-rose-700',                        dot: 'bg-rose-600' },
  0:    { label: 'Waiting',     bg: 'bg-[#F1F3F5]',  text: 'text-[#495057]',                       dot: 'bg-[#495057]' },
  1:    { label: 'Loading',     bg: 'bg-[#E7F5FF]',  text: 'text-[#1971C2]',                       dot: 'bg-[#1971C2]' },
  2:    { label: 'ETD',         bg: 'bg-[#F3F0FF]',  text: 'text-[#6741D9]',                       dot: 'bg-[#6741D9]' },
  3:    { label: 'ETA',         bg: 'bg-[#FFF3BF]',  text: 'text-[#E67700]',                       dot: 'bg-[#E67700]' },
  4:    { label: 'Warehouse',   bg: 'bg-[#EBFBEE]',  text: 'text-[#2B8A3E]',                       dot: 'bg-[#2B8A3E]' },
  5:    { label: 'Delivery',      bg: 'bg-[#E3FAFC]',  text: 'text-[#0B7285]',                       dot: 'bg-[#0B7285]' },
  6:    { label: 'Delivered',     bg: 'bg-[#F3E4E0]',  text: 'text-[var(--color-tertiary)]',         dot: 'bg-[var(--color-tertiary)]' },
  7:    { label: 'Billed',        bg: 'bg-purple-50',  text: 'text-purple-700',                      dot: 'bg-purple-700' },
  8:    { label: 'Partially Paid', bg: 'bg-yellow-50', text: 'text-yellow-700',                    dot: 'bg-yellow-700' },
  9:    { label: 'Paid',          bg: 'bg-teal-50',    text: 'text-teal-700',                        dot: 'bg-teal-700' },
}

export const STATUS_ORDER = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
