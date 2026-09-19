import { NextRequest, NextResponse } from "next/server";
import { AgentStore } from "@/lib/agent-store";

export async function GET() {
  const agents = AgentStore.listAgents();
  return NextResponse.json({
    success: true,
    count: agents.length,
    agents,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, repNumber, email, phone, agencyFirm, role } = body;

    if (!fullName || !repNumber || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fullName, repNumber (MAS Rep ID), and corporate email are required.",
        },
        { status: 400 }
      );
    }

    const result = AgentStore.createAgent({
      fullName,
      repNumber,
      email,
      phone,
      agencyFirm,
      role,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to create agent account",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Financial adviser account provisioned successfully.",
        agent: result.agent,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to provision agent:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during agent provisioning",
      },
      { status: 500 }
    );
  }
}
