export const HEADER_LEFT = "Grupo Casa de Nobles Valdelamar S.A. de C.V.";
export const HEADER_RIGHT = "AGS Arrendamiento de Vehículos V1.0";

export const DECLARACIONES = [
  "I. El ARRENDADOR declara, a través de su administrador único:",
  "a) Ser una persona moral mexicana con plena capacidad legal para celebrar este contrato.",
  "b) Que su representante legal cuenta con las facultades necesarias para obligar a su representada en los términos de este documento.",
  "c) Que se encuentra al corriente de sus obligaciones fiscales y cuenta con la infraestructura para cumplir con el objeto de este contrato.",
  "d) Que cuenta con las licencias y permisos requeridos para la operación de su negocio de arrendamiento de vehículos.",
  "e) Que es propietario legal del VEHÍCULO descrito en la hoja de firmas de este contrato, libre de todo gravamen o limitación de dominio.",
  "",
  "II. El ARRENDATARIO establecido en la hoja de firmas declara:",
  "a) Que cuenta con la capacidad financiera y legal para obligarse en los términos de este contrato.",
  "b) Que es su deseo tomar en arrendamiento el VEHÍCULO para su uso personal y/o comercial, conforme a lo estipulado.",
  "c) Que cuenta con licencia de conducir vigente otorgada por las autoridades competentes, la cual lo acredita para operar el VEHÍCULO.",
  "d) Que se compromete a respetar en todo momento los Reglamentos y Leyes de Tránsito aplicables en el territorio donde circule.",
  "",
  "III. LAS PARTES declaran conjuntamente que:",
  "a) Se reconocen recíprocamente las facultades con las que comparecen a la celebración de este contrato y manifiestan su voluntad de obligarse al tenor de las siguientes cláusulas.",
];

export const CLAUSULAS = [
  "PRIMERA. Objeto. De conformidad con los términos de este contrato, el ARRENDADOR otorga en arrendamiento al ARRENDATARIO el uso y goce temporal del VEHÍCULO descrito.",
  "SEGUNDA. Plazo del arrendamiento. La vigencia del presente contrato iniciará en la fecha de inicio estipulada y concluirá en la fecha de término, pudiendo ser renovado por acuerdo mutuo.",
  "TERCERA. Uso del vehículo. El ARRENDATARIO destinará el VEHÍCULO exclusivamente para transporte particular y/o comercial lícito, comprometiéndose a no subarrendarlo, ceder sus derechos, o permitir que sea operado por personas no autorizadas.",
  "CUARTA. Obligaciones. El ARRENDATARIO se obliga a: a) Pagar puntualmente la renta diaria estipulada. b) Conservar el vehículo en el estado en que lo recibe. c) Cubrir los gastos de combustible. d) No sobrecargar el vehículo. e) Respetar las leyes de tránsito. f) No transportar sustancias ilegales. g) Reportar cualquier siniestro inmediatamente. h) No realizar modificaciones al vehículo. i) Permitir inspecciones periódicas. j) No retirar el vehículo del territorio nacional sin autorización. k) Devolver el vehículo en la fecha y lugar pactados.",
  "QUINTA. Entrega del vehículo. El ARRENDADOR entrega el VEHÍCULO en perfectas condiciones de funcionamiento y seguridad, con el equipo descrito en el Anexo 'A'.",
  "SEXTA. Recepción del vehículo. A la terminación del contrato, el ARRENDATARIO devolverá el vehículo en las mismas condiciones, salvo el desgaste natural por el uso.",
  "SÉPTIMA. Costo del arrendamiento. El ARRENDATARIO pagará la renta diaria acordada. La falta de pago oportuno generará un interés moratorio del 5% mensual.",
  "OCTAVA. Seguro del vehículo. El VEHÍCULO cuenta con una póliza de seguro de cobertura amplia. El ARRENDATARIO será responsable del pago del deducible en caso de siniestro.",
  "NOVENA. Depósito en garantía. El ARRENDATARIO entrega un depósito en garantía para cubrir posibles daños, multas o rentas no pagadas, el cual será devuelto al finalizar el contrato si no existen adeudos.",
  "DÉCIMA. Inexistencia de Relación Laboral. Este contrato es de naturaleza mercantil, por lo que no crea ninguna relación de trabajo entre las partes.",
  "DÉCIMA PRIMERA. Revisiones y Reparaciones. El ARRENDADOR es responsable de los mantenimientos preventivos. Las reparaciones por mal uso serán cubiertas por el ARRENDATARIO.",
  "DÉCIMO SEGUNDA. Terminación. El contrato podrá darse por terminado anticipadamente por incumplimiento de cualquiera de las partes.",
  "DÉCIMO TERCERA. Caso Fortuito y Fuerza Mayor. Ninguna de las partes será responsable por el incumplimiento de sus obligaciones si éste se debe a un caso fortuito o de fuerza mayor.",
];

export const ANEXO_A_LABELS = [
  "Refacción", "Gato", "Cruceta",
  "Tapetes Interiores uso rudo",
  "Tapete de Cajuela",
  "Cables pasa corriente",
  "Antena",
];

export const PAGARE_TEXT = (lugar: string, fecha: string, amountMXN: string) => [
  `PAGARÉ   No. 1 de 1        BUENO POR: ${amountMXN}`,
  "",
  `En ${lugar} ${fecha}.`,
  "",
  `Debo y pagaré incondicionalmente por este Pagaré a la orden de ${HEADER_LEFT}, en`,
  `${lugar}, el día ${fecha} la cantidad de ${amountMXN}.`,
  "",
  "Valor recibido a mí entera satisfacción. Este pagaré forma parte de una serie numerada del 1 al 1 y está sujeto a la condición de que, al no ser pagado a su vencimiento, serán exigibles todos los de la serie que le sigan en número, además de los ya vencidos.",
  "Desde la fecha de vencimiento hasta el día de su liquidación, este pagaré causará intereses moratorios al tipo del 5% mensual, pagaderos en esta ciudad juntamente con el principal.",
  "En caso de controversia, las partes se someten expresamente a la jurisdicción de los tribunales competentes de la ciudad de Aguascalientes, renunciando a cualquier otro fuero que pudiera corresponderles.",
  "ACEPTO",
];
