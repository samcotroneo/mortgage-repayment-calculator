const HEADER_ALIASES = {
  date: ['date', 'transaction date', 'posted date', 'processed date'],
  merchant: ['description', 'merchant', 'payee', 'details', 'narrative'],
  amount: ['amount', 'transaction amount', 'value'],
  debit: ['debit', 'withdrawal', 'withdrawals'],
  credit: ['credit', 'deposit', 'deposits'],
  category: ['category', 'type'],
}

function normalizeHeader(header) {
  return header.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '')
}

function findHeader(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)))
}

function splitCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += character
    }
  }

  cells.push(cell.trim())
  return cells
}

function parseAmount(value) {
  if (!value) return NaN
  const normalized = value.replace(/[$,\s]/g, '')
  const isParenthesized = normalized.startsWith('(') && normalized.endsWith(')')
  const amount = Number(normalized.replace(/[()]/g, ''))
  return isParenthesized ? -amount : amount
}

function normalizeDate(value) {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const australianDate = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (australianDate) {
    const [, day, month, year] = australianDate
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

export function parseCsvStatement(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0])
  const dateIndex = findHeader(headers, HEADER_ALIASES.date)
  const merchantIndex = findHeader(headers, HEADER_ALIASES.merchant)
  const amountIndex = findHeader(headers, HEADER_ALIASES.amount)
  const debitIndex = findHeader(headers, HEADER_ALIASES.debit)
  const creditIndex = findHeader(headers, HEADER_ALIASES.credit)
  const categoryIndex = findHeader(headers, HEADER_ALIASES.category)

  if (dateIndex < 0 || merchantIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
    throw new Error('We need date, description, and amount columns to read this statement.')
  }

  return lines.slice(1).map(splitCsvLine).map((cells, index) => {
    const amountValue = amountIndex >= 0
      ? parseAmount(cells[amountIndex])
      : (parseAmount(cells[creditIndex]) || 0) - (parseAmount(cells[debitIndex]) || 0)
    const date = normalizeDate(cells[dateIndex] || '')
    const merchant = (cells[merchantIndex] || '').trim()

    if (!date || !merchant || !Number.isFinite(amountValue)) return null

    return {
      id: `parsed-${index}`,
      date,
      merchant,
      category: (categoryIndex >= 0 && cells[categoryIndex]) || 'Needs review',
      amount: amountValue,
    }
  }).filter(Boolean)
}
