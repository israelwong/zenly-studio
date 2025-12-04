import Image from 'next/image'
import Link from 'next/link'

interface AuthHeaderProps {
    // title: string
    subtitle?: string
}

export function AuthHeader({ subtitle }: AuthHeaderProps) {
    return (
        <div className="flex flex-col items-center space-y-6 mb-8">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
                <Image
                    src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProSocialPlatform/platform/logotipo.svg"
                    alt="ProSocial MX"
                    width={160}
                    height={32}
                    className="h-8 w-auto"
                />
            </Link>

            {/* Title and Subtitle */}
            <div className="text-center space-y-2">
                {/* <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {title}
                </h1> */}
                {subtitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    )
}
