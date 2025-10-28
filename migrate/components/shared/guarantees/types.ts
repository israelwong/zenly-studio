export type GuaranteeVariant = 'full' | 'compact' | 'inline'

export interface Guarantee {
    id: string
    title: string
    description: string
    icon: React.ReactNode
    features: string[]
    badge?: string
    color?: 'purple' | 'blue' | 'green' | 'pink' | 'orange'
}
