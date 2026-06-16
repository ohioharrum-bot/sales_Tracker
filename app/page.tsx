'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui';

// ─── Components ───────────────────────────────────────────────────────────

import { ShoppingCart } from 'lucide-react';

const Nav = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 py-4 transition-all duration-300 backdrop-blur-md bg-white/80 border-b border-zen-border/50 max-w-7xl mx-auto rounded-b-2xl mt-0 sm:mt-2">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-zen-accent rounded-xl flex items-center justify-center text-white">
          <ShoppingCart size={24} />
        </div>
        <span className="text-xl font-bold text-zen-text tracking-tight">Sales Calc</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zen-muted">
        <Link href="/dashboard" className="hover:text-zen-accent transition-colors">Dashboard</Link>
        <Link href="#about" className="hover:text-zen-accent transition-colors">About us</Link>
      </div>
      
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="hidden sm:block">
          <Button className="bg-zen-accent text-white hover:bg-zen-accent/90 rounded-full px-6 py-5 font-bold text-sm uppercase tracking-wider">
            Go to Dashboard
          </Button>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-zen-text"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-zen-border shadow-xl p-6 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-200">
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-zen-text">Dashboard</Link>
          <Link href="#about" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-zen-text">About us</Link>
          <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
            <Button className="w-full bg-zen-accent text-white rounded-xl py-4 font-bold">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

const Mockup = ({ children, className }: { children?: React.ReactNode, className?: string }) => (
  <div className={`relative w-[300px] sm:w-[320px] h-[600px] bg-white rounded-[3rem] border-[8px] border-slate-100 shadow-2xl overflow-hidden zen-glow ${className}`}>
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-100 rounded-b-2xl z-10" />
    <div className="p-6 pt-12 h-full flex flex-col bg-slate-50/30">
      {children}
    </div>
  </div>
);

