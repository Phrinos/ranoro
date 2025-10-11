/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/* =========================================
   Tipos de entrada (self-contained)
========================================= */
export type Party = {
  companyName?: string;     // Razón social (si aplica)
  name: string;             // Nombre de persona física (si no hay empresa)
  address: string;
  phone?: string;
  representativeName?: string;
  representativeTitle?: string;
};

export type VehicleForContract = {
  make: string;
  model: string;
  year: number | string;
  color?: string;
  plates: string;
  vin: string;
  engine?: string;
};

export type LeaseContractInput = {
  signDate: string | Date;
  startDate: string | Date;
  endDate?: string | Date;
  dailyRate: number;
  deposit: number;
  place: string;
  contractId?: string;
  lessor: Party;
  lessee: Party;
  vehicle: VehicleForContract;
  // Si quieres sobreescribir cláusulas con texto propio, úsalo:
  clausesOverride?: string[];
};

/* =========================================
   Helpers
========================================= */
const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function toDate(d: string | Date | undefined): Date | undefined {
  if (!d) return undefined;
  if (d instanceof Date) return d;
  const try1 = new Date(d);
  return isNaN(try1.getTime()) ? undefined : try1;
}

function formatDateLong(d: string | Date | undefined): string {
  const dd = toDate(d);
  if (!dd) return "";
  const day = dd.getDate();
  const month = MONTHS_ES[dd.getMonth()];
  const year = dd.getFullYear();
  return `${day} de ${month} del ${year}`;
}

function formatMXN(v?: number | string): string {
  const num = Number(v ?? 0);
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  });
}

/* =========================================
   Texto “fijo” basado en tu PDF
========================================= */
const HEADER_LEFT = "Grupo Casa de Nobles Valdelamar S.A. de C.V.";
const HEADER_RIGHT = "AGS Arrendamiento de Vehículos V1.0";

const DECLARACIONES: string[] = [
  "I. El ARRENDADOR declara, a través de su administrador único:",
  "a) Ser una persona moral mexicana, constituida conforme la legislación nacional aplicable, según consta en la escritura pública número 7854, volumen 179, de fecha 16 de julio de 2018, exhibida ante la fe del Notario Público número 24 en la entidad Federativa de Durango, Durango, Lic. Jesús Cisneros Solís, e inscrita en el Registro Público del Comercio de Durango, bajo el número N2018064317 de fecha 08 de agosto de 2018.",
  "b) Que acredita como su representante legal para todos los efectos de este contrato, a ARTURO FEDERICO ANGEL MOJICA VALDELAMAR, quien valida su personalidad jurídica mediante el testimonio notarial número 7854, exhibida ante la fe del Lic. Jesús Cisneros Solís, Notario Público número veinticuatro, en el Estado de Durango, Durango.",
  "c) Que se encuentra al corriente de sus obligaciones fiscales y legales, y que el vehículo objeto del presente contrato se encuentra libre de gravámenes, limitaciones de dominio o cualquier otro impedimento para su arrendamiento.",
  "II. El ARRENDATARIO manifiesta:",
  "a) Ser mayor de edad, con plena capacidad legal para contratar y obligarse en términos de lo establecido en este instrumento.",
  "b) Que conoce y acepta las condiciones de uso, estado mecánico y características del vehículo descrito en la Hoja de Firmas.",
  "III. Ambas partes manifiestan su voluntad de celebrar el presente Contrato de Arrendamiento de Vehículo, sujetándose a las siguientes:",
];

const CLAUSULAS: string[] = [
  "PRIMERA (Objeto). El ARRENDADOR entrega en arrendamiento el Vehículo descrito en la Hoja de Firmas y el ARRENDATARIO lo recibe para su uso conforme a las condiciones pactadas.",
  "SEGUNDA (Precio y forma de pago). El ARRENDATARIO pagará al ARRENDADOR la renta diaria convenida, así como los cargos adicionales aplicables, en los términos y fechas estipuladas.",
  "TERCERA (Depósito en garantía). El ARRENDATARIO entrega el depósito en garantía señalado, para responder por daños, deducibles, faltantes de combustible, limpieza especial, llaves o documentos, multas, corralón y demás conceptos que se generen por el uso del vehículo.",
  "CUARTA (Uso y conservación). El ARRENDATARIO se obliga a usar el vehículo conforme a la normativa de tránsito y mantenerlo bajo su cuidado, notificando de inmediato cualquier siniestro, falla o situación que afecte su operación.",
  "QUINTA (Prohibiciones). Queda estrictamente prohibido subarrendar, ceder o prestar el vehículo, así como utilizarlo para actividades ilícitas o fuera del territorio autorizado sin autorización expresa y por escrito del ARRENDADOR.",
  "SEXTA (Seguros y deducibles). En caso de siniestro, el ARRENDATARIO se obliga a cubrir los deducibles y gastos no amparados por la póliza; a falta de cobertura, responderá por la reparación o reposición total.",
  "SÉPTIMA (Multas y sanciones). Toda multa, infracción, fotomulta, corralón, peaje o gasto derivado del uso del vehículo será por cuenta del ARRENDATARIO.",
  "OCTAVA (Plazo). El plazo de arrendamiento inicia y concluye en las fechas indicadas en la Hoja de Firmas; cualquier prórroga deberá constar por escrito.",
  "NOVENA (Devolución). El ARRENDATARIO devolverá el vehículo en el lugar convenido, junto con su combustible, llaves, accesorios y documentación; en caso contrario, cubrirá los cargos correspondientes.",
  "DÉCIMA (Terminación). El incumplimiento de cualquiera de las obligaciones faculta al ARRENDADOR a dar por terminado el Contrato de forma inmediata, sin perjuicio de exigir daños y perjuicios.",
  "DÉCIMA PRIMERA (Jurisdicción). Para la interpretación y cumplimiento del presente, las partes se someten a las leyes y tribunales competentes, renunciando al fuero que pudiera corresponderles por razón de su domicilio presente o futuro.",
];

