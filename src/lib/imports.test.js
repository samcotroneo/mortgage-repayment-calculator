import { describe, expect, it } from 'vitest'
import { parseCsvStatement } from './imports'

describe('statement imports', () => {
  it('normalizes a simple CSV statement into reviewable transactions', () => {
    const rows = parseCsvStatement([
      'Date,Description,Amount,Category',
      '2026-09-20,"Grocer, Main Street",-86.42,Groceries',
      '2026-09-18,Monthly salary,7420,Income',
    ].join('\n'))

    expect(rows).toEqual([
      {
        id: 'parsed-0',
        date: '2026-09-20',
        merchant: 'Grocer, Main Street',
        category: 'Groceries',
        amount: -86.42,
      },
      {
        id: 'parsed-1',
        date: '2026-09-18',
        merchant: 'Monthly salary',
        category: 'Income',
        amount: 7420,
      },
    ])
  })

  it('supports separate debit and credit columns', () => {
    const rows = parseCsvStatement([
      'Posted date,Payee,Debit,Credit',
      '20/09/2026,Rent,2400,',
      '18/09/2026,Salary,,7420',
    ].join('\n'))

    expect(rows.map((row) => row.amount)).toEqual([-2400, 7420])
  })

  it('rejects files without the minimum columns', () => {
    expect(() => parseCsvStatement('Date,Note\n2026-09-20,Missing amount')).toThrow(/date, description, and amount/i)
  })
})
