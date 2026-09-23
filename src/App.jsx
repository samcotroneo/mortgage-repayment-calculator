import { useMemo, useRef, useState } from 'react'
import {
  formatDuration,
  getEffectiveBalance,
  simulateSchedule,
} from './lib/mortgage'
import { parseCsvStatement } from './lib/imports'
import './App.css'

const currency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
})

const preciseCurrency = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 2,
})

const dateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const compactDateFmt = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'short',
})

const initialAccounts = [
  {
    id: 'offset-home',
    name: 'Everyday offset',
    institution: 'Bankwest',
    type: 'Offset account',
    balance: 48520,
    offset: true,
    lastImported: 'Today, 9:14 am',
    tone: 'moss',
  },
  {
    id: 'offset-saver',
    name: 'Rainy day offset',
    institution: 'Bankwest',
    type: 'Offset account',
    balance: 12750,
    offset: true,
    lastImported: 'Yesterday',
    tone: 'sky',
  },
  {
    id: 'spend',
    name: 'Household spending',
    institution: 'Up',
    type: 'Transaction account',
    balance: 6340,
    offset: false,
    lastImported: '18 Sep 2026',
    tone: 'clay',
  },
]

const initialTransactions = [
  { id: '1', date: '2026-09-20', merchant: 'Woolworths Metro', category: 'Groceries', amount: -86.42, account: 'Everyday offset' },
  { id: '2', date: '2026-09-19', merchant: 'Origin Energy', category: 'Bills', amount: -143.18, account: 'Household spending' },
  { id: '3', date: '2026-09-18', merchant: 'Monthly salary', category: 'Income', amount: 7420, account: 'Everyday offset' },
  { id: '4', date: '2026-09-17', merchant: 'The Grounds', category: 'Eating out', amount: -38.5, account: 'Household spending' },
]

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'accounts', label: 'Accounts', icon: 'wallet' },
  { id: 'transactions', label: 'Transactions', icon: 'rows' },
  { id: 'forecast', label: 'Forecast', icon: 'chart' },
  { id: 'calculators', label: 'Calculators', icon: 'calculator' },
]

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /></>,
    wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M4 8h15" /><path d="M16 12h4v4h-4a2 2 0 1 1 0-4Z" /></>,
    rows: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="18" cy="18" r="2" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-6" /></>,
    calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2" /></>,
    upload: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    chevron: <path d="m9 6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="m8.5 12 2.3 2.3 4.7-5" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    spark: <><path d="m12 3 1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5z" /></>,
  }

  return (
    <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function Metric({ label, value, detail, tone = '' }) {
  return (
    <div className={`metric ${tone}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      {detail ? <span className="metric-detail">{detail}</span> : null}
    </div>
  )
}

function ForecastChart({ schedule }) {
  const points = useMemo(() => {
    if (!schedule?.length) return []
    const stride = Math.max(1, Math.floor(schedule.length / 34))
    return schedule.filter((_, index) => index % stride === 0 || index === schedule.length - 1)
  }, [schedule])

  if (!points.length) return null

  const maxValue = points[0].balance
  const width = 760
  const height = 230
  const padX = 12
  const padY = 18
  const chartWidth = width - padX * 2
  const chartHeight = height - padY * 2
  const getX = (index) => padX + (index / Math.max(points.length - 1, 1)) * chartWidth
  const getY = (value) => padY + (1 - value / maxValue) * chartHeight
  const line = points.map((point, index) => `${getX(index)},${getY(point.balance)}`).join(' ')
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`

  return (
    <div className="forecast-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Projected mortgage balance decreases to zero over the forecast term">
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5d735b" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#5d735b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((lineIndex) => {
          const y = padY + (lineIndex / 3) * chartHeight
          return <line key={lineIndex} x1={padX} x2={width - padX} y1={y} y2={y} className="chart-grid" />
        })}
        <polygon points={area} fill="url(#area-fill)" />
        <polyline points={line} fill="none" className="chart-line" />
        {points.slice(-1).map((point, index) => (
          <circle key={index} cx={getX(points.length - 1)} cy={getY(point.balance)} r="4" className="chart-end" />
        ))}
      </svg>
      <div className="chart-axis"><span>Today</span><span>12 months</span><span>24 months</span><span>Payoff</span></div>
    </div>
  )
}

