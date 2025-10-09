#!/bin/bash

# ╭──────────────────────────────────────────────╮
# │ 🔄 RESET DE ENTORNO PARA FIREBASE STUDIO     │
# ╰──────────────────────────────────────────────╯

echo "📌 Estableciendo proyecto a ranoro-jm8l0..."
gcloud config set project ranoro-jm8l0

echo "🔐 Reautenticando credenciales predeterminadas..."
gcloud auth application-default login

echo "🧹 Borrando cachés y dependencias..."
rm -rf .next .genkit/.cache node_modules

echo "📦 Reinstalando dependencias..."
npm install

echo "✅ ¡Entorno limpiado!"
echo "🚀 Reinicia el servidor para aplicar los cambios."
echo "Comando sugerido: PORT=6000 npm run dev"
