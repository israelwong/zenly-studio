import React from 'react'
import Image from 'next/image'
import { Loader2, Clock } from 'lucide-react'

function SkeletonPage() {
    return (
        <div className='min-h-screen bg-zinc-950 flex items-center justify-center p-6'>
            <div className='max-w-2xl w-full text-center space-y-8'>

                {/* Logo */}
                <div className='flex justify-center mb-8'>
                    <div className='relative'>
                        <Image
                            src="https://bgtapcutchryzhzooony.supabase.co/storage/v1/object/public/ProSocial/logos/logotipo_gris.svg"
                            alt="ProSocial MX"
                            width={200}
                            height={80}
                            className="opacity-70"
                        />
                    </div>
                </div>

                {/* Header with icon */}
                <div className='space-y-4'>

                    <div className="flex items-center justify-center space-x-3">
                        <h3 className='text-3xl md:text-4xl font-bold text-zinc-200'>
                            Un momento por favor
                        </h3>
                        <Loader2 className='w-6 h-6 text-zinc-400 animate-spin' />
                    </div>
                    <p className='text-zinc-500 text-lg md:text-xl font-light leading-relaxed'>
                        Estamos optimizando la página para brindarte la mejor experiencia
                    </p>
                </div>

                {/* Modern Skeleton Cards */}
                <div className='space-y-6 pt-8'>

                    {/* Main Card */}
                    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-2xl">
                        <div className="animate-pulse flex space-x-4">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-lg bg-zinc-600 animate-pulse opacity-50"></div>
                            </div>
                            <div className="flex-1 space-y-4 py-1">
                                <div className="h-3 bg-zinc-700 rounded-full"></div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-2 bg-zinc-700 rounded-full col-span-2"></div>
                                        <div className="h-2 bg-zinc-800 rounded-full col-span-1"></div>
                                    </div>
                                    <div className="h-2 bg-zinc-700 rounded-full"></div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="h-2 bg-zinc-800 rounded-full"></div>
                                        <div className="h-2 bg-zinc-700 rounded-full"></div>
                                        <div className="h-2 bg-zinc-800 rounded-full"></div>
                                        <div className="h-2 bg-zinc-700 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid Cards */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/40 rounded-xl p-5 shadow-xl">
                            <div className="animate-pulse space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-lg bg-zinc-700 h-8 w-8"></div>
                                    <div className="h-3 bg-zinc-700 rounded-full flex-1"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 bg-zinc-800 rounded-full w-3/4"></div>
                                    <div className="h-2 bg-zinc-700 rounded-full w-1/2"></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800/40 rounded-xl p-5 shadow-xl">
                            <div className="animate-pulse space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="rounded-lg bg-zinc-600 h-8 w-8"></div>
                                    <div className="h-3 bg-zinc-700 rounded-full flex-1"></div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 bg-zinc-800 rounded-full w-2/3"></div>
                                    <div className="h-2 bg-zinc-700 rounded-full w-4/5"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-zinc-900/70 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 shadow-lg">
                                <div className="animate-pulse space-y-3">
                                    <div className={`h-8 rounded-md ${i % 2 === 0 ? 'bg-zinc-700' : 'bg-zinc-600'}`}></div>
                                    <div className="h-2 bg-zinc-800 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Card */}
                    <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-6 shadow-2xl">
                        <div className="animate-pulse space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-zinc-700 rounded-full w-1/3"></div>
                                <div className="h-8 w-8 bg-zinc-700 rounded-full"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-zinc-800 rounded-full"></div>
                                <div className="h-2 bg-zinc-700 rounded-full w-5/6"></div>
                                <div className="h-2 bg-zinc-800 rounded-full w-4/6"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading indicator */}
                <div className='pt-8'>
                    <div className='flex items-center justify-center space-x-2 text-zinc-500'>
                        <div className='flex space-x-1'>
                            <div className='w-2 h-2 bg-zinc-600 rounded-full animate-bounce'></div>
                            <div className='w-2 h-2 bg-zinc-600 rounded-full animate-bounce' style={{ animationDelay: '0.1s' }}></div>
                            <div className='w-2 h-2 bg-zinc-600 rounded-full animate-bounce' style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className='text-sm font-medium'>Cargando contenido</span>
                    </div>
                </div>

            </div>
        </div>
    )
}

export default SkeletonPage
