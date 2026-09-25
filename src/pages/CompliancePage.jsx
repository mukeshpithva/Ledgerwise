import { FactCheckRounded, GppGoodRounded, WarningAmberRounded } from '@mui/icons-material';
import { useBookkeeping } from '../context/BookkeepingContext';

const statusOptions = ['Not started', 'In progress', 'Complete'];

export default function CompliancePage() {
  const { compliance, updateCompliance } = useBookkeeping();
  const completed = compliance.filter((item) => item.status === 'Complete').length;
  const inProgress = compliance.filter((item) => item.status === 'In progress').length;

  return (
    <section className="page compliance-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow page-eyebrow">CANADA · GOVERNANCE</p>
          <h1>Compliance centre</h1>
          <p className="muted">Keep your records organized and filing tasks on schedule.</p>
        </div>
        <span className="ai-status"><span /> Monitoring active</span>
      </div>

      <div className="compliance-layout">
        <div>
          <div className="compliance-stats">
            <article className="compliance-stat"><span className="stat-icon green"><GppGoodRounded /></span><div><small>Completed</small><strong>{completed}</strong></div></article>
            <article className="compliance-stat"><span className="stat-icon purple"><FactCheckRounded /></span><div><small>In progress</small><strong>{inProgress}</strong></div></article>
            <article className="compliance-stat"><span className="stat-icon amber"><WarningAmberRounded /></span><div><small>Needs attention</small><strong>{compliance.length - completed}</strong></div></article>
          </div>

          <article className="panel compliance-table-panel">
            <div className="panel-heading">
              <div><h2>Compliance checklist</h2><p className="muted">Update each task as your records progress.</p></div>
              <span className="status-pill">{completed}/{compliance.length} complete</span>
            </div>
            <div className="compliance-table-wrap">
              <table className="compliance-table">
                <thead><tr><th>Task</th><th>Due date</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>
                  {compliance.map((item) => (
                    <tr key={item.id}>
                      <td><div className="compliance-task"><span className={`task-check ${item.status === 'Complete' ? 'done' : ''}`}>{item.status === 'Complete' ? '✓' : ''}</span><strong>{item.title}</strong></div></td>
                      <td><input aria-label={`${item.title} due date`} type="date" value={item.dueDate} onChange={(event) => updateCompliance(item.id, { dueDate: event.target.value })} /></td>
                      <td><select aria-label={`${item.title} status`} className={`compliance-status ${item.status.toLowerCase().replace(' ', '-')}`} value={item.status} onChange={(event) => updateCompliance(item.id, { status: event.target.value })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></td>
                      <td><input aria-label={`${item.title} notes`} value={item.notes} onChange={(event) => updateCompliance(item.id, { notes: event.target.value })} placeholder="Add note" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        <aside className="compliance-visual-panel">
          <div className="compliance-visual" aria-label="AI compliance protection illustration">
            <div className="shield-glow" /><div className="shield-orbit orbit-a" /><div className="shield-orbit orbit-b" />
            <div className="shield-shape"><GppGoodRounded /></div>
            <span className="shield-dot dot-a" /><span className="shield-dot dot-b" /><span className="shield-dot dot-c" />
          </div>
          <div className="compliance-visual-copy">
            <p className="eyebrow">LEDGERWISE AI</p>
            <h2>Stay ahead of deadlines.</h2>
            <p>Your compliance assistant highlights what needs attention so your business stays prepared for GST/HST and year-end filing.</p>
            <div className="compliance-tip"><span>✓</span><div><strong>Good recordkeeping</strong><small>Supports accurate CRA filings</small></div></div>
            <div className="compliance-tip"><span>✦</span><div><strong>Clear next steps</strong><small>Every task has a visible status</small></div></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
