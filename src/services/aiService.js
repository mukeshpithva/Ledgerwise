const CATEGORY_RULES = [
  { terms: ['rent', 'lease'], category: 'Rent', reason: 'Recurring property cost' },
  { terms: ['software', 'saas', 'subscription', 'adobe', 'quickbooks'], category: 'Software', reason: 'Digital service or subscription' },
  { terms: ['payroll', 'salary', 'wage'], category: 'Payroll', reason: 'Employee compensation' },
  { terms: ['gas', 'fuel', 'mileage', 'uber', 'flight', 'hotel'], category: 'Travel', reason: 'Travel or transportation cost' },
  { terms: ['phone', 'internet', 'hydro', 'utility'], category: 'Utilities', reason: 'Telecommunications or utility cost' },
  { terms: ['invoice', 'client', 'customer', 'payment', 'sale'], category: 'Sales', reason: 'Customer revenue or collection' },
];

export function categorizeTransaction(description = '', type = 'expense') {
  const normalized = description.toLowerCase();
  const match = CATEGORY_RULES.find((rule) => rule.terms.some((term) => normalized.includes(term)));
  if (match) return { category: match.category, confidence: 0.91, reason: match.reason };
  return { category: type === 'income' ? 'Sales' : 'Other', confidence: 0.54, reason: 'No strong description match; review before posting' };
}

export function calculateGst({ amount = 0, type = 'expense', rate = 0.05, included = false }) {
  const value = Number(amount) || 0;
  const tax = included ? value - (value / (1 + rate)) : value * rate;
  return { base: included ? value - tax : value, tax, total: included ? value : value + tax, direction: type === 'income' ? 'Output tax' : 'Input tax credit' };
}

export function getComplianceFlags({ transactions = [], invoices = [], compliance = [] }) {
  const flags = [];
  const pending = transactions.filter((item) => item.status === 'Pending');
  if (pending.length) flags.push({ level: 'medium', title: `${pending.length} transaction${pending.length > 1 ? 's are' : ' is'} pending`, detail: 'Reconcile pending items before preparing a return.' });
  const overdue = invoices.filter((item) => item.status === 'Overdue');
  if (overdue.length) flags.push({ level: 'high', title: `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''}`, detail: 'Follow up with customers and review the accounts receivable balance.' });
  const incomplete = compliance.filter((item) => item.status !== 'Complete');
  if (incomplete.length) flags.push({ level: 'low', title: `${incomplete.length} compliance task${incomplete.length > 1 ? 's need' : ' needs'} attention`, detail: 'Complete the checklist before filing or closing the period.' });
  if (!flags.length) flags.push({ level: 'success', title: 'No immediate issues found', detail: 'Your current records pass the local bookkeeping checks.' });
  return flags;
}

export function analyzeDocument(text = '') {
  const normalized = text.toLowerCase();
  const amountMatch = normalized.match(/(?:total|amount|balance)[^\d]{0,12}(\d+(?:\.\d{1,2})?)/);
  const dateMatch = text.match(/\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2})\b/);
  const invoiceMatch = text.match(/\b(?:inv(?:oice)?[-\s#]*)([a-z0-9-]+)/i);
  const isReceipt = normalized.includes('receipt') || normalized.includes('subtotal');
  return {
    documentType: isReceipt ? 'Receipt' : invoiceMatch ? 'Invoice' : 'Document',
    amount: amountMatch ? Number(amountMatch[1]) : null,
    date: dateMatch ? dateMatch[1].replaceAll('/', '-') : null,
    reference: invoiceMatch ? invoiceMatch[1] : null,
    suggestions: [
      amountMatch ? 'Amount detected successfully.' : 'Add a total or amount for automatic extraction.',
      dateMatch ? 'Date detected successfully.' : 'Add a YYYY-MM-DD date for automatic extraction.',
      isReceipt || invoiceMatch ? 'Document type detected.' : 'Mention receipt or invoice to classify the document.',
    ],
  };
}

export function createBookkeepingSnapshot(data) {
  const income = data.transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = data.transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    transactionCount: data.transactions.length,
    invoiceCount: data.invoices.length,
    pendingTransactions: data.transactions.filter((item) => item.status === 'Pending').length,
    openInvoices: data.invoices.filter((item) => item.status !== 'Paid').length,
    complianceTasksOpen: data.compliance.filter((item) => item.status !== 'Complete').length,
    income,
    expenses,
    netIncome: income - expenses,
  };
}

export const AGENT_TOOLS = [
  { name: 'categorize_transaction', description: 'Suggest a Canadian bookkeeping category from transaction context.' },
  { name: 'calculate_gst_hst', description: 'Calculate GST/HST and the related input tax credit or output tax.' },
  { name: 'check_compliance', description: 'Check the current books for deterministic filing and reconciliation warnings.' },
  { name: 'analyze_document', description: 'Extract dates, references, totals, and document type from receipt text.' },
  { name: 'prepare_transaction', description: 'Prepare a reviewable transaction draft without silently posting it.' },
];

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function runBookkeepingAgent({ prompt, data, onProgress }) {
  const emit = async (event) => {
    onProgress?.(event);
    await wait(280);
  };
  const snapshot = createBookkeepingSnapshot(data);
  await emit({ type: 'context', label: 'Reading current books', detail: `${snapshot.transactionCount} transactions, ${snapshot.invoiceCount} invoices, and ${snapshot.complianceTasksOpen} open compliance tasks.` });

  const document = analyzeDocument(prompt);
  const category = categorizeTransaction(prompt, 'expense');
  const tax = calculateGst({ amount: document.amount || 0, type: 'expense', rate: 0.05, included: false });
  const flags = getComplianceFlags(data);
  await emit({ type: 'tool', tool: 'analyze_document', label: 'Analyzing receipt or transaction context', detail: document.amount ? `Detected ${moneyValue(document.amount)} and ${document.documentType.toLowerCase()} fields.` : 'No reliable total was found; the draft will need review.' });
  await emit({ type: 'tool', tool: 'categorize_transaction', label: 'Categorizing transaction', detail: `${category.category} suggested at ${Math.round(category.confidence * 100)}% confidence because it matches ${category.reason.toLowerCase()}.` });
  await emit({ type: 'tool', tool: 'calculate_gst_hst', label: 'Calculating GST/HST implication', detail: document.amount ? `Estimated 5% input tax credit: ${moneyValue(tax.tax)}.` : 'Waiting for a transaction amount before calculating tax.' });
  await emit({ type: 'tool', tool: 'check_compliance', label: 'Checking CRA workflow signals', detail: flags[0].detail });

  const proposedTransaction = {
    date: document.date || new Date().toISOString().slice(0, 10),
    description: prompt.slice(0, 120),
    category: category.category,
    type: 'expense',
    amount: document.amount || '',
    account: 'Business chequing',
    status: 'Pending',
    notes: `Prepared by Ledgerwise AI. ${category.reason}. Estimated GST/HST: ${moneyValue(tax.tax)}.`,
  };
  await emit({ type: 'complete', label: 'Reviewable draft prepared', detail: document.amount ? 'The transaction is ready for your approval before it is posted to the books.' : 'Add the missing amount before posting this draft.' });
  return { snapshot, document, category, tax, flags, proposedTransaction, canPost: Boolean(document.amount) };
}

function moneyValue(value) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(value) || 0);
}
