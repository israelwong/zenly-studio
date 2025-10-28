'use client';
import React from 'react'

interface TitlePulseProps {
    titulo: string;
}

function TitlePulse({ titulo }: TitlePulseProps) {
    return (
        <div>
            <div className="">
                <span className="relative inline-flex items-center justify-center h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-800"></span>
                </span>

                <span className=" bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-pink-700 text-xl font-light  pb-2"> {titulo}
                </span>
            </div>

        </div>
    )
}

export default TitlePulse
