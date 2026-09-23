# Ledge

Ledge is a mortgage-first financial cockpit for Australian owner-occupiers. It makes offset accounts, everyday spending, and repayment forecasts legible in one calm workspace.

## Included in this slice

- Responsive rebrand and dashboard shell for overview, accounts, transactions, forecasts, and companion calculators.
- Multiple offset-account relationships with live effective-balance and interest-saved calculations.
- Explainable forecast visualisation with current-path and no-offset comparisons.
- File-first statement review flow for CSV imports, with OFX/QIF positioned for the next parser slice.
- Browser-local review model that does not require bank credentials or a paid aggregation provider.

## Product direction

The product plan is captured in [`PRODUCT.md`](./PRODUCT.md), and the visual direction is documented in [`DESIGN.md`](./DESIGN.md). The first release intentionally starts with statement uploads and keeps automated bank feeds optional behind a future adapter boundary.

Forecasts are educational projections, not financial advice or lender-verified balances. Imported data should remain reviewable, attributable, and reversible.

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

## Current data model assumptions

- Monthly compounding with annual rate divided by 12.
- Interest is charged on `max(balance - linked offset balances, 0)`.
- Offset accounts reduce the interest-bearing balance but do not directly reduce principal.
- Repayments are monthly and the schedule stops once the loan reaches zero.
- The statement path currently demonstrates CSV parsing and review. Automated bank connections, PDF extraction, multi-device sync, and live rate sources remain future work.
