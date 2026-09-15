# Mortgage Repayment Calculator

A production-focused, mobile-friendly mortgage repayment calculator for offset-account mortgages.

## Features

- Inputs for mortgage balance, offset balance, annual interest rate, and minimum monthly repayment
- **Payoff forecast** scenario for baseline repayment
- **Target term** scenario that computes the flat monthly repayment to finish in a chosen number of years
- **Changing repayments** scenario with annual percentage and/or dollar adjustment
- Baseline vs active-scenario comparison (payoff time and total interest)
- Responsive charts for remaining balance and monthly repayment/interest
- Inline input validation and non-amortizing repayment messaging
- Local storage persistence of calculator settings

## Assumptions

- Monthly compounding with rate = annual rate / 12
- Interest is charged on `max(balance - offset, 0)`
- Offset lowers interest-bearing balance only (not principal directly)
- Repayments are monthly and schedule stops once balance reaches zero
- Final repayment may be a partial month payment
- No fees, redraws, or interest-rate changes unless modeled via changing repayments

## Development

```bash
npm install
npm run dev
```

## Build, lint, and test

```bash
npm run build
npm run lint
npm test
```

## Limitations

- This is an educational projection model, not financial advice.
- Assumes a constant offset balance and does not model daily interest calculations.
