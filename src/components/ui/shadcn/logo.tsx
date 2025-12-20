import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
    variant?: 'isotipo' | 'logotipo'
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const sizeMap = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
}

export function Logo({ variant = 'isotipo', size = 'md', className }: LogoProps) {
    const dimensions = sizeMap[size]

    const logoSrc = variant === 'isotipo'
        ? 'https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/isotipo_gris.svg'
        : 'https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg'

    return (
        <div className={cn('flex items-center', className)}>
            <Image
                src={logoSrc}
                alt="ProSocial Platform"
                width={dimensions.width}
                height={dimensions.height}
                className="object-contain"
                priority
            />
        </div>
    )
}

// Componente específico para el header
export function HeaderLogo({ className }: { className?: string }) {
    return (
        <div className={cn('flex items-center space-x-3', className)}>
            <Logo variant="isotipo" size="md" />
            <div className="hidden sm:block">
                <Logo variant="logotipo" size="md" />
            </div>
        </div>
    )
}
