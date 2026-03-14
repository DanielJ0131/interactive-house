import BottomTabs from "@/components/BottomTabs";

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
        <div className="min-h-screen pb-24 bg-[#070F2B] text-white">
            <header className="px-6 pt-8 pb-4">
                <div className="mx-auto max-w-4xl flex items-start justify-between">
                    <div>
                        <h1 className="text-4xl font-extrabold">{title}</h1>
                        {subtitle ? <p className="mt-2 text-white/50">{subtitle}</p> : null}
                    </div>
                    {rightActions}
                </div>
            </header>

            <main className="px-6">
                <div className="mx-auto max-w-4xl">{children}</div>
            </main>

            <BottomTabs />
        </div>
    );
}