function AccountRow({ account, onToggleOffset }) {
  return (
    <div className="account-row">
      <div className={`account-mark ${account.tone}`}><Icon name={account.offset ? 'shield' : 'wallet'} size={17} /></div>
      <div className="account-copy">
        <strong>{account.name}</strong>
        <span>{account.institution} · {account.type}</span>
      </div>
      <div className="account-balance">
        <strong>{currency.format(account.balance)}</strong>
        <span>{account.lastImported}</span>
      </div>
      <button className={`offset-toggle ${account.offset ? 'active' : ''}`} onClick={() => onToggleOffset(account.id)} aria-pressed={account.offset}>
        {account.offset ? <><Icon name="check" size={14} /> Offset linked</> : 'Link to mortgage'}
      </button>
      <button className="icon-button" aria-label={`More options for ${account.name}`}><Icon name="more" /></button>
    </div>
  )
}

function EmptyTransactions() {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon name="rows" size={22} /></div>
      <h3>Your transaction story starts here</h3>
      <p>Upload a statement to bring your everyday spending into the forecast.</p>
    </div>
  )
}

function ImportPanel({ onClose, onImport }) {
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState([])
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    setError('')
    setFileName(file.name)
    try {
      const text = await file.text()
      const parsed = parseCsvStatement(text)
      if (!parsed.length) throw new Error('No usable transactions were found in this file.')
      setPreview(parsed.slice(0, 5))
    } catch (parseError) {
      setPreview([])
      setError(parseError.message)
    }
  }

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <div className="import-head">
        <div>
          <p className="section-kicker">Private by default</p>
          <h2 id="import-title">Bring in a statement</h2>
          <p className="section-subtitle">Start with CSV, OFX, or QIF. Your file stays in this browser until you choose to save the reviewed transactions.</p>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close import panel">×</button>
      </div>
      <button className="drop-zone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]) }}>
        <span className="upload-circle"><Icon name="upload" size={21} /></span>
        <strong>{fileName || 'Drop a statement here'}</strong>
        <span>{fileName ? 'Click to choose a different file' : 'or browse from your device · CSV, OFX, QIF'}</span>
        <input ref={inputRef} type="file" accept=".csv,.ofx,.qif,text/csv" onChange={(event) => handleFile(event.target.files[0])} hidden />
      </button>
      {error ? <p className="inline-error">{error}</p> : null}
      {preview.length ? (
        <div className="import-review">
          <div className="review-header"><div><strong>Review before adding</strong><span>Showing the first {preview.length} rows</span></div><span className="review-badge"><Icon name="check" size={13} /> Parsed</span></div>
          <div className="review-table">
            {preview.map((transaction) => (
              <div className="review-row" key={transaction.id}>
                <span>{compactDateFmt.format(new Date(`${transaction.date}T00:00:00`))}</span>
                <strong>{transaction.merchant}</strong>
                <span>{transaction.category}</span>
                <strong className={transaction.amount < 0 ? 'amount-negative' : 'amount-positive'}>{preciseCurrency.format(transaction.amount)}</strong>
              </div>
            ))}
          </div>
          <div className="review-actions"><span><Icon name="shield" size={15} /> Nothing is connected automatically.</span><button className="button primary" onClick={() => onImport(preview)}>Add reviewed rows <Icon name="arrow" size={16} /></button></div>
        </div>
      ) : null}
      <div className="supported-formats"><span>Accepted formats</span><b>CSV</b><b>OFX</b><b>QIF</b><em>PDF review coming later</em></div>
    </section>
  )
}

