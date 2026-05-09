import { fetcher } from "@/lib/api";

export interface Notification {
  id: number;
  store_id: number;
  user_id: number | null;
  title: string;
  message: string;
  type: string;
  link: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    return fetcher("/notifications/");
  },

  markAsRead: async (id: number): Promise<Notification> => {
    return fetcher(`/notifications/${id}/mark-read/`, {
      method: "PATCH",
    });
  },

  markAllAsRead: async (): Promise<void> => {
    return fetcher("/notifications/mark-all-read/", {
      method: "POST",
    });
  },
};
