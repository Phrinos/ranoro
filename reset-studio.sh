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

echo "📦 Dependencias omitidas para un reinicio rápido."

echo "🚀 Reinicia el servidor para aplicar los cambios."
echo "Comando sugerido: PORT=6000 npm run dev"
