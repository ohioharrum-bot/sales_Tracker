import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  const sections = [
    { name: "Dashboard", href: "/dashboard", description: "Manage your stores, sales, payouts and expenses." },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="p-6 max-w-7xl mx-auto w-full flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/30">
            S
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">SalesTracker</span>
        </div>
        <Link href="/dashboard">
          <Button size="sm">Go to Dashboard</Button>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
        <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-6 border border-indigo-100">
          Simplify your business accounting
        </div>
        <h1 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
          Track Sales.<br />Manage Payouts.<br />
          <span className="text-indigo-600">Grow Faster.</span>
        </h1>
        <p className="text-lg text-slate-500 font-medium mb-10 max-w-2xl leading-relaxed">
          The all-in-one platform for multi-store owners. Monitor real-time revenue, 
          track overhead expenses, and generate professional reports in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-48 h-14 text-base shadow-xl shadow-indigo-500/20">
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-48 h-14 text-base border-slate-200">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-12 text-left border-t border-slate-200 pt-12">
          <div>
            <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Multi-Store</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Switch between locations effortlessly and see aggregate data instantly.</p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Safe & Secure</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Your data is protected with industry-standard encryption and RLS policies.</p>
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 mb-2 uppercase tracking-widest">Clean Reports</p>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Download CSV reports ready for Excel, Google Sheets, or your accountant.</p>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center border-t border-slate-200">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          © {new Date().getFullYear()} SalesTracker Pro. Built for modern entrepreneurs.
        </p>
      </footer>
    </div>
  );
}
