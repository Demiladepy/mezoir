function SocialX() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FooterLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-[#a3a3a3] transition-colors duration-200 hover:text-white"
    >
      {children}
    </a>
  );
}

function SponsorLink({
  href,
  label,
  subtitle,
}: {
  href: string;
  label: string;
  subtitle: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-colors duration-200 hover:text-white"
      >
        <span className="text-sm text-[#a3a3a3] group-hover:text-white">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[#737373] group-hover:text-[#a3a3a3]">
          {subtitle}
        </span>
      </a>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-white">Project</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#a3a3a3]">
              Mezoir is an intent-based agent for Mezo&apos;s ve-economy. Built
              for the 2026 Mezo Bitcoin Hackathon.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://x.com/AgenttDefi"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 transition-opacity hover:opacity-100"
                aria-label="X"
              >
                <SocialX />
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">Resources</p>
            <nav className="mt-3 flex flex-col gap-3">
              <FooterLink href="https://github.com/Demiladepy/mezoir">
                GitHub
              </FooterLink>
              <FooterLink href="https://mezo.org/docs/">Mezo Docs</FooterLink>
              <FooterLink href="https://explorer.test.mezo.org">
                Mezo Testnet Explorer
              </FooterLink>
              <FooterLink href="https://discord.mezo.org">Mezo Discord</FooterLink>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              Sponsors &amp; Infrastructure
            </p>
            <ul className="mt-3 space-y-4">
              <SponsorLink
                href="https://www.validationcloud.io/mezo"
                label="Validation Cloud"
                subtitle="Dedicated RPC"
              />
              <SponsorLink
                href="https://goldsky.com/"
                label="Goldsky"
                subtitle="Subgraph indexer"
              />
              <SponsorLink
                href="https://www.supernormal.foundation/"
                label="Supernormal Foundation"
                subtitle="Ecosystem alignment"
              />
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#737373]">© 2026 Mezoir</p>
          <p className="text-xs text-[#737373]">
            Built solo for the Mezo Bitcoin Hackathon
          </p>
        </div>
      </div>
    </footer>
  );
}
