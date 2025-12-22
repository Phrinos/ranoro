tsc --noEmit o npm run typecheck
Para revisar errores de Typescrip

/clear
Limpiar el prototyper

df -h
Ver espacio del disco duro

rm -rf node_modules .next .turbo .cache .eslintcache dist coverage tsconfig.tsbuildinfo

# 1) Cerrar el dev server (Ctrl+C) y limpiar artefactos

npm cache clean --force

# 2) Limpiar caché de npm

npm ci

# 3) Reinstalar desde el lockfile (más confiable que npm i)

npm run build

# 4) Reconstruir

Mejora General

A este componente: 
1. Preparalo para que funcione correctamente en dispositivos móviles 
2. Mejoralo visualmente para que sea más impactante y bonito. 
3. Añade animaciones y todo. Ver espacio del disco duro

Componentes Indispensables


npm react-to-print
Para manejar impresiones de vistas previas correctamente, si no lo ponemos, no funciona la impresion y se hace un caos. Perdi mucho tiempo sin el

react-calendar
Mejor que react-pick-a-day

npm install react-compare-image
Para comparar imagenes. 

react-konva
PAra generar collages de imagenes. 

firebase deploy --only firestore:indexes
