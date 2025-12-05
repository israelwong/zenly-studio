import { Toaster } from 'sonner';

export default function StudioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            {children}
            <Toaster position="top-right" richColors toastOptions={{ style: { zIndex: 9999 } }} />
        </>
    );
}
