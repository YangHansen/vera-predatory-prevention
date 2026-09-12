import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { getPolicyById } from "@/lib/dummy-data";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = SessionStore.getSession(id);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Session not found" },
      { status: 404 }
    );
  }

  const policy = getPolicyById(session.policyId);

  return NextResponse.json({
    success: true,
    session,
    policy,
  });
}
