#!/bin/bash

# ============================================
# SETUP SEEDS SOLAMENTE (Sin reset DB)
# ============================================
# Para cuando ya hiciste prisma db push/generate
# y NO quieres borrar datos con db reset

set -e  # Salir si hay error

echo "🌱 EJECUTANDO SEEDS (Sin reset DB)"
echo "========================================"
echo ""
echo "⚠️  NOTA: Este script NO aplica migrations SQL"
echo "   Si necesitas las migrations nuevas, ejecuta:"
echo "   npx supabase db reset"
echo ""
read -p "¿Continuar solo con seeds? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelado"
    exit 1
fi
echo ""

# ============================================
# 1. SEED MAESTRO (Studio + Platform Core)
# ============================================
echo "🌱 PASO 1: Seed Maestro (Platform Core)..."
echo "-----------------------------------"
npx tsx prisma/01-seed.ts
echo "✅ Seed Maestro completado"
echo ""

# ============================================
# 2. SEED USUARIOS DEMO (Auth + Profiles)
# ============================================
echo "👥 PASO 2: Seed Usuarios Demo..."
echo "-----------------------------------"
npx tsx prisma/02-seed-demo-users.ts
echo "✅ Usuarios creados"
echo ""

# ============================================
# 3. SEED CATÁLOGO COMPLETO
# ============================================
echo "📁 PASO 3: Seed Catálogo..."
echo "-----------------------------------"
npx tsx prisma/03-seed-catalogo.ts
echo "✅ Catálogo creado"
echo ""

# ============================================
# 4. SEED PROMISE PIPELINE
# ============================================
echo "📊 PASO 4: Seed Promise Pipeline..."
echo "-----------------------------------"
npx tsx prisma/04-seed-promise-pipeline.ts demo-studio
echo "✅ Promise Pipeline creado"
echo ""

# ============================================
# 5. VALIDACIÓN (puede fallar si faltan migrations)
# ============================================
echo "🔍 PASO 5: Validando setup..."
echo "-----------------------------------"
npx tsx scripts/validate-auth-setup.ts || echo "⚠️  Validación falló (puede ser por migrations faltantes)"
echo ""

echo "========================================"
echo "🎉 SEEDS COMPLETADOS"
echo "========================================"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   Si el realtime no funciona, DEBES ejecutar:"
echo "   npx supabase db reset"
echo "   para aplicar las migrations SQL necesarias"
echo ""
echo "📌 Credenciales de acceso:"
echo "   Demo Studio Owner:"
echo "   - Email: owner@demo-studio.com"
echo "   - Password: Owner123!"
echo ""

