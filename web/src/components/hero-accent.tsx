export function HeroAccent() {
  return (
    <>
      <style>{`
        @keyframes float-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .hero-card-stack {
          animation: float-bob 4s ease-in-out infinite;
        }
      `}</style>
      <div
        className="pointer-events-none absolute right-12 top-28 hidden opacity-80 lg:block"
        aria-hidden
      >
        <div
          className="hero-card-stack"
          style={{
            perspective: "900px",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="relative h-[88px] w-[120px]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #0a0a0a 0%, #262626 100%)",
                transform: "rotateY(18deg) rotateX(-12deg) translateZ(-24px) translateX(12px)",
                filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.25))",
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #f7931a 0%, #e08813 100%)",
                transform: "rotateY(15deg) rotateX(-10deg) translateZ(-8px) translateX(6px)",
                filter: "drop-shadow(0 10px 18px rgba(247,147,26,0.35))",
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #e91e63 100%)",
                transform: "rotateY(12deg) rotateX(-8deg) translateZ(8px)",
                filter: "drop-shadow(0 14px 24px rgba(233,30,99,0.35))",
              }}
            />
            <div
              className="absolute inset-0 rounded-2xl border border-white/20"
              style={{
                background: "linear-gradient(145deg, rgba(255,255,255,0.35) 0%, rgba(233,30,99,0.15) 100%)",
                transform: "rotateY(10deg) rotateX(-6deg) translateZ(20px) translateY(-4px)",
                filter: "drop-shadow(0 16px 28px rgba(233,30,99,0.2))",
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
