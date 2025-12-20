import React from 'react';

function SkeletonLogo({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {

    const baseClasses = "animate-pulse rounded-md bg-zinc-700/60 dark:bg-zinc-800/60";

    return (
        <div
            className={`${baseClasses} ${className || ''}`}
            {...props} // Pasa cualquier otro atributo HTML (como aria-hidden)
        />
    )
}

export { SkeletonLogo }