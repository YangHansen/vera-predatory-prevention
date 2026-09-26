import { NextRequest, NextResponse } from "next/server";
import { AgentStore } from "@/lib/agent-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = AgentStore.getAgent(id);

  if (!agent) {
    return NextResponse.json(
      { success: false, error: "Advisor account not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    agent,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const agent = AgentStore.getAgent(id);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: "Advisor account not found" },
        { status: 404 }
      );
    }

    const updated = AgentStore.updateAgent(id, body);

    return NextResponse.json({
      success: true,
      agent: updated,
    });
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update agent profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (id === "agt_andi_01" || id === "agt_sarah_02" || id === "agt_marcus_03") {
    return NextResponse.json(
      { success: false, error: "Cannot delete core default representative accounts" },
      { status: 400 }
    );
  }
  const deleted = AgentStore.deleteAgent(id);
  return NextResponse.json({ success: deleted });
}
