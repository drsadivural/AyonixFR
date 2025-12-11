import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("enrollees", () => {
  it("should list all enrollees", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.enrollees.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("should search enrollees by query", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.enrollees.search({ query: "test" });

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("analytics", () => {
  it("should return enrollment stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.enrollmentStats();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("thisMonth");
    expect(result).toHaveProperty("thisWeek");
  });

  it("should return verification stats", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.analytics.verificationStats();

    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("matches");
    expect(result).toHaveProperty("noMatches");
    expect(result).toHaveProperty("successRate");
  });
});

describe("settings", () => {
  it("should get user settings with defaults", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.get();

    expect(result).toHaveProperty("llmProvider");
    expect(result).toHaveProperty("voiceLanguage");
    expect(result).toHaveProperty("matchThreshold");
    expect(result.matchThreshold).toBeGreaterThanOrEqual(0);
    expect(result.matchThreshold).toBeLessThanOrEqual(100);
  });

  it("should update settings", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.update({
      matchThreshold: 80,
      voiceLanguage: "ja",
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
  });
});

describe("events", () => {
  it("should list events", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.events.list({});

    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter events by type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.events.list({
      eventType: "enrollment",
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
