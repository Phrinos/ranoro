#!/bin/bash

# ╭──────────────────────────────────────────────╮
# │ 🔄 RESET DE ENTORNO PARA FIREBASE STUDIO     │
# ╰──────────────────────────────────────────────╯

echo "📌 Estableciendo proyecto a ranoro-jm8l0..."
gcloud config set project ranoro-jm8l0

echo "🔐 Reautenticando credenciales predeterminadas..."
gcloud auth application-default login

echo "🧹 Borrando cachés de Next.js y Genkit..."
rm -rf .next .genkit/.cache

echo "📦 Reinstalando dependencias..."
rm -rf node_modules package-lock.json
npm install

echo "🚀 Iniciando servidor en puerto 6000..."
PORT=6000 npm run dev
