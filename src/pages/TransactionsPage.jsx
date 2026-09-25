import { useState } from 'react';
import { CloseRounded } from '@mui/icons-material';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { useBookkeeping } from '../context/BookkeepingContext';

const empty = { date: new Date().toISOString().slice(0, 10), description: '', category: 'Sales', type: 'income', amount: '', account: 'Business chequing', status: 'Cleared', notes: '' };
const money = (value) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useBookkeeping();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const filtered = transactions.filter((item) => `${item.description} ${item.category} ${item.account}`.toLowerCase().includes(query.toLowerCase()));
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm(empty); };
  const submit = (event) => {
    event.preventDefault();
    if (!form.description || !form.amount) return;
    if (editing) updateTransaction(editing, form);
    else addTransaction(form);
    closeModal();
  };
  const edit = (item) => { setEditing(item.id); setForm(item); setModalOpen(true); };

  return (
    <section className="page">
      <div className="page-heading">
        <div><p className="eyebrow">LEDGER</p><h1>Transactions</h1><p className="muted">Record every income and expense in your books.</p></div>
        <button className="primary-button" onClick={openCreate}>Add transaction</button>
      </div>

      <article className="panel">
        <div className="panel-heading"><h2>All transactions ({filtered.length})</h2><input className="search-input" placeholder="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Account</th><th>Amount</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.date}</td><td><strong>{item.description}</strong><small>{item.notes}</small></td><td>{item.category}</td><td>{item.account}</td><td className={item.type === 'income' ? 'positive' : 'negative'}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</td><td><span className="status-pill">{item.status}</span></td><td className="actions"><button className="text-button" onClick={() => edit(item)}>Edit</button><button className="danger-button" onClick={() => deleteTransaction(item.id)}>Delete</button></td></tr>)}</tbody></table></div>
      </article>

      <Dialog open={modalOpen} onClose={closeModal} fullWidth maxWidth="md" PaperProps={{ className: 'transaction-dialog' }}>
        <div className="transaction-dialog-header"><div><p className="eyebrow page-eyebrow">LEDGER ENTRY</p><h2>{editing ? 'Edit transaction' : 'Add transaction'}</h2><p className="muted">Enter the details for this bookkeeping entry.</p></div><IconButton aria-label="Close transaction dialog" onClick={closeModal}><CloseRounded /></IconButton></div>
        <DialogContent>
          <form className="data-form transaction-form" onSubmit={submit}>
            <label>Date<input name="date" type="date" value={form.date} onChange={change} required /></label>
            <label>Description<input name="description" value={form.description} onChange={change} placeholder="e.g. Client payment" required /></label>
            <label>Type<select name="type" value={form.type} onChange={change}><option value="income">Income</option><option value="expense">Expense</option></select></label>
            <label>Category<select name="category" value={form.category} onChange={change}><option>Sales</option><option>Rent</option><option>Payroll</option><option>Software</option><option>Utilities</option><option>Travel</option><option>Other</option></select></label>
            <label>Amount (CAD)<input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={change} required /></label>
            <label>Account<select name="account" value={form.account} onChange={change}><option>Business chequing</option><option>Business savings</option><option>Business credit card</option><option>Cash</option></select></label>
            <label>Status<select name="status" value={form.status} onChange={change}><option>Cleared</option><option>Pending</option></select></label>
            <label className="wide">Notes<input name="notes" value={form.notes} onChange={change} placeholder="Optional note" /></label>
            <div className="transaction-form-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancel</button><button className="primary-button" type="submit">{editing ? 'Save transaction' : 'Add transaction'}</button></div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
