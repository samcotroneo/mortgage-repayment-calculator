import { describe, expect, it } from 'vitest'
import {
  calculateRequiredRepaymentForTargetTerm,
  getMonthlyInterest,
  simulateSchedule,
} from './mortgage'

describe('mortgage calculations', () => {
  it('uses offset balance to reduce interest', () => {
    const interest = getMonthlyInterest(500000, 100000, 6)
    expect(interest).toBeCloseTo(2000, 4)
  })

  it('handles over-offset so no interest is charged', () => {
    const interest = getMonthlyInterest(300000, 400000, 6)
    expect(interest).toBe(0)
  })

  it('calculates target-term repayment that pays off within target months', () => {
    const repayment = calculateRequiredRepaymentForTargetTerm({
      mortgageBalance: 500000,
      offsetBalance: 50000,
      annualInterestRate: 6,
      targetYears: 20,
    })

    const result = simulateSchedule({
      mortgageBalance: 500000,
      offsetBalance: 50000,
      annualInterestRate: 6,
      startingRepayment: repayment,
      maxMonths: 20 * 12,
    })

    expect(result.nonAmortizing).toBe(false)
    expect(result.monthsToPayoff).toBeLessThanOrEqual(240)
  })

  it('flags non-amortizing repayment when payment does not cover interest', () => {
    const result = simulateSchedule({
      mortgageBalance: 500000,
      offsetBalance: 0,
      annualInterestRate: 6,
      startingRepayment: 1000,
      maxMonths: 120,
    })

    expect(result.nonAmortizing).toBe(true)
    expect(result.reason).toMatch(/does not cover monthly interest/i)
  })
})
