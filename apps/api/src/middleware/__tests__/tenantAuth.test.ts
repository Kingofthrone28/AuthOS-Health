import type { NextFunction, Request, Response } from "express";
import { jest } from "@jest/globals";

jest.unstable_mockModule("jwks-rsa", () => ({ default: () => ({}) }));
const { signJwt, tenantAuth } = await import("../tenantAuth.js");

const JWT_SECRET = "unit-test-jwt-secret-that-is-long-enough";

function responseMock() {
  return {
    locals: {} as Record<string, unknown>,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("tenantAuth", () => {
  const originalSecret = process.env["JWT_SECRET"];

  beforeEach(() => {
    process.env["JWT_SECRET"] = JWT_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env["JWT_SECRET"];
    else process.env["JWT_SECRET"] = originalSecret;
  });

  it("rejects a tenant header without authenticated credentials", () => {
    const res = responseMock();
    const next = jest.fn() as unknown as jest.MockedFunction<NextFunction>;

    tenantAuth(
      { headers: { "x-tenant-id": "tenant-a" } } as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid bearer token and derives tenant context from claims", async () => {
    const res = responseMock();
    const next = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
    const token = signJwt({ sub: "user-a", tenantId: "tenant-a", role: "admin" });

    tenantAuth(
      { headers: { authorization: `Bearer ${token}` } } as unknown as Request,
      res,
      next,
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(res.locals).toMatchObject({ tenantId: "tenant-a", userId: "user-a", userRole: "admin" });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
