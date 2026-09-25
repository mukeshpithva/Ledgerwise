import { useEffect, useMemo, useState } from 'react';
import { AutoAwesomeRounded, CheckCircleRounded, DescriptionRounded, PercentRounded, SearchRounded, SendRounded } from '@mui/icons-material';
import { useBookkeeping } from '../context/BookkeepingContext';
import { analyzeDocument, calculateGst, categorizeTransaction, getComplianceFlags, runBookkeepingAgent } from '../services/aiService';
import { approveRemoteAgent, getRemoteAgentRun, startRemoteAgent } from '../services/agentApi';

const money = (value) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
const tabs = [
  { id: 'categorize', label: 'Categorize', icon: <SearchRounded fontSize="small" /> },
  { id: 'tax', label: 'GST / HST', icon: <PercentRounded fontSize="small" /> },
  { id: 'compliance', label: 'Compliance', icon: <CheckCircleRounded fontSize="small" /> },
  { id: 'documents', label: 'Documents', icon: <DescriptionRounded fontSize="small" /> },
];

export default function AIAgentPage() {
  const data = useBookkeeping();
  const [activeTab, setActiveTab] = useState('categorize');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('expense');
  const [categoryResult, setCategoryResult] = useState(null);
  const [gst, setGst] = useState({ amount: '', type: 'expense', rate: '0.05', included: false });
  const [gstResult, setGstResult] = useState(null);
  const [documentText, setDocumentText] = useState('');
  const [documentResult, setDocumentResult] = useState(null);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [agentRun, setAgentRun] = useState(null);
  const [agentProgress, setAgentProgress] = useState([]);
  const [agentRunning, setAgentRunning] = useState(false);
  const [posted, setPosted] = useState(false);
  const [agentError, setAgentError] = useState('');
  const [remoteRunId, setRemoteRunId] = useState(null);
  const [agentSource, setAgentSource] = useState('local');
  const flags = useMemo(() => getComplianceFlags(data), [data]);
  useEffect(() => {
    const savedRunId = localStorage.getItem('ledgerwise-last-agent-run');
    if (!savedRunId) return;
    getRemoteAgentRun(savedRunId).then((run) => {
      if (run.status === 'awaiting_approval' && run.result) {
        setRemoteRunId(savedRunId);
        setAgentRun(run.result);
        setAgentSource('server');
        setAgentProgress([{ type: 'complete', label: 'Resumed reviewable draft', detail: 'This agent run was restored from the server after refresh.' }]);
      }
    }).catch(() => localStorage.removeItem('ledgerwise-last-agent-run'));
  }, []);
  const runAgent = async (event) => {
    event.preventDefault();
    if (!agentPrompt.trim() || agentRunning) return;
    setAgentRunning(true);
    setPosted(false);
    setAgentProgress([]);
    setAgentRun(null);
    setAgentError('');
    setRemoteRunId(null);
    try {
      let result;
      try {
        setAgentSource('server');
        result = await startRemoteAgent({
          prompt: agentPrompt.trim(),
          data,
          onRunCreated: (run) => {
            setRemoteRunId(run.id);
            localStorage.setItem('ledgerwise-last-agent-run', run.id);
          },
          onEvent: (event) => setAgentProgress((current) => [...current, event]),
        });
      } catch {
        setAgentSource('local');
        result = await runBookkeepingAgent({ prompt: agentPrompt.trim(), data, onProgress: (step) => setAgentProgress((current) => [...current, step]) });
      }
      setAgentRun(result);
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'The agent could not complete this run.');
    } finally {
      setAgentRunning(false);
    }
  };
  const postDraft = () => {
    if (!agentRun?.canPost) return;
    data.addTransaction(agentRun.proposedTransaction);
    if (remoteRunId) {
      approveRemoteAgent(remoteRunId).catch(() => {});
      localStorage.removeItem('ledgerwise-last-agent-run');
    }
    setPosted(true);
  };

  return (
    <section className="page ai-page">
      <div className="page-heading">
        <div><p className="eyebrow page-eyebrow">LEDGERWISE AI</p><h1>AI bookkeeping agent</h1><p className="muted">One intelligent workspace for faster, cleaner bookkeeping decisions.</p></div>
        <span className="ai-status"><span /> Agent ready</span>
      </div>

      <article className="panel agent-console">
        <div className="agent-console-heading"><div><p className="eyebrow page-eyebrow">AGENT CONSOLE</p><h2>Ask Ledgerwise to review a transaction</h2><p className="muted">The agent reads your current books, calls deterministic tools, explains each step, and waits for approval before writing anything.</p></div><span className="agent-safety-badge">Human approval required</span></div>
        <form className="agent-prompt-form" onSubmit={runAgent}>
          <textarea value={agentPrompt} onChange={(event) => setAgentPrompt(event.target.value)} placeholder="Paste a receipt or describe an expense, for example: Adobe invoice INV-1042 dated 2026-09-23 total 125.00" rows={3} />
          <button className="primary-button compact-button" disabled={agentRunning || !agentPrompt.trim()} type="submit">{agentRunning ? 'Working…' : 'Run agent'} {!agentRunning && <SendRounded fontSize="small" />}</button>
        </form>
        {agentError && <p className="form-error agent-error">{agentError}</p>}
        {agentProgress.length > 0 && <div className="agent-run-layout"><div className="agent-timeline"><div className="agent-source-label">{agentSource === 'server' ? 'Live server run · resumable event stream' : 'Local fallback mode · backend unavailable'}</div>{agentProgress.map((step, index) => <div className={`agent-step ${step.type}`} key={`${step.label}-${index}`}><span className="agent-step-marker">{step.type === 'complete' ? '✓' : index + 1}</span><div><strong>{step.label}</strong><p>{step.detail}</p></div></div>)}</div>{agentRun && <div className="agent-result-card"><div className="agent-result-header"><div><span className="eyebrow">PROPOSED BOOK ENTRY</span><h3>{agentRun.proposedTransaction.category}</h3></div><span className="ai-confidence">{Math.round(agentRun.category.confidence * 100)}% match</span></div><div className="agent-result-grid"><span>Description<strong>{agentRun.proposedTransaction.description}</strong></span><span>Amount<strong>{agentRun.document.amount ? money(agentRun.document.amount) : 'Missing'}</strong></span><span>GST/HST estimate<strong>{agentRun.document.amount ? money(agentRun.tax.tax) : 'Pending'}</strong></span></div><p className="muted">{agentRun.category.reason}. {agentRun.proposedTransaction.notes}</p><button className="primary-button compact-button" disabled={!agentRun.canPost || posted} onClick={postDraft}>{posted ? 'Posted to transactions' : agentRun.canPost ? 'Approve & post transaction' : 'Amount required to post'}</button></div>}</div>}
      </article>

      <div className="ai-workspace">
        <div className="ai-main-panel panel">
          <div className="ai-tabs" role="tablist" aria-label="AI capabilities">
            {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.icon}<span>{tab.label}</span></button>)}
          </div>
          <div className="ai-tab-content">
            {activeTab === 'categorize' && <CategorizeTab description={description} setDescription={setDescription} type={type} setType={setType} result={categoryResult} onRun={() => setCategoryResult(categorizeTransaction(description, type))} />}
            {activeTab === 'tax' && <TaxTab gst={gst} setGst={setGst} result={gstResult} onRun={() => setGstResult(calculateGst({ ...gst, rate: Number(gst.rate) }))} />}
            {activeTab === 'compliance' && <ComplianceTab flags={flags} />}
            {activeTab === 'documents' && <DocumentsTab text={documentText} setText={setDocumentText} result={documentResult} onRun={() => setDocumentResult(analyzeDocument(documentText))} />}
          </div>
        </div>
        <aside className="ai-side-panel">
          <div className="ai-visual" aria-label="AI assistant illustration">
            <div className="ai-visual-grid" /><div className="ai-visual-ring ring-one" /><div className="ai-visual-ring ring-two" />
            <div className="ai-brain"><AutoAwesomeRounded /></div>
            <span className="ai-node node-one" /><span className="ai-node node-two" /><span className="ai-node node-three" />
          </div>
          <div className="ai-side-copy"><p className="eyebrow page-eyebrow">YOUR ASSISTANT</p><h2>Clarity in every entry.</h2><p>Ledgerwise AI reviews the information you provide and explains its suggestions before you post anything to your books.</p><div className="ai-trust-row"><span>✦</span><div><strong>Explainable by design</strong><small>Always review before posting</small></div></div><div className="ai-trust-row"><span>✓</span><div><strong>Private workspace</strong><small>Runs locally in this browser</small></div></div></div>
        </aside>
      </div>
    </section>
  );
}