const ANEXO_A_LABELS = [
  "Llanta de refacción",
  "Gato",
  "Llave de cruz",
  "Triángulos",
  "Extintor",
  "Tapetes",
  "Manual",
  "Duplicado de llave",
  "Documentación",
  "Antena",
];

function PAGARE_TEXT(place: string, fechaLetra: string, monto: string): string[] {
  return [
    "PAGARÉ",
    "",
    `Debo(emos) y pagaré(emos) incondicionalmente a la orden del ARRENDADOR, en ${place}, México, el ${fechaLetra}, la cantidad de ${monto}, por concepto de depósito en garantía derivado del Contrato de Arrendamiento de Vehículo.`,
    "La falta de pago faculta al tenedor para exigir el total adeudado, gastos, costas y honorarios que se originen, de conformidad con la legislación aplicable.",
  ];
}

/* =========================================
   Estilos compatibles con React-PDF
========================================= */
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, fontSize: 9 },
  h1: { fontSize: 16, marginTop: 8, marginBottom: 8, fontWeight: "bold" as const },
  h2: { fontSize: 12, marginTop: 8, marginBottom: 6, fontWeight: "bold" as const },
  small: { fontSize: 9, color: "#666666" },
  row: { flexDirection: "row", marginBottom: 6, flexWrap: "wrap" as const },
  col: { width: "48%" },
  colSpacer: { width: "4%" },
  box: { borderWidth: 1, borderColor: "#dddddd", padding: 8, borderRadius: 4, marginTop: 6 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  sigBox: { width: "48%", borderTopWidth: 1, borderColor: "#222222", paddingTop: 6 },
  list: { marginTop: 4, marginBottom: 4 },
  listItem: { marginBottom: 4, textAlign: "justify" as const },
  justified: { textAlign: "justify" as const },
  annexItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
});

/* =========================================
   Subcomponente etiqueta: valor
========================================= */
const Item = ({ label, value }: { label: string; value?: string }) => (
  <Text style={{ marginBottom: 2 }}>
    <Text style={{ fontWeight: "bold" as const }}>{label}: </Text>
    <Text>{value || ""}</Text>
  </Text>
);

