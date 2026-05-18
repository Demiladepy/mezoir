import { Footer } from "@/components/footer";
import { IntentPicker } from "@/components/intent-picker";
import { LiveActivity } from "@/components/live-activity";
import { AnimatedWords, Reveal } from "@/components/motion";

export function WalletHome() {
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <section className="mx-auto max-w-3xl text-center">
        <Reveal delay={100}>
          <p className="mezoir-label mb-4">Intent → execution → explanation</p>
        </Reveal>
        <h1 className="text-3xl leading-tight lg:text-5xl lg:leading-[1.12]">
          <AnimatedWords
            text="Intent-based ve strategy"
            className="mezoir-gradient-text font-semibold"
          />
        </h1>
        <Reveal delay={280} className="mx-auto mt-5 max-w-2xl">
          <p className="text-base leading-relaxed text-[#425466] lg:text-lg lg:leading-relaxed">
            Tell Mezoir your goal — it reads chain state, compares lock paths,
            and executes manager auth and gauge votes on Mezo testnet.
          </p>
        </Reveal>
        <Reveal delay={380} className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3e8ee] bg-white/80 px-4 py-2 text-xs font-medium text-[#425466] shadow-sm">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              aria-hidden
            />
            Mezo testnet · live agent
          </span>
        </Reveal>
      </section>

      <Reveal delay={200}>
        <IntentPicker />
      </Reveal>
      <Reveal delay={260}>
        <LiveActivity />
      </Reveal>
      <Reveal delay={320}>
        <Footer />
      </Reveal>
    </div>
  );
}

