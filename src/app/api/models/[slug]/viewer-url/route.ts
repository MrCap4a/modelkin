import { NextResponse } from "next/server";
import { getModelViewerSource } from "@modules/models";
import { withApiHandler } from "@shared/http";

/**
 * Unauthenticated on purpose: rotating/zooming a 3D preview is allowed for
 * any visitor, including guests (ТЗ §18) — only the actual purchasable file
 * download is ownership-gated (that's `@modules/downloads`, a separate
 * flow). Only resolves for PUBLISHED models with an STL file attached.
 */
export const GET = withApiHandler(async (_request, context) => {
  const { slug } = await context.params;
  const source = slug ? await getModelViewerSource(slug) : null;

  if (!source) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "3D-модель недоступна" } },
      { status: 404 },
    );
  }

  return NextResponse.json(source);
});
