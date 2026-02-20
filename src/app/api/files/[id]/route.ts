import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Serve a file from the database by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const file = await prisma.fileUpload.findUnique({
      where: { id: params.id },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": file.data.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
