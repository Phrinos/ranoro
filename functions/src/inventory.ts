
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// No inicializar 'db' aquí. Se accederá a través de admin.firestore() directamente
// para asegurar que la app de Firebase ya esté inicializada desde index.ts.

/**
 * Revisa si un usuario tiene privilegios de administrador basado en sus custom claims.
 * @param {string} uid El ID del usuario.
 * @returns {Promise<boolean>} True si el usuario es admin, de lo contrario false.
 */
const isAdmin = async (uid: string): Promise<boolean> => {
  try {
    const user = await admin.auth().getUser(uid);
    return user.customClaims?.role === "admin";
  } catch (error) {
    logger.error(`[Auth] Error revisando el estado de admin para UID: ${uid}`, error);
    return false;
  }
};

/**
 * Registra la salida de inventario cuando un servicio se marca como "entregado".
 */
export const onStockExit = onDocumentUpdated("serviceRecords/{serviceId}", async (event) => {
  const db = admin.firestore(); // Obtener la instancia de db aquí
  const serviceId = event.params.serviceId;
  const dataBefore = event.data?.before.data();
  const dataAfter = event.data?.after.data();

  if (!dataBefore || !dataAfter) {
    logger.info(`[Inventory] No se encontraron datos para el servicio ${serviceId}. Saliendo.`);
    return;
  }

  if (dataAfter.status !== "entregado" || dataBefore.status === "entregado") {
    logger.info(`[Inventory] El estado del servicio ${serviceId} no cambió a 'entregado'. No se toma acción.`);
    return;
  }

  const items = dataAfter.items;
  if (!items || items.length === 0) {
    logger.info(`[Inventory] El servicio ${serviceId} no tiene items para procesar. Saliendo.`);
    return;
  }

  logger.info(`[Inventory] Procesando salida de stock para servicio ${serviceId}. Se encontraron ${items.length} items.`);

  try {
    await db.runTransaction(async (transaction) => {
      for (const item of items) {
        if (!item.id || !item.quantity || item.quantity <= 0) {
          logger.warn(`[Inventory] Servicio ${serviceId}: Datos de item inválidos, omitiendo.`, item);
          continue;
        }

        const inventoryItemRef = db.collection("inventoryItems").doc(item.id);
        const movementRef = db.collection("inventoryMovements").doc();

        transaction.set(movementRef, {
          itemId: item.id,
          serviceId: serviceId,
          folio: dataAfter.folio || null,
          type: "sale",
          quantityChanged: -item.quantity,
          date: admin.firestore.FieldValue.serverTimestamp(),
          itemName: item.name || "N/A",
          itemSku: item.sku || "N/A",
        });

        transaction.update(inventoryItemRef, {
          stock: admin.firestore.FieldValue.increment(-item.quantity),
        });
      }
    });
    logger.info(`[Inventory] Salida de stock para el servicio ${serviceId} procesada exitosamente.`);
  } catch (error) {    
    logger.error(`[Inventory] Falló la transacción para el servicio ${serviceId}:`, error);
  }
});

/**
 * Lógica centralizada para incrementar el stock. Reutilizable para creación y actualización.
 * @param {FirebaseFirestore.DocumentSnapshot} purchaseSnap El snapshot del documento de la compra.
 * @param {string} purchaseId El ID de la compra.
 */
const processStockEntry = async (purchaseSnap: FirebaseFirestore.DocumentSnapshot, purchaseId: string) => {
  const db = admin.firestore(); // Obtener la instancia de db aquí
  const purchaseData = purchaseSnap.data();
  if (!purchaseData) {
    logger.info(`[Inventory] No hay datos en el snapshot de la compra ${purchaseId}.`);
    return;
  }

  const items = purchaseData.items;
  if (!items || items.length === 0) {
    logger.info(`[Inventory] La compra ${purchaseId} no tiene items para procesar.`);
    return;
  }

  logger.info(`[Inventory] Procesando entrada de stock para la compra ${purchaseId}. Se encontraron ${items.length} items.`);
  
  try {
    await db.runTransaction(async (transaction) => {
      for (const item of items) {
        if (!item.id || !item.quantity || item.quantity <= 0) {
          logger.warn(`[Inventory] Compra ${purchaseId}: Datos de item inválidos, omitiendo.`, item);
          continue;
        }
        const inventoryItemRef = db.collection("inventoryItems").doc(item.id);
        const movementRef = db.collection("inventoryMovements").doc();

        transaction.set(movementRef, {
          itemId: item.id,
          purchaseId: purchaseId,
          type: "purchase",
          quantityChanged: item.quantity,
          date: admin.firestore.FieldValue.serverTimestamp(),
          itemName: item.name || "N/A",
          itemSku: item.sku || "N/A",
        });
        transaction.update(inventoryItemRef, {
          stock: admin.firestore.FieldValue.increment(item.quantity),
        });
      }
    });
    logger.info(`[Inventory] Entrada de stock para la compra ${purchaseId} procesada exitosamente.`);
  } catch (error) {
    logger.error(`[Inventory] Falló la transacción para la compra ${purchaseId}:`, error);
  }
};

