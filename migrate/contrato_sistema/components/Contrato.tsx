'use client'
import React, { useEffect, useState, useMemo, useRef } from 'react'
import { CircleCheck } from 'lucide-react'

import { Cliente, Cotizacion, CotizacionServicio, CondicionesComerciales, ServicioCategoria } from '@/app/admin/_lib/types'
import { obtenerEventoContrato } from '@/app/admin/_lib/evento.actions'
import { obtenerCotizacionServicios } from '@/app/admin/_lib/cotizacion.actions';
import { obtenerCategories } from '@/app/admin/_lib/categorias.actions'
// import FichaServicioContrato from '../../seguimiento/[eventoId]/components/FichaServicioContrato'

interface Props {
    eventoId: string
}

export default function Contrato({ eventoId }: Props) {

    const divRef = useRef<HTMLDivElement | null>(null);
    const [loading, setLoading] = useState(true)
    const [nombreEvento, setNombreEvento] = useState<string | null>(null)
    const [fechaEvento, setFechaEvento] = useState<Date | null>(null)
    const [tipoEvento, setTipoEvento] = useState<string | null>(null)
    const [condicionesComerciales, setCondicionesComerciales] = useState<CondicionesComerciales | null>(null)
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null)
    const [categorias, setCategorias] = useState<ServicioCategoria[]>([])
    const [servicios, setServicios] = useState<CotizacionServicio[]>([])

    useEffect(() => {

        const fetchData = async () => {
            try {

                const data = await obtenerEventoContrato(eventoId)
                const { evento, tipoEvento, cliente, cotizacion, condicionesComerciales } = data

                if (evento) {
                    setNombreEvento(evento.nombre)
                    setFechaEvento(evento.fecha_evento)
                }
                setTipoEvento(tipoEvento ?? null)
                setCondicionesComerciales(condicionesComerciales)
                setCotizacion(cotizacion)
                setCliente(cliente)

                if (cotizacion?.id) {
                    obtenerCotizacionServicios(cotizacion.id).then(cotizacionServiciosData => {
                        setServicios(
                            cotizacionServiciosData.map(servicio => ({
                                ...servicio,
                                nombre: servicio.nombre === null ? undefined : servicio.nombre,
                                costo: servicio.costo === null ? undefined : servicio.costo,
                                servicioId: servicio.servicioId === null ? '' : servicio.servicioId,
                                servicioCategoriaId: servicio.servicioCategoriaId === null ? undefined : servicio.servicioCategoriaId
                            }))
                        )
                    })
                }

                obtenerCategories().then(data => {
                    setCategorias(data)
                })

            } catch (error) {
                console.error('Error fetching data:', error)
            }
        }
        fetchData()
        setLoading(false)
    }, [eventoId])

    const categoriasRenderizadas = useMemo(() => {
        return categorias
            .map(categoria => {
                const serviciosFiltrados = servicios.filter(servicio => servicio.servicioCategoriaId === categoria.id)
                if (serviciosFiltrados.length === 0) {
                    return null
                }
                return (
                    <div key={categoria.id} className='mb-5 border border-dashed border-zinc-800 p-3 rounded-md bg-zinc-900'>
                        <div className="px-0 pb-0 text-zinc-600 font-semibold uppercase">
                            {categoria.nombre}
                        </div>
                        <ul>
                            {serviciosFiltrados.map(servicio => {
                                return (
                                    <li key={servicio.id} className='px-0 py-2 '>
                                        {/* <FichaServicioContrato
                                            cotizacionServicioId={servicio.id}
                                        /> */}
                                        <div className="text-zinc-400 text-sm">
                                            Servicio: {servicio.nombre || 'Sin nombre'} - ${servicio.precio || 0}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
                )
            })
            .filter(categoria => categoria !== null)
    }, [categorias, servicios])

    if (loading) {
        return <div className='flex items-center justify-center h-full'>
            <p className='text-zinc-600 italic text-center'>
                Generando contrato...
            </p>
        </div>
    }

    return (

        <div className='max-w-2xl mx-auto '>
            <div ref={divRef} className='px-5 py-3'>
                <h1 className='text-xl font-semibold mb-5 uppercase'>
                    Contrato de prestación de servicios profesionales
                </h1>

                <div className=''>

                    {/* GENERALES DEL EVENTO */}
                    <ul className='mb-10 space-y-3'>
                        <li>
                            <p className='font-semibold text-zinc-500'>Nombre del evento:</p>
                            {nombreEvento}
                        </li>
                        <li>
                            <p className='font-semibold text-zinc-500'>Fecha de celebración:</p>
                            {fechaEvento ? new Date(new Date(fechaEvento).getTime() + new Date().getTimezoneOffset() * 60000).toLocaleString('es-ES', { dateStyle: 'full' }) : 'Obteniendo fecha...'}

                        </li>
                        <li>
                            <p className='font-semibold text-zinc-500'>Tipo de evento:</p>
                            {tipoEvento}
                        </li>
                    </ul>

                    {/* CONTRATO */}
                    <p className='mb-10'>
                        Contrato de prestación de servicios profesionales de fotografía y cinematografía
                        que celebran por una parte <span className='font-semibold text-zinc-500'>PROSOCIALMX</span> y por la otra en lo sucesivo el cliente <span className='font-semibold text-zinc-500 uppercase'>{cliente?.nombre}</span> instrumento que se celebra de conformidad con las
                        siguientes declaraciones y cláusulas:
                    </p>

                    {/* DECLARACIONES */}
                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> DECLARACIONES
                        </h2>
                        <ol className='list-disc list-inside text-zinc-400'>
                            <li className='mb-3'>Declara el prestador de servicios que cuenta con la capacidad técnica, equipo y el material para el desempeño de las actividades profesionales en medios audiovisuales encomendadas.</li>
                            <li className='mb-3'>Declara el cliente que conoce los servicios que ofrece el cinematógrafo, y que reconoce que cuenta la capacidad y la técnica necesarias para el cumplimiento de los fines del presente contrato.</li>
                        </ol>
                        <p className='mb-3 text-zinc-400'>Declaran las partes que por lo anterior, manifiestan su conformidad de celebrar este instrumento de conformidad a las siguientes cláusulas:</p>
                    </div>

                    {/* //!SERVICIOS */}
                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> SERVICIOS INCLUIDOS
                        </h2>
                        {categoriasRenderizadas}
                    </div>

                    {/* HONORARIOS */}
                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> HONORARIOS
                        </h2>

                        <p className='mb-2 text-zinc-400'>
                            A continuación se desgloza el precio del servicio contratado:
                        </p>

                        <ul className='mb-5 list-inside text-zinc-400'>
                            <li>
                                <span className='text-zinc-200'>Condiciones:</span> {condicionesComerciales?.nombre}. {condicionesComerciales?.descripcion}
                            </li>
                        </ul>
                        <p className='text-zinc-400'>
                            Por la prestación de los servicios arriba establecidos,
                            el cliente pagará la cantidad de
                            <span className='font-semibold bg-yellow-500 px-1 py-0.5 ms-1 text-yellow-900'>{(cotizacion ? (cotizacion.precio - (condicionesComerciales?.descuento ?? 0)).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A')}</span> (pesos mexicanos 00/100 M.N.)
                        </p>
                    </div>

                    {/* REQUERIMIENTOS */}
                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> REQUERIMIENTOS
                        </h2>
                        <ul className='list-inside text-zinc-400'>
                            <li className='mb-3'>El cliente proporcionará acceso a la locación y las facilidades necesarias para la realización de los servicios contratados.</li>
                            <li className='mb-3'>El cliente proporcionará acceso a los servicios de alimentación y bebidas para el equipo de producción.</li>
                        </ul>
                    </div>

                    {/* GARANTÍAS */}
                    <div className='mb-10'>

                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> GARANTÍAS EN PRODUCCIÓN
                        </h2>
                        <ul className='list-inside space-y-2 text-zinc-400'>
                            <li className='mb-3'><span className='font-semibold text-zinc-200'>Puntualidad:</span> La producción llegará 30 minutos antes al lugar pactado.</li>
                            <li className='mb-3'><span className='font-semibold text-zinc-200'>Equipo técnico:</span> Se llevará todo el equipo contratado y accesorios necesarios.</li>
                        </ul>
                    </div>

                    {/* CANCELACIÓN */}

                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> EN CASO DE CANCELACIÓN
                        </h2>
                        <p className='text-zinc-400'>
                            El anticipo no es reembolsable por cancelaciones ajenas a PROSOCIAL. Si se cambia la fecha, se respeta el anticipo si PROSOCIAL está disponible. Si la fecha ya está asignada, se considerará como cancelación.
                        </p>
                    </div>

                    {/* COSTOS ADICIONALES */}
                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-2 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> COSTOS ADICIONALES
                        </h2>
                        <ul className='list-inside text-zinc-400'>
                            <li className='mb-3'><span className='font-semibold text-zinc-200'>Permiso de locación:</span> El cliente cubrirá permisos requeridos por la locación.</li>
                            <li className='mb-3'><span className='font-semibold text-zinc-200'>Horas extra:</span> Se agregarán al presupuesto y pagarán el día de la solicitud.</li>
                        </ul>
                    </div>


                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-3 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> ENTREGA DEL SERVICIO
                        </h2>
                        <ul className='list-inside text-zinc-400'>
                            <li className='mb-3'>Entrega digital máxima en 20 días hábiles después del evento.</li>
                            <li className='mb-3'>Entrega impresa máximo 30 días tras autorizar el diseño de libro.</li>
                            <li className='mb-3'>Cliente puede solicitar respaldo previo en disco de 250GB.</li>
                        </ul>
                    </div>

                    <div className='mb-10'>
                        <h2 className='text-lg font-semibold mb-3 flex items-center'>
                            <CircleCheck size={16} className='mr-2' /> GARANTÍAS EN SERVICIO
                        </h2>
                        <ul className='text-zinc-400'>
                            <li className='mb-3'>Respaldo de material audio visual en disco externo dedicado.</li>
                            <li className='mb-3'>Copia y edición de material en discos duros de trabajo dedicados.</li>
                            <li className='mb-3'>Fotos en alta resolución formato JPG con revelado digital (ajuste de exposición y balance de blancos).</li>
                            <li className='mb-3'>Calidad de video en alta definición.</li>
                            <li className='mb-3'>Plazo de observaciones: 30 días para comentarios y ajustes; después, se borran originales.</li>
                        </ul>
                    </div>

                </div>
            </div>

            <div>

                <button
                    className="bg-red-600 text-white p-2 rounded-md border border-red-500 text-sm w-full"
                    onClick={() => window.close()}
                >
                    Cerrar ventana
                </button>
            </div>

        </div>


    )
}
