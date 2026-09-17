import { NextResponse } from "next/server";
import { listPolicies } from "@/lib/dummy-data";

export async function GET() {
  const policies = listPolicies();
  return NextResponse.json({
    success: true,
    count: policies.length,
    policies,
  });
}
