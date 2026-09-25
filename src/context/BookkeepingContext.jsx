import { createContext, useContext, useState } from 'react';

const STORAGE_KEY = 'ledgerwise-bookkeeping-data';

const seed = {
  transactions: [
    { id: 'tx-1', date: '2026-09-15', description: 'Office rent', category: 'Rent', type: 'expense', amount: 1850, account: 'Business chequing', status: 'Cleared', notes: '' },
    { id: 'tx-2', date: '2026-09-18', description: 'Client payment - Northstar', category: 'Sales', type: 'income', amount: 4250, account: 'Business chequing', status: 'Cleared', notes: '' },
    { id: 'tx-3', date: '2026-09-20', description: 'Software subscriptions', category: 'Software', type: 'expense', amount: 284.5, account: 'Business credit card', status: 'Pending', notes: '' },
  ],
  invoices: [
    { id: 'inv-1', number: 'INV-1001', client: 'Northstar Design', dueDate: '2026-10-05', amount: 4250, status: 'Paid' },
    { id: 'inv-2', number: 'INV-1002', client: 'Maple & Co.', dueDate: '2026-09-28', amount: 1850, status: 'Sent' },
  ],
  compliance: [
    { id: 'gst', title: 'GST/HST registration details', dueDate: '2026-12-31', status: 'Complete', notes: 'Registration number and filing frequency confirmed.' },
    { id: 'books', title: 'Monthly books reconciliation', dueDate: '2026-09-30', status: 'In progress', notes: 'Reconcile the business credit card.' },
    { id: 'year-end', title: 'Year-end filing preparation', dueDate: '2027-03-31', status: 'Not started', notes: '' },
  ],
  settings: { businessName: 'My Canadian Business', ownerName: 'Demo User', email: 'demo@example.com', currency: 'CAD', fiscalYearEnd: 'December 31' },
};

function loadData() {
  try {
    return { ...seed, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return seed;
  }
}

export function BookkeepingProvider({ children }) {
  const [data, setData] = useState(loadData);
  const persist = (next) => {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const addTransaction = (transaction) => persist({ ...data, transactions: [{ ...transaction, id: `tx-${Date.now()}`, amount: Number(transaction.amount) }, ...data.transactions] });
  const updateTransaction = (id, transaction) => persist({ ...data, transactions: data.transactions.map((item) => item.id === id ? { ...item, ...transaction, amount: Number(transaction.amount) } : item) });
  const deleteTransaction = (id) => persist({ ...data, transactions: data.transactions.filter((item) => item.id !== id) });
  const addInvoice = (invoice) => persist({ ...data, invoices: [{ ...invoice, id: `inv-${Date.now()}`, amount: Number(invoice.amount) }, ...data.invoices] });
  const updateInvoice = (id, invoice) => persist({ ...data, invoices: data.invoices.map((item) => item.id === id ? { ...item, ...invoice, amount: Number(invoice.amount) } : item) });
  const deleteInvoice = (id) => persist({ ...data, invoices: data.invoices.filter((item) => item.id !== id) });
  const updateCompliance = (id, changes) => persist({ ...data, compliance: data.compliance.map((item) => item.id === id ? { ...item, ...changes } : item) });
  const updateSettings = (settings) => persist({ ...data, settings: { ...data.settings, ...settings } });
  const resetData = () => persist(seed);
  const value = { ...data, addTransaction, updateTransaction, deleteTransaction, addInvoice, updateInvoice, deleteInvoice, updateCompliance, updateSettings, resetData };
  return <BookkeepingContext.Provider value={value}>{children}</BookkeepingContext.Provider>;
}

const BookkeepingContext = createContext(null);
export const useBookkeeping = () => {
  const context = useContext(BookkeepingContext);
  if (!context) throw new Error('useBookkeeping must be used within BookkeepingProvider');
  return context;
};
