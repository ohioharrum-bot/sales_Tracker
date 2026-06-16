'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ShoppingCart, Package, BarChart3, Trash2, Plus, Minus, X, Search,
  Delete, DollarSign, CreditCard, Banknote, Check, AlertTriangle,
  Pencil, ScanLine, Receipt, RotateCcw, TrendingUp, Box, Hash, Pause,
  Clock, Users, FileText, Undo2, Percent, ShieldCheck, LogIn, LogOut,
  Printer, ArrowDownToLine, ArrowUpFromLine, Lock, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */
interface Product {
  barcode: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  cat: string;
  quick: boolean;
  taxable: boolean;
  reorder: number;
}

interface CartItem {
  key: string;
  barcode: string | null;
  name: string;
  price: number;
  qty: number;
  taxable: boolean;
  isCustom: boolean;
}

interface TransactionItem {
  name: string;
  price: number;
  qty: number;
  taxable: boolean;
  barcode: string | null;
}

interface Transaction {
  id: string;
  ts: number;
  type: string;
  cashier: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  method: string;
  payments?: { method: string; amount: number }[];
  tendered: number;
  change: number;
  refOf?: string;
  note?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  pin: string;
}

interface Punch {
  id: string;
  empId: string;
  clockIn: number;
  clockOut: number | null;
}

interface Settings {
  storeName: string;
  taxRate: number;
  float: number;
  lastClose: number;
  activeCashier: string;
}

interface DayStats {
  grossSales: number;
  refundTotal: number;
  netSales: number;
  taxColl: number;
  cashSales: number;
  cardSales: number;
  cashRefunds: number;
  cardRefunds: number;
  paidIn: number;
  paidOut: number;
  items: number;
  saleCount: number;
  refundCount: number;
  noSales: number;
  manualSales: number;
  manualCount: number;
  expectedCash: number;
  avg: number;
}

interface ZReport extends DayStats {
  id: string;
  openedAt: number;
  closedAt: number;
  float: number;
  countedCash: number;
  overShort: number;
  cashierName: string;
  type: 'z';
}

/* ------------------------------------------------------------------ */
/*  Persistent storage (falls back to in-memory if unavailable)        */
/* ------------------------------------------------------------------ */
const hasStore = typeof window !== "undefined" && (window as any).storage;
const mem: Record<string, any> = {};
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
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */
const CATEGORIES = ["Beverages", "Snacks", "Tobacco", "Grocery", "Other"];
const CAT_COLOR: Record<string, string> = { Beverages: "#2563eb", Snacks: "#d97706", Tobacco: "#7c3aed", Grocery: "#059669", Other: "#64748b" };

const SEED_PRODUCTS: Product[] = [
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

const SEED_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Alex Rivera", role: "Cashier", pin: "1234" },
  { id: "e2", name: "Sam Okafor", role: "Manager", pin: "4321" },
];

const DEFAULT_SETTINGS: Settings = { storeName: "Quick Stop Market", taxRate: 7.25, float: 200, lastClose: 0, activeCashier: "e1" };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const money = (n: number) => (n < 0 ? "-$" + Math.abs(n).toFixed(2) : "$" + (Number(n) || 0).toFixed(2));
const uid = () => Math.random().toString(36).slice(2, 10);
const dayKey = (d: number | Date) => new Date(d).toISOString().slice(0, 10);
const itemKey = (it: { barcode?: string | null; name: string }) => it.barcode || "c:" + it.name;

function computeDayStats(txs: Transaction[], since: number, float: number): DayStats {
  let grossSales = 0, refundTotal = 0, taxColl = 0, cashSales = 0, cardSales = 0,
    cashRefunds = 0, cardRefunds = 0, paidIn = 0, paidOut = 0, items = 0,
    saleCount = 0, refundCount = 0, noSales = 0, manualSales = 0, manualCount = 0;
  txs.filter((t) => t.ts > since).forEach((t) => {
    if (t.type === "sale") {
      grossSales += t.total; taxColl += t.tax; saleCount++;
      items += t.items.reduce((a, i) => a + i.qty, 0);
      // manual (open-price) lines have no barcode
      t.items.forEach((i) => { if (i.barcode == null) { manualSales += i.price * i.qty; manualCount += i.qty; } });
      // attribute cash vs card by individual tender when a split was recorded
      if (Array.isArray(t.payments) && t.payments.length) {
        t.payments.forEach((p) => { if (p.method === "cash") cashSales += p.amount; else cardSales += p.amount; });
      } else if (t.method === "cash") cashSales += t.total; else cardSales += t.total;
    } else if (t.type === "refund") {
      const mag = Math.abs(t.total); refundTotal += mag; taxColl -= Math.abs(t.tax); refundCount++;
      items -= t.items.reduce((a, i) => a + i.qty, 0);
      if (t.method === "cash") cashRefunds += mag; else cardRefunds += mag;
    } else if (t.type === "paidin") paidIn += t.total;
    else if (t.type === "paidout") paidOut += t.total;
    else if (t.type === "nosale") noSales++;
  });
  return {
    grossSales, refundTotal, netSales: grossSales - refundTotal, taxColl,
    cashSales, cardSales, cashRefunds, cardRefunds, paidIn, paidOut,
    items, saleCount, refundCount, noSales, manualSales, manualCount,
    expectedCash: float + cashSales - cashRefunds + paidIn - paidOut,
    avg: saleCount ? (grossSales - refundTotal) / saleCount : 0,
  };
}

