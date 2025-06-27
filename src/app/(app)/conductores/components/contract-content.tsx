"use client";

import React from "react";
import type { Driver, Vehicle } from "@/types";
import { format, parseISO, addYears, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

interface ContractContentProps {
  driver: Driver;
  vehicle: Vehicle;
}

export const ContractContent = React.forwardRef<
  HTMLDivElement,
  ContractContentProps
>(({ driver, vehicle }, ref) => {
  // ──────────────────────────────────────────────────────────────
  //  Fechas
  // ──────────────────────────────────────────────────────────────
  const signatureDate = driver.contractDate
    ? parseISO(driver.contractDate)
    : new Date();

  // Inicio = fecha de firma (01-jun-2025 en el ejemplo)
  const startDate = driver.contractStartDate
    ? parseISO(driver.contractStartDate)
    : signatureDate;

  // Fin = un año menos un día (31-may-2026 en el ejemplo)
  const endDate = subDays(addYears(startDate, 1), 1);

  const fSignature = format(signatureDate, "dd 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  const fStart = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: es });
  const fEnd = format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: es });

  // ──────────────────────────────────────────────────────────────
  //  Renta diaria y depósito
  // ──────────────────────────────────────────────────────────────
  const dailyRent = vehicle.dailyRentalCost ?? 0;
  const dailyRentWithVat = dailyRent * 1.16;
  const deposit = driver.depositAmount ?? 0;

  return (
    <div
      ref={ref}
      data-format="letter"
      className="font-serif bg-white text-black p-8 text-sm leading-relaxed"
    >
      {/* ===========================================================
          CABECERA
      ============================================================ */}
      <p className="text-center font-bold mb-6 text-lg uppercase">
        Contrato de Arrendamiento de Vehículo
      </p>

      {/* ===========================================================
          HOJA DE FIRMAS
      ============================================================ */}
      <section className="mb-8 space-y-2">
        <h2 className="font-bold uppercase text-center">Hoja de Firmas</h2>

        <p>
          <strong>Fecha de firma:</strong> {fSignature}
        </p>
        <p>
          <strong>Inicio del contrato:</strong> {fStart}
        </p>
        <p>
          <strong>Fin de contrato:</strong> {fEnd}
        </p>

        <p className="mt-4 font-semibold">“VEHÍCULO”</p>
        <ul className="list-disc list-inside pl-4">
          <li>
            <strong>Marca / Modelo / Año / Color:</strong>{" "}
            {vehicle.make} {vehicle.model} {vehicle.year}{" "}
            {vehicle.color ?? ""}
          </li>
          <li>
            <strong>Placas:</strong> {vehicle.licensePlate}
          </li>
          <li>
            <strong>No. de motor:</strong> {vehicle.engineNumber ?? "—"}
          </li>
          <li>
            <strong>Serie (VIN):</strong> {vehicle.vin ?? "—"}
          </li>
        </ul>

        <p className="mt-4">
          <strong>RENTA DIARIA SIN IVA:</strong>{" "}
          {formatCurrency(dailyRent)} (sin IVA)
          <br />
          <strong>RENTA DIARIA CON IVA 16 %:</strong>{" "}
          {formatCurrency(dailyRentWithVat)}
        </p>

        {/* ARRENDADOR */}
        <div className="mt-6">
          <p className="font-semibold">“ARRENDADOR”</p>
          <p className="leading-tight">
            GRUPO CASA DE NOBLES VALDELAMAR S.A. DE C.V.
            <br />
            Representante Legal / Administrador Único:{" "}
            {vehicle.ownerName ?? "Arturo Federico Ángel Mojica Valdelamar"}
            <br />
            Domicilio: Avenida Convención de 1914 No 1421,
            Col. Jardines de la Convención, C.P. 20267,
            Aguascalientes, Ags., México.
            <br />
            Teléfono: 449 142 5323
          </p>
        </div>

        {/* ARRENDATARIO */}
        <div className="mt-6">
          <p className="font-semibold">“ARRENDATARIO”</p>
          <p className="leading-tight">
            Nombre: {driver.name}
            <br />
            Domicilio: {driver.address ?? "Aguascalientes, Ags."}
            <br />
            Teléfono: {driver.phone ?? "—"}
          </p>
        </div>
      </section>

      {/* ===========================================================
          TEXTO INTEGRAL DEL CONTRATO
      ============================================================ */}
      <section className="space-y-4 text-justify">
        <p className="font-bold text-center uppercase">
          Contrato de Arrendamiento
        </p>

        <p>
          CONTRATO DE ARRENDAMIENTO DE VEHÍCULOS (el “Contrato”) celebrado entre{" "}
          <strong>GRUPO CASA DE NOBLES VALDELAMAR S.A. DE C.V.</strong> (en lo
          sucesivo, el “<strong>ARRENDADOR</strong>”) y la persona física
          indicada en la Hoja de Firmas (el “<strong>ARRENDATARIO</strong>”),
          para el arrendamiento del bien mueble descrito anteriormente (el
          “<strong>VEHÍCULO</strong>”).
        </p>

        <h3 className="font-bold text-center uppercase">Declaraciones</h3>

        <p>
          <strong>Del ARRENDADOR:</strong> (i) es sociedad mercantil conforme a
          las leyes mexicanas, inscrita en el Registro Público del Comercio
          (escritura 7 854, vol. 179, de 16-jul-2018, Not. 24 Durango); (ii)
          acredita personalidad de su representante legal{" "}
          <strong>Arturo Federico Ángel Mojica Valdelamar</strong> conforme al
          testimonio notarial 7 854; (iii) se dedica al arrendamiento de bienes
          muebles y se encuentra al corriente en sus obligaciones fiscales; (iv)
          el VEHÍCULO está libre de gravamen, con verificación vehicular y
          seguro vigentes; y (v) cuenta con facultades para administrar y rentar
          el VEHÍCULO.
        </p>

        <p>
          <strong>Del ARRENDATARIO:</strong> (i) es persona física mayor de edad
          con capacidad jurídica y económica; (ii) cuenta con licencia de
          conducir vigente y seguro de gastos médicos; y (iii) conoce y acepta
          el estado físico-mecánico del VEHÍCULO.
        </p>

        <p className="text-center font-semibold">
          <em>
            Reconociéndose mutuamente la personalidad con que intervienen, LAS
            PARTES acuerdan lo siguiente:
          </em>
        </p>

        {/* ─────────────── CLÁUSULAS ─────────────── */}
        <h3 className="font-bold text-center uppercase">Cláusulas</h3>

        <p>
          <strong>Primera. Objeto.</strong> El ARRENDADOR otorga al
          ARRENDATARIO, y este acepta, el uso y goce temporal del VEHÍCULO,
          obligándose a pagar la renta convenida y a cumplir lo aquí estipulado.
        </p>

        <p>
          <strong>Segunda. Plazo.</strong> La vigencia inicial es de doce (12)
          meses contados a partir del {fStart}. Salvo aviso escrito con 30 días
          de anticipación, el contrato se prorrogará automáticamente por
          periodos mensuales, ajustándose la renta conforme al INPC publicado
          por INEGI.
        </p>

        <p>
          <strong>Tercera. Uso autorizado.</strong> El ARRENDATARIO destinará el
          VEHÍCULO a uso particular y/o prestación de servicio de transporte de
          personas con chofer dentro de Aguascalientes. Para sacarlo fuera de la
          entidad o ceder su conducción requerirá autorización escrita del
          ARRENDADOR.
        </p>

        <p>
          <strong>Cuarta. Obligaciones del ARRENDATARIO.</strong> Incluyen, de
          forma enunciativa mas no limitativa: (a) no gravar ni subarrendar el
          VEHÍCULO ni usarlo para fines ilícitos; (b) conducir con licencia
          vigente y pagar de inmediato cualquier multa; (c) no permitir otros
          conductores; (d) mantener mínimo ¼ de tanque y devolverlo igual; (e)
          no conducir bajo efectos de alcohol o drogas; (f) no sobrecargar ni
          remolcar; (g) no circular fuera de caminos reconocidos; (h) reportar
          cualquier siniestro en 1 h; (i) acudir semanalmente a revisión
          preventiva so pena de $500 diarios; (j) pagar puntualmente la renta
          diaria + IVA en el domicilio del ARRENDADOR; y (k) restituir el
          VEHÍCULO con el inventario del Anexo “A”.
        </p>

        <p>
          <strong>Quinta. Entrega.</strong> El ARRENDADOR entregará el VEHÍCULO
          a las 15:00 h del {fStart} con tanque lleno e inventario del
          Anexo “A”.
        </p>

        <p>
          <strong>Sexta. Devolución.</strong> El ARRENDATARIO lo devolverá a las
          15:00 h del {fEnd} (o antes si se rescinde) en el mismo domicilio, con
          inventario completo y desgaste normal; pagará faltantes o daños al
          valor de mercado.
        </p>

        <p>
          <strong>Séptima. Renta e impuestos.</strong> La renta diaria sin IVA
          es {formatCurrency(dailyRent)}; con IVA,{" "}
          {formatCurrency(dailyRentWithVat)}. El ARRENDADOR emitirá CFDI por
          arrendamiento y el ARRENDATARIO retendrá lo que proceda.
        </p>

        <p>
          <strong>Octava. Seguro.</strong> El VEHÍCULO cuenta con póliza de
          cobertura amplia (deducible $15 000; excluye robo total). El
          ARRENDATARIO cubrirá deducibles y daños no cubiertos, incluyendo robo
          total, así como responsabilidad civil y penal mientras tenga el
          VEHÍCULO en su poder.
        </p>

        <p>
          <strong>Novena. Depósito en garantía.</strong> El ARRENDATARIO entrega
          {formatCurrency(deposit)} como depósito. Se devolverá (o compensará)
          dentro de las 48 h hábiles posteriores a la restitución satisfactoria
          del VEHÍCULO.
        </p>

        <p>
          <strong>Décima. Intereses moratorios.</strong> El retraso en el pago
          de renta causará 5 % mensual sobre lo vencido.
        </p>

        <p>
          <strong>Décima Primera. Mantenimiento y reparaciones.</strong> Toda
          intervención al VEHÍCULO deberá hacerse únicamente en Taller Mecánico
          y de Carrocería Ranoro (Av. Convención de 1914 #1421). Intervenciones
          no autorizadas: multa $30 000. Falta de revisión semanal: $500 por día
          de retraso.
        </p>

        <p>
          <strong>Décima Segunda. Terminación anticipada.</strong> El ARRENDADOR
          podrá rescindir sin declaración judicial ante incumplimiento del
          ARRENDATARIO, bastando aviso escrito con 2 h; el ARRENDATARIO perderá
          el depósito como pena convencional. El ARRENDATARIO podrá terminar con
          30 días de aviso; de no hacerlo, perderá el depósito.
        </p>

        <p>
          <strong>Décima Tercera. Caso fortuito o fuerza mayor.</strong> La
          parte afectada notificará en 2 h; las obligaciones se suspenderán
          mientras subsista la causa.
        </p>

        <p>
          <strong>Décima Cuarta. Avisos.</strong> Se enviarán por correo
          electrónico y/o WhatsApp a los datos de la Hoja de Firmas, con acuse
          de lectura.
        </p>

        <p>
          <strong>Décima Quinta. Protección de datos personales.</strong> Las
          partes tratarán la información conforme a la Ley Federal de
          Protección de Datos; el ARRENDATARIO acepta el Aviso de Privacidad en{" "}
          <a
            href="https://casadenobles.mx/aviso"
            target="_blank"
            rel="noopener noreferrer"
          >
            casadenobles.mx/aviso
          </a>
          .
        </p>

        <p>
          <strong>Décima Sexta. Legislación y jurisdicción.</strong> Para la
          interpretación y cumplimiento, las partes se someten a las leyes
          federales de México y a los tribunales competentes de Aguascalientes,
          renunciando a otro fuero.
        </p>

        <p>
          <strong>Décima Séptima. Geolocalización (GPS).</strong> El VEHÍCULO
          cuenta con rastreo satelital; el ARRENDATARIO autoriza la recopilación
          y tratamiento de datos de localización. Manipular el dispositivo será
          incumplimiento grave y causa de rescisión.
        </p>

        <p>
          <strong>Décima Octava. Uso en plataformas de choferes.</strong> Se
          permite su uso en plataformas (Uber, DiDi, etc.) siempre que el
          ARRENDATARIO mantenga cuenta activa, seguro ERT y cumpla requisitos
          fiscales y métricas de la plataforma; de lo contrario se rescindirá.
        </p>

        <p>
          <strong>Décima Novena. Integración.</strong> Este documento y anexos
          constituyen la totalidad del acuerdo y solo podrán modificarse por
          escrito firmado por ambas partes.
        </p>

        <p className="text-center my-6">
          Leído que fue el presente Contrato y enteradas LAS PARTES de su
          contenido y alcance legal, lo firman por duplicado en la ciudad de
          Aguascalientes, Aguascalientes, a {fSignature}.
        </p>
      </section>

      {/* ===========================================================
          FIRMAS
      ============================================================ */}
      <footer className="mt-20 grid grid-cols-2 gap-8 text-center text-xs">
        <div className="border-t-2 border-black pt-2">
          <p className="font-semibold">
            GRUPO CASA DE NOBLES VALDELAMAR S.A. DE C.V.
          </p>
          <p>
            <strong>“EL ARRENDADOR”</strong>
          </p>
        </div>
        <div className="border-t-2 border-black pt-2">
          <p className="font-semibold">{driver.name.toUpperCase()}</p>
          <p>
            <strong>“EL ARRENDATARIO”</strong>
          </p>
        </div>
      </footer>

      {/* ===========================================================
          PAGARÉ (resumen)
      ============================================================ */}
      <section className="mt-16 text-justify text-xs leading-relaxed">
        <h3 className="font-bold text-center uppercase mb-2">Pagaré</h3>
        <p className="text-center mb-2">Bueno por: $175,000.00</p>
        <p>
          En Aguascalientes, Aguascalientes, {fSignature}. Debo y pagaré
          incondicionalmente por este pagaré a la orden de{" "}
          <strong>Arturo Federico Ángel Mojica Valdelamar</strong> la cantidad de
          $175 000.00 (CIENTO SETENTA Y CINCO MIL PESOS 00/100 M.N.) el{" "}
          {fSignature}. Su impago causará intereses moratorios del 5 % mensual y
          las partes se someten a los tribunales competentes de Aguascalientes.
        </p>
      </section>

      {/* ===========================================================
          ANEXO “A” (Inventario resumido)
      ============================================================ */}
      <section className="mt-16 text-xs leading-relaxed">
        <h3 className="font-bold text-center uppercase mb-2">Anexo “A”</h3>
        <p className="text-center font-semibold">Inventario de entrega</p>
        <ul className="list-disc list-inside pl-4">
          <li>Kilometraje inicial: _________ km</li>
          <li>Nivel de combustible (mín. ¼): _________</li>
          <li>Llave y control remoto, tarjeta de circulación, cables pasa
            corriente, gato, cruceta, antena, llanta de refacción, tapetes,
            extintor.</li>
        </ul>
        <p className="mt-4">
          Recibo de conformidad el {fSignature}.<br />
          Nombre: ______________________ Huella: __________ Firma: __________
        </p>
      </section>
    </div>
  );
});
ContractContent.displayName = "ContractContent";
