import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-side proxy for AWS S3 direct upload.
 * Avoids browser CORS issues when AWS S3 bucket does not have CORS enabled for the client origin.
 */
export async function PUT(req: NextRequest) {
  try {
    const uploadUrl =
      req.headers.get('x-s3-upload-url') || req.nextUrl.searchParams.get('url');

    if (!uploadUrl) {
      return NextResponse.json(
        { success: false, message: 'URL tujuan unggah (x-s3-upload-url) tidak ditemukan.' },
        { status: 400 }
      );
    }

    const contentType = req.headers.get('content-type') || 'application/octet-stream';
    const bodyBuffer = await req.arrayBuffer();

    // Server-to-server PUT to AWS S3 without browser CORS constraints
    const s3Response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: Buffer.from(bodyBuffer),
    });

    if (!s3Response.ok) {
      const errorText = await s3Response.text().catch(() => '');
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengunggah ke storage S3 via proxy (Status: ${s3Response.status})`,
          detail: errorText,
        },
        { status: s3Response.status }
      );
    }

    return new NextResponse(null, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan internal pada server proxy upload.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-s3-upload-url',
    },
  });
}
