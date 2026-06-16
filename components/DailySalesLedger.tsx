'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui';

// ── Types ──────────────────────────────────────────────────────────────────
interface SaleEntry {
  sale: number; po: number; bill: number; pr: number; cc: number;
  entered: boolean; changeReason: string | null; changedAt: string | null;
  dbId?: string;
}
interface PayoutEntry {
  id?: string; date: string; amount: number; cat: string; subtype: string; desc: string;
  payoutId?: string; // Link to the 'payouts' table
}
interface CategoryDef {
  label: string; color: string; text: string; subs: string[];
}
interface SalesStore { [key: string]: { [day: number]: SaleEntry } }
interface PayoutStore { [key: string]: PayoutEntry[] }
interface DistValues { bud: number; cdc: number; heid: number; glaz: number; fil: number }

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DEFAULT_CATEGORIES: Record<string, CategoryDef> = {
  bill:    { label:'Bill',     color:'#E6F1FB', text:'#0C447C', subs:['Gas','Electric','WiFi/Internet','Rent','Phone','Insurance','Water','ADP','ADT','Sales Tax'] },
  alcohol: { label:'Alcohol',  color:'#FAECE7', text:'#712B13', subs:['Budweiser','CDC','Heidelberg','Glazers'] },
  tobacco: { label:'Tobacco',  color:'#FAEEDA', text:'#633806', subs:['Filichia'] },
  payroll: { label:'Pay roll', color:'#EAF3DE', text:'#27500A', subs:['Weekly','Bi-weekly'] },
  other:   { label:'Other',    color:'#F1EFE8', text:'#444441', subs:[] },
};

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const hasData = (e?: SaleEntry) =>
  e && ((e.sale || 0) || (e.po || 0) || (e.bill || 0) || (e.pr || 0) || (e.cc || 0) || e.entered);

const mk = (y: number, m: number) => `${y}-${m}`;