function Overview({ accounts, forecast, effectiveBalance, interestSaved, monthlyOffsetBenefit, onNavigate, onToggleOffset }) {
  const linkedAccounts = accounts.filter((account) => account.offset)
  return (
    <>
      <section className="hero-row">
        <div>
          <p className="section-kicker">Monday, 21 September 2026</p>
          <h1>Make the balance<br /><em>work harder.</em></h1>
          <p className="hero-copy">Your offsets are doing good work. Here is the clearest view of what they mean for your loan.</p>
        </div>
        <div className="hero-actions">
          <button className="button secondary" onClick={() => onNavigate('accounts')}><Icon name="plus" size={16} /> Add account</button>
          <button className="button primary" onClick={() => onNavigate('transactions')}><Icon name="upload" size={16} /> Import statement</button>
        </div>
      </section>

      <section className="forecast-lead">
        <div className="forecast-summary">
          <div className="summary-topline"><span>Home loan · Variable</span><span className="fresh"><i /> Updated today</span></div>
          <h2>{currency.format(effectiveBalance)}</h2>
          <p className="summary-note">Effective balance after {linkedAccounts.length} linked offset {linkedAccounts.length === 1 ? 'account' : 'accounts'}</p>
          <div className="summary-stats">
            <Metric label="Current loan" value={currency.format(682400)} detail="6.09% variable" />
            <Metric label="Monthly repayment" value={currency.format(4_120)} detail="Next on 2 Oct" />
            <Metric label="Interest saved" value={currency.format(interestSaved)} detail="Since your offsets were added" tone="positive" />
          </div>
          <button className="text-button" onClick={() => onNavigate('forecast')}>Open full forecast <Icon name="arrow" size={15} /></button>
        </div>
        <div className="forecast-visual">
          <div className="visual-header"><span>Projected balance</span><strong>{formatDuration(forecast.monthsToPayoff)} to go</strong></div>
          <ForecastChart schedule={forecast.schedule} />
          <div className="visual-foot"><span>Interest-bearing balance moves with your offsets.</span><span className="legend-mark"><i /> Current path</span></div>
        </div>
      </section>

      <div className="section-heading">
        <div><h2>Your money, in relation</h2><p>Every account has a job. Keep the connections clear.</p></div>
        <button className="text-button" onClick={() => onNavigate('accounts')}>Manage accounts <Icon name="arrow" size={15} /></button>
      </div>
      <section className="account-list">
        {accounts.map((account) => <AccountRow key={account.id} account={account} onToggleOffset={onToggleOffset} />)}
      </section>

      <section className="insight-strip">
        <div className="insight-mark"><Icon name="spark" size={19} /></div>
        <div><strong>Your offsets are currently saving around {currency.format(monthlyOffsetBenefit)} in interest each month.</strong><span>That is an estimate based on your current balances and a 6.09% variable rate.</span></div>
        <button className="text-button" onClick={() => onNavigate('calculators')}>Try a scenario <Icon name="arrow" size={15} /></button>
      </section>
    </>
  )
}

function AccountsView({ accounts, onToggleOffset, onNavigate }) {
  return (
    <div className="view-stack">
      <section className="view-intro"><div><p className="section-kicker">Connected accounts</p><h1>Make every account legible.</h1><p>Link offsets to the loan they support. Keep other accounts visible for the cash-flow context.</p></div><button className="button primary" onClick={() => onNavigate('transactions')}><Icon name="plus" size={16} /> Add an account</button></section>
      <section className="account-list large">{accounts.map((account) => <AccountRow key={account.id} account={account} onToggleOffset={onToggleOffset} />)}</section>
      <div className="quiet-note"><Icon name="shield" size={17} /><span><strong>Designed for file-first privacy.</strong> You can get a useful forecast without handing over your bank login.</span></div>
    </div>
  )
}

