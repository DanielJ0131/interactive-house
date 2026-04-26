export function PageShell({
    title,
    subtitle,
    rightActions,
    children,
}: {
    title: string;
    subtitle?: string;
    rightActions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[var(--bg-color)] text-white">
            {/* background glow */}
            <div className="pointer-events-none fixed inset-0 opacity-60">
                <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[var(--color-accent-soft)] blur-3xl" />
                <div className="absolute top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[var(--color-secondary-accent-soft)] blur-3xl" />
            </div>

            <header className="px-6 pt-8 pb-4">
                <div className="mx-auto max-w-4xl flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold">{title}</h1>
                        {subtitle ? <p className="mt-2 text-white/50">{subtitle}</p> : null}
                    </div>
                    {rightActions}
                </div>
            </header>

            <main className="px-6 pb-10">
                <div className="mx-auto max-w-4xl">{children}</div>
            </main>
        </div>
    );
}