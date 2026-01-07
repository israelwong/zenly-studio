interface AuthHeaderProps {
    subtitle?: string
}

export function AuthHeader({ subtitle }: AuthHeaderProps) {
    return (
        <div className="flex flex-col items-center space-y-4 mb-8">
            {/* Título Zenly Studio - Sin link */}
            <h1 className="text-3xl font-bold text-zinc-100">
                Zenly <span className="text-emerald-500">Studio</span>
            </h1>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-sm text-zinc-400 text-center max-w-sm">
                    {subtitle}
                </p>
            )}
        </div>
    )
}
