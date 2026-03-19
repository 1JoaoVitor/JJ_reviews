import { beforeEach, describe, expect, it, vi } from "vitest";

const {
   fromMock,
   selectMock,
   eqMock,
   orderMock,
   limitMock,
   updateMock,
   channelMock,
   onMock,
   subscribeMock,
   removeChannelMock,
} = vi.hoisted(() => ({
   fromMock: vi.fn(),
   selectMock: vi.fn(),
   eqMock: vi.fn(),
   orderMock: vi.fn(),
   limitMock: vi.fn(),
   updateMock: vi.fn(),
   channelMock: vi.fn(),
   onMock: vi.fn(),
   subscribeMock: vi.fn(),
   removeChannelMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
   supabase: {
      from: fromMock,
      channel: channelMock,
      removeChannel: removeChannelMock,
   },
}));

import {
   fetchRecentNotifications,
   markNotificationAsRead,
   subscribeNotifications,
} from "../notificationsService";

describe("notificationsService", () => {
   beforeEach(() => {
      vi.clearAllMocks();

      selectMock.mockReturnValue({ eq: eqMock });
      eqMock.mockReturnValue({ order: orderMock, eq: eqMock });
      orderMock.mockReturnValue({ limit: limitMock });
      updateMock.mockReturnValue({ eq: eqMock });

      onMock.mockReturnThis();
      subscribeMock.mockReturnValue({ id: "notif-channel" });
      channelMock.mockReturnValue({ on: onMock, subscribe: subscribeMock });

      fromMock.mockReturnValue({
         select: selectMock,
         update: updateMock,
      });
   });

   it("fetches recent notifications", async () => {
      limitMock.mockResolvedValue({ data: [{ id: "n1" }], error: null });
      const result = await fetchRecentNotifications("u1");
      expect(result).toEqual([{ id: "n1" }]);
   });

   it("marks a notification as read", async () => {
      eqMock.mockResolvedValue({ error: null });
      await expect(markNotificationAsRead("n1")).resolves.toBeUndefined();
   });

   it("subscribes and unsubscribes notification channel", () => {
      const unsubscribe = subscribeNotifications("u1", vi.fn());
      expect(channelMock).toHaveBeenCalledWith("realtime:notifications");
      unsubscribe();
      expect(removeChannelMock).toHaveBeenCalledWith({ id: "notif-channel" });
   });
});
