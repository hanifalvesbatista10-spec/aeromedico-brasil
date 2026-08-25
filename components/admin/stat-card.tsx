import type { LucideIcon } from "lucide-react";
export function StatCard({ label, value, change, icon: Icon, accent = "blue" }: { label: string; value: string; change: string; icon: LucideIcon; accent?: "blue" | "cyan" | "orange" | "green" }) {
  const colors = { blue: "bg-blue-50 text-[#1175d1]", cyan: "bg-cyan-50 text-cyan-600", orange: "bg-orange-50 text-[#ff7a1a]", green: "bg-emerald-50 text-emerald-600" };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid size-11 place-items-center rounded-xl ${colors[accent]}`}><Icon className="size-5" /></span><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">{change}</span></div><strong className="mt-6 block text-3xl tracking-tight text-[#07182b]">{value}</strong><span className="mt-1 block text-xs font-medium text-slate-500">{label}</span></article>;
}
