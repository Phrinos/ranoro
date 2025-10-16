
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { LeaseContractInput } from "./types";
import { formatDateLong, formatMXN } from "./format";
import { HEADER_LEFT, HEADER_RIGHT, DECLARACIONES, CLAUSULAS, ANEXO_A_LABELS, PAGARE_TEXT } from "./lease-text-es";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, lineHeight: 1.4 },
  header: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, fontSize: 9 },
  h1: { fontSize: 16, marginTop: 8, marginBottom: 8, fontWeight: 700 },
  h2: { fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: 700 },
  small: { fontSize: 9, color: "#666" },
  row: { flexDirection: "row", gap: 12, marginBottom: 6, flexWrap: "wrap" },
  col: { flexGrow: 1, flexBasis: "48%" },
  box: { border: 1, borderColor: "#ddd", padding: 8, borderRadius: 4, marginTop: 6 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  sigBox: { width: "48%", borderTop: 1, borderColor: "#222", paddingTop: 6 },
  list: { marginTop: 4, marginBottom: 4 },
  listItem: { marginBottom: 4, textAlign: "justify" as const },
  justified: { textAlign: "justify" as const },
  annexItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
});

const Item = ({ label, value }: { label: string; value?: string }) => (
  <Text style={{ marginBottom: 2 }}>
    <Text style={{ fontWeight: 700 }}>{label}: </Text>
    <Text>{value || ""}</Text>
  </Text>
);

