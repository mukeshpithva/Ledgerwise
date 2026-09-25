import { useState } from 'react';
import { useBookkeeping } from '../context/BookkeepingContext';
export default function SettingsPage() {
  const { settings, updateSettings, resetData } = useBookkeeping();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = (event) => { event.preventDefault(); updateSettings(form); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return <section className="page"><div className="page-heading"><div><p className="eyebrow">WORKSPACE</p><h1>Settings</h1><p className="muted">Update your business profile and bookkeeping preferences.</p></div></div><article className="panel"><form className="settings-form" onSubmit={submit}><label>Business name<input name="businessName" value={form.businessName} onChange={change} required /></label><label>Owner name<input name="ownerName" value={form.ownerName} onChange={change} required /></label><label>Email<input name="email" type="email" value={form.email} onChange={change} required /></label><label>Currency<select name="currency" value={form.currency} onChange={change}><option>CAD</option><option>USD</option></select></label><label>Fiscal year end<select name="fiscalYearEnd" value={form.fiscalYearEnd} onChange={change}><option>December 31</option><option>March 31</option><option>June 30</option></select></label><div className="form-actions"><button className="primary-button" type="submit">Save settings</button>{saved && <span className="positive">Saved successfully</span>}</div></form></article><article className="panel danger-zone"><h2>Demo data</h2><p className="muted">Reset local data to the starter records. This cannot be undone.</p><button className="danger-button" onClick={resetData}>Reset demo data</button></article></section>;
}
