import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// Mock the database functions
vi.mock("./db", () => ({
  getAllUsers: vi.fn(),
  updateUserRole: vi.fn(),
}));

describe("Users Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should allow admin to list all users", async () => {
      const mockUsers = [
        { id: 1, name: "Admin User", email: "admin@test.com", role: "admin", createdAt: Date.now() },
        { id: 2, name: "Operator User", email: "operator@test.com", role: "operator", createdAt: Date.now() },
        { id: 3, name: "Viewer User", email: "viewer@test.com", role: "viewer", createdAt: Date.now() },
      ];

      vi.mocked(db.getAllUsers).mockResolvedValue(mockUsers as any);

      const caller = appRouter.createCaller({
        user: {
          id: 1,
          openId: "admin-123",
          name: "Admin User",
          email: "admin@test.com",
          role: "admin",
          createdAt: Date.now(),
        },
      });

      const result = await caller.users.list();

      expect(result).toEqual(mockUsers);
      expect(db.getAllUsers).toHaveBeenCalledOnce();
    });

    it("should deny non-admin users from listing users", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 2,
          openId: "operator-123",
          name: "Operator User",
          email: "operator@test.com",
          role: "operator",
          createdAt: Date.now(),
        },
      });

      await expect(caller.users.list()).rejects.toThrow("You do not have permission to view users");
      expect(db.getAllUsers).not.toHaveBeenCalled();
    });

    it("should deny viewer from listing users", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 3,
          openId: "viewer-123",
          name: "Viewer User",
          email: "viewer@test.com",
          role: "viewer",
          createdAt: Date.now(),
        },
      });

      await expect(caller.users.list()).rejects.toThrow("You do not have permission to view users");
      expect(db.getAllUsers).not.toHaveBeenCalled();
    });
  });

  describe("updateRole", () => {
    it("should allow admin to update user role", async () => {
      vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

      const caller = appRouter.createCaller({
        user: {
          id: 1,
          openId: "admin-123",
          name: "Admin User",
          email: "admin@test.com",
          role: "admin",
          createdAt: Date.now(),
        },
      });

      const result = await caller.users.updateRole({
        userId: 2,
        role: "operator",
      });

      expect(result).toEqual({ success: true });
      expect(db.updateUserRole).toHaveBeenCalledWith(2, "operator");
    });

    it("should allow admin to change role to viewer", async () => {
      vi.mocked(db.updateUserRole).mockResolvedValue(undefined);

      const caller = appRouter.createCaller({
        user: {
          id: 1,
          openId: "admin-123",
          name: "Admin User",
          email: "admin@test.com",
          role: "admin",
          createdAt: Date.now(),
        },
      });

      const result = await caller.users.updateRole({
        userId: 3,
        role: "viewer",
      });

      expect(result).toEqual({ success: true });
      expect(db.updateUserRole).toHaveBeenCalledWith(3, "viewer");
    });

    it("should deny non-admin users from updating roles", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 2,
          openId: "operator-123",
          name: "Operator User",
          email: "operator@test.com",
          role: "operator",
          createdAt: Date.now(),
        },
      });

      await expect(
        caller.users.updateRole({
          userId: 3,
          role: "admin",
        })
      ).rejects.toThrow("You do not have permission to change user roles");

      expect(db.updateUserRole).not.toHaveBeenCalled();
    });

    it("should deny viewer from updating roles", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 3,
          openId: "viewer-123",
          name: "Viewer User",
          email: "viewer@test.com",
          role: "viewer",
          createdAt: Date.now(),
        },
      });

      await expect(
        caller.users.updateRole({
          userId: 2,
          role: "admin",
        })
      ).rejects.toThrow("You do not have permission to change user roles");

      expect(db.updateUserRole).not.toHaveBeenCalled();
    });
  });
});
