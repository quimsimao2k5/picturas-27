import { api } from "./axios";

export type PresetTool = {
  procedure: string;
  params: any;
};

export type UserPreset = {
  _id: string;
  owner_id: string;
  name: string;
  tools: PresetTool[];
  share?: { id?: string | null; revoked?: boolean };
  createdAt?: string;
  updatedAt?: string;
};

export type DefaultPreset = {
  id: string;
  name: string;
  tools: PresetTool[];
  isDefault: true;
};

export async function getPresets(args: { userId: string; token: string }) {
  const resp = await api.get<{ defaultPresets: DefaultPreset[]; userPresets: UserPreset[] }>(
    `/users/${args.userId}/presets`,
    { headers: { Authorization: `Bearer ${args.token}` } },
  );
  return resp.data;
}

export async function createPreset(args: {
  userId: string;
  token: string;
  name: string;
  tools: PresetTool[];
}) {
  const resp = await api.post<UserPreset>(
    `/users/${args.userId}/presets`,
    { name: args.name, tools: args.tools },
    { headers: { Authorization: `Bearer ${args.token}` } },
  );
  return resp.data;
}

export async function updatePreset(args: {
  userId: string;
  token: string;
  presetId: string;
  patch: Partial<{ name: string; tools: PresetTool[] }>;
}) {
  const resp = await api.patch<UserPreset>(
    `/users/${args.userId}/presets/${args.presetId}`,
    args.patch,
    { headers: { Authorization: `Bearer ${args.token}` } },
  );
  return resp.data;
}

export async function deletePreset(args: { userId: string; token: string; presetId: string }) {
  await api.delete(`/users/${args.userId}/presets/${args.presetId}`, {
    headers: { Authorization: `Bearer ${args.token}` },
  });
}

export async function sharePreset(args: { userId: string; token: string; presetId: string }) {
  const resp = await api.post<{ shareId: string }>(
    `/users/${args.userId}/presets/${args.presetId}/share`,
    {},
    { headers: { Authorization: `Bearer ${args.token}` } },
  );
  return resp.data;
}

export async function getSharedPreset(args: { shareId: string }) {
  const resp = await api.get<{ name: string; tools: PresetTool[]; shared: true }>(
    `/users/presets/share/${args.shareId}`,
  );
  return resp.data;
}
