import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculateRequiredRepaymentForTargetTerm,
  formatDuration,
  getEffectiveBalance,
  simulateSchedule,
} from './lib/mortgage'
import './App.css'

const storageKey = 'mortgage-calculator-inputs-v1'

const defaults = {
  mortgageBalance: 650000,
  offsetBalance: 50000,
  annualInterestRate: 6,
  monthlyRepayment: 3900,
  mode: 'payoff',
  targetYears: 25,
  changingStartRepayment: 3900,
  annualPercentChange: 2,
  annualDollarChange: 0,
}

const getInitialState = () => {
  try {
    const saved = window.localStorage.getItem(storageKey)
    if (!saved) return defaults
    return { ...defaults, ...JSON.parse(saved) }
  } catch {
    return defaults
  }
}

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

const percentFmt = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  min = 0,
  max,
  step = 'any',
  prefix,
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <div className="input-wrap">
        {prefix ? <span className="prefix">{prefix}</span> : null}
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="error">
          {error}
        </p>
      ) : null}
    </label>
  )
}

function App() {
  const [inputs, setInputs] = useState(getInitialState)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(inputs))
  }, [inputs])

  const errors = {
    mortgageBalance: inputs.mortgageBalance > 0 ? '' : 'Mortgage balance must be greater than 0.',
    offsetBalance: inputs.offsetBalance >= 0 ? '' : 'Offset balance cannot be negative.',
    annualInterestRate:
      inputs.annualInterestRate >= 0 && inputs.annualInterestRate <= 100
        ? ''
        : 'Interest rate must be between 0% and 100%.',
    monthlyRepayment: inputs.monthlyRepayment > 0 ? '' : 'Monthly repayment must be greater than 0.',
    targetYears: inputs.targetYears > 0 ? '' : 'Target years must be greater than 0.',
    changingStartRepayment:
      inputs.changingStartRepayment > 0 ? '' : 'Starting monthly repayment must be greater than 0.',
  }

  const hasErrors = Object.values(errors).some(Boolean)

  const baseline =
    !hasErrors && inputs.monthlyRepayment > 0
      ? simulateSchedule({
          mortgageBalance: inputs.mortgageBalance,
          offsetBalance: inputs.offsetBalance,
          annualInterestRate: inputs.annualInterestRate,
          startingRepayment: inputs.monthlyRepayment,
        })
      : null

  const active = useMemo(() => {
    if (hasErrors) return null

    if (inputs.mode === 'payoff') {
      return baseline
    }

    if (inputs.mode === 'target') {
      const requiredRepayment = calculateRequiredRepaymentForTargetTerm({
        mortgageBalance: inputs.mortgageBalance,
        offsetBalance: inputs.offsetBalance,
        annualInterestRate: inputs.annualInterestRate,
        targetYears: inputs.targetYears,
      })

      return {
        ...simulateSchedule({
          mortgageBalance: inputs.mortgageBalance,
          offsetBalance: inputs.offsetBalance,
          annualInterestRate: inputs.annualInterestRate,
          startingRepayment: requiredRepayment,
        }),
        requiredRepayment,
      }
    }

    return simulateSchedule({
      mortgageBalance: inputs.mortgageBalance,
      offsetBalance: inputs.offsetBalance,
      annualInterestRate: inputs.annualInterestRate,
      startingRepayment: inputs.changingStartRepayment,
      annualPercentChange: inputs.annualPercentChange,
      annualDollarChange: inputs.annualDollarChange,
    })
  }, [baseline, hasErrors, inputs])

  const chartData = useMemo(() => {
    if (!active?.schedule?.length) return []
    return active.schedule.map((row, index) => ({
      month: row.month,
      activeBalance: row.balance,
      activeInterest: row.interest,
      activeRepayment: row.payment,
      baselineBalance: baseline?.schedule[index]?.balance,
    }))
  }, [active, baseline])

  const activeRepaymentDisplay =
    inputs.mode === 'target' && active?.requiredRepayment
      ? active.requiredRepayment
      : inputs.mode === 'changing'
        ? inputs.changingStartRepayment
        : inputs.monthlyRepayment

  const effectiveBalance = getEffectiveBalance(inputs.mortgageBalance, inputs.offsetBalance)

  return (
    <main className="container">
      <header>
        <h1>Mortgage repayment calculator</h1>
        <p>
          Forecast payoff time, compare strategies, and model how an offset account reduces interest.
        </p>
      </header>

      <section className="layout" aria-label="Mortgage calculator">
        <form className="panel" onSubmit={(e) => e.preventDefault()}>
          <h2>Inputs</h2>
          <NumberField
            id="mortgageBalance"
            label="Mortgage balance"
            prefix="$"
            value={inputs.mortgageBalance}
            onChange={(mortgageBalance) => setInputs((p) => ({ ...p, mortgageBalance }))}
            error={errors.mortgageBalance}
          />
          <NumberField
            id="offsetBalance"
            label="Offset account balance"
            prefix="$"
            value={inputs.offsetBalance}
            onChange={(offsetBalance) => setInputs((p) => ({ ...p, offsetBalance }))}
            error={errors.offsetBalance}
          />
          <NumberField
            id="interestRate"
            label="Annual interest rate"
            prefix="%"
            value={inputs.annualInterestRate}
            onChange={(annualInterestRate) => setInputs((p) => ({ ...p, annualInterestRate }))}
            error={errors.annualInterestRate}
            max={100}
            step="0.01"
          />
          <NumberField
            id="monthlyRepayment"
            label="Minimum repayment (monthly)"
            prefix="$"
            value={inputs.monthlyRepayment}
            onChange={(monthlyRepayment) => setInputs((p) => ({ ...p, monthlyRepayment }))}
            error={errors.monthlyRepayment}
          />

          <fieldset>
            <legend>Scenario</legend>
            <label>
              <input
                type="radio"
                name="mode"
                checked={inputs.mode === 'payoff'}
                onChange={() => setInputs((p) => ({ ...p, mode: 'payoff' }))}
              />
              Payoff forecast
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={inputs.mode === 'target'}
                onChange={() => setInputs((p) => ({ ...p, mode: 'target' }))}
              />
              Target term
            </label>
            <label>
              <input
                type="radio"
                name="mode"
                checked={inputs.mode === 'changing'}
                onChange={() => setInputs((p) => ({ ...p, mode: 'changing' }))}
              />
              Changing repayments over time
            </label>
          </fieldset>

          {inputs.mode === 'target' ? (
            <NumberField
              id="targetYears"
              label="Target payoff duration (years)"
              value={inputs.targetYears}
              onChange={(targetYears) => setInputs((p) => ({ ...p, targetYears }))}
              error={errors.targetYears}
              step="0.5"
              min={0.5}
            />
          ) : null}

          {inputs.mode === 'changing' ? (
            <>
              <NumberField
                id="changingStartRepayment"
                label="Starting monthly repayment"
                prefix="$"
                value={inputs.changingStartRepayment}
                onChange={(changingStartRepayment) =>
                  setInputs((p) => ({ ...p, changingStartRepayment }))
                }
                error={errors.changingStartRepayment}
              />
              <NumberField
                id="annualPercentChange"
                label="Annual repayment change (%)"
                prefix="%"
                value={inputs.annualPercentChange}
                onChange={(annualPercentChange) => setInputs((p) => ({ ...p, annualPercentChange }))}
                error=""
                step="0.1"
              />
              <NumberField
                id="annualDollarChange"
                label="Annual repayment change ($)"
                prefix="$"
                value={inputs.annualDollarChange}
                onChange={(annualDollarChange) => setInputs((p) => ({ ...p, annualDollarChange }))}
                error=""
              />
            </>
          ) : null}
        </form>

        <section className="results" aria-live="polite">
          <div className="cards">
            <article className="card">
              <h3>Effective interest-bearing balance</h3>
              <p>{currency.format(effectiveBalance)}</p>
            </article>
            <article className="card">
              <h3>Estimated payoff</h3>
              <p>
                {active?.nonAmortizing
                  ? 'Not repayable'
                  : `${formatDuration(active?.monthsToPayoff)} · ${dateFmt.format(active?.payoffDate)}`}
              </p>
            </article>
            <article className="card">
              <h3>Total interest</h3>
              <p>{active ? currency.format(active.totalInterest) : '—'}</p>
            </article>
            <article className="card">
              <h3>Repayment amount</h3>
              <p>{currency.format(activeRepaymentDisplay || 0)}</p>
            </article>
          </div>

          {active?.nonAmortizing ? (
            <p className="warning">{active.reason}</p>
          ) : null}

          {active && baseline && !active.nonAmortizing && !baseline.nonAmortizing ? (
            <article className="comparison card">
              <h3>Comparison to baseline repayment</h3>
              <p>
                Interest difference:{' '}
                <strong>{currency.format(active.totalInterest - baseline.totalInterest)}</strong>
              </p>
              <p>
                Payoff difference:{' '}
                <strong>
                  {formatDuration((active.monthsToPayoff ?? 0) - (baseline.monthsToPayoff ?? 0))}
                </strong>
              </p>
              {inputs.mode === 'changing' ? (
                <p>
                  Adjustment applied each year: {percentFmt.format(inputs.annualPercentChange)}% and{' '}
                  {currency.format(inputs.annualDollarChange)}
                </p>
              ) : null}
            </article>
          ) : null}

          <article className="card assumptions">
            <h3>Model assumptions</h3>
            <p>
              Monthly compounding, monthly repayments, offset reduces interest-bearing balance only,
              and no fees or rate changes unless adjusted by your selected repayment scenario.
            </p>
          </article>

          {chartData.length ? (
            <div className="charts">
              <article className="card chart-card">
                <h3>Remaining balance over time</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => currency.format(v)} width={100} />
                    <Tooltip formatter={(v) => currency.format(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="activeBalance" stroke="#1d4ed8" name="Active" dot={false} />
                    <Line
                      type="monotone"
                      dataKey="baselineBalance"
                      stroke="#0f766e"
                      name="Baseline"
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className="card chart-card">
                <h3>Monthly repayment and interest (active scenario)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => currency.format(v)} width={100} />
                    <Tooltip formatter={(v) => currency.format(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="activeRepayment"
                      stroke="#7c3aed"
                      name="Repayment"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="activeInterest"
                      stroke="#b91c1c"
                      name="Interest"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </article>
            </div>
          ) : (
            <p className="empty">Enter valid inputs to view forecast results and charts.</p>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
