import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/session-store";
import { SessionStatus } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: SessionStatus };

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status field is required" },
        { status: 400 }
      );
    }

    const updated = SessionStore.updateSessionStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error) {
    console.error("Failed to update status:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
