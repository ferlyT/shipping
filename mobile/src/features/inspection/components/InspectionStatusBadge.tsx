import React from 'react'
import { Badge } from '@/components/ui/Badge'

interface Props {
  status: string
}

export function InspectionStatusBadge({ status }: Props) {
  if (status === '2') {
    return <Badge label="Selesai" variant="success" />
  }
  return <Badge label="Draft" variant="warning" />
}
