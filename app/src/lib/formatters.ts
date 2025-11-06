const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatNumber = (value: number) => numberFormatter.format(value)

export const formatDecimal = (value: number) => decimalFormatter.format(value)

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let value = bytes
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${formatDecimal(value)} ${units[index]}`
}

export const formatSeconds = (seconds: number) => {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining.toFixed(0)}s`
}

export const dashboardDateFormatter = (iso: string) => {
  try {
    return dateFormatter.format(new Date(iso))
  } catch (error) {
    return iso
  }
}
