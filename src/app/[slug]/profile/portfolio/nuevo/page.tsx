import { PortfolioEditor } from "../components/PortfolioEditorWrapper";

interface NuevoPortfolioPageProps {
    params: Promise<{
        slug: string;
    }>;
}

export default async function NuevoPortfolioPage({ params }: NuevoPortfolioPageProps) {
    const { slug } = await params;

    return (
        <PortfolioEditor
            studioSlug={slug}
            mode="create"
        />
    );
}
