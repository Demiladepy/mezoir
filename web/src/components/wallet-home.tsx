import { IntentPicker } from "@/components/intent-picker";
import { LiveActivity } from "@/components/live-activity";
import { MezoVideo } from "@/components/mezo-video";
import { Reveal } from "@/components/motion";

export function WalletHome() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-12">
      <Reveal
        delay={100}
        className="flex flex-col justify-center lg:col-span-5 lg:col-start-1"
      >
        <p className="text-xs font-medium uppercase tracking-[0.1em] text-[#737373]">
          Intent → execution → explanation
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black lg:text-5xl xl:text-6xl">
          Your ve strategy, one sentence.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-[#525252]">
          Tell Mezoir what you want. It reads chain state, compares lock paths,
          and executes on Mezo testnet—with a plain-English audit trail.
        </p>
        <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-medium text-[#525252]">
          <span
            className="h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden
          />
          Mezo testnet · live agent
        </span>
      </Reveal>

      <Reveal delay={140} className="lg:col-span-7 lg:col-start-6">
        <MezoVideo />
      </Reveal>

      <Reveal delay={180} className="lg:col-span-12">
        <IntentPicker />
      </Reveal>

      <Reveal delay={220} className="lg:col-span-12">
        <LiveActivity />
      </Reveal>
    </div>
  );
}
