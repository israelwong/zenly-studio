import React from 'react'
import Image from 'next/image'

interface Props {
    footer: string
}

export default function Skeleton({ footer }: Props) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="max-w-screen-sm py-40 px-10 mx-auto">
                <div className='my-5'>
                    <Image
                        src="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg"
                        alt="ProSocial MX"
                        className="mx-auto"
                        width={150}
                        height={300}
                        style={{ width: 'auto', height: 'auto' }}
                    />
                </div>

                <div className="flex flex-col space-y-4 mb-5">
                    <div className="grid grid-cols-2 space-x-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    <div className="grid grid-cols-3 space-x-2">
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>

                <p className='mb-5 text-center text-zinc-400 animate-pulse'>
                    {footer}
                </p>
            </div>
        </div>
    )
}