function TransactionsView({ transactions, onOpenImport }) {
  return (
    <div className="view-stack">
      <section className="view-intro"><div><p className="section-kicker">Statement review</p><h1>Keep the story current.</h1><p>Upload a statement, review what Ledge understood, then choose what becomes part of your forecast.</p></div><button className="button primary" onClick={onOpenImport}><Icon name="upload" size={16} /> Import statement</button></section>
      <div className="transaction-toolbar"><div className="search-field"><Icon name="search" size={16} /><input aria-label="Search transactions" placeholder="Search transactions" /></div><button className="filter-button">All accounts <Icon name="chevron" size={14} /></button><button className="filter-button">This month <Icon name="chevron" size={14} /></button></div>
      <section className="transaction-list">
        <div className="table-head"><span>Date</span><span>Merchant</span><span>Category</span><span>Amount</span></div>
        {transactions.length ? transactions.map((transaction) => (
          <div className="transaction-row" key={transaction.id}><span>{compactDateFmt.format(new Date(`${transaction.date}T00:00:00`))}</span><strong>{transaction.merchant}</strong><span className="category-label">{transaction.category}</span><strong className={transaction.amount < 0 ? 'amount-negative' : 'amount-positive'}>{preciseCurrency.format(transaction.amount)}</strong></div>
        )) : <EmptyTransactions />}
      </section>
      <div className="quiet-note"><Icon name="check" size={17} /><span>Transactions are only added after you review the import. Re-importing the same file will not create duplicates.</span></div>
    </div>
  )
}

function ForecastView({ forecast, baseline, effectiveBalance, interestSaved, onNavigate }) {
  return (
    <div className="view-stack">
      <section className="view-intro"><div><p className="section-kicker">Forecast studio</p><h1>See the choices, not just the number.</h1><p>Your forecast updates from your loan assumptions and the accounts you have linked to it.</p></div><button className="button secondary" onClick={() => onNavigate('calculators')}><Icon name="calculator" size={16} /> Compare a scenario</button></section>
      <section className="forecast-detail">
        <div className="detail-heading"><div><span className="summary-topline">Current path · Updated today</span><h2>{currency.format(effectiveBalance)} effective balance</h2><p>Estimated payoff in <strong>{dateFmt.format(forecast.payoffDate)}</strong> with your current repayment rhythm.</p></div><div className="forecast-callout"><span>Offset benefit</span><strong>{currency.format(interestSaved)}</strong><em>estimated interest saved over the loan</em></div></div>
        <ForecastChart schedule={forecast.schedule} />
        <div className="forecast-table"><div><span>Current path</span><strong>{formatDuration(forecast.monthsToPayoff)}</strong><em>{currency.format(forecast.totalInterest)} total interest</em></div><div><span>Without linked offsets</span><strong>{formatDuration(baseline.monthsToPayoff)}</strong><em>{currency.format(baseline.totalInterest)} total interest</em></div><div><span>Monthly repayment</span><strong>{currency.format(4120)}</strong><em>Variable · 6.09%</em></div></div>
      </section>
      <div className="assumption-line"><Icon name="shield" size={16} /><span>Forecasts are projections using the assumptions shown. They are not financial advice or lender-verified balances.</span><button className="text-button">View assumptions <Icon name="arrow" size={14} /></button></div>
    </div>
  )
}

