import { IntentPicker } from "@/components/intent-picker";
import { LiveActivity } from "@/components/live-activity";
import { Footer } from "@/components/footer";

export function WalletHome() {
  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 px-6 py-8 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-cyan-500/10" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Intent-based ve strategy
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Tell Mezoir your goal — it reads chain state, chooses venues, and
            executes locks, manager auth, and gauge votes on Mezo testnet.
          </p>
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-emerald-400">
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                aria-hidden
              />
              Mezo testnet
            </span>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_12px_40px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
        <IntentPicker />
      </section>

      <LiveActivity />
      <Footer />
    </div>
  );
}
