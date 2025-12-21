-- Crear tabla para pagos parciales de nóminas
CREATE TABLE IF NOT EXISTS studio_nomina_pagos_parciales (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nomina_id TEXT NOT NULL REFERENCES studio_nominas(id) ON DELETE CASCADE,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('transferencia', 'efectivo')),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_nomina_pagos_parciales_nomina FOREIGN KEY (nomina_id) REFERENCES studio_nominas(id) ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_nomina_pagos_parciales_nomina_id ON studio_nomina_pagos_parciales(nomina_id);
CREATE INDEX IF NOT EXISTS idx_nomina_pagos_parciales_payment_date ON studio_nomina_pagos_parciales(payment_date);

-- Comentarios
COMMENT ON TABLE studio_nomina_pagos_parciales IS 'Pagos parciales de nóminas consolidadas con diferentes métodos de pago';
COMMENT ON COLUMN studio_nomina_pagos_parciales.nomina_id IS 'ID de la nómina consolidada a la que pertenece este pago parcial';
COMMENT ON COLUMN studio_nomina_pagos_parciales.payment_method IS 'Método de pago: transferencia o efectivo';
COMMENT ON COLUMN studio_nomina_pagos_parciales.amount IS 'Monto del pago parcial';