/**
 * Registra la entrada de inventario cuando se CREA una nueva compra ya finalizada.
 */
export const onPurchaseCreated = onDocumentCreated("purchases/{purchaseId}", async (event) => {
  const eventData = event.data;
  if (!eventData) {
    return;
  }

  const purchaseData = eventData.data();
  if (purchaseData?.status === 'completado') {
    logger.info(`[Inventory] Compra ${event.params.purchaseId} creada como 'completado'.`);
    await processStockEntry(eventData, event.params.purchaseId);
  }
});

/**
 * Registra la entrada de inventario cuando una compra se ACTUALIZA a un estado finalizado.
 */
export const onPurchaseUpdated = onDocumentUpdated("purchases/{purchaseId}", async (event) => {
  if (!event.data) {
    return;
  }

  const dataBefore = event.data.before.data();
  const dataAfter = event.data.after.data();
  
  if (dataAfter?.status === 'completado' && dataBefore?.status !== 'completado') {
    logger.info(`[Inventory] Compra ${event.params.purchaseId} actualizada a 'completado'.`);
    await processStockEntry(event.data.after, event.params.purchaseId);
  }
});

/**
 * Permite a un administrador ajustar manualmente el stock de un item.
 */
export const adjustStock = onCall(async (request) => {
  const db = admin.firestore(); // Obtener la instancia de db aquí
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para realizar esta acción.");
  }
  
  const isUserAdmin = await isAdmin(auth.uid);
  if (!isUserAdmin) {
    throw new HttpsError("permission-denied", "No tienes permisos de administrador.");
  }

  const { itemId, newQuantity, reason } = request.data;
  if (!itemId || typeof newQuantity !== 'number' || newQuantity < 0 || !reason) {
    throw new HttpsError("invalid-argument", "Faltan o son inválidos los parámetros (itemId, newQuantity, reason).");
  }

  logger.info(`[Inventory] Admin ${auth.uid} está ajustando el stock para el item ${itemId}.`);

  const inventoryItemRef = db.collection("inventoryItems").doc(itemId);
  const movementRef = db.collection("inventoryMovements").doc();

  try {
    await db.runTransaction(async (transaction) => {
      const itemDoc = await transaction.get(inventoryItemRef);
      if (!itemDoc.exists) {
        throw new HttpsError("not-found", `El item con ID ${itemId} no existe.`);
      }

      const currentStock = itemDoc.data()?.stock || 0;
      const quantityChanged = newQuantity - currentStock;

      if (quantityChanged === 0) return;
      
      transaction.set(movementRef, {
        itemId: itemId,
        type: "adjustment",
        quantityChanged: quantityChanged,
        reason: reason,
        previousStock: currentStock,
        newStock: newQuantity,
        date: admin.firestore.FieldValue.serverTimestamp(),
        adminId: auth.uid,
        itemName: itemDoc.data()?.name || "N/A",
        itemSku: itemDoc.data()?.sku || "N/A",
      });

      transaction.update(inventoryItemRef, { stock: newQuantity });
    });

    logger.info(`[Inventory] Stock para el item ${itemId} ajustado exitosamente a ${newQuantity}.`);
    return { success: true, message: "Inventario ajustado correctamente." };

  } catch (error) {
    logger.error(`[Inventory] Falló el ajuste de stock para el item ${itemId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ocurrió un error al ajustar el inventario.");
  }
});
