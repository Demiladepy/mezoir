import { IntentPicker } from "@/components/intent-picker";
import { LiveActivity } from "@/components/live-activity";
import { Footer } from "@/components/footer";

export function WalletHome() {
  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[#0a2540] lg:text-4xl">
          Intent-based ve strategy
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-[#425466]">
          Tell Mezoir your goal — it reads chain state, chooses venues, and
          executes locks, manager auth, and gauge votes on Mezo testnet.
        </p>
      </section>

      <IntentPicker />
      <LiveActivity />
      <Footer />
    </div>
  );
}
