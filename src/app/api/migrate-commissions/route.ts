import { getAdminDb } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

const CARD_MSI_3_RATE = 0.09512;
const CARD_RATE = 0.0406;
const CARD_MSI_6_RATE = 0.12992;

export async function GET() {
  try {
    const db = getAdminDb();
    let batch = db.batch();
    let operationCount = 0;
    let totalUpdatedCount = 0;
    let totalAddedCommissions = 0;

    const commitBatchIfNeeded = async () => {
      if (operationCount >= 400) {
        await batch.commit();
        batch = db.batch();
        operationCount = 0;
      }
    };

    // 1. Migrate Sales
    const salesSnap = await db.collection('sales').get();
    for (const doc of salesSnap.docs) {
      const data = doc.data();
      let modified = false;
      const payments = data.payments || [];

      const newPayments = payments.map((p: any) => {
        if (p.method === 'Tarjeta MSI') {
          modified = true;
          return { ...p, method: 'Tarjeta 3 MSI' };
        }
        return p;
      });

      if (modified) {
        batch.update(doc.ref, { payments: newPayments });
        operationCount++;
        totalUpdatedCount++;
        await commitBatchIfNeeded();
      }

      for (const p of newPayments) {
        if (p.method === 'Tarjeta 3 MSI' || p.method === 'Tarjeta' || p.method === 'Tarjeta 6 MSI') {
          const commSnap = await db.collection('cashDrawerTransactions')
            .where('relatedId', '==', doc.id)
            .where('relatedType', '==', 'Venta')
            .where('paymentMethod', '==', p.method)
            .get();

          let rate = 0;
          if (p.method === 'Tarjeta 3 MSI') rate = CARD_MSI_3_RATE;
          else if (p.method === 'Tarjeta 6 MSI') rate = CARD_MSI_6_RATE;
          else if (p.method === 'Tarjeta') rate = CARD_RATE;

          if (commSnap.empty && rate > 0) {
            const commAmount = Math.round((p.amount || 0) * rate * 100) / 100;
            if (commAmount > 0) {
              const commRef = db.collection('cashDrawerTransactions').doc();
              batch.set(commRef, {
                date: data.saleDate || new Date().toISOString(),
                type: 'out', // Sales used 'out'
                amount: commAmount,
                concept: `Comisión Terminal (${p.method}) - Venta POS #${doc.id.slice(-6)}`,
                userId: data.registeredById || 'Sistema',
                userName: data.registeredByName || 'Sistema',
                relatedType: 'Venta',
                relatedId: doc.id,
                paymentMethod: p.method,
              });
              operationCount++;
              totalAddedCommissions++;
              await commitBatchIfNeeded();
            }
          }
        }
      }
    }

    // 2. Migrate Services
    const authSnap = await db.collection('serviceRecords').get();
    for (const doc of authSnap.docs) {
      const data = doc.data();
      let modified = false;
      const payments = data.payments || [];

      const newPayments = payments.map((p: any) => {
        if (p.method === 'Tarjeta MSI') {
          modified = true;
          return { ...p, method: 'Tarjeta 3 MSI' };
        }
        return p;
      });

      const updateData: any = {};
      if (modified) {
        updateData.payments = newPayments;
      }
      if (data.paymentMethod === 'Tarjeta MSI') {
        updateData.paymentMethod = 'Tarjeta 3 MSI';
        modified = true;
      }
      
      if (modified) {
        batch.update(doc.ref, updateData);
        operationCount++;
        totalUpdatedCount++;
        await commitBatchIfNeeded();
        
        const publicId = data.publicId || doc.id;
        const publicRef = db.collection('publicServices').doc(publicId);
        batch.update(publicRef, updateData);
        operationCount++;
        await commitBatchIfNeeded();
      }

      const isCompleted = data.status === 'Entregado';

      if (isCompleted) {
        let paymentMethodsToCheck = newPayments.length > 0 ? newPayments : [];
        if (paymentMethodsToCheck.length === 0 && (updateData.paymentMethod || data.paymentMethod)) {
            const methodToUse = updateData.paymentMethod || data.paymentMethod;
            paymentMethodsToCheck = [{ method: methodToUse, amount: data.totalCost || data.totalAmount || 0 }];
        }

        for (const p of paymentMethodsToCheck) {
          if (p.method === 'Tarjeta 3 MSI' || p.method === 'Tarjeta' || p.method === 'Tarjeta 6 MSI') {
            const commSnap = await db.collection('cashDrawerTransactions')
              .where('relatedId', '==', doc.id)
              .where('relatedType', '==', 'Servicio')
              .where('paymentMethod', '==', p.method)
              .get();

            let rate = 0;
            if (p.method === 'Tarjeta 3 MSI') rate = CARD_MSI_3_RATE;
            else if (p.method === 'Tarjeta 6 MSI') rate = CARD_MSI_6_RATE;
            else if (p.method === 'Tarjeta') rate = CARD_RATE;

            if (commSnap.empty && rate > 0) {
              const amountBase = Number(p.amount) > 0 ? Number(p.amount) : Number(data.totalCost || data.totalAmount || 0);
              const commAmount = Math.round(amountBase * rate * 100) / 100;
              if (commAmount > 0) {
                const commRef = db.collection('cashDrawerTransactions').doc();
                batch.set(commRef, {
                  date: data.deliveryDateTime || data.serviceDate || new Date().toISOString(),
                  type: 'Salida', // Services used 'Salida'
                  amount: commAmount,
                  concept: `Comisión Terminal (${p.method}) - Servicio #${data.folio || doc.id.slice(-6)}`,
                  userId: data.serviceAdvisorId || 'Sistema',
                  userName: data.serviceAdvisorName || 'Sistema',
                  relatedType: 'Servicio',
                  relatedId: doc.id,
                  paymentMethod: p.method,
                });
                operationCount++;
                totalAddedCommissions++;
                await commitBatchIfNeeded();
              }
            }
          }
        }
      }
    }

    const cashSnap = await db.collection('cashDrawerTransactions').where('paymentMethod', '==', 'Tarjeta MSI').get();
    for (const doc of cashSnap.docs) {
       batch.update(doc.ref, { paymentMethod: 'Tarjeta 3 MSI' });
       operationCount++;
       totalUpdatedCount++;
       await commitBatchIfNeeded();
    }

    if (operationCount > 0) {
        await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully', 
      updatedRecords: totalUpdatedCount,
      addedCommissions: totalAddedCommissions 
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
