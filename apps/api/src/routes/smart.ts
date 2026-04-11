import { Router } from "express";
import { ctx } from "../lib/context.js";

export const smartRouter = Router();

const WEB_URL = process.env["WEB_URL"] ?? "http://localhost:3000";

// Shared handler: fetch FHIR context, sync refs, create case, redirect to case detail.
async function handleSmartLaunch(
  iss: string | undefined,
  patient: string | undefined,
  res: import("express").Response,
  next: import("express").NextFunction
): Promise<void> {
  try {
    if (!iss || !patient) {
      res.status(400).json({ error: "Missing required query params: iss, patient" });
      return;
    }

    // Phase 3: exchange launch token for real SMART access token via PKCE.
    // For Phase 2, accept the mock FHIR server with a placeholder token.
    const accessToken = "mock-token";
    const tenantId    = "default";

    const { patientRef, coverageRefId, orderRefId, orderRef, coverageRef } =
      await ctx.ehrService.fetchAndSyncContext(tenantId, iss, accessToken, patient);

    const authCase = await ctx.caseService.createCase(tenantId, {
      patientRefId:  patientRef.id,
      coverageRefId: coverageRefId ?? "",
      orderRefId,
      serviceType:   orderRef?.serviceType ?? "Unknown",
      serviceCode:   orderRef?.serviceCode ?? undefined,
      priority:      "standard",
      payerName:     coverageRef?.payerName ?? "Unknown",
      createdBy:     "smart-launch",
    });

    res.redirect(`${WEB_URL}/cases/${authCase.id}`);
  } catch (err) {
    next(err);
  }
}

// GET /smart/launch/ehr?iss=&launch=&patient=
// EHR-embedded launch: EHR redirects here with iss + launch + patient context.
smartRouter.get("/launch/ehr", (req, res, next) => {
  const { iss, patient } = req.query as Record<string, string | undefined>;
  void handleSmartLaunch(iss, patient, res, next);
});

// GET /smart/launch/standalone?iss=&patient=
// Standalone launch: user opens app directly, provides iss + patient.
smartRouter.get("/launch/standalone", (req, res, next) => {
  const { iss, patient } = req.query as Record<string, string | undefined>;
  void handleSmartLaunch(iss, patient, res, next);
});
