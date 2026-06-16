'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ShoppingCart, Package, BarChart3, Trash2, Plus, Minus, X, Search,
  Delete, DollarSign, CreditCard, Banknote, Check, AlertTriangle,
  Pencil, ScanLine, Receipt, RotateCcw, TrendingUp, Box, Hash, Pause,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Persistent storage layer (falls back to in-memory if unavailable) */
/* ------------------------------------------------------------------ */
const hasStore = typeof window !== "undefined" && (window as any).storage;
const mem: any = {};
const store = {
  async get(key: string) {
    if (hasStore) {
      try { const r = await (window as any).storage.get(key); return r ? r.value : null; }
      catch { return key in mem ? mem[key] : null; }
    }
    return key in mem ? mem[key] : null;
  },
  async set(key: string, value: any) {
    mem[key] = value;
    if (hasStore) { try { await (window as any).storage.set(key, value); } catch { /* ignore */ } }
  },
};

/* ------------------------------------------------------------------ */
/*  Seed catalog                                                       */
/* ------------------------------------------------------------------ */
const CATEGORIES = ["Beverages", "Snacks", "Tobacco", "Grocery", "Other"];
const CAT_COLOR: any = {
  Beverages: "#2563eb",
  Snacks: "#d97706",
  Tobacco: "#14b8a6",
  Grocery: "#059669",
  Other: "#64748b",
};

const SEED = [
  { barcode: "049000050103", name: "Coca-Cola 20oz",   price: 2.49, cost: 1.10, stock: 48, cat: "Beverages", quick: true,  taxable: true,  reorder: 12 },
  { barcode: "012000001291", name: "Pepsi 20oz",        price: 2.49, cost: 1.10, stock: 36, cat: "Beverages", quick: true,  taxable: true,  reorder: 12 },
  { barcode: "611269991000", name: "Red Bull 8.4oz",    price: 3.29, cost: 1.75, stock: 24, cat: "Beverages", quick: true,  taxable: true,  reorder: 8  },
  { barcode: "070847811169", name: "Monster Energy",    price: 3.49, cost: 1.80, stock: 20, cat: "Beverages", quick: true,  taxable: true,  reorder: 8  },
  { barcode: "052000338683", name: "Gatorade 28oz",     price: 2.79, cost: 1.20, stock: 30, cat: "Beverages", quick: false, taxable: true,  reorder: 10 },
  { barcode: "012000005107", name: "Aquafina Water",    price: 1.59, cost: 0.45, stock: 60, cat: "Beverages", quick: true,  taxable: true,  reorder: 24 },
  { barcode: "000000000111", name: "Fountain Coffee",   price: 1.99, cost: 0.35, stock: 999,cat: "Beverages", quick: true,  taxable: true,  reorder: 0  },
  { barcode: "028400090858", name: "Doritos Nacho",     price: 2.29, cost: 0.95, stock: 28, cat: "Snacks",    quick: true,  taxable: true,  reorder: 10 },
  { barcode: "028400064057", name: "Lay's Classic",     price: 2.29, cost: 0.95, stock: 22, cat: "Snacks",    quick: true,  taxable: true,  reorder: 10 },
  { barcode: "040000004271", name: "Snickers Bar",      price: 1.89, cost: 0.70, stock: 40, cat: "Snacks",    quick: true,  taxable: true,  reorder: 15 },
  { barcode: "040000485377", name: "M&M's Peanut",      price: 1.89, cost: 0.70, stock: 35, cat: "Snacks",    quick: false, taxable: true,  reorder: 15 },
  { barcode: "022000119568", name: "Trident Gum",       price: 1.49, cost: 0.55, stock: 50, cat: "Snacks",    quick: false, taxable: true,  reorder: 20 },
  { barcode: "028000516000", name: "Marlboro Red Pack", price: 9.99, cost: 7.20, stock: 18, cat: "Tobacco",   quick: true,  taxable: true,  reorder: 10 },
  { barcode: "028000516017", name: "Newport Pack",      price: 9.99, cost: 7.20, stock: 14, cat: "Tobacco",   quick: true,  taxable: true,  reorder: 10 },
  { barcode: "070330005006", name: "White Bread",       price: 2.99, cost: 1.40, stock: 9,  cat: "Grocery",   quick: false, taxable: false, reorder: 6  },
  { barcode: "070330005013", name: "Milk 1/2 Gallon",   price: 3.49, cost: 1.90, stock: 7,  cat: "Grocery",   quick: false, taxable: false, reorder: 6  },
  { barcode: "070330005020", name: "Large Eggs Dozen",  price: 3.99, cost: 2.10, stock: 4,  cat: "Grocery",   quick: false, taxable: false, reorder: 6  },
  { barcode: "000000000222", name: "Lottery Scratcher", price: 5.00, cost: 4.00, stock: 100,cat: "Other",     quick: true,  taxable: false, reorder: 0  },
];

