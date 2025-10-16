#!/usr/bin/env bash
set -euo pipefail

SHOW_ALL=0
[[ "${1:-}" == "--all" ]] && SHOW_ALL=1

ROOT="${ROOT:-.}"
SRC_DIR="${SRC_DIR:-src}"

if [[ ! -d "$SRC_DIR" ]]; then
  echo "❌ No encuentro el directorio '$SRC_DIR'. Ajusta SRC_DIR o ejecuta desde la raíz del repo."
  exit 1
fi

has_cmd() { command -v "$1" >/dev/null 2>&1; }

if has_cmd rg; then
  SEARCH_ENGINE="rg"
elif has_cmd git && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  SEARCH_ENGINE="gitgrep"
else
  SEARCH_ENGINE="grep"
fi

print_header() { printf "\n\n%s\n%s\n" "🔎 $1" "$(printf '%.0s─' $(seq 1 ${#1}))"; }

run_search() {
  local pattern="$1"
  case "$SEARCH_ENGINE" in
    rg)
      rg -n --no-heading -e "$pattern" "$SRC_DIR" || true
      ;;
    gitgrep)
      git grep -nE "$pattern" -- "$SRC_DIR" || true
      ;;
    grep)
      grep -RInE "$pattern" "$SRC_DIR" || true
      ;;
  esac
}

count_hits() {
  local pattern="$1"
  case "$SEARCH_ENGINE" in
    rg)       rg -n --no-heading -e "$pattern" "$SRC_DIR" | wc -l ;;
    gitgrep)  git grep -nE "$pattern" -- "$SRC_DIR" | wc -l ;;
    grep)     grep -RInE "$pattern" "$SRC_DIR" | wc -l ;;
  esac
}

show_block() {
  local label="$1"
  local pattern="$2"
  local limit_txt=" (primeras 20)"
  local hits
  hits=$(count_hits "$pattern")
  print_header "$label · Coincidencias: $hits"
  if [[ "$hits" -eq 0 ]]; then
    echo "— Sin resultados —"
    return
  fi
  if [[ "$SHOW_ALL" -eq 1 ]]; then
    run_search "$pattern"
  else
    run_search "$pattern" | head -n 20
    echo "... usa '--all' para ver todas las coincidencias."
  fi
}

echo "🧹 Auditoría de referencias a 'WorkshopInfo' y relacionados"
echo "Herramienta de búsqueda: $SEARCH_ENGINE"
[[ "$SHOW_ALL" -eq 1 ]] && echo "Modo: mostrar TODO" || echo "Modo: mostrar un resumen"

# Patrones clave (label|regex)
PATTERNS=(
  "Imports de WorkshopInfo|import[^;]*WorkshopInfo"
  "Tipo WorkshopInfo|\bWorkshopInfo\b"
  "Prop/variable 'workshopInfo'|\bworkshopInfo\b"
  "ServiceRecord.workshopInfo|service\.workshopInfo\b"
  "Claves de localStorage (workshopTicketInfo)|workshopTicketInfo"
  "Previews/initial (nombres comunes)|previewWorkshopInfo|initialWorkshopInfo"
)

TOTAL_HITS=0
for entry in "${PATTERNS[@]}"; do
  IFS='|' read -r label p1 p2 <<<"$entry"
  if [[ -n "${p2:-}" ]]; then
    # combinar 2 patrones en uno
    pattern="(${p1}|${p2})"
  else
    pattern="$p1"
  fi
  show_block "$label" "$pattern"
  TOTAL_HITS=$(( TOTAL_HITS + $(count_hits "$pattern") ))
done

echo -e "\n\n✅ Checklist sugerido:"
echo "1) En '@/types':"
echo "   • Elimina la definición/export de 'WorkshopInfo'."
echo "   • Si 'ServiceRecord' tenía 'workshopInfo', bórralo del tipo."
echo "2) En archivos que importan 'WorkshopInfo': quita 'WorkshopInfo' del import."
echo "3) Donde haya 'service.workshopInfo': elimina merges/usos."
echo "4) Variables/props como 'workshopInfo', 'previewWorkshopInfo', 'initialWorkshopInfo':"
echo "   • Renómbralas o elimínalas según aplique."
echo "5) Si usas 'workshopTicketInfo' en localStorage:"
echo "   • Decide si migras/eliminas esa preferencia."
echo "6) Corre el typecheck para confirmar:"
echo "   • pnpm tsc -p .   (o)   npm run typecheck"

if [[ "$TOTAL_HITS" -gt 0 ]]; then
  echo -e "\n⚠️ Aún hay $TOTAL_HITS coincidencias totales. Repite el script hasta llegar a 0."
else
  echo -e "\n🎉 No se encontraron coincidencias. Limpieza completada."
fi
