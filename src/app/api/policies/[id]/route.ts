import { NextRequest, NextResponse } from "next/server";
import { getPolicyById } from "@/lib/dummy-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const policy = getPolicyById(id);

  if (!policy) {
    return NextResponse.json(
      { success: false, error: "Policy not found in catalog" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    policy,
  });
}
