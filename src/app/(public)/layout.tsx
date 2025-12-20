// import { Navbar } from "@/app/studio/[slug]/components/Navbar";
import { PlatformFooter } from "@/components/platform";
import { GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "Zen Universe - Plataforma para Estudios Creativos",
    description: "Encuentra y gestiona estudios de fotografía y video profesionales. Cada estudio tiene su propio espacio personalizado en Zen Universe.",
    keywords: [
        'Zen Universe', 'estudios creativos', 'fotografía profesional', 'video profesional',
        'gestión de estudios', 'plataforma creativa', 'México', 'estudios fotografía'
    ],
    authors: [{ name: 'Zen Universe' }],
    creator: 'Zen Universe',
    publisher: 'zen.pro',
    openGraph: {
        type: 'website',
        locale: 'es_MX',
        url: 'https://zenuniverse.com',
        title: 'Zen Universe - Plataforma para Estudios Creativos',
        description: 'Encuentra y gestiona estudios de fotografía y video profesionales. Cada estudio tiene su propio espacio personalizado.',
        siteName: 'Zen Universe',
        images: [
            {
                url: 'https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_blanco.svg',
                width: 1200,
                height: 630,
                alt: 'Zen Universe - Plataforma para Estudios Creativos',
            },
        ],
    },
};

export default function MarketingLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="antialiased h-screen flex flex-col">
            <main className="flex-grow">
                {children}
            </main>
            <PlatformFooter />
            <GoogleTagManager gtmId="GTM-WCG8X7J" />
        </div>
    );
}