// Gives the admin's browser a short-lived token to upload an edition image straight to Vercel Blob
// (see PLAN.md "Images"). The token only allows images up to 5 MB.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return Response.json({ error: "Permintaan unggah tidak valid." }, { status: 400 });

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        maximumSizeInBytes: 5 * 1024 * 1024,
        addRandomSuffix: true, // two files with the same name don't overwrite each other
      }),
    });
    return Response.json(result);
  } catch (e) {
    console.error("Blob upload token failed", e);
    return Response.json({ error: "Gagal menyiapkan unggahan gambar." }, { status: 500 });
  }
}
