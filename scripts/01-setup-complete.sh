#!/bin/bash

# ============================================
# SETUP COMPLETO: Migrations + Seeds
# ============================================
# Ejecuta toda la configuración necesaria para desarrollo

set -e  # Salir si hay error

echo "🚀 INICIANDO SETUP COMPLETO ZEN PLATFORM"
echo "========================================"
echo ""

# ============================================
# 1. RESET DB + MIGRATIONS
# ============================================
echo "📦 PASO 1: Aplicando migrations..."
echo "-----------------------------------"
npx supabase db reset
echo "✅ Migrations aplicadas"
echo ""

# ============================================
# 2. SEED MAESTRO (Studio + Platform Core)
# ============================================
echo "🌱 PASO 2: Seed Maestro (Platform Core)..."
echo "-----------------------------------"
npx tsx prisma/01-seed.ts
echo "✅ Seed Maestro completado"
echo ""

# ============================================
# 3. SEED USUARIOS DEMO (Auth + Profiles)
# ============================================
echo "👥 PASO 3: Seed Usuarios Demo..."
echo "-----------------------------------"
npx tsx prisma/02-seed-demo-users.ts
echo "✅ Usuarios creados"
echo ""

# ============================================
# 4. SEED CATÁLOGO COMPLETO
# ============================================
echo "📁 PASO 4: Seed Catálogo..."
echo "-----------------------------------"
npx tsx prisma/03-seed-catalogo.ts
echo "✅ Catálogo creado"
echo ""

# ============================================
# 5. SEED PROMISE PIPELINE
# ============================================
echo "📊 PASO 5: Seed Promise Pipeline..."
echo "-----------------------------------"
npx tsx prisma/04-seed-promise-pipeline.ts demo-studio
echo "✅ Promise Pipeline creado"
echo ""

# ============================================
# 6. VALIDACIÓN FINAL
# ============================================
echo "🔍 PASO 6: Validando setup..."
echo "-----------------------------------"
npx tsx scripts/validate-auth-setup.ts
echo ""

echo "========================================"
echo "🎉 SETUP COMPLETADO EXITOSAMENTE"
echo "========================================"
echo ""
echo "📌 Credenciales de acceso:"
echo "   Super Admin:"
echo "   - Email: admin@prosocial.mx"
echo "   - Password: Admin123!"
echo ""
echo "   Demo Studio Owner:"
echo "   - Email: owner@demo-studio.com"
echo "   - Password: Owner123!"
echo "   - URL: http://localhost:3000/login"
echo ""
echo "   Demo Studio Fotógrafo:"
echo "   - Email: fotografo@demo-studio.com"
echo "   - Password: Foto123!"
echo ""
echo "🔗 Iniciar servidor:"
echo "   npm run dev"
echo ""

