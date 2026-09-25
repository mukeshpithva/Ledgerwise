import { Link } from 'react-router-dom';
import { useBookkeeping } from '../context/BookkeepingContext';

const money = (value) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

export default function DashboardPage() {
  const { transactions, invoices, compliance } = useBookkeeping();
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount), 0);
  const receivables = invoices.filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + Number(item.amount), 0);
  const completed = compliance.filter((item) => item.status === 'Complete').length;
  return (
    <section className="page">
      <div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>Financial dashboard</h1><p className="muted">A live view of your books and filing readiness.</p></div><Link className="primary-button link-button" to="/transactions">Add transaction</Link></div>
      <div className="metric-grid">
        <article className="metric-card"><p className="muted">Net cash movement</p><strong>{money(income - expenses)}</strong><span className="positive">{transactions.length} transactions</span></article>
        <article className="metric-card"><p className="muted">Accounts receivable</p><strong>{money(receivables)}</strong><span>{invoices.filter((item) => item.status !== 'Paid').length} outstanding invoices</span></article>
        <article className="metric-card"><p className="muted">Compliance progress</p><strong>{completed}/{compliance.length}</strong><span>{compliance.length ? Math.round((completed / compliance.length) * 100) : 0}% complete</span></article>
      </div>
      <div className="dashboard-columns">
        <article className="panel"><div className="panel-heading"><h2>Recent transactions</h2><Link to="/transactions">View all</Link></div>{transactions.slice(0, 5).map((item) => <div className="list-row" key={item.id}><div><strong>{item.description}</strong><small>{item.date} · {item.category}</small></div><strong className={item.type === 'income' ? 'positive' : 'negative'}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</strong></div>)}</article>
        <article className="panel"><div className="panel-heading"><h2>Next steps</h2><Link to="/compliance">Open checklist</Link></div>{compliance.filter((item) => item.status !== 'Complete').slice(0, 3).map((item) => <div className="list-row" key={item.id}><div><strong>{item.title}</strong><small>Due {item.dueDate}</small></div><span className="status-pill">{item.status}</span></div>)}</article>
      </div>
    </section>
  );
}