const DEFAULT_SETTINGS = { storeName: "Quick Stop Market", taxRate: 7.25 };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const money = (n: number) => "$" + (Number(n) || 0).toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 10);
const todayKey = (d: any) => new Date(d).toISOString().slice(0, 10);

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export default function POS() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("register");
  const [products, setProducts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [cart, setCart] = useState<any[]>([]);           // {key,barcode|null,name,price,qty,taxable,isCustom}
  const [scanInput, setScanInput] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [pad, setPad] = useState(0);              // cents, for manual entry
  const [padTaxable, setPadTaxable] = useState(true);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);   // product object or "new"
  const [toast, setToast] = useState<any>(null);
  const [held, setHeld] = useState<any>(null);

  const scanRef = useRef<HTMLInputElement>(null);
  const clockRef = useRef<any>(null);
  const [now, setNow] = useState(Date.now());

  /* ---------------------------- load ---------------------------- */
  useEffect(() => {
    (async () => {
      const p = await store.get("pos:products");
      const t = await store.get("pos:transactions");
      const s = await store.get("pos:settings");
      setProducts(p ? JSON.parse(p) : SEED);
      setTransactions(t ? JSON.parse(t) : []);
      setSettings(s ? JSON.parse(s) : DEFAULT_SETTINGS);
      setLoaded(true);
    })();
  }, []);

  /* --------------------------- persist -------------------------- */
  useEffect(() => { if (loaded) store.set("pos:products", JSON.stringify(products)); }, [products, loaded]);
  useEffect(() => { if (loaded) store.set("pos:transactions", JSON.stringify(transactions)); }, [transactions, loaded]);
  useEffect(() => { if (loaded) store.set("pos:settings", JSON.stringify(settings)); }, [settings, loaded]);

  /* ---------------------------- clock --------------------------- */
  useEffect(() => {
    clockRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  const flash = useCallback((msg: string, kind = "info") => {
    setToast({ msg, kind, id: uid() });
    setTimeout(() => setToast((cur: any) => (cur && cur.msg === msg ? null : cur)), 2200);
  }, []);

  /* --------------------- cart manipulation ---------------------- */
  const addProductToCart = useCallback((prod: any, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.barcode === prod.barcode && !c.isCustom);
      const inCart = existing ? existing.qty : 0;
      if (prod.reorder !== 0 && inCart + qty > prod.stock) {
        flash(`${prod.name}: only ${prod.stock} in stock`, "warn");
        if (inCart >= prod.stock) return prev;
        qty = prod.stock - inCart;
      }
      if (existing) {
        return prev.map((c) => (c === existing ? { ...c, qty: c.qty + qty } : c));
      }
      return [...prev, {
        key: uid(), barcode: prod.barcode, name: prod.name,
        price: prod.price, qty, taxable: prod.taxable, isCustom: false,
      }];
    });
  }, [flash]);

  const handleBarcode = useCallback((code: string) => {
    const c = String(code).trim();
    if (!c) return;
    const prod = products.find((p) => p.barcode === c);
    if (prod) { addProductToCart(prod); flash(`Added ${prod.name}`, "ok"); }
    else { flash(`Unknown barcode: ${c}`, "warn"); }
    setScanInput("");
  }, [products, addProductToCart, flash]);

  const changeQty = (key: string, delta: number) => {
    setCart((prev) => prev.flatMap((c) => {
      if (c.key !== key) return [c];
      const next = c.qty + delta;
      if (next <= 0) return [];
      if (!c.isCustom) {
        const prod = products.find((p) => p.barcode === c.barcode);
        if (prod && prod.reorder !== 0 && next > prod.stock) {
          flash(`Only ${prod.stock} in stock`, "warn");
          return [c];
        }
      }
      return [{ ...c, qty: next }];
    }));
  };
  const removeLine = (key: string) => setCart((prev) => prev.filter((c: any) => c.key !== key));
  const clearCart = () => { if (cart.length && !window.confirm("Clear the whole cart?")) return; setCart([]); };

  /* ----------------------- number pad --------------------------- */
  const padDigit = (d: number) => setPad((p) => Math.min(p * 10 + d, 99999999));
  const padDouble = () => setPad((p) => Math.min(p * 100, 99999999));
  const padBack = () => setPad((p) => Math.floor(p / 10));
  const padClear = () => setPad(0);
  const addManualItem = () => {
    if (pad <= 0) { flash("Enter an amount first", "warn"); return; }
    setCart((prev) => [...prev, {
      key: uid(), barcode: null, name: "Manual Item",
      price: pad / 100, qty: 1, taxable: padTaxable, isCustom: true,
    }]);
    flash(`Added manual ${money(pad / 100)}`, "ok");
    setPad(0);
  };

  /* ------------------------- totals ----------------------------- */
  const totals = useMemo(() => {
    let subtotal = 0, taxable = 0;
    cart.forEach((c) => { const line = c.price * c.qty; subtotal += line; if (c.taxable) taxable += line; });
    const tax = taxable * (settings.taxRate / 100);
    return { subtotal, tax, total: subtotal + tax, count: cart.reduce((a, c) => a + c.qty, 0) };
  }, [cart, settings.taxRate]);

  /* ---------------------- complete sale ------------------------- */
  const completeSale = (method: string, tendered?: number) => {
    const tx = {
      id: uid(), ts: Date.now(),
      items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty, taxable: c.taxable, barcode: c.barcode })),
      subtotal: totals.subtotal, tax: totals.tax, total: totals.total,
      method, tendered: tendered ?? totals.total, change: method === "cash" ? (tendered ?? totals.total) - totals.total : 0,
    };
    // decrement inventory
    setProducts((prev) => prev.map((p) => {
      const sold = cart.filter((c) => c.barcode === p.barcode && !c.isCustom).reduce((a, c) => a + c.qty, 0);
      return sold ? { ...p, stock: Math.max(p.reorder === 0 ? p.stock : 0, p.stock - sold) } : p;
    }));
    setTransactions((prev) => [tx, ...prev]);
    setReceipt(tx);
    setCart([]);
    setCheckoutOpen(false);
    setPad(0);
  };

  /* ----------------------- product CRUD ------------------------- */
  const saveProduct = (data: any) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.barcode === data.barcode);
      if (editing === "new" || !exists) {
        if (exists) { flash("Barcode already exists", "warn"); return prev; }
        return [...prev, data];
      }
      return prev.map((p) => (p.barcode === editing.barcode ? data : p));
    });
    setEditing(null);
    flash("Product saved", "ok");
  };
  const deleteProduct = (barcode: string) => {
    if (!window.confirm("Delete this product?")) return;
    setProducts((prev) => prev.filter((p) => p.barcode !== barcode));
    setEditing(null);
  };

  /* ------------------- global scanner capture ------------------- */
  useEffect(() => {
    if (view !== "register" || checkoutOpen || editing || receipt) return;
    let buf = "", t = 0;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return; // field handles it
      const ts = performance.now();
      if (ts - t > 90) buf = "";
      t = ts;
      if (e.key === "Enter") { if (buf.length >= 2) handleBarcode(buf); buf = ""; return; }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, checkoutOpen, editing, receipt, handleBarcode]);

  /* --------------------------- derived -------------------------- */
  const quickItems = useMemo(() => products.filter((p) => p.quick), [products]);
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const catOk = activeCat === "All" || p.cat === activeCat;
      const q = search.trim().toLowerCase();
      const sOk = !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q);
      return catOk && sOk;
    });
  }, [products, activeCat, search]);

  const lowStock = useMemo(
    () => products.filter((p) => p.reorder > 0 && p.stock <= p.reorder),
    [products]
  );

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400" style={{ fontFamily: "ui-sans-serif, system-ui" }}>
        Loading register…
      </div>
    );
  }

  /* ============================ render ========================== */
  return (
    <div className="flex flex-col h-screen text-slate-800 select-none" style={{ background: "#eef1f5", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* top bar */}
      <header className="flex items-center justify-between px-4 py-2 text-white shadow-md" style={{ background: "#14181f" }}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center justify-center w-9 h-9 rounded-md font-bold text-slate-900 hover:opacity-80 transition-opacity" style={{ background: "#10b981" }}>
            <ShoppingCart size={20} />
          </Link>
          <div>
            <div className="text-sm font-bold leading-tight">{settings.storeName}</div>
            <div className="text-xs text-slate-400 leading-tight flex items-center gap-2">
              Point of Sale • <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
            </div>
          </div>
        </div>

        <nav className="flex gap-1">
          {[
            ["register", "Register", ShoppingCart],
            ["inventory", "Inventory", Package],
            ["reports", "Reports", BarChart3],
          ].map(([id, label, Icon]: any) => (
            <button key={id} onClick={() => setView(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              style={view === id ? { background: "#10b981", color: "#06281d" } : { color: "#cbd5e1" }}>
              <Icon size={16} /> {label}
              {id === "inventory" && lowStock.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: "#dc2626", color: "white" }}>
                  {lowStock.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="text-right">
          <div className="text-sm font-mono font-semibold">{new Date(now).toLocaleTimeString()}</div>
          <div className="text-xs text-slate-400">Tax {settings.taxRate}%</div>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "register" && (
          <RegisterView
            quickItems={quickItems} filtered={filtered} categories={CATEGORIES}
            activeCat={activeCat} setActiveCat={setActiveCat} search={search} setSearch={setSearch}
            onAdd={addProductToCart} cart={cart} totals={totals}
            scanInput={scanInput} setScanInput={setScanInput} handleBarcode={handleBarcode} scanRef={scanRef}
            changeQty={changeQty} removeLine={removeLine} clearCart={clearCart}
            pad={pad} padDigit={padDigit} padDouble={padDouble} padBack={padBack} padClear={padClear}
            addManualItem={addManualItem} padTaxable={padTaxable} setPadTaxable={setPadTaxable}
            onCheckout={() => cart.length ? setCheckoutOpen(true) : flash("Cart is empty", "warn")}
            held={held}
            onHold={() => { if (cart.length) { setHeld(cart); setCart([]); flash("Sale held", "ok"); } }}
            onResume={() => { if (held) { setCart(held); setHeld(null); flash("Sale resumed", "ok"); } }}
          />
        )}
        {view === "inventory" && (
          <InventoryView products={products} lowStock={lowStock}
            onEdit={(p: any) => setEditing(p)} onNew={() => setEditing("new")}
            onRestock={(bc: string, amt: number) => setProducts((prev) => prev.map((p) => p.barcode === bc ? { ...p, stock: p.stock + amt } : p))}
            onToggleQuick={(bc: string) => setProducts((prev) => prev.map((p) => p.barcode === bc ? { ...p, quick: !p.quick } : p))}
          />
        )}
        {view === "reports" && (
          <ReportsView transactions={transactions} products={products} lowStock={lowStock}
            settings={settings} setSettings={setSettings} />
        )}
      </div>

      {/* checkout modal */}
      {checkoutOpen && (
        <CheckoutModal totals={totals} onClose={() => setCheckoutOpen(false)} onComplete={completeSale} />
      )}

      {/* receipt modal */}
      {receipt && (
        <ReceiptModal tx={receipt} storeName={settings.storeName} onClose={() => setReceipt(null)} />
      )}

      {/* editor modal */}
      {editing && (
        <ProductEditor product={editing === "new" ? null : editing} categories={CATEGORIES}
          onCancel={() => setEditing(null)} onSave={saveProduct}
          onDelete={editing !== "new" ? () => deleteProduct(editing.barcode) : null} />
      )}

      {/* toast */}
      {toast && (
        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold text-white flex items-center gap-2 z-50"
          style={{ background: toast.kind === "warn" ? "#dc2626" : toast.kind === "ok" ? "#059669" : "#334155" }}>
          {toast.kind === "warn" ? <AlertTriangle size={16} /> : <Check size={16} />} {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Register View                                                      */
/* ================================================================== */
function RegisterView(props: any) {
  const {
    quickItems, filtered, categories, activeCat, setActiveCat, search, setSearch,
    onAdd, cart, totals, scanInput, setScanInput, handleBarcode, scanRef,
    changeQty, removeLine, clearCart, pad, padDigit, padDouble, padBack, padClear,
    addManualItem, padTaxable, setPadTaxable, onCheckout, held, onHold, onResume,
  } = props;

  useEffect(() => { scanRef.current && scanRef.current.focus(); }, [scanRef]);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* left: catalog */}
      <div className="flex flex-col flex-1 min-w-0 p-3 gap-3">
        {/* scan bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border-2" style={{ borderColor: "#10b981" }}>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <ScanLine size={22} className="text-emerald-600 shrink-0" />
            <input
              ref={scanRef} value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleBarcode(scanInput); }}
              placeholder="Scan or type barcode…"
              className="flex-1 text-base outline-none bg-transparent font-mono"
            />
          </div>
          <div className="relative shrink-0 w-full sm:w-auto">
            <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…" className="w-full sm:w-40 pl-7 pr-2 py-1.5 text-sm rounded-lg bg-slate-100 outline-none" />
          </div>
        </div>

        {/* category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar whitespace-nowrap">
          {["All", ...categories].map((c) => (
            <button key={c} onClick={() => setActiveCat(c)}
              className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors shrink-0"
              style={activeCat === c
                ? { background: "#14181f", color: "white" }
                : { background: "white", color: "#475569" }}>
              {c}
            </button>
          ))}
        </div>

        {/* quick items (only on All / no search) */}
        {activeCat === "All" && !search && quickItems.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-0.5">Quick Sell</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {quickItems.map((p: any) => <QuickButton key={p.barcode} p={p} onAdd={onAdd} />)}
            </div>
          </div>
        )}

        {/* full grid */}
        <div className="flex-1 min-h-0 lg:overflow-auto">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-0.5">
            {activeCat === "All" && !search ? "All Items" : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 pb-2">
            {filtered.map((p: any) => <QuickButton key={p.barcode} p={p} onAdd={onAdd} />)}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-slate-400 py-10">No items match your search.</div>
            )}
          </div>
        </div>
      </div>

      {/* right: order panel */}
      <div className="flex flex-col bg-white shadow-xl border-t lg:border-t-0 lg:border-l border-slate-200 w-full lg:w-[420px] lg:h-full shrink-0">
        {/* cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold">
            <Receipt size={18} className="text-slate-500" /> Current Sale
            <span className="text-sm font-normal text-slate-400">({totals.count})</span>
          </div>
          <div className="flex gap-1">
            {held && (
              <button onClick={onResume} title="Resume held sale"
                className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50"><RotateCcw size={16} /></button>
            )}
            <button onClick={onHold} title="Hold sale" disabled={!cart.length}
              className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Pause size={16} /></button>
            <button onClick={clearCart} title="Clear cart" disabled={!cart.length}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 size={16} /></button>
          </div>
        </div>

        {/* cart lines */}
        <div className="flex-1 min-h-[200px] lg:min-h-0 lg:overflow-auto px-2 py-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2 py-8">
              <ShoppingCart size={40} /><div className="text-sm">Scan or tap an item to begin</div>
            </div>
          ) : cart.map((c: any) => (
            <div key={c.key} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs text-slate-400 font-mono">
                  {money(c.price)} ea{!c.taxable && " · tax-free"}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => changeQty(c.key, -1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-7 text-center font-mono font-bold text-xs">{c.qty}</span>
                <button onClick={() => changeQty(c.key, 1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={14} /></button>
              </div>
              <div className="w-16 text-right font-mono font-bold text-xs shrink-0">{money(c.price * c.qty)}</div>
              <button onClick={() => removeLine(c.key)} className="text-slate-300 hover:text-red-500 shrink-0"><X size={16} /></button>
            </div>
          ))}
        </div>

        {/* number pad */}
        <div className="border-t border-slate-100 px-3 pt-2 pb-1 bg-slate-50/50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Hash size={13} /> Manual Entry
            </div>
            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
              <input type="checkbox" checked={padTaxable} onChange={(e) => setPadTaxable(e.target.checked)} /> Taxable
            </label>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 grid grid-cols-3 gap-1.5">
              {[1,2,3,4,5,6,7,8,9].map((d) => (
                <button key={d} onClick={() => padDigit(d)}
                  className="py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-lg shadow-sm">{d}</button>
              ))}
              <button onClick={padDouble} className="py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-lg shadow-sm">00</button>
              <button onClick={() => padDigit(0)} className="py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-lg shadow-sm">0</button>
              <button onClick={padBack} className="py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center shadow-sm"><Delete size={18} /></button>
            </div>
            <div className="flex flex-col gap-1.5 w-24 sm:w-[110px]">
              <div className="flex-1 flex flex-col items-end justify-center px-2 rounded-lg font-mono font-bold text-lg sm:text-xl" style={{ background: "#0f1115", color: "#34d399" }}>
                {money(pad / 100)}
              </div>
              <button onClick={padClear} className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold shadow-sm">Clear</button>
              <button onClick={addManualItem} className="py-2 rounded-lg font-semibold text-white text-sm" style={{ background: "#14181f" }}>Add</button>
            </div>
          </div>
        </div>

        {/* totals + pay */}
        <div className="border-t-2 border-slate-100 p-4" style={{ background: "#fafbfc" }}>
          <div className="space-y-1 mb-3 font-mono text-sm">
            <Row label="Subtotal" value={money(totals.subtotal)} />
            <Row label="Tax" value={money(totals.tax)} muted />
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Total</span>
            <span className="font-mono font-bold" style={{ fontSize: 32, color: "#0f1115" }}>{money(totals.total)}</span>
          </div>
          <button onClick={onCheckout} disabled={!cart.length}
            className="w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
            style={{ background: "#059669" }}>
            <DollarSign size={22} /> Charge {money(totals.total)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: any) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-slate-400" : "text-slate-600"}>{label}</span>
      <span className={muted ? "text-slate-400" : "text-slate-700"}>{value}</span>
    </div>
  );
}

function QuickButton({ p, onAdd }: any) {
  const out = p.reorder !== 0 && p.stock <= 0;
  return (
    <button onClick={() => onAdd(p)} disabled={out}
      className="relative flex flex-col justify-between p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-left hover:shadow-md transition-shadow disabled:opacity-40"
      style={{ minHeight: 84 }}>
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: CAT_COLOR[p.cat] || "#94a3b8" }} />
      <span className="text-sm font-semibold leading-tight pr-3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</span>
      <span className="flex items-end justify-between mt-1">
        <span className="font-mono font-bold text-emerald-700">{money(p.price)}</span>
        {p.reorder !== 0 && (
          <span className="text-xs font-mono" style={{ color: p.stock <= p.reorder ? "#dc2626" : "#94a3b8" }}>
            {out ? "out" : p.stock}
          </span>
        )}
      </span>
    </button>
  );
}

/* ================================================================== */
/*  Checkout Modal                                                     */
/* ================================================================== */
function CheckoutModal({ totals, onClose, onComplete }: any) {
  const [method, setMethod] = useState("cash");
  const [tendered, setTendered] = useState(0); // cents

  const padDigit = (d: number) => setTendered((p) => Math.min(p * 10 + d, 9999999));
  const padDouble = () => setTendered((p) => Math.min(p * 100, 9999999));
  const back = () => setTendered((p) => Math.floor(p / 10));
  const due = totals.total;
  const cash = tendered / 100;
  const change = cash - due;
  const enough = cash >= due;

  const quickCash = [due, Math.ceil(due), Math.ceil(due / 5) * 5, Math.ceil(due / 10) * 10, Math.ceil(due / 20) * 20]
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 460 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}>
          <span className="font-bold text-lg">Payment</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5">
          <div className="text-center mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Amount Due</div>
            <div className="font-mono font-bold" style={{ fontSize: 40, color: "#0f1115" }}>{money(due)}</div>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setMethod("cash")}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2"
              style={method === "cash" ? { background: "#059669", color: "white", borderColor: "#059669" } : { borderColor: "#e2e8f0", color: "#475569" }}>
              <Banknote size={18} /> Cash
            </button>
            <button onClick={() => setMethod("card")}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border-2"
              style={method === "card" ? { background: "#10b981", color: "white", borderColor: "#10b981" } : { borderColor: "#e2e8f0", color: "#475569" }}>
              <CreditCard size={18} /> Card
            </button>
          </div>

          {method === "cash" ? (
            <>
              <div className="flex gap-2 mb-3">
                {quickCash.map((v: number) => (
                  <button key={v} onClick={() => setTendered(Math.round(v * 100))}
                    className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-mono font-semibold text-sm">
                    {v === due ? "Exact" : money(v)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="grid grid-cols-3 gap-1.5 flex-1">
                  {[1,2,3,4,5,6,7,8,9].map((d) => (
                    <button key={d} onClick={() => padDigit(d)} className="py-3 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-lg">{d}</button>
                  ))}
                  <button onClick={padDouble} className="py-3 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-lg">00</button>
                  <button onClick={() => padDigit(0)} className="py-3 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-lg">0</button>
                  <button onClick={back} className="py-3 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Delete size={18} /></button>
                </div>
                <div className="flex flex-col gap-2" style={{ width: 130 }}>
                  <div className="px-3 py-2 rounded-lg">
                    <div className="text-xs text-slate-400">Tendered</div>
                    <div className="font-mono font-bold text-lg">{money(cash)}</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg flex-1" style={{ background: enough ? "#ecfdf5" : "#fef2f2" }}>
                    <div className="text-xs text-slate-400">Change</div>
                    <div className="font-mono font-bold text-lg" style={{ color: enough ? "#059669" : "#dc2626" }}>
                      {enough ? money(change) : "—"}
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => onComplete("cash", cash)} disabled={!enough}
                className="w-full mt-4 py-4 rounded-xl text-white font-bold text-lg disabled:opacity-40" style={{ background: "#059669" }}>
                Complete Sale
              </button>
            </>
          ) : (
            <button onClick={() => onComplete("card")} className="w-full py-4 rounded-xl text-white font-bold text-lg" style={{ background: "#10b981" }}>
              <span className="flex items-center justify-center gap-2"><CreditCard size={20} /> Charge Card {money(due)}</span>
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Receipt Modal                                                      */
/* ================================================================== */
function ReceiptModal({ tx, storeName, onClose }: any) {
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 360 }}>
        <div className="flex items-center justify-center py-4" style={{ background: "#059669" }}>
          <div className="flex items-center gap-2 text-white font-bold text-lg"><Check size={22} /> Sale Complete</div>
        </div>
        <div className="p-5 font-mono text-sm" style={{ color: "#1e293b" }}>
          <div className="text-center mb-3">
            <div className="font-bold text-base">{storeName}</div>
            <div className="text-xs text-slate-400">{new Date(tx.ts).toLocaleString()}</div>
            <div className="text-xs text-slate-400">Sale #{tx.id.toUpperCase()}</div>
          </div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {tx.items.map((it: any, i: number) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="truncate pr-2">{it.qty}× {it.name}</span>
              <span>{money(it.price * it.qty)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{money(tx.subtotal)}</span></div>
          <div className="flex justify-between text-slate-500"><span>Tax</span><span>{money(tx.tax)}</span></div>
          <div className="flex justify-between font-bold text-base mt-1"><span>Total</span><span>{money(tx.total)}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between"><span>{tx.method === "cash" ? "Cash" : "Card"}</span><span>{money(tx.tendered)}</span></div>
          {tx.method === "cash" && <div className="flex justify-between font-bold"><span>Change</span><span>{money(tx.change)}</span></div>}
          <div className="text-center text-xs text-slate-400 mt-3">Thank you!</div>
        </div>
        <div className="p-4 pt-0">
          <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "#14181f" }}>
            New Sale
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Inventory View                                                     */
/* ================================================================== */
function InventoryView({ products, lowStock, onEdit, onNew, onRestock, onToggleQuick }: any) {
  const [q, setQ] = useState("");
  const list = products.filter((p: any) =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q)
  );
  const invValue = products.reduce((a: number, p: any) => a + (p.reorder === 0 ? 0 : p.cost * p.stock), 0);

  return (
    <div className="h-full overflow-auto p-3 sm:p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl font-bold">Inventory</h2>
            <p className="text-sm text-slate-500">
              {products.length} products · {money(invValue)} stock value
              {lowStock.length > 0 && <span className="text-red-600 font-semibold"> · {lowStock.length} low</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                className="pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-200 outline-none text-sm w-full sm:w-48" />
            </div>
            <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold text-sm bg-emerald-600">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {lowStock.length > 0 && (
          <div className="mb-4 p-3 rounded-xl flex items-start gap-2 bg-red-50 border border-red-100">
            <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-700">
              <span className="font-bold">Low stock:</span>{" "}
              {lowStock.map((p: any) => `${p.name} (${p.stock})`).join(", ")}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 bg-slate-50">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Barcode</th>
                  <th className="px-3 py-3 font-semibold text-right">Price</th>
                  <th className="px-3 py-3 font-semibold text-right">Stock</th>
                  <th className="px-3 py-3 font-semibold text-center">Quick</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p: any) => {
                  const low = p.reorder > 0 && p.stock <= p.reorder;
                  return (
                    <tr key={p.barcode} className="border-t border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[p.cat] }} />
                          <div>
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-slate-400">{p.cat}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.barcode}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{money(p.price)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="font-mono font-bold" style={{ color: low ? "#dc2626" : "#1e293b" }}>
                          {p.reorder === 0 ? "∞" : p.stock}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => onToggleQuick(p.barcode)}
                          className="w-9 h-5 rounded-full relative transition-colors"
                          style={{ background: p.quick ? "#10b981" : "#cbd5e1" }}>
                          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: p.quick ? 18 : 2 }} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => onEdit(p)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"><Pencil size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-slate-100">
            {list.map((p: any) => (
              <div key={p.barcode} className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-sm">{p.name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[p.cat] }} />
                    <span>{p.cat}</span>
                    <span>•</span>
                    <span className="font-mono">{p.barcode}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-sm">{money(p.price)}</div>
                  <div className="text-xs font-mono text-slate-400">Stock: {p.reorder === 0 ? "∞" : p.stock}</div>
                </div>
                <button onClick={() => onEdit(p)} className="p-2 text-slate-400"><Pencil size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Product Editor                                                     */
/* ================================================================== */
function ProductEditor({ product, categories, onCancel, onSave, onDelete }: any) {
  const [f, setF] = useState(product || {
    barcode: "", name: "", price: 0, cost: 0, stock: 0, cat: "Snacks", quick: false, taxable: true, reorder: 5,
  });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));


  const num = (v: any) => (v === "" ? 0 : parseFloat(v) || 0);
  const valid = f.name.trim() && f.barcode.trim();

  return (
    <Overlay onClose={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[460px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10" style={{ background: "#14181f", color: "white" }}>
          <span className="font-bold text-lg">{product ? "Edit Product" : "New Product"}</span>
          <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Name">
            <input value={f.name} onChange={(e: any) => set("name", e.target.value)} className="inp" autoFocus />
          </Field>
          <Field label="Barcode">
            <input value={f.barcode} onChange={(e: any) => set("barcode", e.target.value)} disabled={!!product}
              className="inp font-mono disabled:bg-slate-100 disabled:text-slate-400" placeholder="Scan or type" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price ($)">
              <input type="number" step="0.01" value={f.price} onChange={(e: any) => set("price", num(e.target.value))} className="inp font-mono" />
            </Field>
            <Field label="Cost ($)">
              <input type="number" step="0.01" value={f.cost} onChange={(e: any) => set("cost", num(e.target.value))} className="inp font-mono" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock">
              <input type="number" value={f.stock} onChange={(e: any) => set("stock", Math.round(num(e.target.value)))} className="inp font-mono" />
            </Field>
            <Field label="Reorder at (0 = untracked)">
              <input type="number" value={f.reorder} onChange={(e: any) => set("reorder", Math.round(num(e.target.value)))} className="inp font-mono" />
            </Field>
          </div>
          <Field label="Category">
            <select value={f.cat} onChange={(e: any) => set("cat", e.target.value)} className="inp">
              {categories.map((c: string) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <div className="flex flex-col sm:flex-row gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={f.quick} onChange={(e: any) => set("quick", e.target.checked)} /> Quick-sell button
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={f.taxable} onChange={(e: any) => set("taxable", e.target.checked)} /> Taxable
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-100 sticky bottom-0 bg-white">
          {onDelete ? (
            <button onClick={onDelete} className="px-4 py-2.5 rounded-lg text-red-600 font-semibold text-sm hover:bg-red-50 flex items-center gap-1.5">
              <Trash2 size={15} /> Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2.5 rounded-lg font-semibold text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={() => valid && onSave(f)} disabled={!valid}
              className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-40 bg-emerald-600">
              Save
            </button>
          </div>
        </div>
      </div>
      <style>{`.inp{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;outline:none;font-size:14px}.inp:focus{border-color:#10b981}`}</style>
    </Overlay>
  );
}

function Field({ label, children }: any) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

/* ================================================================== */
/*  Reports View                                                       */
/* ================================================================== */
function ReportsView({ transactions, products, lowStock, settings, setSettings }: any) {
  const today = todayKey(Date.now());
  const todayTx = transactions.filter((t) => todayKey(t.ts) === today);

  const stats = useMemo(() => {
    const revenue = todayTx.reduce((a, t) => a + t.total, 0);
    const items = todayTx.reduce((a, t) => a + t.items.reduce((s: number, i: any) => s + i.qty, 0), 0);
    return {
      revenue, count: todayTx.length, items,
      avg: todayTx.length ? revenue / todayTx.length : 0,
    };
  }, [todayTx]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const sum = transactions.filter((t: any) => todayKey(t.ts) === key).reduce((a: number, t: any) => a + t.total, 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), sales: Math.round(sum * 100) / 100 });
    }
    return days;
  }, [transactions]);

  const topSellers = useMemo(() => {
    const map: any = {};
    transactions.forEach((t: any) => t.items.forEach((i: any) => {
      if (!map[i.name]) map[i.name] = { name: i.name, qty: 0, rev: 0 };
      map[i.name].qty += i.qty; map[i.name].rev += i.price * i.qty;
    }));
    return Object.values(map).sort((a: any, b: any) => b.qty - a.qty).slice(0, 6);
  }, [transactions]);

  return (
    <div className="h-full overflow-auto p-3 sm:p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        <h2 className="text-xl font-bold">Reports</h2>

        {/* today's stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Today's Sales" value={money(stats.revenue)} icon={DollarSign} color="#059669" />
          <Stat label="Transactions" value={stats.count} icon={Receipt} color="#10b981" />
          <Stat label="Items Sold" value={stats.items} icon={Box} color="#d97706" />
          <Stat label="Avg Sale" value={money(stats.avg)} icon={TrendingUp} color="#14b8a6" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 7-day chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="text-sm font-bold mb-3">Last 7 Days</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* top sellers */}
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="text-sm font-bold mb-3">Top Sellers (all time)</div>
            {topSellers.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">No sales recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {topSellers.map((s: any, i: number) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-slate-300">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium truncate">{s.name}</span>
                    <span className="text-sm text-slate-400">{s.qty} sold</span>
                    <span className="text-sm font-mono font-semibold w-16 text-right">{money(s.rev)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* settings + low stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="text-sm font-bold mb-3">Store Settings</div>
            <Field label="Store Name">
              <input value={settings.storeName} onChange={(e: any) => setSettings((s: any) => ({ ...s, storeName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" />
            </Field>
            <div className="mt-3">
              <Field label="Tax Rate (%)">
                <input type="number" step="0.01" value={settings.taxRate}
                  onChange={(e: any) => setSettings((s: any) => ({ ...s, taxRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-mono" />
              </Field>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div className="text-sm font-bold mb-3 flex items-center gap-2">
              Reorder Report
              {lowStock.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "#dc2626" }}>{lowStock.length}</span>}
            </div>
            {lowStock.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center">Everything is well stocked.</div>
            ) : (
              <div className="space-y-1.5">
                {lowStock.map((p: any) => (
                  <div key={p.barcode} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{p.name}</span>
                    <span className="font-mono text-red-600 font-bold">{p.stock} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* recent transactions */}
        <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
          <div className="text-sm font-bold mb-3">Recent Transactions</div>
          {transactions.length === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">No transactions yet. Make a sale on the Register.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {transactions.slice(0, 12).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                  <span className="font-mono text-xs text-slate-400 w-16 sm:w-20">#{t.id.slice(0, 6).toUpperCase()}</span>
                  <span className="text-slate-500 w-28 sm:w-36 truncate">{new Date(t.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex-1 text-slate-400 truncate">{t.items.reduce((a: number, i: any) => a + i.qty, 0)} items</span>
                  <span className="font-mono font-bold">{money(t.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="font-mono font-bold" style={{ fontSize: 26, color: "#0f1115" }}>{value}</div>
    </div>
  );
}

/* ================================================================== */
/*  Overlay                                                            */
/* ================================================================== */
function Overlay({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "rgba(15,17,21,0.55)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
