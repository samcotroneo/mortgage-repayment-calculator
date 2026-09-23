const EPSILON = 1e-8

export function getEffectiveBalance(mortgageBalance, offsetBalance) {
  return Math.max(mortgageBalance - offsetBalance, 0)
}

export function getMonthlyRate(annualInterestRate) {
  return annualInterestRate / 100 / 12
}

export function getMonthlyInterest(balance, offsetBalance, annualInterestRate) {
  return getEffectiveBalance(balance, offsetBalance) * getMonthlyRate(annualInterestRate)
}

export function buildRepaymentForMonth({
  monthIndex,
  startingRepayment,
  annualPercentChange = 0,
  annualDollarChange = 0,
}) {
  const yearIndex = Math.floor(monthIndex / 12)
  const percentFactor = (1 + annualPercentChange / 100) ** yearIndex
  return Math.max(startingRepayment * percentFactor + annualDollarChange * yearIndex, 0)
}

export function simulateSchedule({
  mortgageBalance,
  offsetBalance,
  annualInterestRate,
  startingRepayment,
  annualPercentChange = 0,
  annualDollarChange = 0,
  startDate = new Date(),
  maxMonths = 1200,
}) {
  const schedule = []
  let balance = mortgageBalance
  let totalInterest = 0
  let totalRepayments = 0

  for (let monthIndex = 0; monthIndex < maxMonths; monthIndex += 1) {
    if (balance <= EPSILON) {
      break
    }

    const scheduledRepayment = buildRepaymentForMonth({
      monthIndex,
      startingRepayment,
      annualPercentChange,
      annualDollarChange,
    })
    const interest = getMonthlyInterest(balance, offsetBalance, annualInterestRate)

    if (scheduledRepayment <= interest + EPSILON) {
      return {
        nonAmortizing: true,
        reason:
          'The chosen repayment does not cover monthly interest, so the loan cannot be repaid under this scenario.',
        schedule,
        monthsToPayoff: null,
        payoffDate: null,
        totalInterest,
        totalRepayments,
      }
    }

    const principal = Math.min(scheduledRepayment - interest, balance)
    const payment = principal + interest
    balance = Math.max(balance - principal, 0)

    totalInterest += interest
    totalRepayments += payment

    schedule.push({
      month: monthIndex + 1,
      payment,
      scheduledRepayment,
      interest,
      principal,
      balance,
    })
  }

  const monthsToPayoff = balance <= EPSILON ? schedule.length : null

  if (!monthsToPayoff) {
    return {
      nonAmortizing: true,
      reason: 'The scenario did not repay the loan within the simulation horizon.',
      schedule,
      monthsToPayoff: null,
      payoffDate: null,
      totalInterest,
      totalRepayments,
    }
  }

  const payoffDate = new Date(startDate)
  payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff)

  return {
    nonAmortizing: false,
    reason: null,
    schedule,
    monthsToPayoff,
    payoffDate,
    totalInterest,
    totalRepayments,
  }
}

export function calculateRequiredRepaymentForTargetTerm({
  mortgageBalance,
  offsetBalance,
  annualInterestRate,
  targetYears,
}) {
  const targetMonths = Math.round(targetYears * 12)
  if (targetMonths <= 0) {
    throw new Error('Target term must be greater than 0 years.')
  }

  const firstMonthInterest = getMonthlyInterest(
    mortgageBalance,
    offsetBalance,
    annualInterestRate,
  )

  let low = firstMonthInterest + 0.01
  let high = Math.max(mortgageBalance + firstMonthInterest, low + 1)

  while (
    simulateSchedule({
      mortgageBalance,
      offsetBalance,
      annualInterestRate,
      startingRepayment: high,
      maxMonths: targetMonths,
    }).nonAmortizing
  ) {
    high *= 2
    if (high > mortgageBalance * 10 + 1_000_000) {
      throw new Error('Unable to find a repayment for the requested target term.')
    }
  }

  for (let i = 0; i < 70; i += 1) {
    const mid = (low + high) / 2
    const result = simulateSchedule({
      mortgageBalance,
      offsetBalance,
      annualInterestRate,
      startingRepayment: mid,
      maxMonths: targetMonths,
    })

    if (!result.nonAmortizing && result.monthsToPayoff && result.monthsToPayoff <= targetMonths) {
      high = mid
    } else {
      low = mid
    }
  }

  return high
}

export function formatDuration(months) {
  if (!months && months !== 0) return '—'
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  if (!years) return `${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`
  if (!remainingMonths) return `${years} year${years === 1 ? '' : 's'}`
  return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${
    remainingMonths === 1 ? '' : 's'
  }`
}