const FAQItem = ({ question, answer, isOpen, onClick }: { question: string, answer: string, isOpen: boolean, onClick: () => void }) => (
  <div className="border-b border-zen-border/50 overflow-hidden">
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between py-6 text-left group transition-all"
    >
      <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-zen-accent' : 'text-zen-text'}`}>
        {question}
      </span>
      <span className={`text-2xl transition-transform duration-300 ${isOpen ? 'rotate-45 text-zen-accent' : 'text-zen-muted'}`}>
        +
      </span>
    </button>
    <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[300px] pb-8 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
      <p className="text-zen-muted leading-relaxed">
        {answer}
      </p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(1);

  const faqs = [
    {
      q: "Can I manage multiple store locations?",
      a: "Yes! The software is designed for multi-store owners. You can switch between different business locations with one click and see aggregated financial reports for your entire business empire."
    },
    {
      q: "Is my financial data secure?",
      a: "Absolutely. We use industry-standard encryption and Row Level Security (RLS) via Supabase to ensure that your sensitive business data is only accessible by you and authorized users."
    },
    {
      q: "Can I download reports for my accountant?",
      a: "Yes, you can export all your sales, expenses, and ledger data to CSV format. These files are ready to be imported into Excel, Google Sheets, or provided directly to your accounting professional."
    },
    {
      q: "How does the daily ledger synchronization work?",
      a: "Our daily ledger automatically syncs with your dashboard. When you enter daily sales, payouts, or bills in the ledger, the dashboard updates in real-time to reflect your current revenue and net profit."
    },
    {
      q: "Is there a limit to the number of stores I can add?",
      a: "We offer flexible plans to suit your needs. Whether you have two stores or twenty, our platform scales with your business growth."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-zen-text selection:bg-zen-accent selection:text-white">
      <Nav />

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-40 pb-32 px-6 overflow-hidden">
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-zen-accent/5 rounded-full blur-[120px] -z-10" />
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.1] mb-8">
                The Smart Way to <br />
                <span className="text-zen-accent">Track Store Sales</span>
              </h1>
              <p className="text-xl text-zen-muted font-medium mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                The all-in-one platform for modern store owners. Track revenue, manage payouts, and analyze expenses with absolute precision.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-12 justify-center lg:justify-start">
                <Link href="/dashboard">
                  <Button className="bg-zen-accent text-white hover:bg-zen-accent/90 rounded-2xl px-10 py-7 font-black text-lg uppercase tracking-wider">
                    Get Started Free →
                  </Button>
                </Link>
                <div className="flex items-center gap-4 text-xs font-bold text-zen-muted">
                   Trusted by 500+ store owners
                </div>
              </div>
            </div>

            <div className="relative flex justify-center lg:justify-end">
              <Mockup className="z-10 translate-x-4">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-xs font-bold text-zen-muted uppercase tracking-widest">Dashboard</span>
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-zen-border" />
                </div>
                <div className="mb-8">
                  <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest mb-1">Today's Revenue</p>
                  <p className="text-3xl font-black mb-1">$4,867.50</p>
                  <p className="text-xs font-bold text-zen-accent">+12.4% from yesterday</p>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Downtown Store', val: '$2,100.00', status: 'Active' },
                    { name: 'Uptown Branch', val: '$1,250.45', status: 'Active' },
                    { name: 'Eastside Mall', val: '$1,517.05', status: 'Pending' },
                  ].map(store => (
                    <div key={store.name} className="p-4 rounded-2xl bg-white border border-zen-border flex flex-col gap-2 zen-shadow">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold">{store.name}</p>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${store.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {store.status}
                        </span>
                      </div>
                      <p className="text-sm font-black">{store.val}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-auto py-4 text-center">
                  <p className="text-[8px] font-bold text-zen-accent uppercase tracking-[0.2em]">Live reporting active</p>
                </div>
              </Mockup>
              
              <div className="absolute bottom-10 -left-10 z-20 hidden sm:block p-6 bg-white border border-zen-border rounded-3xl shadow-2xl zen-glow scale-90 lg:scale-100">
                <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest mb-2">Total Monthly Profit</p>
                <p className="text-2xl font-black text-zen-text tracking-tight">$38,867.45</p>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION SECTION */}
        <section id="about" className="py-32 px-6 text-center bg-slate-50/50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-8">
              We empower store owners with real-time financial clarity
            </h2>
            <p className="text-xl text-zen-muted font-medium max-w-2xl mx-auto leading-relaxed">
              Managing a business is hard enough. We believe accounting should be effortless, intuitive, and always accessible, so you can focus on what you do best: growing your business.
            </p>
          </div>
        </section>

        {/* SECURITY SECTION */}
        <section className="py-32 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="order-2 lg:order-1 flex justify-center lg:justify-start">
              <Mockup>
                <div className="mb-8">
                  <p className="text-xs font-bold text-zen-muted uppercase tracking-widest mb-4">Expense Analysis</p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-zen-accent flex items-center justify-center font-black text-sm text-zen-accent">72%</div>
                    <div>
                      <p className="text-lg font-bold">Efficiency</p>
                      <p className="text-xs text-zen-muted font-bold">Cost Savings Index</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 rounded-2xl bg-white border border-zen-border p-4 flex flex-col justify-end">
                  <div className="flex items-end gap-2 h-40">
                    {[30, 50, 40, 70, 45, 80, 60].map((h, i) => (
                      <div key={i} className="flex-1 bg-zen-accent/10 border border-zen-accent/20 rounded-t-lg transition-all hover:bg-zen-accent" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </Mockup>
            </div>
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-8">
                Your Data, Private & Protected
              </h2>
              <p className="text-lg text-zen-muted font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                We use bank-level encryption and private storage policies to ensure that only you can see your business financials. Your privacy is our top priority.
              </p>
            </div>
          </div>
        </section>

        {/* TRANSACTIONS SECTION */}
        <section className="py-32 px-6 bg-slate-50/50 overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-8">
                Fast Payouts & Expense Tracking
              </h2>
              <p className="text-lg text-zen-muted font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Log vendor payments and employee payouts in seconds. The software keeps your ledger organized and your cash flow transparent across all branches.
              </p>
            </div>
            <div className="flex justify-center lg:justify-end">
              <Mockup>
                <div className="text-center mb-8">
                  <p className="text-[10px] font-bold text-zen-muted uppercase tracking-widest mb-1">Total Payouts</p>
                  <p className="text-3xl font-black tracking-tight">$12,908.50</p>
                </div>
                <div className="space-y-3 mb-8">
                  {[
                    { name: 'Weekly Payroll', val: '$8,200', date: 'Oct 12' },
                    { name: 'Inventory Restock', val: '$2,450', date: 'Oct 11' },
                    { name: 'Electricity Bill', val: '$450', date: 'Oct 10' },
                  ].map(item => (
                    <div key={item.name} className="p-3 bg-white border border-zen-border rounded-xl zen-shadow">
                       <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-bold">{item.name}</p>
                          <p className="text-[10px] font-black text-rose-500">-{item.val}</p>
                       </div>
                       <p className="text-[8px] font-bold text-zen-muted uppercase tracking-widest">{item.date}</p>
                    </div>
                  ))}
                </div>
                <Button className="w-full bg-zen-accent text-white hover:bg-zen-accent/90 rounded-2xl py-6 font-black text-sm uppercase tracking-wider">
                  Generate Report
                </Button>
              </Mockup>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="py-32 px-6">
          <div className="max-w-7xl mx-auto text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-8">
              The only tool you need to <br className="hidden md:block" /> run a profitable store network
            </h2>
            <p className="text-lg text-zen-muted font-medium max-w-2xl mx-auto leading-relaxed">
              Designed from the ground up for multi-store operations and simplified daily bookkeeping.
            </p>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 bg-white border border-zen-border rounded-[2rem] hover:border-zen-accent/50 transition-all group zen-shadow">
              <h3 className="text-2xl font-black mb-4">Multi-Store Dashboard</h3>
              <p className="text-zen-muted font-medium mb-8 leading-relaxed">
                Centralized control for all your locations. Monitor aggregate performance or dive into store-specific details instantly.
              </p>
              <Link href="#" className="text-zen-accent font-bold uppercase tracking-widest text-xs flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                Explore dashboard →
              </Link>
            </div>
            <div className="p-10 bg-zen-accent text-white border border-zen-accent rounded-[2rem] shadow-2xl shadow-zen-accent/20 transition-all hover:scale-[1.02]">
              <h3 className="text-2xl font-black mb-4">Interactive Daily Ledger</h3>
              <p className="font-bold mb-8 leading-relaxed opacity-80">
                Log daily sales, payouts, and bills in a familiar, easy-to-use interface. Automatically syncs with your main records.
              </p>
              <Link href="#" className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                Learn more →
              </Link>
            </div>
            <div className="p-10 bg-white border border-zen-border rounded-[2rem] hover:border-zen-accent/50 transition-all group zen-shadow">
              <h3 className="text-2xl font-black mb-4">Expense Categorization</h3>
              <p className="text-zen-muted font-medium mb-8 leading-relaxed">
                Categorize every dollar spent. Identify high-overhead areas and optimize your business for maximum profitability.
              </p>
              <Link href="#" className="text-zen-accent font-bold uppercase tracking-widest text-xs flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                Learn more →
              </Link>
            </div>
            <div className="p-10 bg-white border border-zen-border rounded-[2rem] hover:border-zen-accent/50 transition-all group zen-shadow">
              <h3 className="text-2xl font-black mb-4">One-Click CSV Export</h3>
              <p className="text-zen-muted font-medium mb-8 leading-relaxed">
                Ready-to-use reports for your accountant. Export comprehensive financial data in standard CSV format anytime.
              </p>
              <Link href="#" className="text-zen-accent font-bold uppercase tracking-widest text-xs flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                Learn more →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="py-32 px-6 bg-slate-50/30">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight mb-8">
                Common Questions
              </h2>
              <p className="text-lg text-zen-muted font-medium leading-relaxed">
                Everything you need to know about the software
              </p>
            </div>

            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <FAQItem 
                  key={idx}
                  question={faq.q}
                  answer={faq.a}
                  isOpen={openFaq === idx}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-20 px-6 bg-white border-t border-zen-border/50 text-center">
        <p className="text-xs font-bold text-zen-muted uppercase tracking-[0.2em] mb-4">
          © {new Date().getFullYear()} Accounting Platform. All rights reserved.
        </p>
        <div className="flex justify-center gap-6 text-[10px] font-bold text-zen-accent uppercase tracking-widest">
          <Link href="#" className="hover:opacity-70 transition-opacity">Terms of Service</Link>
          <Link href="#" className="hover:opacity-70 transition-opacity">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