function LeasePdf({ data }: { data: LeaseContractInput }) {
  const lessor = {
    companyName: data.lessor?.companyName ?? "",
    name: data.lessor?.name ?? "",
    address: data.lessor?.address ?? "",
    phone: data.lessor?.phone ?? "",
    representativeName: data.lessor?.representativeName ?? "",
    representativeTitle: data.lessor?.representativeTitle ?? "",
  };

  const lessee = {
    name: data.lessee?.name ?? "",
    address: data.lessee?.address ?? "",
    phone: data.lessee?.phone ?? "",
  };

  const vehicle = {
    make: data.vehicle?.make ?? "",
    model: data.vehicle?.model ?? "",
    year: String(data.vehicle?.year ?? ""),
    color: data.vehicle?.color ?? "",
    plates: data.vehicle?.plates ?? "",
    vin: data.vehicle?.vin ?? "",
    engine: data.vehicle?.engine ?? "",
  };

  const signDate = formatDateLong(data.signDate);
  const startDate = formatDateLong(data.startDate);
  const endDate = data.endDate ? formatDateLong(data.endDate) : "";

  const headerLeft = lessor.companyName || HEADER_LEFT;

  const pagaréLines = PAGARE_TEXT(
    data.place,
    endDate || startDate || signDate,
    formatMXN(data.deposit || 0),
  );

  return (
    <Document>
      {/* Página 1 - Hoja de firmas */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{HEADER_RIGHT}</Text>
        </View>

        <Text style={styles.h1}>CONTRATO DE ARRENDAMIENTO DE VEHÍCULO</Text>
        <Text style={styles.h2}>HOJA DE FIRMAS</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Item label="Fecha de Firma" value={signDate} />
            <Item label="Inicio del Contrato" value={startDate} />
            <Item label="Fin de Contrato" value={endDate || "—"} />
          </View>
          <View style={styles.col}>
            <Item label="Costo Renta Diaria" value={formatMXN(data.dailyRate)} />
            <Item label="Depósito en Garantía" value={formatMXN(data.deposit)} />
            {data.contractId ? <Item label="Folio Interno" value={data.contractId} /> : null}
          </View>
        </View>

        <View style={styles.box}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>
            “VEHÍCULO”
          </Text>
          <Item label="Marca / Modelo / Año" value={`${vehicle.make} ${vehicle.model} ${vehicle.year}`} />
          <Item label="Color" value={vehicle.color || "—"} />
          <Item label="Placas" value={vehicle.plates} />
          <Item label="Serie (VIN)" value={vehicle.vin} />
          <Item label="Motor" value={vehicle.engine || "—"} />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>“ARRENDADOR”</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Item label="Nombre" value={lessor.companyName || lessor.name} />
              {lessor.representativeName ? (
                <Item
                  label="Representante"
                  value={`${lessor.representativeName}${lessor.representativeTitle ? " / " + lessor.representativeTitle : ""}`}
                />
              ) : null}
            </View>
            <View style={styles.col}>
              <Item label="Domicilio" value={lessor.address} />
              <Item label="Teléfono" value={lessor.phone || "—"} />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>“ARRENDATARIO”</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Item label="Nombre" value={lessee.name} />
              <Item label="Teléfono" value={lessee.phone || "—"} />
            </View>
            <View style={styles.col}>
              <Item label="Domicilio" value={lessee.address} />
            </View>
          </View>
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Firma ARRENDADOR</Text>
            <Text style={styles.small}>{lessor.companyName || lessor.name}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Firma ARRENDATARIO</Text>
            <Text style={styles.small}>{lessee.name}</Text>
          </View>
        </View>
      </Page>

      {/* Página 2 - Declaraciones */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{HEADER_RIGHT}</Text>
        </View>

        <Text style={styles.h2}>CONTRATO DE ARRENDAMIENTO</Text>
        <Text style={[styles.justified, { marginBottom: 8 }]}>
          CONTRATO DE ARRENDAMIENTO DE VEHÍCULOS (“El Contrato”) celebrado entre {headerLeft}
          {" "} (en lo sucesivo “ARRENDADOR”) y {lessee.name} (en lo sucesivo “ARRENDATARIO”), para el
          arrendamiento del bien mueble descrito en la Hoja de Firmas (“VEHÍCULO”).
        </Text>

        <Text style={styles.h2}>DECLARACIONES</Text>
        <View style={styles.list}>
          {DECLARACIONES.map((line, idx) => (
            <Text key={idx} style={styles.listItem}>{line}</Text>
          ))}
        </View>
      </Page>

      {/* Página 3+ - Cláusulas (se parte automáticamente en páginas) */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{HEADER_RIGHT}</Text>
        </View>
        <Text style={styles.h2}>CLÁUSULAS</Text>
        <View style={styles.list}>
          {(data.clausesOverride ?? CLAUSULAS).map((c, idx) => (
            <Text key={idx} style={styles.listItem}>{c}</Text>
          ))}
        </View>
        <Text style={[styles.small, { marginTop: 8 }]}>
          En testimonio de lo anterior, en {data.place}, México, las Partes firmaron el presente Contrato en la fecha de firma.
        </Text>
      </Page>

      {/* Página Pagaré */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{HEADER_RIGHT}</Text>
        </View>
        {pagaréLines.map((t, i) => (
          <Text key={i} style={{ marginBottom: 6 }}>{t}</Text>
        ))}
        <View style={{ marginTop: 24 }}>
          <Text style={{ marginBottom: 12 }}>DATOS DEL SUSCRIPTOR</Text>
          <Item label="NOMBRE" value={lessee.name} />
          <Item label="DIRECCIÓN" value={lessee.address} />
          <Item label="TELÉFONO" value={lessee.phone || ""} />
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.small}>FIRMA DEL SUSCRIPTOR</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.small}>HUELLA DEL SUSCRIPTOR</Text>
          </View>
        </View>
      </Page>

      {/* Página ANEXO “A” */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{HEADER_RIGHT}</Text>
        </View>

        <Text style={styles.h2}>ANEXO “A”</Text>
        <View style={styles.box}>
          <Item label="Marca" value={vehicle.make} />
          <Item label="Modelo" value={vehicle.model} />
          <Item label="Año" value={String(vehicle.year)} />
          <Item label="Color" value={vehicle.color || "—"} />
          <Item label="Placas" value={vehicle.plates} />
          <Item label="Serie (VIN)" value={vehicle.vin} />
          <Item label="Motor" value={vehicle.engine || "—"} />
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.col}>
            <Item label="Kilometraje a la entrega" value="___________________" />
          </View>
          <View style={styles.col}>
            <Item label="Kilometraje a la recepción" value="___________________" />
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: 700, marginBottom: 6 }}>Inventario:</Text>
          {ANEXO_A_LABELS.map((x, i) => (
            <View key={i} style={styles.annexItem}>
              <Text>{x}:</Text>
              <Text>___</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: 700, marginBottom: 6 }}>Detalles:</Text>
          <Text>_____________________________________________________________________________________</Text>
          <Text>_____________________________________________________________________________________</Text>
          <Text>_____________________________________________________________________________________</Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text>Recibo de conformidad el {endDate || startDate || signDate}</Text>
        </View>

        <View style={[styles.sigRow, { marginTop: 40 }]}>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Nombre:</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Firma:</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export default LeasePdf;
export { LeasePdf }; // (opcional, por si en algún lugar lo importas como named)
