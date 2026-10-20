// lib/users.ts
import { api } from "./axios";

export const deleteAccount = async (uid: string, token: string) => {
  const resp = await api.delete(`/users/${uid}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (resp.status !== 204) {
    throw new Error("Failed to delete account");
  }
};