function TabHeader({ icon, title, description }) { return <div className="ai-tab-header"><span className="ai-icon">{icon}</span><div><h2>{title}</h2><p className="muted">{description}</p></div></div>; }
function CategorizeTab({ description, setDescription, type, setType, result, onRun }) {
  return <><TabHeader icon="✦" title="Transaction categorization" description="Suggest the most likely category from a transaction description." /><div className="ai-form-grid"><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Adobe monthly subscription" /></label><label>Transaction type<select value={type} onChange={(event) => setType(event.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><button className="primary-button" onClick={onRun}>Suggest category</button>{result && <div className="ai-result"><strong>{result.category}</strong><span>{Math.round(result.confidence * 100)}% confidence</span><p>{result.reason}. Review before posting.</p></div>}</>;
}
function TaxTab({ gst, setGst, result, onRun }) {
  return <><TabHeader icon="%" title="GST/HST calculator" description="Estimate output tax or an input tax credit for a transaction." /><div className="ai-form-grid"><label>Amount<input type="number" min="0" step="0.01" value={gst.amount} onChange={(event) => setGst({ ...gst, amount: event.target.value })} placeholder="1000.00" /></label><label>Tax type<select value={gst.type} onChange={(event) => setGst({ ...gst, type: event.target.value })}><option value="expense">Expense / ITC</option><option value="income">Income / output tax</option></select></label><label>Rate<select value={gst.rate} onChange={(event) => setGst({ ...gst, rate: event.target.value })}><option value="0.05">5% GST</option><option value="0.13">13% HST</option><option value="0.15">15% HST</option></select></label></div><label className="remember-option"><input type="checkbox" checked={gst.included} onChange={(event) => setGst({ ...gst, included: event.target.checked })} /><span>Tax is included in amount</span></label><button className="primary-button" onClick={onRun}>Calculate tax</button>{result && <div className="ai-result"><div className="result-grid"><span>Taxable base<strong>{money(result.base)}</strong></span><span>{result.direction}<strong>{money(result.tax)}</strong></span><span>Total<strong>{money(result.total)}</strong></span></div></div>}</>;
}
function ComplianceTab({ flags }) {
  return <><TabHeader icon="✓" title="Compliance monitor" description="Potential issues found in your current bookkeeping data." /><div className="ai-table"><div className="ai-table-row ai-table-head"><span>Finding</span><span>Priority</span><span>Recommended action</span></div>{flags.map((flag) => <div className="ai-table-row" key={flag.title}><strong>{flag.title}</strong><span className={`ai-priority ${flag.level}`}>{flag.level}</span><span>{flag.detail}</span></div>)}</div></>;
}
function DocumentsTab({ text, setText, result, onRun }) {
  return <><TabHeader icon="▣" title="Receipt & invoice analysis" description="Paste text from a document and extract fields before entry." /><textarea className="document-input" value={text} onChange={(event) => setText(event.target.value)} placeholder={'Example: Invoice INV-1003\\nDate: 2026-09-23\\nTotal: 1250.00'} /><button className="primary-button" onClick={onRun}>Analyze document</button>{result && <div className="ai-result"><div className="result-grid"><span>Type<strong>{result.documentType}</strong></span><span>Amount<strong>{result.amount ? money(result.amount) : 'Not found'}</strong></span><span>Reference<strong>{result.reference || 'Not found'}</strong></span></div><ul>{result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div>}</>;
}