function CalculatorsView({ effectiveBalance }) {
  const [extra, setExtra] = useState(250)
  const projected = Math.max(effectiveBalance - extra * 12, 0)
  return (
    <div className="view-stack">
      <section className="view-intro"><div><p className="section-kicker">Companion calculators</p><h1>Small changes, made visible.</h1><p>Use these quick scenarios alongside your real forecast, then save the ones worth keeping.</p></div></section>
      <section className="calculator-grid">
        <article className="calculator-card active-calculator"><div className="calculator-icon"><Icon name="chart" size={20} /></div><h2>Extra repayment</h2><p>What would an extra monthly amount change over the next year?</p><label className="range-label" htmlFor="extra-repayment"><span>Extra each month</span><strong>{currency.format(extra)}</strong></label><input id="extra-repayment" type="range" min="0" max="1000" step="50" value={extra} onChange={(event) => setExtra(Number(event.target.value))} /><div className="calculator-result"><span>Projected balance after 12 months</span><strong>{currency.format(projected)}</strong></div></article>
        <article className="calculator-card"><div className="calculator-icon sky"><Icon name="wallet" size={20} /></div><h2>Offset impact</h2><p>See how a balance held in offset changes your interest path.</p><button className="text-button">Open calculator <Icon name="arrow" size={15} /></button></article>
        <article className="calculator-card"><div className="calculator-icon clay"><Icon name="spark" size={20} /></div><h2>Rate change</h2><p>Stress-test the repayment if your variable rate moves.</p><button className="text-button">Open calculator <Icon name="arrow" size={15} /></button></article>
      </section>
    </div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('overview')
  const [accounts, setAccounts] = useState(initialAccounts)
  const [transactions, setTransactions] = useState(initialTransactions)
  const [showImport, setShowImport] = useState(false)

  const offsetBalance = accounts.filter((account) => account.offset).reduce((sum, account) => sum + account.balance, 0)
  const effectiveBalance = getEffectiveBalance(682400, offsetBalance)
  const forecast = useMemo(() => simulateSchedule({ mortgageBalance: 682400, offsetBalance, annualInterestRate: 6.09, startingRepayment: 4120 }), [offsetBalance])
  const baseline = useMemo(() => simulateSchedule({ mortgageBalance: 682400, offsetBalance: 0, annualInterestRate: 6.09, startingRepayment: 4120 }), [])
  const interestSaved = Math.max(baseline.totalInterest - forecast.totalInterest, 0)
  const monthlyOffsetBenefit = offsetBalance * (6.09 / 100) / 12

  const toggleOffset = (accountId) => {
    setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, offset: !account.offset } : account))
  }

  const handleImport = (imported) => {
    setTransactions((current) => [...imported.map((item, index) => ({ ...item, id: `import-${Date.now()}-${index}` })), ...current])
    setShowImport(false)
    setActiveView('transactions')
  }

  const navigate = (view) => {
    setActiveView(view)
    setShowImport(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-symbol">L</span><span>Ledge</span></div>
        <div className="sidebar-label">Your money</div>
        <nav aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} className={`nav-item ${activeView === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}><Icon name={item.icon} size={17} /><span>{item.label}</span>{item.id === 'transactions' ? <small>4</small> : null}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini"><Icon name="shield" size={16} /><div><strong>File-first privacy</strong><span>No bank login needed</span></div></div>
          <button className="nav-item"><Icon name="more" size={17} /><span>Settings</span></button>
          <div className="profile"><span className="avatar">SC</span><div><strong>Sam Cotroneo</strong><span>Personal space</span></div><Icon name="chevron" size={14} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-brand"><span className="brand-symbol">L</span><span>Ledge</span></button><div className="topbar-actions"><button className="topbar-icon" aria-label="Notifications"><Icon name="bell" size={18} /><i /></button><span className="topbar-date">Last synced today</span><span className="avatar small">SC</span></div></header>
        <div className="page-content">
          {activeView === 'overview' ? <Overview accounts={accounts} forecast={forecast} effectiveBalance={effectiveBalance} interestSaved={interestSaved} monthlyOffsetBenefit={monthlyOffsetBenefit} onNavigate={navigate} onToggleOffset={toggleOffset} /> : null}
          {activeView === 'accounts' ? <AccountsView accounts={accounts} onToggleOffset={toggleOffset} onNavigate={navigate} /> : null}
          {activeView === 'transactions' ? <TransactionsView transactions={transactions} onOpenImport={() => setShowImport(true)} /> : null}
          {activeView === 'forecast' ? <ForecastView forecast={forecast} baseline={baseline} effectiveBalance={effectiveBalance} interestSaved={interestSaved} onNavigate={navigate} /> : null}
          {activeView === 'calculators' ? <CalculatorsView effectiveBalance={effectiveBalance} /> : null}
          {showImport ? <ImportPanel onClose={() => setShowImport(false)} onImport={handleImport} /> : null}
        </div>
      </main>
    </div>
  )
}

export default App