/* ================================================================== */
/*  Main                                                               */
/* ================================================================== */
export default function POS() {
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("register");

  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheet, setTimesheet] = useState<Punch[]>([]);
  const [zreports, setZreports] = useState<ZReport[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");
  const [pendingQty, setPendingQty] = useState(1);
  const [pad, setPad] = useState(0);
  const [padTaxable, setPadTaxable] = useState(true);
  const [discount, setDiscount] = useState<{ type: 'pct' | 'amt'; value: number } | null>(null);   // {type:'pct'|'amt', value}
  const [ageOk, setAgeOk] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [ageVerify, setAgeVerify] = useState<{ prod: Product; qty: number } | null>(null);  // {prod, qty}
  const [receipt, setReceipt] = useState<Transaction | ZReport | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const [toast, setToast] = useState<{ msg: string; kind: string; id: string } | null>(null);
  const [held, setHeld] = useState<{ cart: CartItem[]; discount: any } | null>(null);

  const scanRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(Date.now());

  /* load */
  useEffect(() => {
    (async () => {
      const [p, t, e, ts, z, s] = await Promise.all([
        store.get("pos:products"), store.get("pos:transactions"), store.get("pos:employees"),
        store.get("pos:timesheet"), store.get("pos:zreports"), store.get("pos:settings"),
      ]);
      setProducts(p ? JSON.parse(p) : SEED_PRODUCTS);
      setTransactions(t ? JSON.parse(t) : []);
      setEmployees(e ? JSON.parse(e) : SEED_EMPLOYEES);
      setTimesheet(ts ? JSON.parse(ts) : []);
      setZreports(z ? JSON.parse(z) : []);
      setSettings(s ? JSON.parse(s) : DEFAULT_SETTINGS);
      setLoaded(true);
    })();
  }, []);

  /* persist */
  useEffect(() => { if (loaded) store.set("pos:products", JSON.stringify(products)); }, [products, loaded]);
  useEffect(() => { if (loaded) store.set("pos:transactions", JSON.stringify(transactions)); }, [transactions, loaded]);
  useEffect(() => { if (loaded) store.set("pos:employees", JSON.stringify(employees)); }, [employees, loaded]);
  useEffect(() => { if (loaded) store.set("pos:timesheet", JSON.stringify(timesheet)); }, [timesheet, loaded]);
  useEffect(() => { if (loaded) store.set("pos:zreports", JSON.stringify(zreports)); }, [zreports, loaded]);
  useEffect(() => { if (loaded) store.set("pos:settings", JSON.stringify(settings)); }, [settings, loaded]);

  /* clock */
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);

  const flash = useCallback((msg: string, kind = "info") => {
    const id = uid();
    setToast({ msg, kind, id });
    setTimeout(() => setToast((c) => (c && c.id === id ? null : c)), 2200);
  }, []);

  const cashierName = useMemo(
    () => employees.find((e) => e.id === settings.activeCashier)?.name || "Unassigned",
    [employees, settings.activeCashier]
  );

  /* ----------------------- add to cart -------------------------- */
  const addProductToCart = useCallback((prod: Product, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.barcode === prod.barcode && !c.isCustom);
      const inCart = existing ? existing.qty : 0;
      if (prod.reorder !== 0 && inCart + qty > prod.stock) {
        flash(`${prod.name}: only ${prod.stock} in stock`, "warn");
        qty = prod.stock - inCart;
        if (qty <= 0) return prev;
      }
      if (existing) return prev.map((c) => (c === existing ? { ...c, qty: c.qty + qty } : c));
      return [...prev, { key: uid(), barcode: prod.barcode, name: prod.name, price: prod.price, qty, taxable: prod.taxable, isCustom: false }];
    });
  }, [flash]);

  const handleAddIntent = useCallback((prod: Product) => {
    const qty = Math.max(1, pendingQty);
    if (prod.cat === "Tobacco" && !ageOk) { setAgeVerify({ prod, qty }); return; }
    addProductToCart(prod, qty);
    flash(`${qty > 1 ? qty + "× " : ""}${prod.name}`, "ok");
    setPendingQty(1);
  }, [pendingQty, ageOk, addProductToCart, flash]);

  const handleBarcode = useCallback((code: string) => {
    const c = String(code).trim();
    if (!c) return;
    const prod = products.find((p) => p.barcode === c);
    if (prod) handleAddIntent(prod);
    else flash(`Unknown barcode: ${c}`, "warn");
    setScanInput("");
  }, [products, handleAddIntent, flash]);

  // keep latest handler for the global scanner listener
  const barcodeRef = useRef(handleBarcode);
  barcodeRef.current = handleBarcode;

  const changeQty = (key: string, delta: number) => {
    setCart((prev) => prev.flatMap((c) => {
      if (c.key !== key) return [c];
      const next = c.qty + delta;
      if (next <= 0) return [];
      if (!c.isCustom) {
        const prod = products.find((p) => p.barcode === c.barcode);
        if (prod && prod.reorder !== 0 && next > prod.stock) { flash(`Only ${prod.stock} in stock`, "warn"); return [c]; }
      }
      return [{ ...c, qty: next }];
    }));
  };
  const removeLine = (key: string) => setCart((prev) => prev.filter((c) => c.key !== key));
  const resetSale = () => { setCart([]); setDiscount(null); setAgeOk(false); setPendingQty(1); setPad(0); };
  const clearCart = () => { if (cart.length && !window.confirm("Clear the whole cart?")) return; resetSale(); };

  /* manual line */
  const addManualItem = () => {
    if (pad <= 0) { flash("Enter an amount first", "warn"); return; }
    const qty = Math.max(1, pendingQty);
    setCart((prev) => [...prev, { key: uid(), barcode: null, name: "Manual Item", price: pad / 100, qty, taxable: padTaxable, isCustom: true }]);
    flash(`Manual ${money(pad / 100)}`, "ok");
    setPad(0); setPendingQty(1);
  };

  /* totals */
  const totals = useMemo(() => {
    let subtotal = 0, taxable = 0;
    cart.forEach((c) => { const line = c.price * c.qty; subtotal += line; if (c.taxable) taxable += line; });
    let discountAmt = 0;
    if (discount && subtotal > 0)
      discountAmt = discount.type === "pct" ? subtotal * discount.value / 100 : Math.min(discount.value, subtotal);
    const taxableAfter = subtotal > 0 ? Math.max(0, taxable - discountAmt * (taxable / subtotal)) : 0;
    const tax = taxableAfter * (settings.taxRate / 100);
    return { subtotal, discountAmt, tax, total: subtotal - discountAmt + tax, count: cart.reduce((a, c) => a + c.qty, 0) };
  }, [cart, discount, settings.taxRate]);

  /* complete sale — payments: [{method, amount, given?}], change = cash overpayment */
  const completeSale = (payments: { method: string; amount: number; given?: number }[], change: number) => {
    const methods = new Set(payments.map((p) => p.method));
    const tendered = payments.reduce((a, p) => a + (p.given != null ? p.given : p.amount), 0);
    const tx: Transaction = {
      id: uid(), ts: Date.now(), type: "sale", cashier: cashierName,
      items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty, taxable: c.taxable, barcode: c.barcode })),
      subtotal: totals.subtotal, discount: totals.discountAmt, tax: totals.tax, total: totals.total,
      method: methods.size > 1 ? "split" : payments[0].method,
      payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
      tendered, change: change || 0,
    };
    setProducts((prev) => prev.map((p) => {
      const sold = cart.filter((c) => c.barcode === p.barcode && !c.isCustom).reduce((a, c) => a + c.qty, 0);
      return sold && p.reorder !== 0 ? { ...p, stock: Math.max(0, p.stock - sold) } : p;
    }));
    setTransactions((prev) => [tx, ...prev]);
    setReceipt(tx); setCheckoutOpen(false); resetSale();
  };

  /* refund */
  const processRefund = (orig: Transaction, returnItems: CartItem[], method: string) => {
    let subtotal = 0, taxable = 0;
    returnItems.forEach((it) => { const line = it.price * it.qty; subtotal += line; if (it.taxable) taxable += line; });
    const tax = taxable * (settings.taxRate / 100);
    const total = subtotal + tax;
    const tx: Transaction = {
      id: uid(), ts: Date.now(), type: "refund", cashier: cashierName, refOf: orig.id,
      items: returnItems.map((it) => ({ name: it.name, price: it.price, qty: it.qty, taxable: it.taxable, barcode: it.barcode })),
      subtotal: -subtotal, discount: 0, tax: -tax, total: -total, method, tendered: -total, change: 0,
    };
    setProducts((prev) => prev.map((p) => {
      const back = returnItems.filter((it) => it.barcode === p.barcode).reduce((a, it) => a + it.qty, 0);
      return back && p.reorder !== 0 ? { ...p, stock: p.stock + back } : p;
    }));
    setTransactions((prev) => [tx, ...prev]);
    setReturnsOpen(false); setReceipt(tx);
    flash(`Refunded ${money(total)}`, "ok");
  };

  /* cash drawer movements */
  const addCashMovement = (type: string, amount: number, note: string) => {
    if (amount <= 0 && type !== "nosale") return;
    setTransactions((prev) => [{ id: uid(), ts: Date.now(), type, total: amount, note: note || "", method: "cash", cashier: cashierName, items: [], subtotal: 0, discount: 0, tax: 0, tendered: amount, change: 0 }, ...prev]);
    flash(type === "nosale" ? "Drawer opened" : type === "paidin" ? `Paid in ${money(amount)}` : `Paid out ${money(amount)}`, "ok");
  };

  /* close day (Z) */
  const closeDay = (countedCash: number, newFloat: number) => {
    const s = computeDayStats(transactions, settings.lastClose, settings.float);
    const report: ZReport = {
      id: uid(), openedAt: settings.lastClose, closedAt: Date.now(), float: settings.float,
      countedCash, overShort: countedCash - s.expectedCash, cashierName, ...s, type: "z",
    };
    setZreports((prev) => [report, ...prev]);
    setSettings((prev: any) => ({ ...prev, lastClose: Date.now(), float: newFloat }));
    setReceipt(report);
    flash("Day closed — Z report saved", "ok");
  };

  /* product CRUD */
  const saveProduct = (data: any) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.barcode === data.barcode);
      if (editing === "new") { if (exists) { flash("Barcode already exists", "warn"); return prev; } return [...prev, data]; }
      return prev.map((p) => (p.barcode === editing.barcode ? data : p));
    });
    setEditing(null); flash("Product saved", "ok");
  };
  const deleteProduct = (barcode: string) => { if (!window.confirm("Delete this product?")) return; setProducts((prev) => prev.filter((p) => p.barcode !== barcode)); setEditing(null); };

  /* timesheet */
  const clockToggle = (empId: string) => {
    setTimesheet((prev) => {
      const open = prev.find((e) => e.empId === empId && !e.clockOut);
      if (open) { flash("Clocked out", "ok"); return prev.map((e) => (e === open ? { ...e, clockOut: Date.now() } : e)); }
      flash("Clocked in", "ok"); return [{ id: uid(), empId, clockIn: Date.now(), clockOut: null }, ...prev];
    });
  };

  /* global scanner */
  useEffect(() => {
    const blocked = view !== "register" || checkoutOpen || editing || receipt || returnsOpen || ageVerify || discountOpen;
    if (blocked) return;
    let buf = "", t = 0;
    const onKey = (e: any) => {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) return;
      const ts = performance.now();
      if (ts - t > 90) buf = "";
      t = ts;
      if (e.key === "Enter") { if (buf.length >= 2) barcodeRef.current(buf); buf = ""; return; }
      if (e.key.length === 1) buf += e.key;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, checkoutOpen, editing, receipt, returnsOpen, ageVerify, discountOpen]);

  /* derived */
  const quickItems = useMemo(() => products.filter((p) => p.quick), [products]);
  const filtered = useMemo(() => products.filter((p) => {
    const catOk = activeCat === "All" || p.cat === activeCat;
    const q = search.trim().toLowerCase();
    return catOk && (!q || p.name.toLowerCase().includes(q) || p.barcode.includes(q));
  }), [products, activeCat, search]);
  const lowStock = useMemo(() => products.filter((p) => p.reorder > 0 && p.stock <= p.reorder), [products]);
  const clockedIn = useMemo(() => new Set(timesheet.filter((e) => !e.clockOut).map((e) => e.empId)), [timesheet]);

  if (!loaded)
    return <div className="flex items-center justify-center h-screen text-slate-400" style={{ fontFamily: "ui-sans-serif, system-ui" }}>Loading register…</div>;

  const tabs = [
    ["register", "Register", ShoppingCart, 0],
    ["inventory", "Inventory", Package, lowStock.length],
    ["staff", "Staff", Users, clockedIn.size],
    ["reports", "Reports", BarChart3, 0],
    ["endofday", "End of Day", FileText, 0],
  ];

  return (
    <div className="flex flex-col h-screen text-slate-800 select-none" style={{ background: "#eef1f5", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      {/* header */}
      <header className="flex items-center justify-between px-4 py-2 text-white shadow-md" style={{ background: "#14181f" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-md text-slate-900" style={{ background: "#10b981" }}><ShoppingCart size={20} /></div>
          <div><div className="text-sm font-bold leading-tight">{settings.storeName}</div><div className="text-xs text-slate-400 leading-tight">Point of Sale</div></div>
        </div>
        <nav className="flex gap-1">
          {tabs.map(([id, label, Icon, badge]: any) => (
            <button key={id} onClick={() => setView(id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-semibold transition-colors"
              style={view === id ? { background: "#10b981", color: "#06281d" } : { color: "#cbd5e1" }}>
              <Icon size={16} /> {label}
              {badge > 0 && id === "inventory" && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "#dc2626" }}>{badge}</span>}
              {badge > 0 && id === "staff" && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: "#34d399", color: "#06281d" }}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ background: "#222834" }}>
            <Lock size={13} className="text-slate-400" />
            <select value={settings.activeCashier} onChange={(e) => setSettings((s: any) => ({ ...s, activeCashier: e.target.value }))}
              className="bg-transparent text-sm font-semibold outline-none cursor-pointer" style={{ color: "white" }}>
              {employees.map((e) => <option key={e.id} value={e.id} style={{ color: "black" }}>{e.name}</option>)}
            </select>
          </div>
          <div className="text-right"><div className="text-sm font-mono font-semibold">{new Date(now).toLocaleTimeString()}</div><div className="text-xs text-slate-400">Tax {settings.taxRate}%</div></div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {view === "register" && (
          <RegisterView
            quickItems={quickItems} filtered={filtered} categories={CATEGORIES}
            activeCat={activeCat} setActiveCat={setActiveCat} search={search} setSearch={setSearch}
            onAdd={handleAddIntent} cart={cart} totals={totals} discount={discount}
            scanInput={scanInput} setScanInput={setScanInput} handleBarcode={handleBarcode} scanRef={scanRef}
            pendingQty={pendingQty} setPendingQty={setPendingQty}
            changeQty={changeQty} removeLine={removeLine} clearCart={clearCart}
            pad={pad} setPad={setPad} addManualItem={addManualItem} padTaxable={padTaxable} setPadTaxable={setPadTaxable}
            onCheckout={() => (cart.length ? setCheckoutOpen(true) : flash("Cart is empty", "warn"))}
            onDiscount={() => setDiscountOpen(true)} onClearDiscount={() => setDiscount(null)}
            onReturns={() => setReturnsOpen(true)}
            held={held} onHold={() => { if (cart.length) { setHeld({ cart, discount }); resetSale(); flash("Sale held", "ok"); } }}
            onResume={() => { if (held) { setCart(held.cart); setDiscount(held.discount); setHeld(null); flash("Sale resumed", "ok"); } }}
          />
        )}
        {view === "inventory" && (
          <InventoryView products={products} lowStock={lowStock} onEdit={setEditing} onNew={() => setEditing("new")}
            onRestock={(bc: any, amt: any) => setProducts((prev) => prev.map((p) => (p.barcode === bc ? { ...p, stock: p.stock + amt } : p)))}
            onToggleQuick={(bc: any) => setProducts((prev) => prev.map((p) => (p.barcode === bc ? { ...p, quick: !p.quick } : p)))} />
        )}
        {view === "staff" && (
          <StaffView employees={employees} setEmployees={setEmployees} timesheet={timesheet} clockToggle={clockToggle}
            clockedIn={clockedIn} now={now} flash={flash} />
        )}
        {view === "reports" && (
          <ReportsView transactions={transactions} lowStock={lowStock} settings={settings} setSettings={setSettings}
            onReprint={setReceipt} onRefund={() => setReturnsOpen(true)} />
        )}
        {view === "endofday" && (
          <EndOfDayView transactions={transactions} settings={settings} zreports={zreports}
            onCash={addCashMovement} onCloseDay={closeDay} onView={(z: any) => setReceipt({ ...z, type: "z" })} now={now} />
        )}
      </div>

      {checkoutOpen && <CheckoutModal totals={totals} cashier={cashierName} onClose={() => setCheckoutOpen(false)} onComplete={completeSale} />}
      {discountOpen && <DiscountModal subtotal={totals.subtotal} onClose={() => setDiscountOpen(false)} onApply={(d: any) => { setDiscount(d); setDiscountOpen(false); }} />}
      {returnsOpen && <ReturnsModal transactions={transactions} taxRate={settings.taxRate} onClose={() => setReturnsOpen(false)} onRefund={processRefund} />}
      {ageVerify && (
        <AgeVerifyModal product={ageVerify.prod}
          onConfirm={() => { addProductToCart(ageVerify.prod, ageVerify.qty); setAgeOk(true); setPendingQty(1); setAgeVerify(null); }}
          onDeny={() => { setAgeVerify(null); flash("Sale of age-restricted item denied", "warn"); }} />
      )}
      {receipt && <ReceiptModal data={receipt} storeName={settings.storeName} onClose={() => setReceipt(null)} />}
      {editing && (
        <ProductEditor product={editing === "new" ? null : editing} categories={CATEGORIES}
          onCancel={() => setEditing(null)} onSave={saveProduct} onDelete={editing !== "new" ? () => deleteProduct(editing.barcode) : null} />
      )}
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
/*  Reusable numeric keypad (operates on integer cents)                */
/* ================================================================== */
function CentsPad({ setValue, big }: any) {
  const d = (n: any) => setValue((v: any) => Math.min(v * 10 + n, 99999999));
  const dd = () => setValue((v: any) => Math.min(v * 100, 99999999));
  const back = () => setValue((v: any) => Math.floor(v / 10));
  const cls = "rounded-lg bg-slate-100 hover:bg-slate-200 font-bold " + (big ? "py-3 text-lg" : "py-2.5 text-base");
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => d(n)} className={cls}>{n}</button>)}
      <button onClick={dd} className={cls}>00</button>
      <button onClick={() => d(0)} className={cls}>0</button>
      <button onClick={back} className={cls + " flex items-center justify-center"}><Delete size={18} /></button>
    </div>
  );
}

/* ================================================================== */
/*  Register                                                           */
/* ================================================================== */
function RegisterView(props: any) {
  const {
    quickItems, filtered, categories, activeCat, setActiveCat, search, setSearch, onAdd, cart, totals, discount,
    scanInput, setScanInput, handleBarcode, scanRef, pendingQty, setPendingQty, changeQty, removeLine, clearCart,
    pad, setPad, addManualItem, padTaxable, setPadTaxable, onCheckout, onDiscount, onClearDiscount, onReturns,
    held, onHold, onResume,
  } = props;
  useEffect(() => { scanRef.current && scanRef.current.focus(); }, [scanRef]);

  return (
    <div className="flex h-full">
      {/* left */}
      <div className="flex flex-col flex-1 min-w-0 p-3 gap-3">
        {/* scan + qty */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border-2 flex-1" style={{ borderColor: "#10b981" }}>
            <ScanLine size={22} className="text-emerald-600 shrink-0" />
            <input ref={scanRef} value={scanInput} onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleBarcode(scanInput); }}
              placeholder="Scan barcode or type and press Enter…" className="flex-1 text-base outline-none bg-transparent font-mono" />
            <div className="relative shrink-0">
              <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-36 pl-7 pr-2 py-1.5 text-sm rounded-lg bg-slate-100 outline-none" />
            </div>
          </div>
          {/* quantity multiplier */}
          <div className="flex items-center gap-1 bg-white rounded-xl px-2 py-2 shadow-sm border-2"
            style={{ borderColor: pendingQty > 1 ? "#d97706" : "#e2e8f0" }}>
            <span className="text-xs font-bold text-slate-400 px-1">QTY</span>
            <button onClick={() => setPendingQty((q: any) => Math.max(1, q - 1))} className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={15} /></button>
            <input value={pendingQty}
              onChange={(e) => setPendingQty(Math.max(1, Math.min(999, parseInt(e.target.value.replace(/\D/g, "")) || 1)))}
              onFocus={(e) => e.currentTarget.select()} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="w-12 text-center font-mono font-bold text-lg outline-none" style={{ color: pendingQty > 1 ? "#d97706" : "#1e293b" }} />
            <button onClick={() => setPendingQty((q: any) => Math.min(999, q + 1))} className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={15} /></button>
          </div>
        </div>
        {pendingQty > 1 && (
          <div className="-mt-1 text-xs font-semibold flex items-center gap-1" style={{ color: "#d97706" }}>
            <Hash size={12} /> Next item will be added ×{pendingQty}. Scan or tap it now.
          </div>
        )}

        {/* category tabs */}
        <div className="flex gap-2 flex-wrap">
          {["All", ...categories].map((c: any) => (
            <button key={c} onClick={() => setActiveCat(c)} className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={activeCat === c ? { background: "#14181f", color: "white" } : { background: "white", color: "#475569" }}>{c}</button>
          ))}
        </div>

        {activeCat === "All" && !search && quickItems.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-0.5">Quick Sell</div>
            <div className="grid grid-cols-4 gap-2">{quickItems.map((p: any) => <QuickButton key={p.barcode} p={p} onAdd={onAdd} />)}</div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1.5 px-0.5">
            {activeCat === "All" && !search ? "All Items" : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
          </div>
          <div className="grid grid-cols-4 gap-2 pb-2">
            {filtered.map((p: any) => <QuickButton key={p.barcode} p={p} onAdd={onAdd} />)}
            {filtered.length === 0 && <div className="col-span-4 text-center text-slate-400 py-10">No items match your search.</div>}
          </div>
        </div>
      </div>

      {/* right: order panel */}
      <div className="flex flex-col bg-white shadow-xl border-l border-slate-200" style={{ width: 420 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 font-bold"><Receipt size={18} className="text-slate-500" /> Current Sale
            <span className="text-sm font-normal text-slate-400">({totals.count})</span></div>
          <div className="flex gap-1">
            <button onClick={onReturns} title="Returns / refund" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"><Undo2 size={16} /></button>
            {held && <button onClick={onResume} title="Resume held sale" className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50"><RotateCcw size={16} /></button>}
            <button onClick={onHold} title="Hold sale" disabled={!cart.length} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Pause size={16} /></button>
            <button onClick={clearCart} title="Clear cart" disabled={!cart.length} className="p-1.5 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30"><Trash2 size={16} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto px-2 py-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2"><ShoppingCart size={40} /><div className="text-sm">Scan or tap an item to begin</div></div>
          ) : cart.map((c: any) => (
            <div key={c.key} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-xs text-slate-400 font-mono">{money(c.price)} ea{!c.taxable && " · tax-free"}{c.isCustom && " · manual"}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => changeQty(c.key, -1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14} /></button>
                <span className="w-7 text-center font-mono font-bold">{c.qty}</span>
                <button onClick={() => changeQty(c.key, 1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={14} /></button>
              </div>
              <div className="w-16 text-right font-mono font-bold text-sm">{money(c.price * c.qty)}</div>
              <button onClick={() => removeLine(c.key)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
            </div>
          ))}
        </div>

        {/* manual entry */}
        <div className="border-t border-slate-100 px-3 pt-2 pb-1">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Hash size={13} /> Manual Entry</div>
            <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer"><input type="checkbox" checked={padTaxable} onChange={(e) => setPadTaxable(e.target.checked)} /> Taxable</label>
          </div>
          <div className="flex gap-2">
            <div className="flex-1"><CentsPad setValue={setPad} /></div>
            <div className="flex flex-col gap-1.5" style={{ width: 110 }}>
              <div className="flex-1 flex flex-col items-end justify-center px-2 rounded-lg font-mono font-bold text-xl" style={{ background: "#0f1115", color: "#34d399" }}>{money(pad / 100)}</div>
              <button onClick={() => setPad(0)} className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">Clear</button>
              <button onClick={addManualItem} className="py-2 rounded-lg font-semibold text-white text-sm" style={{ background: "#14181f" }}>Add</button>
            </div>
          </div>
        </div>

        {/* totals */}
        <div className="border-t-2 border-slate-100 p-4" style={{ background: "#fafbfc" }}>
          <div className="flex gap-2 mb-3">
            <button onClick={onDiscount} className="flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50">
              <Percent size={14} /> {discount ? "Edit Discount" : "Discount"}
            </button>
          </div>
          <div className="space-y-1 mb-3 font-mono text-sm">
            <Row label="Subtotal" value={money(totals.subtotal)} />
            {totals.discountAmt > 0 && (
              <div className="flex justify-between items-center" style={{ color: "#d97706" }}>
                <span className="flex items-center gap-1">Discount{discount.type === "pct" ? ` (${discount.value}%)` : ""}
                  <button onClick={onClearDiscount} className="text-slate-300 hover:text-red-500"><X size={13} /></button></span>
                <span>-{money(totals.discountAmt)}</span>
              </div>
            )}
            <Row label="Tax" value={money(totals.tax)} muted />
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Total</span>
            <span className="font-mono font-bold" style={{ fontSize: 32, color: "#0f1115" }}>{money(totals.total)}</span>
          </div>
          <button onClick={onCheckout} disabled={!cart.length}
            className="w-full py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: "#059669" }}>
            <DollarSign size={22} /> Charge {money(totals.total)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: any) {
  return <div className="flex justify-between"><span className={muted ? "text-slate-400" : "text-slate-600"}>{label}</span><span className={muted ? "text-slate-400" : "text-slate-700"}>{value}</span></div>;
}

function QuickButton({ p, onAdd }: any) {
  const out = p.reorder !== 0 && p.stock <= 0;
  return (
    <button onClick={() => onAdd(p)} disabled={out}
      className="relative flex flex-col justify-between p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-left hover:shadow-md transition-shadow disabled:opacity-40" style={{ minHeight: 84 }}>
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: CAT_COLOR[p.cat] || "#94a3b8" }} />
      <span className="text-sm font-semibold leading-tight pr-3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.name}</span>
      <span className="flex items-end justify-between mt-1">
        <span className="font-mono font-bold text-emerald-700">{money(p.price)}</span>
        {p.reorder !== 0 && <span className="text-xs font-mono" style={{ color: p.stock <= p.reorder ? "#dc2626" : "#94a3b8" }}>{out ? "out" : p.stock}</span>}
      </span>
    </button>
  );
}

/* ================================================================== */
/*  Checkout                                                           */
/* ================================================================== */
function CheckoutModal({ totals, cashier, onClose, onComplete }: any) {
  const [payments, setPayments] = useState<any[]>([]);   // {method, amount, given?}
  const [method, setMethod] = useState("cash");
  const [entry, setEntry] = useState(0);           // cents being typed

  const dueC = Math.round(totals.total * 100);
  const paidC = payments.reduce((a, p) => a + Math.round(p.amount * 100), 0);
  const balC = dueC - paidC;
  const balance = balC / 100;
  const covered = balC <= 0;
  const change = payments.reduce((a, p) => a + (p.method === "cash" && p.given != null ? Math.max(0, p.given - p.amount) : 0), 0);

  const addCash = (givenC: any) => {
    if (balC <= 0 || givenC <= 0) return;
    const applied = Math.min(givenC, balC);
    setPayments((prev) => [...prev, { method: "cash", amount: applied / 100, given: givenC / 100 }]);
    setEntry(0);
  };
  const addCard = (amtC: any) => {
    if (balC <= 0) return;
    const applied = Math.min(amtC > 0 ? amtC : balC, balC);
    if (applied <= 0) return;
    setPayments((prev) => [...prev, { method: "card", amount: applied / 100 }]);
    setEntry(0);
  };
  const removePay = (i: any) => setPayments((prev) => prev.filter((_, idx) => idx !== i));

  // finish: pay any remaining balance with the selected method, then complete
  const finish = () => {
    if (covered) { onComplete(payments, change); return; }
    if (method === "cash") onComplete([...payments, { method: "cash", amount: balance, given: balance }], change);
    else onComplete([...payments, { method: "card", amount: balance }], change);
  };

  const quickCash = [balance, Math.ceil(balance), Math.ceil(balance / 5) * 5, Math.ceil(balance / 10) * 10, Math.ceil(balance / 20) * 20]
    .filter((v, i, a) => v > 0 && a.indexOf(v) === i).slice(0, 4);

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 480 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}>
          <span className="font-bold text-lg">Payment</span>
          <span className="text-xs text-slate-400">Total {money(totals.total)} · {cashier}</span>
        </div>
        <div className="p-5">
          {/* balance */}
          <div className="text-center mb-3">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-bold">{covered ? "Paid in Full" : "Balance Due"}</div>
            <div className="font-mono font-bold" style={{ fontSize: 40, color: covered ? "#059669" : "#0f1115" }}>{money(Math.max(0, balance))}</div>
            {covered && change > 0 && <div className="text-sm font-bold" style={{ color: "#d97706" }}>Change due {money(change)}</div>}
          </div>

          {/* tenders so far */}
          {payments.length > 0 && (
            <div className="mb-3 rounded-lg border border-slate-100 divide-y divide-slate-50">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                  {p.method === "cash" ? <Banknote size={15} className="text-emerald-600" /> : <CreditCard size={15} className="text-blue-600" />}
                  <span className="font-semibold capitalize">{p.method}</span>
                  {p.method === "cash" && p.given > p.amount && <span className="text-xs text-slate-400">(gave {money(p.given)})</span>}
                  <span className="flex-1" />
                  <span className="font-mono font-bold">{money(p.amount)}</span>
                  <button onClick={() => removePay(i)} className="text-slate-300 hover:text-red-500"><X size={15} /></button>
                </div>
              ))}
            </div>
          )}

          {/* method */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => setMethod("cash")} className="flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2"
              style={method === "cash" ? { background: "#059669", color: "white", borderColor: "#059669" } : { borderColor: "#e2e8f0", color: "#475569" }}><Banknote size={18} /> Cash</button>
            <button onClick={() => setMethod("card")} className="flex-1 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border-2"
              style={method === "card" ? { background: "#2563eb", color: "white", borderColor: "#2563eb" } : { borderColor: "#e2e8f0", color: "#475569" }}><CreditCard size={18} /> Card</button>
          </div>

          {!covered && (
            <>
              {/* quick amounts */}
              <div className="flex gap-2 mb-3">
                {method === "cash"
                  ? quickCash.map((v) => <button key={v} onClick={() => addCash(Math.round(v * 100))} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-mono font-semibold text-sm">{Math.abs(v - balance) < 0.005 ? "Exact" : money(v)}</button>)
                  : <button onClick={() => addCard(balC)} className="flex-1 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm">Pay remaining {money(balance)} on card</button>}
              </div>
              {/* pad + entry */}
              <div className="flex gap-3">
                <div className="flex-1"><CentsPad setValue={setEntry} big /></div>
                <div className="flex flex-col gap-2" style={{ width: 140 }}>
                  <div className="px-3 py-2 rounded-lg" style={{ background: "#0f1115" }}><div className="text-xs text-slate-400">Entering</div><div className="font-mono font-bold text-lg" style={{ color: "#34d399" }}>{money(entry / 100)}</div></div>
                  <button onClick={() => setEntry(0)} className="py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold">Clear</button>
                  <button onClick={() => (method === "cash" ? addCash(entry) : addCard(entry))} disabled={entry <= 0}
                    className="py-2.5 rounded-lg font-semibold text-white text-sm disabled:opacity-40 flex-1" style={{ background: "#14181f" }}>
                    + Add {method === "cash" ? "Cash" : "Card"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Tip: add a partial amount to split across cash and card. Card tenders never exceed the balance, so no change is owed on them.</p>
            </>
          )}

          <button onClick={finish}
            className="w-full mt-4 py-4 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2"
            style={{ background: covered ? "#059669" : method === "cash" ? "#059669" : "#2563eb" }}>
            {covered ? <><Check size={20} /> Complete Sale</> : <>Pay {money(balance)} on {method === "cash" ? "Cash" : "Card"} &amp; Finish</>}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Discount                                                           */
/* ================================================================== */
function DiscountModal({ subtotal, onClose, onApply }: any) {
  const [type, setType] = useState("pct");
  const [v, setV] = useState(0);
  const amt = type === "pct" ? subtotal * v / 100 : Math.min(v / 100, subtotal);
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 380 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}><span className="font-bold text-lg">Apply Discount</span><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
        <div className="p-5">
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setType("pct"); setV(0); }} className="flex-1 py-2.5 rounded-lg font-bold border-2" style={type === "pct" ? { background: "#d97706", color: "white", borderColor: "#d97706" } : { borderColor: "#e2e8f0", color: "#475569" }}>% Percent</button>
            <button onClick={() => { setType("amt"); setV(0); }} className="flex-1 py-2.5 rounded-lg font-bold border-2" style={type === "amt" ? { background: "#d97706", color: "white", borderColor: "#d97706" } : { borderColor: "#e2e8f0", color: "#475569" }}>$ Amount</button>
          </div>
          {type === "pct" ? (
            <>
              <div className="flex gap-2 mb-3">{[5, 10, 15, 20].map((n) => <button key={n} onClick={() => setV(n)} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-semibold">{n}%</button>)}</div>
              <input type="number" value={v} onChange={(e) => setV(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-center font-mono text-lg outline-none" placeholder="Percent" />
            </>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1"><CentsPad setValue={setV} /></div>
              <div className="flex flex-col items-end justify-center px-3 rounded-lg font-mono font-bold text-xl" style={{ width: 110, background: "#0f1115", color: "#fbbf24" }}>{money(v / 100)}</div>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-400">Discount on {money(subtotal)}</span><span className="font-mono font-bold" style={{ color: "#d97706" }}>-{money(amt)}</span></div>
          <button onClick={() => onApply({ type, value: type === "pct" ? v : v / 100 })} disabled={v <= 0} className="w-full mt-4 py-3 rounded-xl text-white font-bold disabled:opacity-40" style={{ background: "#d97706" }}>Apply Discount</button>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Age Verify                                                         */
/* ================================================================== */
function AgeVerifyModal({ product, onConfirm, onDeny }: any) {
  return (
    <Overlay onClose={onDeny}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden text-center" style={{ width: 380 }}>
        <div className="flex flex-col items-center gap-2 py-6" style={{ background: "#7c3aed", color: "white" }}>
          <ShieldCheck size={40} /><span className="font-bold text-lg">Age-Restricted Item</span>
        </div>
        <div className="p-5">
          <p className="text-slate-600 mb-1"><span className="font-bold">{product.name}</span> requires ID.</p>
          <p className="text-sm text-slate-400 mb-5">Confirm the customer is 21 or older before adding.</p>
          <div className="flex gap-3">
            <button onClick={onDeny} className="flex-1 py-3 rounded-xl font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50">Under 21 / Decline</button>
            <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: "#7c3aed" }}>ID Verified · 21+</button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Returns / Refunds                                                  */
/* ================================================================== */
function ReturnsModal({ transactions, taxRate, onClose, onRefund }: any) {
  const sales = useMemo(() => transactions.filter((t: any) => t.type === "sale"), [transactions]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<any>(null);   // original tx
  const [qtys, setQtys] = useState<any>({});   // key -> qty to return
  const [method, setMethod] = useState("cash");

  // already-refunded per item across prior refunds for this sale
  const refundedFor = useCallback((tx: any) => {
    const map: any = {};
    transactions.filter((t: any) => t.type === "refund" && t.refOf === tx.id).forEach((r: any) => r.items.forEach((it: any) => { map[itemKey(it)] = (map[itemKey(it)] || 0) + it.qty; }));
    return map;
  }, [transactions]);

  const selectTx = (tx: any) => { setSel(tx); setMethod(tx.method); setQtys({}); };

  const refunded = sel ? refundedFor(sel) : {};
  const returnLines = sel
    ? sel.items.map((it: any) => ({ ...it, max: it.qty - (refunded[itemKey(it)] || 0), qty: qtys[itemKey(it)] || 0 })).filter((it: any) => it.max > 0)
    : [];
  const refundSub = returnLines.reduce((a: any, it: any) => a + it.price * it.qty, 0);
  const refundTax = returnLines.reduce((a: any, it: any) => a + (it.taxable ? it.price * it.qty : 0), 0) * (taxRate / 100);
  const refundTotal = refundSub + refundTax;
  const setQ2 = (k: any, max: any, v: any) => setQtys((prev: any) => ({ ...prev, [k]: Math.max(0, Math.min(max, v)) }));

  const filteredSales = sales.filter((t: any) => {
    const s = q.trim().toLowerCase();
    return !s || t.id.toLowerCase().includes(s) || t.items.some((i: any) => i.name.toLowerCase().includes(s));
  }).slice(0, 40);

  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 760, height: 560 }}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: "#14181f", color: "white" }}>
          <span className="font-bold text-lg flex items-center gap-2"><Undo2 size={20} /> Returns & Refunds</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* left: pick a sale */}
          <div className="flex flex-col border-r border-slate-100" style={{ width: 300 }}>
            <div className="p-3 border-b border-slate-100"><div className="relative"><Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find sale by # or item…" className="w-full pl-8 pr-2 py-2 rounded-lg bg-slate-100 text-sm outline-none" /></div></div>
            <div className="flex-1 overflow-auto">
              {filteredSales.length === 0 && <div className="text-center text-slate-400 text-sm py-10">No sales found.</div>}
              {filteredSales.map((t: any) => (
                <button key={t.id} onClick={() => selectTx(t)} className="w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50" style={sel?.id === t.id ? { background: "#ecfdf5" } : {}}>
                  <div className="flex justify-between text-sm font-semibold"><span className="font-mono">#{t.id.slice(0, 6).toUpperCase()}</span><span className="font-mono">{money(t.total)}</span></div>
                  <div className="text-xs text-slate-400">{new Date(t.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {t.items.reduce((a: any, i: any) => a + i.qty, 0)} items</div>
                </button>
              ))}
            </div>
          </div>
          {/* right: choose items */}
          <div className="flex-1 flex flex-col min-w-0">
            {!sel ? (
              <div className="flex-1 flex items-center justify-center text-slate-300">Select a sale to refund</div>
            ) : (
              <>
                <div className="flex-1 overflow-auto p-4">
                  <div className="text-xs text-slate-400 mb-2">Sale #{sel.id.slice(0, 6).toUpperCase()} · {new Date(sel.ts).toLocaleString()} · {sel.cashier}</div>
                  {returnLines.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">All items on this sale have been fully refunded.</div>
                  ) : returnLines.map((it: any) => (
                    <div key={itemKey(it)} className="flex items-center gap-2 py-2 border-b border-slate-50">
                      <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{it.name}</div><div className="text-xs text-slate-400 font-mono">{money(it.price)} · up to {it.max}</div></div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setQ2(itemKey(it), it.max, it.qty - 1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14} /></button>
                        <span className="w-7 text-center font-mono font-bold">{it.qty}</span>
                        <button onClick={() => setQ2(itemKey(it), it.max, it.qty + 1)} className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={14} /></button>
                        <button onClick={() => setQ2(itemKey(it), it.max, it.max)} className="ml-1 text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 font-semibold">All</button>
                      </div>
                      <div className="w-16 text-right font-mono font-bold text-sm" style={{ color: it.qty ? "#dc2626" : "#cbd5e1" }}>{it.qty ? "-" + money(it.price * it.qty) : money(0)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-4" style={{ background: "#fafbfc" }}>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setMethod("cash")} className="flex-1 py-2 rounded-lg font-semibold border-2 flex items-center justify-center gap-1.5" style={method === "cash" ? { background: "#059669", color: "white", borderColor: "#059669" } : { borderColor: "#e2e8f0", color: "#475569" }}><Banknote size={15} /> Cash</button>
                    <button onClick={() => setMethod("card")} className="flex-1 py-2 rounded-lg font-semibold border-2 flex items-center justify-center gap-1.5" style={method === "card" ? { background: "#2563eb", color: "white", borderColor: "#2563eb" } : { borderColor: "#e2e8f0", color: "#475569" }}><CreditCard size={15} /> Card</button>
                  </div>
                  <div className="flex items-center justify-between mb-3"><span className="font-bold uppercase tracking-wide text-sm text-slate-500">Refund Total</span><span className="font-mono font-bold text-2xl" style={{ color: "#dc2626" }}>{money(refundTotal)}</span></div>
                  <button onClick={() => onRefund(sel, returnLines.filter((it: any) => it.qty > 0), method)} disabled={refundTotal <= 0} className="w-full py-3.5 rounded-xl text-white font-bold disabled:opacity-40" style={{ background: "#dc2626" }}>Process Refund</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Receipt (sale, refund, or Z report)                                */
/* ================================================================== */
function ReceiptModal({ data, storeName, onClose }: any) {
  if (data.type === "z") return <ZReceipt z={data} storeName={storeName} onClose={onClose} />;
  const refund = data.type === "refund";
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 360 }}>
        <div className="flex items-center justify-center py-4" style={{ background: refund ? "#dc2626" : "#059669" }}>
          <div className="flex items-center gap-2 text-white font-bold text-lg">{refund ? <Undo2 size={22} /> : <Check size={22} />} {refund ? "Refund Issued" : "Sale Complete"}</div>
        </div>
        <div className="p-5 font-mono text-sm" style={{ color: "#1e293b" }}>
          <div className="text-center mb-3"><div className="font-bold text-base">{storeName}</div><div className="text-xs text-slate-400">{new Date(data.ts).toLocaleString()}</div>
            <div className="text-xs text-slate-400">{refund ? "Refund" : "Sale"} #{data.id.slice(0, 6).toUpperCase()} · {data.cashier}</div></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {data.items.map((it: any, i: any) => <div key={i} className="flex justify-between py-0.5"><span className="truncate pr-2">{it.qty}× {it.name}</span><span>{money((refund ? -1 : 1) * it.price * it.qty)}</span></div>)}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="flex justify-between"><span>Subtotal</span><span>{money(data.subtotal)}</span></div>
          {data.discount > 0 && <div className="flex justify-between" style={{ color: "#d97706" }}><span>Discount</span><span>-{money(data.discount)}</span></div>}
          <div className="flex justify-between text-slate-500"><span>Tax</span><span>{money(data.tax)}</span></div>
          <div className="flex justify-between font-bold text-base mt-1"><span>{refund ? "Refund" : "Total"}</span><span>{money(data.total)}</span></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {!refund && Array.isArray(data.payments) && data.payments.length
            ? data.payments.map((p: any, i: number) => <div key={i} className="flex justify-between"><span className="capitalize">{p.method}</span><span>{money(p.amount)}</span></div>)
            : <div className="flex justify-between"><span>{data.method === "cash" ? "Cash" : data.method === "card" ? "Card" : "Tendered"}</span><span>{money(data.tendered)}</span></div>}
          {!refund && data.change > 0 && <div className="flex justify-between font-bold"><span>Change</span><span>{money(data.change)}</span></div>}
          <div className="text-center text-xs text-slate-400 mt-3">{refund ? "Refund processed" : "Thank you!"}</div>
        </div>
        <div className="p-4 pt-0"><button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "#14181f" }}>Done</button></div>
      </div>
    </Overlay>
  );
}

function ZReceipt({ z, storeName, onClose }: any) {
  const line = (l: any, v: any, c: any) => <div className="flex justify-between py-0.5"><span>{l}</span><span style={c ? { color: c } : {}}>{v}</span></div>;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 380 }}>
        <div className="flex items-center justify-center py-4" style={{ background: "#14181f" }}><div className="flex items-center gap-2 text-white font-bold text-lg"><FileText size={20} /> Z Report</div></div>
        <div className="p-5 font-mono text-sm max-h-96 overflow-auto" style={{ color: "#1e293b" }}>
          <div className="text-center mb-2"><div className="font-bold text-base">{storeName}</div>
            <div className="text-xs text-slate-400">{z.openedAt ? new Date(z.openedAt).toLocaleString() : "Open"} → {new Date(z.closedAt).toLocaleString()}</div></div>
          <div className="border-t border-dashed border-slate-300 my-2" />
          {line("Gross sales", money(z.grossSales), null)}
          {line("Refunds", money(-z.refundTotal), "#dc2626")}
          {line("Net sales", money(z.netSales), null)}
          {line("Tax collected", money(z.taxColl), null)}
          <div className="border-t border-dashed border-slate-300 my-2" />
          {line("Cash sales", money(z.cashSales), null)}
          {line("Card sales", money(z.cardSales), null)}
          {z.manualSales > 0 && line("Manual sales", money(z.manualSales), "#d97706")}
          {line("Transactions", z.saleCount, null)}
          {line("Items sold", z.items, null)}
          {line("Avg sale", money(z.avg), null)}
          <div className="border-t border-dashed border-slate-300 my-2" />
          <div className="font-bold mb-1">Cash Drawer</div>
          {line("Opening float", money(z.float), null)}
          {line("+ Cash sales", money(z.cashSales), "#059669")}
          {line("− Cash refunds", money(-z.cashRefunds), "#dc2626")}
          {line("+ Paid in", money(z.paidIn), "#059669")}
          {line("− Paid out", money(-z.paidOut), "#dc2626")}
          {line("Expected in drawer", money(z.expectedCash), null)}
          {z.countedCash != null && line("Counted", money(z.countedCash), null)}
          {z.countedCash != null && line("Over / Short", money(z.overShort), Math.abs(z.overShort) < 0.005 ? "#059669" : "#dc2626")}
          <div className="text-center text-xs text-slate-400 mt-3">Report #{z.id.slice(0, 6).toUpperCase()} · {z.cashierName}</div>
        </div>
        <div className="p-4 pt-0"><button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "#14181f" }}>Done</button></div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Inventory                                                          */
/* ================================================================== */
function InventoryView({ products, lowStock, onEdit, onNew, onRestock, onToggleQuick }: any) {
  const [q, setQ] = useState("");
  const list = products.filter((p: any) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q));
  const invValue = products.reduce((a: any, p: any) => a + (p.reorder === 0 ? 0 : p.cost * p.stock), 0);
  return (
    <div className="h-full overflow-auto p-4"><div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div><h2 className="text-xl font-bold">Inventory</h2>
          <p className="text-sm text-slate-500">{products.length} products · {money(invValue)} stock value at cost{lowStock.length > 0 && <span className="text-red-600 font-semibold"> · {lowStock.length} low</span>}</p></div>
        <div className="flex gap-2">
          <div className="relative"><Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-8 pr-3 py-2 rounded-lg bg-white border border-slate-200 outline-none text-sm w-56" /></div>
          <button onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold text-sm" style={{ background: "#059669" }}><Plus size={16} /> Add Product</button>
        </div>
      </div>
      {lowStock.length > 0 && (
        <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" /><div className="text-sm text-red-700"><span className="font-bold">Low stock:</span> {lowStock.map((p: any) => `${p.name} (${p.stock})`).join(", ")}</div></div>
      )}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400" style={{ background: "#f8fafc" }}>
            <th className="px-4 py-3 font-semibold">Product</th><th className="px-3 py-3 font-semibold">Barcode</th><th className="px-3 py-3 font-semibold text-right">Price</th>
            <th className="px-3 py-3 font-semibold text-right">Stock</th><th className="px-3 py-3 font-semibold text-center">Quick</th><th className="px-3 py-3 font-semibold text-right">Actions</th></tr></thead>
          <tbody>
            {list.map((p: any) => {
              const low = p.reorder > 0 && p.stock <= p.reorder;
              return (
                <tr key={p.barcode} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[p.cat] }} /><div><div className="font-semibold">{p.name}</div><div className="text-xs text-slate-400">{p.cat}{!p.taxable && " · tax-free"}</div></div></div></td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.barcode}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">{money(p.price)}</td>
                  <td className="px-3 py-2.5 text-right"><span className="font-mono font-bold" style={{ color: low ? "#dc2626" : "#1e293b" }}>{p.reorder === 0 ? "∞" : p.stock}</span>{low && <span className="ml-1 text-xs text-red-500">low</span>}</td>
                  <td className="px-3 py-2.5 text-center"><button onClick={() => onToggleQuick(p.barcode)} className="w-9 h-5 rounded-full relative transition-colors" style={{ background: p.quick ? "#10b981" : "#cbd5e1" }}><span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: p.quick ? 18 : 2 }} /></button></td>
                  <td className="px-3 py-2.5"><div className="flex items-center justify-end gap-1">{p.reorder !== 0 && <button onClick={() => onRestock(p.barcode, 10)} title="+10 stock" className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1"><Box size={12} /> +10</button>}<button onClick={() => onEdit(p)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200"><Pencil size={14} /></button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div></div>
  );
}

/* ================================================================== */
/*  Product Editor                                                     */
/* ================================================================== */
function ProductEditor({ product, categories, onCancel, onSave, onDelete }: any) {
  const [f, setF] = useState(product || { barcode: "", name: "", price: 0, cost: 0, stock: 0, cat: "Snacks", quick: false, taxable: true, reorder: 5 });
  const set = (k: any, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const num = (v: any) => (v === "" ? 0 : parseFloat(v) || 0);
  const valid = f.name.trim() && f.barcode.trim();
  return (
    <Overlay onClose={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 460 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}><span className="font-bold text-lg">{product ? "Edit Product" : "New Product"}</span><button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <Field label="Name"><input value={f.name} onChange={(e: any) => set("name", e.target.value)} className="inp" autoFocus /></Field>
          <Field label="Barcode"><input value={f.barcode} onChange={(e: any) => set("barcode", e.target.value)} disabled={!!product} className="inp font-mono disabled:bg-slate-100 disabled:text-slate-400" placeholder="Scan or type" /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Price ($)"><input type="number" step="0.01" value={f.price} onChange={(e: any) => set("price", num(e.target.value))} className="inp font-mono" /></Field><Field label="Cost ($)"><input type="number" step="0.01" value={f.cost} onChange={(e: any) => set("cost", num(e.target.value))} className="inp font-mono" /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Stock"><input type="number" value={f.stock} onChange={(e: any) => set("stock", Math.round(num(e.target.value)))} className="inp font-mono" /></Field><Field label="Reorder at (0 = untracked)"><input type="number" value={f.reorder} onChange={(e: any) => set("reorder", Math.round(num(e.target.value)))} className="inp font-mono" /></Field></div>
          <Field label="Category"><select value={f.cat} onChange={(e: any) => set("cat", e.target.value)} className="inp">{categories.map((c: any) => <option key={c}>{c}</option>)}</select></Field>
          <div className="flex gap-4 pt-1"><label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" checked={f.quick} onChange={(e) => set("quick", e.target.checked)} /> Quick-sell button</label><label className="flex items-center gap-2 text-sm font-medium cursor-pointer"><input type="checkbox" checked={f.taxable} onChange={(e) => set("taxable", e.target.checked)} /> Taxable</label></div>
        </div>
        <div className="flex items-center justify-between gap-2 p-4 border-t border-slate-100">
          {onDelete ? <button onClick={onDelete} className="px-4 py-2.5 rounded-lg text-red-600 font-semibold text-sm hover:bg-red-50 flex items-center gap-1.5"><Trash2 size={15} /> Delete</button> : <span />}
          <div className="flex gap-2"><button onClick={onCancel} className="px-4 py-2.5 rounded-lg font-semibold text-sm text-slate-600 hover:bg-slate-100">Cancel</button><button onClick={() => valid && onSave(f)} disabled={!valid} className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-40" style={{ background: "#059669" }}>Save</button></div>
        </div>
      </div>
      <style>{`.inp{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;outline:none;font-size:14px}.inp:focus{border-color:#10b981}`}</style>
    </Overlay>
  );
}
function Field({ label, children }: any) {
  return <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1 block">{label}</span>{children}</label>;
}

/* ================================================================== */
/*  Staff / Timesheet                                                  */
/* ================================================================== */
function fmtDur(ms: number) { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}h ${m % 60}m`; }

function StaffView({ employees, setEmployees, timesheet, clockToggle, clockedIn, now, flash }: any) {
  const [adding, setAdding] = useState(false);
  const [nm, setNm] = useState(""); const [role, setRole] = useState("Cashier"); const [pin, setPin] = useState("");
  const weekAgo = now - 7 * 86400000;

  const hoursByEmp = useMemo(() => {
    const map: Record<string, number> = {};
    timesheet.forEach((e: Punch) => {
      if (e.clockIn < weekAgo) return;
      const end = e.clockOut || now;
      map[e.empId] = (map[e.empId] || 0) + (end - e.clockIn);
    });
    return map;
  }, [timesheet, now, weekAgo]);

  const log = useMemo(() => [...timesheet].sort((a: Punch, b: Punch) => b.clockIn - a.clockIn).slice(0, 25), [timesheet]);
  const empName = (id: string) => employees.find((e: Employee) => e.id === id)?.name || "—";

  const addEmp = () => {
    if (!nm.trim()) { flash("Enter a name", "warn"); return; }
    setEmployees((prev: Employee[]) => [...prev, { id: uid(), name: nm.trim(), role, pin: pin.trim() }]);
    setNm(""); setPin(""); setAdding(false); flash("Employee added", "ok");
  };

  return (
    <div className="h-full overflow-auto p-4"><div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Staff & Timesheet</h2><p className="text-sm text-slate-500">{clockedIn.size} on the clock · hours shown for the last 7 days</p></div>
        <button onClick={() => setAdding((a) => !a)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white font-semibold text-sm" style={{ background: "#059669" }}><Plus size={16} /> Add Employee</button>
      </div>

      {adding && (
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-end gap-3 flex-wrap">
          <Field label="Name"><input value={nm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNm(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" autoFocus /></Field>
          <Field label="Role"><select value={role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRole(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm"><option>Cashier</option><option>Manager</option><option>Stocker</option></select></Field>
          <Field label="PIN (optional)"><input value={pin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))} className="px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-mono w-28" /></Field>
          <button onClick={addEmp} className="px-4 py-2 rounded-lg text-white font-semibold text-sm" style={{ background: "#14181f" }}>Save</button>
        </div>
      )}

      {/* employee cards */}
      <div className="grid grid-cols-3 gap-3">
        {employees.map((e: Employee) => {
          const on = clockedIn.has(e.id);
          const activePunch = timesheet.find((t: Punch) => t.empId === e.id && !t.clockOut);
          return (
            <div key={e.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div><div className="font-bold">{e.name}</div><div className="text-xs text-slate-400">{e.role}{e.pin ? ` · PIN ${e.pin}` : ""}</div></div>
                <span className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: on ? "#10b981" : "#cbd5e1" }} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div><div className="text-xs text-slate-400">Hours (7d)</div><div className="font-mono font-bold text-lg">{fmtDur(hoursByEmp[e.id] || 0)}</div></div>
                <button onClick={() => clockToggle(e.id)} className="px-3 py-2 rounded-lg font-semibold text-sm text-white flex items-center gap-1.5" style={{ background: on ? "#dc2626" : "#059669" }}>
                  {on ? <><LogOut size={15} /> Clock Out</> : <><LogIn size={15} /> Clock In</>}
                </button>
              </div>
              {on && activePunch && <div className="mt-2 text-xs text-emerald-600 font-semibold">On the clock since {new Date(activePunch.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}
            </div>
          );
        })}
      </div>

      {/* punch log */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-bold text-sm border-b border-slate-50 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Punch Log</div>
        {log.length === 0 ? <div className="text-center text-slate-400 text-sm py-8">No punches yet.</div> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400" style={{ background: "#f8fafc" }}><th className="px-4 py-2.5 font-semibold">Employee</th><th className="px-3 py-2.5 font-semibold">Date</th><th className="px-3 py-2.5 font-semibold">In</th><th className="px-3 py-2.5 font-semibold">Out</th><th className="px-3 py-2.5 font-semibold text-right">Duration</th></tr></thead>
            <tbody>{log.map((e: Punch) => (
              <tr key={e.id} className="border-t border-slate-50">
                <td className="px-4 py-2 font-semibold">{empName(e.empId)}</td>
                <td className="px-3 py-2 text-slate-500">{new Date(e.clockIn).toLocaleDateString([], { month: "short", day: "numeric" })}</td>
                <td className="px-3 py-2 font-mono">{new Date(e.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-3 py-2 font-mono">{e.clockOut ? new Date(e.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span className="text-emerald-600 font-semibold">on clock</span>}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtDur((e.clockOut || now) - e.clockIn)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div></div>
  );
}

/* ================================================================== */
/*  Reports                                                            */
/* ================================================================== */
function ReportsView({ transactions, lowStock, settings, setSettings, onReprint, onRefund }: any) {
  const today = dayKey(Date.now());
  const todayTx = transactions.filter((t: Transaction) => t.type === "sale" && dayKey(t.ts) === today);
  const stats = useMemo(() => {
    const revenue = todayTx.reduce((a: number, t: Transaction) => a + t.total, 0);
    const items = todayTx.reduce((a: number, t: Transaction) => a + t.items.reduce((s: number, i: TransactionItem) => s + i.qty, 0), 0);
    return { revenue, count: todayTx.length, items, avg: todayTx.length ? revenue / todayTx.length : 0 };
  }, [todayTx]);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = dayKey(d);
      const sum = transactions.filter((t: Transaction) => t.type === "sale" && dayKey(t.ts) === key).reduce((a: number, t: Transaction) => a + t.total, 0);
      days.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }), sales: Math.round(sum * 100) / 100 }); }
    return days;
  }, [transactions]);

  const topSellers = useMemo(() => {
    const map: Record<string, { name: string; qty: number; rev: number }> = {};
    transactions.filter((t: Transaction) => t.type === "sale").forEach((t: Transaction) => t.items.forEach((i: TransactionItem) => { if (!map[i.name]) map[i.name] = { name: i.name, qty: 0, rev: 0 }; map[i.name].qty += i.qty; map[i.name].rev += i.price * i.qty; }));
    return Object.values(map).sort((a: any, b: any) => b.qty - a.qty).slice(0, 6);
  }, [transactions]);

  const recent = transactions.filter((t: Transaction) => t.type === "sale" || t.type === "refund").slice(0, 14);

  return (
    <div className="h-full overflow-auto p-4"><div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between"><h2 className="text-xl font-bold">Reports</h2>
        <button onClick={onRefund} className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50"><Undo2 size={15} /> New Return</button></div>

      <div className="grid grid-cols-4 gap-3">
        <Stat label="Today's Sales" value={money(stats.revenue)} icon={DollarSign} color="#059669" />
        <Stat label="Transactions" value={stats.count} icon={Receipt} color="#2563eb" />
        <Stat label="Items Sold" value={stats.items} icon={Box} color="#d97706" />
        <Stat label="Avg Sale" value={money(stats.avg)} icon={TrendingUp} color="#7c3aed" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3">Last 7 Days</div><div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 12, fill: "#94a3b8" } as any} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: "#94a3b8" } as any} axisLine={false} tickLine={false} /><Tooltip formatter={(v: any) => money(v)} cursor={{ fill: "#f8fafc" }} /><Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3">Top Sellers (all time)</div>
          {topSellers.length === 0 ? <div className="text-sm text-slate-400 py-8 text-center">No sales recorded yet.</div> : (
            <div className="space-y-2">{topSellers.map((s: any, i) => <div key={s.name} className="flex items-center gap-3"><span className="w-6 text-center font-bold text-slate-300">{i + 1}</span><span className="flex-1 text-sm font-medium truncate">{s.name}</span><span className="text-sm text-slate-400">{s.qty} sold</span><span className="text-sm font-mono font-semibold w-16 text-right">{money(s.rev)}</span></div>)}</div>
          )}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3">Store Settings</div>
          <Field label="Store Name"><input value={settings.storeName} onChange={(e: any) => setSettings((s: any) => ({ ...s, storeName: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm" /></Field>
          <div className="mt-3"><Field label="Tax Rate (%)"><input type="number" step="0.01" value={settings.taxRate} onChange={(e: any) => setSettings((s: any) => ({ ...s, taxRate: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-sm font-mono" /></Field></div></div>
        <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3 flex items-center gap-2">Reorder Report{lowStock.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: "#dc2626" }}>{lowStock.length}</span>}</div>
          {lowStock.length === 0 ? <div className="text-sm text-slate-400 py-8 text-center">Everything is well stocked.</div> : <div className="space-y-1.5">{lowStock.map((p: any) => <div key={p.barcode} className="flex items-center justify-between text-sm"><span className="font-medium">{p.name}</span><span className="font-mono text-red-600 font-bold">{p.stock} left</span></div>)}</div>}</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3">Recent Transactions</div>
        {recent.length === 0 ? <div className="text-sm text-slate-400 py-8 text-center">No transactions yet.</div> : (
          <div className="divide-y divide-slate-50">{recent.map((t: Transaction) => {
            const refund = t.type === "refund";
            return (
              <div key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="font-mono text-xs w-16" style={{ color: refund ? "#dc2626" : "#94a3b8" }}>{refund ? "RFND" : "#" + t.id.slice(0, 4).toUpperCase()}</span>
                <span className="text-slate-500 w-32">{new Date(t.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex-1 text-slate-400 truncate">{t.items.reduce((a: number, i: TransactionItem) => a + i.qty, 0)} items · {t.method} · {t.cashier}</span>
                <span className="font-mono font-bold w-20 text-right" style={refund ? { color: "#dc2626" } : {}}>{money(t.total)}</span>
                <button onClick={() => onReprint(t)} title="Reprint receipt" className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100"><Printer size={15} /></button>
              </div>
            );
          })}</div>
        )}</div>
    </div></div>
  );
}
function Stat({ label, value, icon: Icon, color }: any) {
  return <div className="bg-white rounded-xl shadow-sm p-4"><div className="flex items-center justify-between mb-1"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span><Icon size={16} style={{ color }} /></div><div className="font-mono font-bold" style={{ fontSize: 26, color: "#0f1115" }}>{value}</div></div>;
}

/* ================================================================== */
/*  End of Day                                                         */
/* ================================================================== */
function EndOfDayView({ transactions, settings, zreports, onCash, onCloseDay, onView, now }: { transactions: Transaction[], settings: Settings, zreports: ZReport[], onCash: any, onCloseDay: any, onView: any, now: number }) {
  const s = useMemo(() => computeDayStats(transactions, settings.lastClose, settings.float), [transactions, settings.lastClose, settings.float]);
  const [cashMove, setCashMove] = useState<any>(null);  // 'paidin' | 'paidout'
  const [closing, setClosing] = useState(false);

  const StatRow = ({ l, v, c, bold }: any) => (
    <div className="flex justify-between py-1.5"><span className={bold ? "font-bold" : "text-slate-500"}>{l}</span><span className={"font-mono " + (bold ? "font-bold" : "")} style={c ? { color: c } : {}}>{v}</span></div>
  );

  return (
    <div className="h-full overflow-auto p-4"><div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">End of Day</h2>
          <p className="text-sm text-slate-500">Live totals since {settings.lastClose ? new Date(settings.lastClose).toLocaleString() : "the beginning"}</p></div>
        <div className="flex gap-2">
          <button onClick={() => onCash("nosale", 0, null)} className="px-3 py-2 rounded-lg font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50">No Sale</button>
          <button onClick={() => setCashMove("paidin")} className="px-3 py-2 rounded-lg font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5"><ArrowDownToLine size={15} /> Paid In</button>
          <button onClick={() => setCashMove("paidout")} className="px-3 py-2 rounded-lg font-semibold text-sm border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-1.5"><ArrowUpFromLine size={15} /> Paid Out</button>
          <button onClick={() => setClosing(true)} className="px-4 py-2 rounded-lg font-semibold text-sm text-white flex items-center gap-1.5" style={{ background: "#14181f" }}><FileText size={15} /> Close Day (Z)</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Net Sales" value={money(s.netSales)} icon={DollarSign} color="#059669" />
        <Stat label="Transactions" value={s.saleCount} icon={Receipt} color="#2563eb" />
        <Stat label="Tax Collected" value={money(s.taxColl)} icon={Percent} color="#d97706" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5"><div className="font-bold mb-2 flex items-center gap-2"><BarChart3 size={16} className="text-slate-400" /> Sales Summary</div>
          <StatRow l="Gross sales" v={money(s.grossSales)} />
          <StatRow l="Refunds" v={money(-s.refundTotal)} c="#dc2626" />
          <div className="border-t border-slate-100 my-1" />
          <StatRow l="Net sales" v={money(s.netSales)} bold />
          <StatRow l="Tax collected" v={money(s.taxColl)} />
          <div className="border-t border-slate-100 my-1" />
          <StatRow l="Cash sales" v={money(s.cashSales)} />
          <StatRow l="Card sales" v={money(s.cardSales)} />
          <StatRow l="Manual (open-price) sales" v={`${money(s.manualSales)} · ${s.manualCount}`} c="#d97706" />
          <StatRow l="Items sold" v={s.items} />
          <StatRow l="Avg sale" v={money(s.avg)} />
          <StatRow l="Refunds issued" v={s.refundCount} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5"><div className="font-bold mb-2 flex items-center gap-2"><Banknote size={16} className="text-slate-400" /> Cash Drawer</div>
          <StatRow l="Opening float" v={money(settings.float)} />
          <StatRow l="+ Cash sales" v={money(s.cashSales)} c="#059669" />
          <StatRow l="− Cash refunds" v={money(-s.cashRefunds)} c="#dc2626" />
          <StatRow l="+ Paid in" v={money(s.paidIn)} c="#059669" />
          <StatRow l="− Paid out" v={money(-s.paidOut)} c="#dc2626" />
          <div className="border-t border-slate-100 my-1" />
          <StatRow l="Expected in drawer" v={money(s.expectedCash)} bold />
          <StatRow l="No-sale opens" v={s.noSales} />
        </div>
      </div>

      {zreports.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4"><div className="text-sm font-bold mb-3 flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> Past Z Reports</div>
          <div className="divide-y divide-slate-50">{zreports.slice(0, 10).map((z: ZReport) => (
            <button key={z.id} onClick={() => onView(z)} className="w-full flex items-center gap-3 py-2 text-sm hover:bg-slate-50 rounded-lg px-2 text-left">
              <span className="font-mono text-xs text-slate-400 w-16">#{z.id.slice(0, 6).toUpperCase()}</span>
              <span className="text-slate-500 flex-1">{new Date(z.closedAt).toLocaleString()}</span>
              <span className="text-slate-400">{z.saleCount} sales</span>
              <span className="font-mono font-bold w-20 text-right">{money(z.netSales)}</span>
              <span className="font-mono w-20 text-right text-xs" style={{ color: Math.abs(z.overShort) < 0.005 ? "#059669" : "#dc2626" }}>{z.overShort >= 0 ? "+" : ""}{money(z.overShort)}</span>
            </button>
          ))}</div></div>
      )}

      {cashMove && <CashMoveModal kind={cashMove} onClose={() => setCashMove(null)} onConfirm={(amt: any, note: any) => { onCash(cashMove, amt, note); setCashMove(null); }} />}
      {closing && <CloseDayModal expected={s.expectedCash} float={settings.float} onClose={() => setClosing(false)} onConfirm={(counted: any, nf: any) => { onCloseDay(counted, nf); setClosing(false); }} />}
    </div></div>
  );
}

function CashMoveModal({ kind, onClose, onConfirm }: any) {
  const [amt, setAmt] = useState(0);
  const [note, setNote] = useState("");
  const paidIn = kind === "paidin";
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 380 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}><span className="font-bold text-lg">{paidIn ? "Paid In" : "Paid Out"}</span><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
        <div className="p-5">
          <div className="flex gap-3 mb-3"><div className="flex-1"><CentsPad setValue={setAmt} /></div><div className="flex flex-col items-end justify-center px-3 rounded-lg font-mono font-bold text-xl" style={{ width: 110, background: "#0f1115", color: paidIn ? "#34d399" : "#f87171" }}>{money(amt / 100)}</div></div>
          <input value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="Reason (e.g. vendor payment)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none mb-3" />
          <button onClick={() => onConfirm(amt / 100, note)} disabled={amt <= 0} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-40" style={{ background: paidIn ? "#059669" : "#dc2626" }}>Record {paidIn ? "Paid In" : "Paid Out"}</button>
        </div>
      </div>
    </Overlay>
  );
}

function CloseDayModal({ expected, float, onClose, onConfirm }: any) {
  const [counted, setCounted] = useState(0);
  const [nf, setNf] = useState(Math.round(float * 100));
  const c = counted / 100, over = c - expected;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 420 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: "#14181f", color: "white" }}><span className="font-bold text-lg flex items-center gap-2"><FileText size={18} /> Close Day</span><button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
        <div className="p-5">
          <div className="text-center mb-3"><div className="text-xs uppercase tracking-wide text-slate-400 font-bold">Expected in Drawer</div><div className="font-mono font-bold text-2xl">{money(expected)}</div></div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Count the drawer</div>
          <div className="flex gap-3 mb-3"><div className="flex-1"><CentsPad setValue={setCounted} /></div>
            <div className="flex flex-col gap-2" style={{ width: 130 }}>
              <div className="px-3 py-2 rounded-lg"><div className="text-xs text-slate-400">Counted</div><div className="font-mono font-bold text-lg">{money(c)}</div></div>
              <div className="px-3 py-2 rounded-lg flex-1 flex flex-col justify-center" style={{ background: Math.abs(over) < 0.005 ? "#ecfdf5" : "#fef2f2" }}><div className="text-xs text-slate-400">Over / Short</div><div className="font-mono font-bold" style={{ color: Math.abs(over) < 0.005 ? "#059669" : "#dc2626" }}>{over >= 0 ? "+" : ""}{money(over)}</div></div>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-500">Float for next shift</span>
            <div className="flex-1" />
            <button onClick={() => setNf((v: any) => Math.max(0, v - 5000))} className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={14} /></button>
            <span className="font-mono font-bold w-20 text-right">{money(nf / 100)}</span>
            <button onClick={() => setNf((v: any) => v + 5000)} className="w-8 h-8 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={14} /></button>
          </div>
          <button onClick={() => onConfirm(c, nf / 100)} className="w-full py-3.5 rounded-xl text-white font-bold" style={{ background: "#dc2626" }}>Close Day & Print Z Report</button>
          <p className="text-xs text-slate-400 text-center mt-2">This finalizes the period and resets the running totals.</p>
        </div>
      </div>
    </Overlay>
  );
}

/* ================================================================== */
/*  Overlay                                                            */
/* ================================================================== */
function Overlay({ children, onClose }: any) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: "rgba(15,17,21,0.55)" }} onClick={onClose}><div onClick={(e) => e.stopPropagation()}>{children}</div></div>;
}
