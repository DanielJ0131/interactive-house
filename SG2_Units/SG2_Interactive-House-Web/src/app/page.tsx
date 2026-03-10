import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-[#0B1636] flex items-center justify-center shadow-lg">
          <div className="h-10 w-10 rounded-xl bg-[#0EA5E9] flex items-center justify-center">
            <span className="text-[#0B1636] font-black text-lg">IH</span>
          </div>
        </div>

        <h1 className="mt-6 text-4xl font-extrabold tracking-wide">
          INTERACTIVE HOUSE
        </h1>
        <p className="mt-3 text-white/60">
          Smart control for your modern <br /> living space.
        </p>

        <div className="mt-10">
          <Link
            href="/auth/login"
            className="block w-full rounded-2xl bg-[#0EA5E9] py-4 font-semibold text-lg text-[#071022] shadow-xl shadow-[#0EA5E9]/10"
          >
            Get Started
          </Link>

          <Link
            href="/devices?guest=1"
            className="mt-5 inline-flex items-center gap-2 text-white/60 hover:text-white"
          >
            Explore as Guest <span aria-hidden>→</span>
          </Link>
        </div>

        <p className="mt-14 text-xs tracking-[0.35em] text-white/25">
          INTERACTIVE HOUSE WEB
        </p>
      </div>
    </main>
  );
}