'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browser'

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/shadcn/card'
import { Button } from '@/components/ui/shadcn/button'
import { Badge } from '@/components/ui/shadcn/badge'
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Building2,
    Calendar,
    Target,
    PieChart,
    BarChart3,
    Download,
    Filter
} from 'lucide-react'

interface RevenueData {
    totalRevenue: number
    monthlyRevenue: number
    commissionRevenue: number
    subscriptionRevenue: number
    revenueGrowth: number
    topStudios: Array<{
        id: string
        name: string
        revenue: number
        commission: number
    }>
    monthlyBreakdown: Array<{
        month: string
        revenue: number
        commission: number
    }>
}

export default function RevenuePage() {
    const [revenueData, setRevenueData] = useState<RevenueData>({
        totalRevenue: 0,
        monthlyRevenue: 0,
        commissionRevenue: 0,
        subscriptionRevenue: 0,
        revenueGrowth: 0,
        topStudios: [],
        monthlyBreakdown: []
    })
    const [loading, setLoading] = useState(true)
    const [timeRange, setTimeRange] = useState('month')

    useEffect(() => {
        fetchRevenueData()
    }, [timeRange])

    const fetchRevenueData = async () => {
        const supabase = createClient()

        try {
            // Obtener transacciones de revenue
            const { data: transactions } = await supabase
                .from('revenue_transactions')
                .select('*')
                .order('transactionDate', { ascending: false })

            // Obtener estudios con sus planes
            const { data: studios } = await supabase
                .from('studios')
                .select(`
          id,
          name,
          plan:plans(priceMonthly)
        `)

            // Calcular métricas
            const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amountTotal), 0) || 0
            const commissionRevenue = transactions?.reduce((sum, t) => sum + Number(t.prosocialCommission), 0) || 0
            const subscriptionRevenue = studios?.reduce((sum, s) => sum + Number(s.plan.priceMonthly), 0) || 0

            // Mock data para top studios
            const topStudios = studios?.slice(0, 5).map(studio => ({
                id: studio.id,
                name: studio.name,
                revenue: Number(studio.plan.priceMonthly) * 12, // Annual
                commission: Number(studio.plan.priceMonthly) * 0.3 * 12 // 30% commission
            })) || []

            // Mock monthly breakdown
            const monthlyBreakdown = [
                { month: 'Ene', revenue: 45000, commission: 13500 },
                { month: 'Feb', revenue: 52000, commission: 15600 },
                { month: 'Mar', revenue: 48000, commission: 14400 },
                { month: 'Abr', revenue: 61000, commission: 18300 },
                { month: 'May', revenue: 55000, commission: 16500 },
                { month: 'Jun', revenue: 67000, commission: 20100 }
            ]

            setRevenueData({
                totalRevenue,
                monthlyRevenue: subscriptionRevenue,
                commissionRevenue,
                subscriptionRevenue,
                revenueGrowth: 15.2, // Mock
                topStudios,
                monthlyBreakdown
            })

        } catch (error) {
            console.error('Error fetching revenue data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-MX').format(num)
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Revenue</h1>
                    <p className="text-muted-foreground mt-1">
                        Análisis de ingresos y comisiones de la plataforma
                    </p>
                </div>
                <div className="flex space-x-2">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="week">Esta semana</option>
                        <option value="month">Este mes</option>
                        <option value="quarter">Este trimestre</option>
                        <option value="year">Este año</option>
                    </select>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Revenue Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueData.totalRevenue)}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                            <span className="text-green-500">+{revenueData.revenueGrowth}%</span>
                            <span className="ml-1">vs período anterior</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenue Mensual</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueData.monthlyRevenue)}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <span>Suscriptions activas</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(revenueData.commissionRevenue)}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <span>30% promedio</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estudios Activos</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{revenueData.topStudios.length}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <span>Generando revenue</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Analytics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Monthly Revenue Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Mensual</CardTitle>
                        <CardDescription>
                            Evolución de ingresos en los últimos 6 meses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {revenueData.monthlyBreakdown.map((month, index) => (
                                <div key={month.month} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 text-sm font-medium">{month.month}</div>
                                        <div className="flex-1">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{
                                                        width: `${(month.revenue / Math.max(...revenueData.monthlyBreakdown.map(m => m.revenue))) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium w-20 text-right">
                                        {formatCurrency(month.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Studios */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Estudios por Revenue</CardTitle>
                        <CardDescription>
                            Estudios que más contribuyen a los ingresos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {revenueData.topStudios.map((studio, index) => (
                                <div key={studio.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{studio.name}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Comisión: {formatCurrency(studio.commission)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {formatCurrency(studio.revenue)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue por Fuente</CardTitle>
                        <CardDescription>
                            Distribución de ingresos
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Suscripciones</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">70%</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Comisiones</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">25%</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Otros</span>
                                <div className="flex items-center space-x-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '5%' }}></div>
                                    </div>
                                    <span className="text-sm text-muted-foreground">5%</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Proyección</CardTitle>
                        <CardDescription>
                            Estimación de crecimiento
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-500">+{revenueData.revenueGrowth}%</div>
                                <div className="text-sm text-muted-foreground">Crecimiento mensual</div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Próximo mes:</span>
                                    <span className="font-medium">
                                        {formatCurrency(revenueData.monthlyRevenue * 1.15)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Próximo trimestre:</span>
                                    <span className="font-medium">
                                        {formatCurrency(revenueData.monthlyRevenue * 3.5)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Próximo año:</span>
                                    <span className="font-medium">
                                        {formatCurrency(revenueData.monthlyRevenue * 14)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Métricas Clave</CardTitle>
                        <CardDescription>
                            KPIs importantes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-sm">ARPU</span>
                                <span className="font-medium">{formatCurrency(revenueData.monthlyRevenue / revenueData.topStudios.length)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">Churn Rate</span>
                                <span className="font-medium text-green-500">2.1%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">LTV</span>
                                <span className="font-medium">{formatCurrency(revenueData.monthlyRevenue * 24)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm">CAC</span>
                                <span className="font-medium">{formatCurrency(1500)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
