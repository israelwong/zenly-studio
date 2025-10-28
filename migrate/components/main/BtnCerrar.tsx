'use client';
import Link from 'next/link';

interface BtnCerrarProps {
    url: string;
}

function BtnCerrar({ url }: BtnCerrarProps) {
    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-10">
            <Link href={url} className="relative z-10 px-4 py-3 text-white bg-red-500 rounded-full hover:bg-red-600"
            >
                Cerrar ventana
            </Link>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-10 bg-red-500 rounded-full animate-ping opacity-50"></div>
            </div>
        </div>
    );
}

export default BtnCerrar;