// ── Component ──────────────────────────────────────────────────────────────
export default function DailySalesLedger({ storeId }: { storeId: string }) {
  const supabase = createClient();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState<'sales'|'payouts'|'distributions'>('sales');

  const [salesStore,   setSalesStore]   = useState<SalesStore>({});
  const [payoutStore,  setPayoutStore]  = useState<PayoutStore>({});
  const [categories,   setCategories]   = useState<Record<string, CategoryDef>>(DEFAULT_CATEGORIES);
  const [dist, setDist] = useState<DistValues>({ bud:0, cdc:0, heid:0, glaz:0, fil:0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [entryModal,  setEntryModal]  = useState(false);
  const [payoutModal, setPayoutModal] = useState(false);

  // Entry form
  const [efDay,    setEfDay]    = useState(1);
  const [efSale,   setEfSale]   = useState('');
  const [efPo,     setEfPo]     = useState('');
  const [efBill,   setEfBill]   = useState('');
  const [efPr,     setEfPr]     = useState('');
  const [efCc,     setEfCc]     = useState('');
  const [efReason, setEfReason] = useState('');
  const [efIsEdit, setEfIsEdit] = useState(false);

  // Payout form
  const [pfDate,    setPfDate]    = useState('');
  const [pfAmount,  setPfAmount]  = useState('');
  const [pfCat,     setPfCat]     = useState('bill');
  const [pfSubtype, setPfSubtype] = useState('');
  const [pfDesc,    setPfDesc]    = useState('');
  const [pfEditIdx, setPfEditIdx] = useState<number|null>(null);

  // ── Data Fetching ──────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', user.id);

      if (data) {
        const newSales: SalesStore = {};
        const newPayouts: PayoutStore = {};

        data.forEach(row => {
          // Check if this row belongs to the current store
          if (row.data?.storeId !== storeId) return;

          const key = mk(row.year, row.month - 1);
          if (row.type === 'sale') {
            if (!newSales[key]) newSales[key] = {};
            newSales[key][row.day] = { ...row.data, dbId: row.id, entered: true };
          } else if (row.type === 'payout') {
            if (!newPayouts[key]) newPayouts[key] = [];
            newPayouts[key].push({ ...row.data, id: row.id });
          }
        });
        setSalesStore(newSales);
        setPayoutStore(newPayouts);
      }
      setLoading(false);
    }
    loadData();
  }, [storeId, supabase]);

  // ── Derived data ───────────────────────────────────────────────────────
  const getSales   = useCallback(() => salesStore[mk(year, month)]  || {}, [salesStore, year, month]);
  const getPayouts = useCallback(() => payoutStore[mk(year, month)] || [], [payoutStore, year, month]);

  const changeMonth = (dir: number) => {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0)  { m = 11; y--; }
    setMonth(m); setYear(y);
  };

  // ── Entry modal ────────────────────────────────────────────────────────
  const openEntryModal = (d: number | null) => {
    const nDays = daysInMonth(year, month);
    const day = d ?? (now.getFullYear() === year && now.getMonth() === month ? now.getDate() : 1);
    const clamped = Math.min(Math.max(day, 1), nDays);
    loadDay(clamped);
    setEntryModal(true);
  };

  const loadDay = (d: number) => {
    const e = getSales()[d];
    const has = !!hasData(e);
    setEfDay(d);
    setEfSale(has ? String(e!.sale ?? 0) : '');
    setEfPo(has   ? String(e!.po   ?? 0) : '');
    setEfBill(has ? String(e!.bill ?? 0) : '');
    setEfPr(has   ? String(e!.pr   ?? 0) : '');
    setEfCc(has   ? String(e!.cc   ?? 0) : '');
    setEfReason('');
    setEfIsEdit(has);
  };

  const saveEntry = async () => {
    const fields = [efSale, efPo, efBill, efPr, efCc];
    if (fields.some(f => f.trim() === '')) {
      alert('Please enter a value for every field — type 0 where there\'s nothing.');
      return;
    }
    if (efIsEdit && !efReason.trim()) {
      alert('Please note a reason for changing an existing entry.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const existing = getSales()[efDay];
    const sale = parseFloat(efSale) || 0;
    const po = parseFloat(efPo) || 0;
    const bill = parseFloat(efBill) || 0;
    const pr = parseFloat(efPr) || 0;
    const cc = parseFloat(efCc) || 0;

    const entryData = {
      sale, po, bill, pr, cc,
      changeReason: efIsEdit ? efReason : (existing?.changeReason ?? null),
      changedAt: efIsEdit ? new Date().toLocaleString() : (existing?.changedAt ?? null),
      storeId
    };

    const payload = {
      user_id: user.id,
      year,
      month: month + 1,
      day: efDay,
      type: 'sale',
      data: entryData
    };

    const { data, error } = await supabase
      .from('ledger_entries')
      .upsert(payload, { onConflict: 'user_id, year, month, day, type' })
      .select()
      .single();

    if (error) {
      alert('Error saving entry: ' + error.message);
    } else {
      // Sync to daily_ledger for dashboard consistency
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(efDay).padStart(2, '0')}`;
      const ds = sale - (po + bill + pr);
      
      await supabase
        .from('daily_ledger')
        .upsert({
          store_id: storeId,
          date: dateStr,
          sale: sale,
          pay_out: po,
          bills: bill,
          payroll: pr,
          day_savings: ds,
          notes: efReason || (existing?.changeReason ?? null)
        }, { onConflict: 'store_id, date' });

      const key = mk(year, month);
      setSalesStore(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [efDay]: {
            ...entryData,
            entered: true,
            dbId: data.id
          }
        }
      }));
      setEntryModal(false);
    }
    setSaving(false);
  };

  // ── Payout modal ───────────────────────────────────────────────────────
  const openPayoutModal = (index: number | null) => {
    if (index !== null) {
      const e = getPayouts()[index];
      setPfDate(e.date); setPfAmount(String(e.amount));
      setPfCat(e.cat); setPfSubtype(e.subtype); setPfDesc(e.desc || '');
      setPfEditIdx(index);
    } else {
      const d = `${year}-${String(month + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      setPfDate(d); setPfAmount(''); setPfCat('bill');
      setPfSubtype(categories['bill'].subs[0] || ''); setPfDesc('');
      setPfEditIdx(null);
    }
    setPayoutModal(true);
  };

  const savePayout = async () => {
    if (!pfDate) { alert('Please choose a date.'); return; }
    if (!pfAmount.trim()) { alert('Please enter an amount.'); return; }
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const amount = parseFloat(pfAmount) || 0;
    const existing = pfEditIdx !== null ? getPayouts()[pfEditIdx] : null;

    // First, sync to the main payouts table
    const payoutPayload: any = {
      store_id: storeId,
      recipient_name: pfSubtype || categories[pfCat]?.label || 'Payout',
      amount,
      method: 'cash',
      date: pfDate,
      status: 'paid',
      notes: pfDesc
    };

    // If we have an existing payout, we need to find its ID in the payouts table
    if (existing && existing.payoutId) {
      payoutPayload.id = existing.payoutId;
    }

    const { data: pData, error: pError } = await supabase
      .from('payouts')
      .upsert(payoutPayload)
      .select()
      .single();

    if (pError) {
      console.error('Error syncing to payouts table:', pError);
    }

    const entryData = {
      date: pfDate,
      amount,
      cat: pfCat,
      subtype: pfSubtype,
      desc: pfDesc,
      storeId,
      payoutId: pData?.id // Store the link
    };

    const payload: any = {
      user_id: user.id,
      year,
      month: month + 1,
      day: null, // Multiple payouts allowed with null day in unique constraint
      type: 'payout',
      data: entryData
    };

    if (existing?.id) payload.id = existing.id;

    const { data, error } = await supabase
      .from('ledger_entries')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      alert('Error saving payout: ' + error.message);
    } else {
      const entry: PayoutEntry = {
        ...entryData,
        id: data.id,
      };
      const key = mk(year, month);
      setPayoutStore(prev => {
        const list = [...(prev[key] || [])];
        if (pfEditIdx !== null) list[pfEditIdx] = entry;
        else list.push(entry);
        list.sort((a, b) => a.date.localeCompare(b.date));
        return { ...prev, [key]: list };
      });
      setPayoutModal(false);
    }
    setSaving(false);
  };

  const deletePayout = async (i: number) => {
    const e = getPayouts()[i];
    if (!e.id) return;
    if (!confirm(`Remove this ${categories[e.cat]?.label || ''} payout of $${fmt(e.amount)}?`)) return;
    
    setSaving(true);
    
    // Also delete from payouts table if we have the link
    if ((e as any).payoutId) {
      await supabase.from('payouts').delete().eq('id', (e as any).payoutId);
    }

    const { error } = await supabase.from('ledger_entries').delete().eq('id', e.id);
    
    if (error) {
      alert('Error deleting payout: ' + error.message);
    } else {
      const key = mk(year, month);
      setPayoutStore(prev => {
        const list = [...(prev[key] || [])];
        list.splice(i, 1);
        return { ...prev, [key]: list };
      });
    }
    setSaving(false);
  };

  const saveDistributions = async () => {
    // Keeping local for now as not part of the requested ledger_entries schema
    alert('Distributions functionality currently limited to session state.');
  };

  // ── Category helpers ───────────────────────────────────────────────────
  const handleCatChange = (val: string) => {
    if (val === '__add') {
      const name = prompt('New category name:');
      if (name?.trim()) {
        const trimmed = name.trim();
        const existing = Object.keys(categories).find(k => categories[k].label.toLowerCase() === trimmed.toLowerCase());
        if (existing) { alert(`"${categories[existing].label}" already exists.`); setPfCat(existing); return; }
        const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g,'_') + '_' + Date.now().toString().slice(-4);
        setCategories(prev => ({ ...prev, [key]: { label: trimmed, color:'#F1EFE8', text:'#444441', subs:[] } }));
        setPfCat(key); setPfSubtype('');
      }
      return;
    }
    setPfCat(val);
    setPfSubtype(categories[val]?.subs[0] || '');
  };

  const handleSubChange = (val: string) => {
    if (val === '__add') {
      const name = prompt('New sub-type name:');
      if (name?.trim()) {
        const trimmed = name.trim();
        setCategories(prev => ({
          ...prev,
          [pfCat]: { ...prev[pfCat], subs: [...(prev[pfCat]?.subs || []), trimmed] }
        }));
        setPfSubtype(trimmed);
      }
      return;
    }
    setPfSubtype(val);
  };

  // Enter-to-save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'SELECT') return;
      if (entryModal)  { e.preventDefault(); saveEntry(); }
      if (payoutModal) { e.preventDefault(); savePayout(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── Sales render data ──────────────────────────────────────────────────
  const buildSalesRows = (): {
    rows: any[];
    totSale: number;
    totPO: number;
    totBill: number;
    totPR: number;
    totCC: number;
    runPayout: number;
    runSave: number;
    filled: number;
    nDays: number;
  } => {
    const data = getSales();
    const nDays = daysInMonth(year, month);
    let runPayout = 0, runSave = 0, totSale = 0, totPO = 0, totBill = 0, totPR = 0, totCC = 0;
    const rows = [];
    for (let d = 1; d <= nDays; d++) {
      const e = data[d];
      const has = !!hasData(e);
      const sale = e?.sale || 0, po = e?.po || 0, bill = e?.bill || 0, pr = e?.pr || 0, cc = e?.cc || 0;
      const dayPayout = po + bill + pr;
      runPayout += dayPayout;
      const ds = sale - dayPayout;
      runSave += ds;
      totSale += sale; totPO += po; totBill += bill; totPR += pr; totCC += cc;
      const dow = new Date(year, month, d).getDay();
      rows.push({ d, has, sale, po, bill, pr, cc, runPayout, ds, runSave, dow, changeReason: e?.changeReason });
    }
    return { rows, totSale, totPO, totBill, totPR, totCC, runPayout, runSave, filled: Object.keys(data).filter(d => hasData(data[+d])).length, nDays };
  };

  const buildPayoutSummary = (): { totals: Record<string, number>; grand: number } => {
    const entries = getPayouts();
    const totals: Record<string, number> = {};
    let grand = 0;
    entries.forEach(e => { totals[e.cat] = (totals[e.cat] || 0) + (e.amount || 0); grand += e.amount || 0; });
    return { totals, grand };
  };

  const buildTax = (): { payAlc: number; payTob: number; totalAlc: number; totalTob: number; alcTax: number; tobTax: number } => {
    const distAlc = dist.bud + dist.cdc + dist.heid + dist.glaz;
    const distTob = dist.fil;
    let payAlc = 0, payTob = 0;
    getPayouts().forEach(e => { if (e.cat==='alcohol') payAlc += e.amount||0; if (e.cat==='tobacco') payTob += e.amount||0; });
    const totalAlc = distAlc + payAlc, totalTob = distTob + payTob;
    return { payAlc, payTob, totalAlc, totalTob, alcTax: totalAlc*0.25, tobTax: totalTob*0.08 };
  };

  const { rows, totSale, totPO, totBill, totPR, totCC, runPayout: totalRunPayout, runSave: totalRunSave, filled, nDays } = buildSalesRows();
  const { totals: payTotals, grand: payGrand } = buildPayoutSummary();
  const tax = buildTax();
  const efDs = (parseFloat(efSale)||0) - (parseFloat(efPo)||0) - (parseFloat(efBill)||0) - (parseFloat(efPr)||0);
  const catSubs = categories[pfCat]?.subs || [];

  // ── Styles (mirrors original CSS vars) ────────────────────────────────
  const s: Record<string, React.CSSProperties> = {
    app:       { padding: '1rem 0', fontFamily: 'var(--font-sans, system-ui, sans-serif)' },
    tabs:      { display:'flex', gap:4, marginBottom:'1.25rem' },
    tab:       { padding:'9px 18px', fontSize:13, cursor:'pointer', borderWidth:'0.5px', borderStyle:'solid', borderColor:'var(--color-border-tertiary,#e0e0e0)', background:'var(--color-background-secondary,#f5f5f5)', color:'var(--color-text-secondary,#666)', borderRadius:6 },
    tabActive: { color:'var(--color-text-primary,#111)', background:'var(--color-background-primary,#fff)', borderColor:'var(--color-border-primary,#bbb)', fontWeight:500 },
    header:    { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem', gap:8, flexWrap:'wrap' as const },
    monthNav:  { display:'flex', alignItems:'center', gap:6 },
    navBtn:    { background:'var(--color-background-secondary,#f5f5f5)', border:'0.5px solid var(--color-border-secondary,#ddd)', borderRadius:6, padding:'7px 11px', cursor:'pointer', color:'var(--color-text-primary,#111)', fontSize:13, lineHeight:1 },
    monthLabel:{ fontSize:16, fontWeight:500, minWidth:140, textAlign:'center' as const },
    addBtn:    { background:'var(--color-text-primary,#111)', color:'var(--color-background-primary,#fff)', border:'none', borderRadius:6, padding:'8px 16px', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6 },
    summaryGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(118px,1fr))', gap:8, marginBottom:'1.25rem' },
    stat:      { background:'var(--color-background-secondary,#f5f5f5)', border:'0.5px solid var(--color-border-tertiary,#e0e0e0)', borderRadius:6, padding:'10px 12px' },
    statLabel: { fontSize:11, color:'var(--color-text-secondary,#666)', marginBottom:3 },
    statVal:   { fontSize:18, fontWeight:500, color:'var(--color-text-primary,#111)' },
    tableWrap: { overflowX:'auto' as const, border:'1px solid var(--color-border-secondary,#ddd)', borderRadius:8 },
    table:     { width:'100%', borderCollapse:'collapse' as const, fontSize:12, minWidth:780, tableLayout:'fixed' as const },
    th:        { padding:'9px 8px', textAlign:'left' as const, fontWeight:500, color:'var(--color-text-secondary,#666)', fontSize:11, borderBottom:'1px solid var(--color-border-secondary,#ddd)', borderRight:'0.5px solid var(--color-border-tertiary,#e0e0e0)', whiteSpace:'nowrap' as const, overflow:'hidden' as const, background:'var(--color-background-secondary,#f5f5f5)' },
    thR:       { textAlign:'right' as const },
    td:        { padding:'8px', borderBottom:'0.5px solid var(--color-border-tertiary,#e0e0e0)', borderRight:'0.5px solid var(--color-border-tertiary,#e0e0e0)', color:'var(--color-text-primary,#111)', verticalAlign:'middle' as const },
    tfoot:     { fontWeight:500, background:'var(--color-background-secondary,#f5f5f5)', fontSize:11, color:'var(--color-text-secondary,#666)', padding:'9px 8px', borderTop:'1px solid var(--color-border-secondary,#ddd)' },
    tfootVal:  { color:'var(--color-text-primary,#111)', fontSize:12, textAlign:'right' as const },
    rowAct:    { background:'transparent', border:'0.5px solid transparent', cursor:'pointer', color:'var(--color-text-tertiary,#aaa)', padding:'4px 6px', borderRadius:4, fontSize:13 },
    overlay:   { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.45)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' },
    modal:     { background:'var(--color-background-primary,#fff)', borderRadius:10, border:'1px solid var(--color-border-secondary,#ddd)', padding:'1.25rem', width:'100%', maxWidth:360 },
    frow:      { display:'flex', flexDirection:'column' as const, gap:4, marginBottom:11 },
    flabel:    { fontSize:11, color:'var(--color-text-secondary,#666)' },
    finput:    { background:'var(--color-background-secondary,#f5f5f5)', border:'0.5px solid var(--color-border-secondary,#ddd)', borderRadius:6, padding:'9px 10px', color:'var(--color-text-primary,#111)', fontSize:14 },
    preview:   { display:'flex', justifyContent:'space-between', fontSize:13, padding:'9px 10px', background:'var(--color-background-secondary,#f5f5f5)', borderRadius:6, marginBottom:11 },
    formActions:{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:6 },
    btnPrimary: { background:'var(--color-text-primary,#111)', color:'var(--color-background-primary,#fff)', border:'none', borderRadius:6, padding:'9px 18px', cursor:'pointer', fontSize:14 },
    btnCancel:  { background:'transparent', border:'0.5px solid var(--color-border-secondary,#ddd)', borderRadius:6, padding:'9px 18px', cursor:'pointer', fontSize:14, color:'var(--color-text-primary,#111)' },
    twoCol:    { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' },
    panel:     { border:'1px solid var(--color-border-secondary,#ddd)', borderRadius:8, overflow:'hidden' as const },
    panelHead: { fontSize:13, fontWeight:500, padding:'10px 14px', background:'var(--color-background-secondary,#f5f5f5)', borderBottom:'1px solid var(--color-border-secondary,#ddd)', color:'var(--color-text-primary,#111)' },
    distRow:   { display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderBottom:'0.5px solid var(--color-border-tertiary,#e0e0e0)' },
    distLabel: { fontSize:12, color:'var(--color-text-secondary,#666)', minWidth:90, flexShrink:0 },
    distInput: { flex:1, background:'var(--color-background-secondary,#f5f5f5)', border:'0.5px solid var(--color-border-tertiary,#e0e0e0)', borderRadius:6, padding:'6px 9px', color:'var(--color-text-primary,#111)', fontSize:12, textAlign:'right' as const },
    taxBlock:  { border:'1px solid var(--color-border-secondary,#ddd)', borderRadius:8, overflow:'hidden' as const },
    taxRow:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 14px', borderBottom:'0.5px solid var(--color-border-tertiary,#e0e0e0)', fontSize:12 },
    taxLabel:  { color:'var(--color-text-secondary,#666)' },
    taxVal:    { color:'var(--color-text-primary,#111)', fontWeight:500 },
    crumb:     { fontSize:12, color:'var(--color-text-secondary,#666)', marginBottom:10, display:'flex', alignItems:'center', gap:6, cursor:'pointer' },
    hint:      { fontSize:11, color:'var(--color-text-tertiary,#aaa)', marginTop:8, textAlign:'center' as const },
    reasonBox: { background:'#fffbe6', border:'0.5px solid #f0c040', borderRadius:6, padding:'9px 10px', marginBottom:11 },
  };

  const pos = { color:'var(--color-text-success,#2a7a2a)' };
  const neg = { color:'var(--color-text-danger,#c0392b)' };
  const muted = { color:'var(--color-text-tertiary,#aaa)' };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div style={s.app}>
      {saving && (
        <div style={{ position:'fixed', top:20, right:20, zIndex:100, background:'#111', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:12, display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
          <Spinner className="h-3 w-3 border-white" /> Saving...
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {(['sales','payouts','distributions'] as const).map(t => (
          <button key={t} style={{ ...s.tab, ...(activeTab===t ? s.tabActive : {}) }} onClick={() => setActiveTab(t)}>
            {t==='sales'?'Daily sales':t==='payouts'?'Payouts':'Distributors & tax'}
          </button>
        ))}
      </div>

      {/* ── SALES TAB ── */}
      {activeTab === 'sales' && (
        <>
          <div style={s.header}>
            <div style={s.monthNav}>
              <button style={s.navBtn} onClick={() => changeMonth(-1)}>‹</button>
              <span style={s.monthLabel}>{MONTHS[month]} {year}</span>
              <button style={s.navBtn} onClick={() => changeMonth(1)}>›</button>
            </div>
            <button style={s.addBtn} onClick={() => openEntryModal(null)}>+ Add entry</button>
          </div>
          <div style={s.summaryGrid}>
            {[
              { label:'Total sales',   val:'$'+fmt(totSale), style:{} },
              { label:'Total payout',  val:'$'+fmt(totalRunPayout), style: neg },
              { label:'Total bills',   val:'$'+fmt(totBill), style:{} },
              { label:'Pay roll',      val:'$'+fmt(totPR), style:{} },
              { label:'Net saving',    val:(totalRunSave>=0?'+':'')+`$${fmt(totalRunSave)}`, style: totalRunSave>=0 ? pos : neg },
              { label:'Days filled',   val:`${filled} / ${nDays}`, style:{} },
            ].map(c => (
              <div key={c.label} style={s.stat}>
                <div style={s.statLabel}>{c.label}</div>
                <div style={{ ...s.statVal, ...c.style }}>{c.val}</div>
              </div>
            ))}
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <colgroup>
                <col style={{width:44}}/><col style={{width:52}}/><col style={{width:80}}/><col style={{width:74}}/>
                <col style={{width:74}}/><col style={{width:78}}/><col style={{width:86}}/><col style={{width:86}}/>
                <col style={{width:88}}/><col style={{width:70}}/><col style={{width:44}}/>
              </colgroup>
              <thead>
                <tr>
                  {['Date','Day','Sale','P.O','Bill','Pay roll','Total P.O','Day saving','Total saving','C-C',''].map((h,i) => (
                    <th key={i} style={{ ...s.th, ...(i>=2 && i<=9 ? s.thR : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ d, has, sale, po, bill, pr, cc, runPayout, ds, runSave, dow, changeReason }) => {
                  const isSun = dow === 0;
                  const rowBg = isSun ? 'var(--color-background-secondary,#f5f5f5)' : 'transparent';
                  const cell = (v: number) => has ? '$'+fmt(v) : <span style={muted}>—</span>;
                  const cellPayout = (v: number) => has ? (v ? <span style={neg}>${fmt(v)}</span> : '$0.00') : <span style={muted}>—</span>;
                  const fmtS = (v: number) => has
                    ? <span style={v>0?pos:neg}>{v>0?'+':''}{`$${fmt(v)}`}</span>
                    : <span style={muted}>—</span>;
                  return (
                    <tr key={d} style={{ background: rowBg }}>
                      <td style={{ ...s.td, fontWeight:500, whiteSpace:'nowrap' }}>
                        {d}{changeReason && <span title={`Changed: ${changeReason}`} style={{ color:'var(--color-text-warning,#b8860b)', fontSize:12, marginLeft:3, cursor:'help' }}>⏱</span>}
                      </td>
                      <td style={{ ...s.td, color:'var(--color-text-secondary,#666)', whiteSpace:'nowrap' }}>{DAYS[dow]}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{cell(sale)}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{cellPayout(po)}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{cellPayout(bill)}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{cellPayout(pr)}</td>
                      <td style={{ ...s.td, textAlign:'right', ...muted }}>{has ? '$'+fmt(runPayout) : '—'}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{fmtS(ds)}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{fmtS(runSave)}</td>
                      <td style={{ ...s.td, textAlign:'right' }}>{cell(cc)}</td>
                      <td style={{ ...s.td, textAlign:'right', borderRight:'none' }}>
                        <button style={s.rowAct} onClick={() => openEntryModal(d)} aria-label={`Edit day ${d}`}>
                          {has ? '✎' : '+'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ ...s.tfoot, ...muted }}>Totals</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totSale)}</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totPO)}</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totBill)}</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totPR)}</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totalRunPayout)}</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totalRunSave)}</td>
                  <td style={s.tfoot}></td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(totCC)}</td>
                  <td style={s.tfoot}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ── PAYOUTS TAB ── */}
      {activeTab === 'payouts' && (
        <>
          <div style={s.header}>
            <div style={s.monthNav}>
              <button style={s.navBtn} onClick={() => changeMonth(-1)}>‹</button>
              <span style={s.monthLabel}>{MONTHS[month]} {year}</span>
              <button style={s.navBtn} onClick={() => changeMonth(1)}>›</button>
            </div>
            <button style={s.addBtn} onClick={() => openPayoutModal(null)}>+ Add payout</button>
          </div>
          <div style={s.summaryGrid}>
            <div style={s.stat}><div style={s.statLabel}>Total payouts</div><div style={{ ...s.statVal, ...neg }}>${fmt(payGrand)}</div></div>
            {['bill','alcohol','tobacco','payroll'].map(c => (
              <div key={c} style={s.stat}><div style={s.statLabel}>{categories[c]?.label}</div><div style={s.statVal}>${fmt(payTotals[c]||0)}</div></div>
            ))}
          </div>
          <div style={s.tableWrap}>
            <table style={{ ...s.table, minWidth:600 }}>
              <colgroup><col style={{width:74}}/><col style={{width:90}}/><col style={{width:104}}/><col/><col style={{width:100}}/><col style={{width:74}}/></colgroup>
              <thead>
                <tr>
                  {['Date','Amount','Category','Description','Sub-type',''].map((h,i) => (
                    <th key={i} style={{ ...s.th, ...(i===1 ? s.thR : {}) }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getPayouts().length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:'2rem', ...muted }}>No payouts yet — tap "Add payout".</td></tr>
                ) : getPayouts().map((e, i) => {
                  const p = e.date?.split('-') || [];
                  const disp = p.length===3 ? `${p[1]}/${p[2]}` : '—';
                  const cat = categories[e.cat] || categories.other;
                  return (
                    <tr key={i}>
                      <td style={s.td}>{disp}</td>
                      <td style={{ ...s.td, textAlign:'right', ...neg }}>${fmt(e.amount)}</td>
                      <td style={s.td}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:500, background:cat.color, color:cat.text }}>{cat.label}</span></td>
                      <td style={{ ...s.td, ...muted, fontSize:11 }}>{e.desc}</td>
                      <td style={{ ...s.td, ...muted, fontSize:11 }}>{e.subtype}</td>
                      <td style={{ ...s.td, textAlign:'right', borderRight:'none', whiteSpace:'nowrap' }}>
                        <button style={s.rowAct} onClick={() => openPayoutModal(i)}>✎</button>
                        <button style={{ ...s.rowAct }} onClick={() => deletePayout(i)}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ ...s.tfoot, ...muted }}>Total</td>
                  <td style={{ ...s.tfoot, ...s.tfootVal }}>${fmt(payGrand)}</td>
                  <td colSpan={4} style={s.tfoot}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ── DISTRIBUTIONS TAB ── */}
      {activeTab === 'distributions' && (
        <>
          <div style={s.header}>
            <div style={s.monthNav}>
              <button style={s.navBtn} onClick={() => changeMonth(-1)}>‹</button>
              <span style={s.monthLabel}>{MONTHS[month]} {year}</span>
              <button style={s.navBtn} onClick={() => changeMonth(1)}>›</button>
            </div>
            <button style={s.addBtn} onClick={saveDistributions} disabled={saving}>
              {saving ? 'Saving...' : 'Save distributions'}
            </button>
          </div>
          <div style={s.twoCol}>
            <div style={s.panel}>
              <div style={s.panelHead}>Alcohol distributors</div>
              {([['bud','Budweiser'],['cdc','CDC'],['heid','Heidelberg'],['glaz','Glazers']] as const).map(([k,label]) => (
                <div key={k} style={s.distRow}>
                  <span style={s.distLabel}>{label}</span>
                  <input style={s.distInput} type="number" placeholder="0.00" step="0.01"
                    value={dist[k] || ''} onChange={e => setDist(prev => ({ ...prev, [k]: parseFloat(e.target.value)||0 }))} />
                </div>
              ))}
            </div>
            <div style={s.panel}>
              <div style={s.panelHead}>Tobacco distributor</div>
              <div style={s.distRow}>
                <span style={s.distLabel}>Filichia</span>
                <input style={s.distInput} type="number" placeholder="0.00" step="0.01"
                  value={dist.fil || ''} onChange={e => setDist(prev => ({ ...prev, fil: parseFloat(e.target.value)||0 }))} />
              </div>
              <div style={{ ...s.distRow, borderTop:'1px solid var(--color-border-secondary,#ddd)' }}>
                <span style={s.distLabel}>Alcohol payouts</span>
                <span style={{ ...s.distLabel, minWidth:'unset', textAlign:'right', flex:1 }}>${fmt(tax.payAlc)}</span>
              </div>
              <div style={s.distRow}>
                <span style={s.distLabel}>Tobacco payouts</span>
                <span style={{ ...s.distLabel, minWidth:'unset', textAlign:'right', flex:1 }}>${fmt(tax.payTob)}</span>
              </div>
            </div>
          </div>
          <div style={s.taxBlock}>
            <div style={s.panelHead}>Tax summary</div>
            <div style={s.taxRow}><span style={s.taxLabel}>Combined alcohol total</span><span style={s.taxVal}>${fmt(tax.totalAlc)}</span></div>
            <div style={{ ...s.taxRow, paddingLeft:26 }}><span style={s.taxLabel}>Alcohol tax collected (× 0.25)</span><span style={s.taxVal}>${fmt(tax.alcTax)}</span></div>
            <div style={s.taxRow}><span style={s.taxLabel}>Combined tobacco total</span><span style={s.taxVal}>${fmt(tax.totalTob)}</span></div>
            <div style={{ ...s.taxRow, paddingLeft:26 }}><span style={s.taxLabel}>Tobacco tax collected (× 0.08)</span><span style={s.taxVal}>${fmt(tax.tobTax)}</span></div>
            <div style={{ ...s.taxRow, borderBottom:'none', background:'var(--color-background-secondary,#f5f5f5)', padding:'11px 14px' }}>
              <span style={{ ...s.taxLabel, fontWeight:500, color:'var(--color-text-primary,#111)' }}>Total taxes collected</span>
              <span style={{ ...s.taxVal, color:'var(--color-text-warning,#b8860b)', fontSize:15 }}>${fmt(tax.alcTax + tax.tobTax)}</span>
            </div>
          </div>
        </>
      )}

      {/* ── ENTRY MODAL ── */}
      {entryModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setEntryModal(false); }}>
          <div style={s.modal}>
            <div style={s.crumb} onClick={() => setEntryModal(false)}>← Daily sales</div>
            <h3 style={{ fontSize:16, fontWeight:500, marginBottom:'1rem' }}>
              {efIsEdit ? 'Edit' : 'Add'} entry — {DAYS[new Date(year,month,efDay).getDay()]}, {MONTHS[month]} {efDay}
            </h3>
            <div style={s.frow}>
              <label style={s.flabel}>Day of month</label>
              <select style={s.finput} value={efDay} onChange={e => { setEfDay(+e.target.value); loadDay(+e.target.value); }}>
                {Array.from({ length: daysInMonth(year, month) }, (_, i) => i+1).map(d => (
                  <option key={d} value={d}>{d} — {DAYS[new Date(year,month,d).getDay()]}</option>
                ))}
              </select>
            </div>
            {[
              { label:'Sale ($)',       val:efSale,   set:setEfSale },
              { label:'P.O — payout ($)', val:efPo,  set:setEfPo },
              { label:'Bill ($)',       val:efBill,   set:setEfBill },
              { label:'Pay roll ($)',   val:efPr,     set:setEfPr },
              { label:'C-C ($)',        val:efCc,     set:setEfCc },
            ].map(f => (
              <div key={f.label} style={s.frow}>
                <label style={s.flabel}>{f.label}</label>
                <input style={s.finput} type="number" placeholder="amount or 0" step="0.01"
                  value={f.val} onChange={e => f.set(e.target.value)} />
              </div>
            ))}
            <div style={s.preview}>
              <span style={muted}>Day saving</span>
              <span style={{ fontWeight:500, ...(efDs>=0 ? pos : neg) }}>{efDs>=0?'+$':'-$'}{fmt(Math.abs(efDs))}</span>
            </div>
            {efIsEdit && (
              <div style={s.reasonBox}>
                <label style={{ fontSize:11, color:'#b8860b', fontWeight:500, display:'block', marginBottom:4 }}>⚠ Reason for changing this entry</label>
                <input style={{ ...s.finput, width:'100%', fontSize:13 }} type="text" placeholder="e.g. corrected register miscount"
                  value={efReason} onChange={e => setEfReason(e.target.value)} />
              </div>
            )}
            <div style={s.formActions}>
              <button style={s.btnCancel} onClick={() => setEntryModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={saveEntry} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
            <div style={s.hint}>All fields required — enter 0 where there's nothing</div>
          </div>
        </div>
      )}

      {/* ── PAYOUT MODAL ── */}
      {payoutModal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setPayoutModal(false); }}>
          <div style={s.modal}>
            <div style={s.crumb} onClick={() => setPayoutModal(false)}>← Payouts</div>
            <h3 style={{ fontSize:16, fontWeight:500, marginBottom:'1rem' }}>{pfEditIdx !== null ? 'Edit' : 'Add'} payout</h3>
            <div style={s.frow}>
              <label style={s.flabel}>Date</label>
              <input style={s.finput} type="date" value={pfDate} onChange={e => setPfDate(e.target.value)} />
            </div>
            <div style={s.frow}>
              <label style={s.flabel}>Amount ($)</label>
              <input style={s.finput} type="number" placeholder="0.00" step="0.01" value={pfAmount} onChange={e => setPfAmount(e.target.value)} />
            </div>
            <div style={s.frow}>
              <label style={s.flabel}>Category</label>
              <select style={s.finput} value={pfCat} onChange={e => handleCatChange(e.target.value)}>
                {Object.keys(categories).map(k => <option key={k} value={k}>{categories[k].label}</option>)}
                <option value="__add">+ Add new category…</option>
              </select>
            </div>
            <div style={s.frow}>
              <label style={s.flabel}>Sub-type</label>
              <select style={s.finput} value={pfSubtype} onChange={e => handleSubChange(e.target.value)}>
                {catSubs.map(s => <option key={s}>{s}</option>)}
                <option value="Other">Other</option>
                <option value="__add">+ Add new sub-type…</option>
              </select>
            </div>
            <div style={s.frow}>
              <label style={s.flabel}>Description (optional)</label>
              <input style={s.finput} type="text" placeholder="e.g. Monthly electric bill" value={pfDesc} onChange={e => setPfDesc(e.target.value)} />
            </div>
            <div style={s.formActions}>
              <button style={s.btnCancel} onClick={() => setPayoutModal(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={savePayout} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
            <div style={s.hint}>Press Enter to save</div>
          </div>
        </div>
      )}
    </div>
  );
}