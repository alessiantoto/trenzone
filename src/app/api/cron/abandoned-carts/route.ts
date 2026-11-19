import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/app/actions/admin-auth";
import { executeAbandonedCartsRecovery } from "@/lib/abandoned-carts-runner";

export const maxDuration = 60;

async function runAffiliateAutoApprovalsSafe() {
  try {
    const { processDueAffiliateAutoApprovals } = await import("@/lib/affiliate-auto-approve");
    return await processDueAffiliateAutoApprovals({ maxBatch: 25 });
  } catch (autoErr: any) {
    console.error("[CRON ABANDONED-CARTS] Affiliate auto-approvals error:", autoErr);
    return { error: autoErr?.message || String(autoErr) };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [recoveryResult, affiliateAutoApprovals] = await Promise.all([
      executeAbandonedCartsRecovery(),
      runAffiliateAutoApprovalsSafe(),
    ]);

    return NextResponse.json({
      ...recoveryResult,
      affiliateAutoApprovals,
    });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
