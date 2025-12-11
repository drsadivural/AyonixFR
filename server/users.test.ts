import { describe, it, expect, vi, beforeEach } from "vitest";
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
        { id: 2, name: "Regular User", email: "user@test.com", role: "user", createdAt: Date.now() },
        { id: 3, name: "Another User", email: "user2@test.com", role: "user", createdAt: Date.now() },
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

    it("should deny regular users from listing users", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 2,
          openId: "user-123",
          name: "Regular User",
          email: "user@test.com",
          role: "user",
          createdAt: Date.now(),
        },
      });

      await expect(caller.users.list()).rejects.toThrow("You do not have permission to view users");
      expect(db.getAllUsers).not.toHaveBeenCalled();
    });
  });

  describe("updateRole", () => {
    it("should allow admin to update user role to admin", async () => {
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

      await caller.users.updateRole({
        userId: 2,
        role: "admin",
      });

      expect(db.updateUserRole).toHaveBeenCalledWith(2, "admin");
    });

    it("should allow admin to update user role to user", async () => {
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

      await caller.users.updateRole({
        userId: 2,
        role: "user",
      });

      expect(db.updateUserRole).toHaveBeenCalledWith(2, "user");
    });

    it("should deny regular users from updating roles", async () => {
      const caller = appRouter.createCaller({
        user: {
          id: 2,
          openId: "user-123",
          name: "Regular User",
          email: "user@test.com",
          role: "user",
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
  });
});