/* =========================================
   Componente principal: LeasePdf
   (todo en un solo archivo, sin imports extra)
========================================= */
export default function LeasePdf({ data }: { data: LeaseContractInput }) {
  const signDate = formatDateLong(data.signDate);
  const startDate = formatDateLong(data.startDate);
  const endDate = formatDateLong(data.endDate);

  const headerLeft = data.lessor.companyName || HEADER_LEFT;
  const headerRight = HEADER_RIGHT;

  const pagaréLines = PAGARE_TEXT(
    data.place,
    endDate || startDate || signDate,
    formatMXN(data.deposit || 0)
  );

  const clauses = data.clausesOverride && data.clausesOverride.length > 0
    ? data.clausesOverride
    : CLAUSULAS;

  return (
    <Document>
      {/* Página 1 - Hoja de Firmas */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{headerRight}</Text>
        </View>

        <Text style={styles.h1}>CONTRATO DE ARRENDAMIENTO DE VEHÍCULO</Text>
        <Text style={styles.h2}>HOJA DE FIRMAS</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Item label="Fecha de Firma" value={signDate} />
            <Item label="Inicio del Contrato" value={startDate} />
            <Item label="Fin de Contrato" value={endDate || "—"} />
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Item label="Costo Renta Diaria" value={formatMXN(data.dailyRate)} />
            <Item label="Depósito en Garantía" value={formatMXN(data.deposit)} />
            {data.contractId ? <Item label="Folio Interno" value={data.contractId} /> : null}
          </View>
        </View>

        <View style={styles.box}>
          <Text style={{ fontWeight: "bold" as const, marginBottom: 4 }}>"VEHÍCULO"</Text>
          <Item label="Marca / Modelo / Año" value={`${data.vehicle.make} ${data.vehicle.model} ${data.vehicle.year}`} />
          <Item label="Color" value={data.vehicle.color || "—"} />
          <Item label="Placas" value={data.vehicle.plates} />
          <Item label="Serie (VIN)" value={data.vehicle.vin} />
          <Item label="Motor" value={data.vehicle.engine || "—"} />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "bold" as const, marginBottom: 4 }}>"ARRENDADOR"</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Item label="Nombre" value={data.lessor.companyName || data.lessor.name} />
              {data.lessor.representativeName ? (
                <Item
                  label="Representante"
                  value={`${data.lessor.representativeName}${
                    data.lessor.representativeTitle ? " / " + data.lessor.representativeTitle : ""
                  }`}
                />
              ) : null}
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Item label="Domicilio" value={data.lessor.address} />
              <Item label="Teléfono" value={data.lessor.phone || "—"} />
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "bold" as const, marginBottom: 4 }}>"ARRENDATARIO"</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <Item label="Nombre" value={data.lessee.name} />
              <Item label="Teléfono" value={data.lessee.phone || "—"} />
            </View>
            <View style={styles.colSpacer} />
            <View style={styles.col}>
              <Item label="Domicilio" value={data.lessee.address} />
            </View>
          </View>
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Firma ARRENDADOR</Text>
            <Text style={styles.small}>{data.lessor.companyName || data.lessor.name}</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.small}>Firma ARRENDATARIO</Text>
            <Text style={styles.small}>{data.lessee.name}</Text>
          </View>
        </View>
      </Page>

      {/* Página 2 - Declaraciones */}
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{headerRight}</Text>
        </View>

        <Text style={styles.h2}>CONTRATO DE ARRENDAMIENTO</Text>
        <Text style={[styles.justified, { marginBottom: 8 }]}>
          CONTRATO DE ARRENDAMIENTO DE VEHÍCULOS (“El Contrato”) celebrado entre {headerLeft} (en lo sucesivo “ARRENDADOR”) y {data.lessee.name} (en lo sucesivo “ARRENDATARIO”), para el arrendamiento del bien mueble descrito en la Hoja de Firmas (“VEHÍCULO”).
        </Text>

        <Text style={styles.h2}>DECLARACIONES</Text>
        <View style={styles.list}>
          {DECLARACIONES.map((line, idx) => (
            <Text key={idx} style={styles.listItem}>{line}</Text>
          ))}
        </View>
      </Page>

      {/* Página 3+ - Cláusulas */}
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header}>
          <Text>{headerLeft}</Text>
          <Text>{headerRight}</Text>
        </View>
        <Text style={styles.h2}>CLÁUSULAS</Text>
        <View style={styles.list}>
          {clauses.map((c, idx) => (
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
          <Text>{headerRight}</Text>
        </View>
        {pagaréLines.map((t, i) => (
          <Text key={i} style={{ marginBottom: 6 }}>{t}</Text>
        ))}
        <View style={{ marginTop: 24 }}>
          <Text style={{ marginBottom: 12, fontWeight: "bold" as const }}>DATOS DEL SUSCRIPTOR</Text>
          <Item label="NOMBRE" value={data.lessee.name} />
          <Item label="DIRECCIÓN" value={data.lessee.address} />
          <Item label="TELÉFONO" value={data.lessee.phone || ""} />
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
          <Text>{headerRight}</Text>
        </View>

        <Text style={styles.h2}>ANEXO “A”</Text>
        <View style={styles.box}>
          <Item label="Marca" value={data.vehicle.make} />
          <Item label="Modelo" value={data.vehicle.model} />
          <Item label="Año" value={String(data.vehicle.year)} />
          <Item label="Color" value={data.vehicle.color || "—"} />
          <Item label="Placas" value={data.vehicle.plates} />
          <Item label="Serie (VIN)" value={data.vehicle.vin} />
          <Item label="Motor" value={data.vehicle.engine || "—"} />
        </View>

        <View style={{ marginTop: 12, flexDirection: "row" }}>
          <View style={styles.col}>
            <Item label="Kilometraje a la entrega" value="___________________" />
          </View>
          <View style={styles.colSpacer} />
          <View style={styles.col}>
            <Item label="Kilometraje a la recepción" value="___________________" />
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "bold" as const, marginBottom: 6 }}>Inventario:</Text>
          {ANEXO_A_LABELS.map((x, i) => (
            <View key={i} style={styles.annexItem}>
              <Text>{x}:</Text>
              <Text>___</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "bold" as const, marginBottom: 6 }}>Detalles:</Text>
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
