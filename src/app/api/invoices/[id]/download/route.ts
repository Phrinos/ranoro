import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin';
import Facturapi from 'facturapi';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const type = req.nextUrl.searchParams.get('type') || 'pdf'; // 'pdf' | 'xml' | 'zip'

    // Si es mock
    if (id.startsWith('mock_inv_')) {
      if (type === 'pdf') {
        return NextResponse.redirect('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
      }
      return new NextResponse('<xml>Mock Factura</xml>', {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="factura_${id}.xml"`,
        },
      });
    }

    const db = getAdminDb();
    const configSnap = await db.collection('settings').doc('billing').get();
    const billingConfig = configSnap.exists ? configSnap.data() as any : {};
    const apiKey = (billingConfig.liveSecretKey || billingConfig.testSecretKey || '').trim();

    if (!apiKey) {
      return new NextResponse('Facturapi no configurado', { status: 400 });
    }

    const facturapi = new Facturapi(apiKey);

    let stream: any;
    let contentType = '';
    let ext = '';

    if (type === 'xml') {
      stream = await facturapi.invoices.downloadXml(id);
      contentType = 'application/xml';
      ext = 'xml';
    } else if (type === 'zip') {
      stream = await facturapi.invoices.downloadZip(id);
      contentType = 'application/zip';
      ext = 'zip';
    } else {
      stream = await facturapi.invoices.downloadPdf(id);
      contentType = 'application/pdf';
      ext = 'pdf';
    }

    // Retornamos el stream directo al cliente
    const response = new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="factura_${id}.${ext}"`,
      },
    });
    return response;
  } catch (error: any) {
    console.error('Error downloading invoice:', error);
    return new NextResponse(error.message || 'Error descargando la factura', { status: 500 });
  }
}
