import { api } from "./axios";
import axios from "axios";
import JSZip from "jszip";
import { ToolNames, ToolParams } from "./tool-types";
import { PDFDocument } from "pdf-lib";

function buildQuery(params: { ownerId?: string; shareId?: string }) {
  if (!params.shareId) return "";          // <-- chave
  const search = new URLSearchParams();
  if (params.ownerId) search.set("owner", params.ownerId);
  search.set("share", params.shareId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function pathUidFor(uid: string, ownerId?: string, shareId?: string) {
  if (shareId && !ownerId) throw new Error("ownerId required for shared access");
  return shareId ? ownerId! : uid;
}

export interface Project {
  _id: string;
  user_id: string;
  name: string;
  version: number;
}

export interface SingleProject {
  _id: string;
  user_id: string;
  name: string;
  tools: ProjectToolResponse[];
  imgs: ProjectImage[];
  version: number;

}
export interface ProjectImage {
  _id: string;
  name: string;
  url: string;
}

export interface ProjectImageText {
  _id: string;
  name: string;
  text: string;
}

export interface ProjectTool {
  _id?: string;
  position: number;
  procedure: ToolNames;
  params: ToolParams;
}

export interface ProjectToolResponse extends Omit<ProjectTool, "_id"> {
  _id: string;
}

export interface SharedProject extends SingleProject {
  permission: "read" | "edit";
}

export type ShareLink = {
  id: string;
  permission: "read" | "edit";
  createdAt: string;
  revoked: boolean;
};

export type AssistantSuggestion = {
  name: string;
  description: string;
  tools: Array<{
    procedure: ToolNames;
    params: ToolParams;
  }>;
  previewUrl?: string | null;
 previewKey?: string | null;
};

export const listProjectShareLinks = async (
  userId: string,
  projectId: string,
  token: string,
): Promise<ShareLink[]> => {
  const resp = await api.get(`/projects/${userId}/${projectId}/share`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return resp.data;
};

export const createProjectShareLink = async (params: {
  userId: string;
  projectId: string;
  permission: "read" | "edit";
  token: string;
  projectVersion: number;
}) => {
  const { userId, projectId, permission, token, projectVersion } = params;

  const resp = await api.post(
    `/projects/${userId}/${projectId}/share`,
    { permission },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    }
  );

  return {
    data: resp.data,
    newVersionHeader: resp.headers["x-project-version"],
  };
};

export const revokeShareLink = async (params: {
  userId: string;
  projectId: string;
  shareId: string;
  token: string;
  projectVersion: number;
}) => {
  const { userId, projectId, shareId, token, projectVersion } = params;

  const resp = await api.delete(`/projects/${userId}/${projectId}/share/${shareId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Project-Version": String(projectVersion),
    },
  });

  return { newVersionHeader: resp.headers["x-project-version"] };
};


export const resolveShareLink = async (shareId: string) => {
  const resp = await api.get(`/projects/share/${shareId}`);
  return resp.data as {
    projectId: string;
    ownerId: string;
    permission: "read" | "edit";
    projectName?: string;
    
  };
};

export const fetchSharedProject = async (shareId: string, token: string) => {
  const response = await api.get<SharedProject>(
    `/projects/share/${shareId}/project`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (response.status !== 200 || !response.data) {
    throw new Error("Failed to fetch shared project");
  }

  return response.data;
};


export const fetchProjects = async (uid: string, token: string) => {
    if (!uid || !token) return []; // evita /projects/ sem uid

    const response = await api.get<Project[]>(`/projects/${uid}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to fetch projects");

  return response.data.map((p) => ({
    _id: p._id,
    user_id: uid,
    name: p.name,
    version: p.version, 
  })) as Project[];
};

export const fetchProject = async (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,        
) => {
  const query = buildQuery({ ownerId, shareId });
   // Se for share, o path tem de usar o ownerId
  const pathUid = shareId ? (ownerId ?? uid) : uid;   
  const response = await api.get<SingleProject>(
    `/projects/${pathUid}/${pid}${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to fetch project");

  return {
    _id: response.data._id,
    user_id: response.data.user_id,
    name: response.data.name,
    imgs: response.data.imgs,
    tools: response.data.tools,
    version: response.data.version,
  } as SingleProject;
};

export const addProject = async ({
  uid,
  token,
  name,
  images = [],
}: {
  uid: string;
  token: string;
  name: string;
  images?: File[];
}) => {
  const response = await api.post<SingleProject>(
    `/projects/${uid}`,
    { name },
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (response.status !== 201 || !response.data)
    throw new Error("Failed to create project");

  const project = response.data;

  if (images.length > 0) {
    await addProjectImages({
      uid,
      pid: project._id,
      token,
      images,
      projectVersion: project.version,
    });
  }

  return project;
};

export const deleteProject = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  projectVersion,
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });

  const response = await api.delete(`/projects/${uid}/${pid}${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Project-Version": String(projectVersion),
    },
  });

  if (response.status !== 204) throw new Error("Failed to delete project");

  return response.headers?.["x-project-version"];
};


export const updateProject = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  name,
  projectVersion,
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
  name: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });

  const response = await api.put(
    `/projects/${uid}/${pid}${query}`,
    { name },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    },
  );

  if (response.status !== 204) throw new Error("Failed to update project");

  return response.headers?.["x-project-version"];
};

export const getProjectImages = async (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);
  const response = await api.get<ProjectImage[]>(
    `/projects/${pathUid}/${pid}/imgs${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to fetch project images");

  return response.data.map((img) => ({
    _id: img._id,
    name: img.name,
    url: img.url,
  })) as ProjectImage[];
};

export const getProjectImage = async (
  uid: string,
  pid: string,
  imageId: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const query = buildQuery({ ownerId, shareId });
  const response = await api.get<ProjectImage>(
    `/projects/${uid}/${pid}/img/${imageId}${query}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to fetch project image");

  return {
    _id: response.data._id,
    name: response.data.name,
    url: response.data.url,
  } as ProjectImage;
};


export const downloadProjectImage = async ({
  imageUrl,
  imageName,
}: {
  imageUrl: string;
  imageName: string;
}) => {
  const response = await axios.get<ArrayBuffer>(imageUrl, {
    responseType: "arraybuffer",
  });

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to download project image");

  const blob = new Blob([response.data], { type: "image/png" });
  const file = new File([blob], imageName, { type: "image/png" });

  return {
    name: imageName,
    file,
  };
};

export const downloadProjectImages = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,                       
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
}) => {
  const project = await fetchProject(uid, pid, token, ownerId, shareId);
  const zip = new JSZip();

  for (const image of project.imgs) {
    const { name, file } = await downloadProjectImage({
      imageUrl: image.url,
      imageName: image.name,
    });
    zip.file(name, file);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const file = new File([blob], `${project.name}.zip`, {
    type: "application/zip",
  });

  return {
    name: project.name,
    file,
  };
};

export const addProjectImages = async ({
  uid,
  pid,
  token,
  images,
  ownerId,
  shareId,
  projectVersion,
}: {
  uid: string;
  pid: string;
  token: string;
  images: File[];
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });

  let lastVersion: string | undefined;

  for (const image of images) {
    const formData = new FormData();
    formData.append("image", image);

    const response = await api.post(`/projects/${uid}/${pid}/img${query}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
        "X-Project-Version": String(projectVersion),
      },
    });

    if (response.status < 200 || response.status >= 300)
      throw new Error("Failed to upload image: " + image.name);

    //  se backend devolver nova versão a cada upload
    lastVersion = response.headers?.["x-project-version"];
    if (lastVersion) projectVersion = Number(lastVersion);
  }
    return lastVersion;

};

export const deleteProjectImages = async ({
  uid,
  pid,
  token,
  imageIds,
  ownerId,
  shareId,
  projectVersion,

}: {
  uid: string;
  pid: string;
  token: string;
  imageIds: string[];
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });

    let lastVersion: string | undefined;

  for (const imageId of imageIds) {
    const response = await api.delete(
        `/projects/${uid}/${pid}/img/${imageId}${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Project-Version": String(projectVersion),
        },
      },
    );

    if (response.status !== 204)
      throw new Error("Failed to delete image: " + imageId);

    lastVersion = response.headers?.["x-project-version"];
    if (lastVersion) projectVersion = Number(lastVersion);
  }

    return lastVersion;

};

export const previewProjectImage = async ({
  uid,
  pid,
  imageId,
  token,
  ownerId,
  shareId,
  projectVersion,
  runnerUserId,
}: {
  uid: string;
  pid: string;
  imageId: string;
  token: string;
  ownerId: string;
  shareId?: string;
  projectVersion: number;
  runnerUserId: string;  
}) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);
  const response = await api.post(
    `/projects/${pathUid}/${pid}/preview/${imageId}${query}`,
    { runnerUserId },   // importante
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    },
  );

  if (response.status !== 201)
    throw new Error("Failed to request preview");

    return response.headers?.["x-project-version"];

};

export const addProjectTool = async ({
  uid, pid, tool, token, ownerId, shareId, projectVersion
}: {
  uid: string;
  pid: string;
  tool: ProjectTool;
  token: string;
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);
  const response = await api.post(
    `/projects/${pathUid}/${pid}/tool${query}`,
    { ...tool },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
        "X-Op-Id": crypto.randomUUID(),
      },
    },
  );

  if (response.status !== 201) throw new Error("Failed to add tool");

    return response.headers?.["x-project-version"];

};


export const downloadProjectPdf = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  useResults = false,
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  useResults?: boolean; 
  shareId?: string;
}) => {
  const project = await fetchProject(uid, pid, token, ownerId, shareId);
  const projectName = project.name.replace(/\s+/g, "_");
  const pdfDoc = await PDFDocument.create();
  const images: { name: string; url: string }[] = [];

  if (useResults) {
    // usa as imagens EDITADAS
    const results = await fetchProjectResults(uid, pid, token, ownerId, shareId);
    for (const img of results.imgs) {
      images.push({ name: img.name, url: img.url });
    }
  } else {
    // usa as imagens ORIGINAIS
    const project = await fetchProject(uid, pid, token, ownerId, shareId);
    for (const img of project.imgs) {
      images.push({ name: img.name, url: img.url });
    }
  }

  for (const image of images) {
    const { file } = await downloadProjectImage({
      imageUrl: image.url,
      imageName: image.name,
    });

    const arrayBuffer = await file.arrayBuffer();
    const lower = image.name.toLowerCase();
    const isJpeg = lower.endsWith(".jpg") || lower.endsWith(".jpeg");

    const pageImage = isJpeg
      ? await pdfDoc.embedJpg(arrayBuffer)
      : await pdfDoc.embedPng(arrayBuffer);

    const page = pdfDoc.addPage();
    const { width, height } = pageImage;

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const scale = Math.min(pageWidth / width, pageHeight / height);
    const imgWidth = width * scale;
    const imgHeight = height * scale;

    page.drawImage(pageImage, {
      x: (pageWidth - imgWidth) / 2,
      y: (pageHeight - imgHeight) / 2,
      width: imgWidth,
      height: imgHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const bytes = new Uint8Array(pdfBytes);
  const blob = new Blob([bytes], { type: "application/pdf" });

  const fileName = useResults
    ? `${projectName}_results.pdf`
    : `${projectName}.pdf`;

  const file = new File([blob], fileName, { type: "application/pdf" });

  return { name: file.name, file };
};

export const updateProjectTool = async ({
  uid,
  pid,
  toolId,
  toolParams,
  token,
  ownerId,
  shareId,
  projectVersion,
}: {
  uid: string;
  pid: string;
  toolId: string;
  toolParams: ToolParams;
  token: string;
  ownerId: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);
  const response = await api.put(
    `/projects/${pathUid}/${pid}/tool/${toolId}${query}`,
    {
      params: toolParams,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
        "X-Op-Id": crypto.randomUUID(),
      },
    },
  );

  if (response.status !== 204) throw new Error("Failed to update tool");
    
  return response.headers?.["x-project-version"];

};

export const deleteProjectTool = async ({
  uid,
  pid,
  toolId,
  token,
  ownerId,
  shareId,
  projectVersion,

}: {
  uid: string;
  pid: string;
  toolId: string;
  token: string;
  ownerId: string;
  shareId?: string;
  projectVersion: number;

}) => {
  const query = buildQuery({ ownerId, shareId });
  const response = await api.delete(`/projects/${uid}/${pid}/tool/${toolId}${query}`,
 {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Project-Version": String(projectVersion),
      "X-Op-Id": crypto.randomUUID(),
    },
  });

  if (response.status !== 204) throw new Error("Failed to remove tool");

    return response.headers?.["x-project-version"];

};

export const clearProjectTools = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  projectVersion,
}: {
  uid: string;
  pid: string;
  token: string;
  toolIds: string[];   // podes manter no tipo, mas deixa de ser usado
  ownerId: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);

  const resp = await api.post(
    `/projects/${pathUid}/${pid}/clear${query}`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
        "X-Op-Id": crypto.randomUUID(),
      },
    },
  );

  if (resp.status !== 204) throw new Error("Failed to clear project");

  // devolve a versão nova
  return resp.headers?.["x-project-version"] ?? String(projectVersion);
};

export const downloadProjectResults = async ({
  uid,
  pid,
  projectName,
  token,
  ownerId,
  shareId
}: {
  uid: string;
  pid: string;
  projectName: string;
  token: string;
  ownerId?: string;
  shareId?: string;
}) => {
  const query = buildQuery({ ownerId, shareId });
  const response = await api.get<ArrayBuffer>(
    `/projects/${uid}/${pid}/process${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "arraybuffer",
    },
  );

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to process project");

  const blob = new Blob([response.data], { type: "application/zip" });
  const file = new File([blob], projectName + "_edited.zip", {
    type: "application/zip",
  });

  return {
    name: projectName,
    file,
  };
};

export const fetchProjectResults = async (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,

) => {
  const query = buildQuery({ ownerId, shareId });
  const pathUid = pathUidFor(uid, ownerId, shareId);
  const response = await api.get<{
    imgs: {
      og_img_id: string;
      name: string;
      url: string;
    }[];
    texts: {
      og_img_id: string;
      name: string;
      url: string;
    }[];
  }>(`/projects/${pathUid}/${pid}/process/url${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status !== 200 || !response.data)
    throw new Error("Failed to fetch project results");

  const texts: ProjectImageText[] = [];
  for (const text of response.data.texts) {
    const textResp = await axios.get<string>(text.url, {
      responseType: "text",
    });

    if (textResp.status !== 200 || !textResp.data)
      throw new Error("Failed to fetch text");

    texts.push({
      _id: text.og_img_id,
      name: text.name,
      text: textResp.data,
    });
  }

  return {
    imgs: response.data.imgs.map(
      (img) =>
        ({
          _id: img.og_img_id,
          name: img.name,
          url: img.url,
        }) as ProjectImage,
    ),
    texts: texts,
  };
};

export const processProject = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  projectVersion,
  runnerUserId,
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
  runnerUserId: string;  
}) => {
  try {
    const query = buildQuery({ ownerId, shareId });
    const pathUid = pathUidFor(uid, ownerId, shareId);
    const response = await api.post<string>(
      `/projects/${pathUid}/${pid}/process${query}`,
      { runnerUserId },   // importante
      { 
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Project-Version": String(projectVersion),
        },
      },
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error("Failed to request project processing");
    }

    return response.headers?.["x-project-version"];

    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const backendMsg = error.response?.data;

        // Caso de limite diário – mantemos esta mensagem especial, porque o frontend sabe tratá-la em getErrorMessage.
        if (backendMsg === "No more daily_operations available") {
          throw new Error("No more daily_operations available");
        }

        // Para o resto, relançamos o próprio erro Axios. O frontend vai usar getErrorMessage para o traduzir.
        throw error;
      }

      // Se for outro tipo de erro, relança como está
      throw error;
    }
  };


  // Reordenar ferramentas de um projeto
  export const reorderProjectTools = async ({
    uid,
    pid,
    tools,
    token,
    ownerId,
    shareId,
    projectVersion,
  }: {
    uid: string;
    pid: string;
    tools: ProjectToolResponse[]; // mesma estrutura de `project.tools`
    token: string;
    ownerId?: string;
    shareId?: string;
    projectVersion: number;
  }) => {
  const query = buildQuery({ ownerId, shareId });
    const response = await api.post(
      `/projects/${uid}/${pid}/reorder${query}`,
      tools,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Project-Version": String(projectVersion),
          "X-Op-Id": crypto.randomUUID(),
        },
      },
    );

    // aceitar QUALQUER 2xx
  if (response.status < 200 || response.status >= 300) {
    console.error("Reorder failed, status:", response.status, response.data);
    throw new Error("Failed to reorder tools");
  }

    return response.headers?.["x-project-version"];
};

export const cancelProjectProcess = async ({
  uid,
  pid,
  token,
  ownerId,
  shareId,
  projectVersion,
}: {
  uid: string;
  pid: string;
  token: string;
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
}) => {
  const query = buildQuery({ ownerId, shareId });

  const response = await api.delete(
    `/projects/${uid}/${pid}/process${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error("Failed to cancel project processing");
  }

  return response.headers?.["x-project-version"];
};

export const assistantSuggest = async (params: {
  uid: string;
  pid: string;
  token: string;
  message: string;
  currentTools: ProjectToolResponse[];
  ownerId?: string;
  shareId?: string;
  projectVersion: number;
  imgId?: string;
}) => {
  const {
    uid,
    pid,
    token,
    message,
    currentTools,
    ownerId,
    shareId,
    projectVersion,
    imgId,
  } = params;

  const query = buildQuery({ ownerId, shareId });

  const resp = await api.post<{ suggestions: AssistantSuggestion[]; features?: any }>(
    `/projects/${uid}/${pid}/assistant/suggest${query}`,
    { message, currentTools, imgId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    },
  );

  if (resp.status !== 200 || !resp.data) {
    throw new Error("Failed to get assistant suggestions");
  }

  return {
    suggestions: resp.data.suggestions ?? [],
    newVersionHeader: resp.headers?.["x-project-version"],
  };
};

export async function setProjectDirty({
  userId,
  projectId,
  token,
  ownerId,
  shareId,
  dirty,
  projectVersion,
}: {
  userId: string;
  projectId: string;
  token: string;
  ownerId?: string;
  shareId?: string;
  dirty: boolean;
  projectVersion: number;
}): Promise<{ newVersionHeader?: string }> {
  const isShare = !!shareId;
  const pathUid = isShare ? (ownerId ?? userId) : userId;

  // só buildQuery quando for share
  const query = isShare ? buildQuery({ ownerId, shareId }) : "";

  const resp = await api.post(
    `/projects/${pathUid}/${projectId}/dirty${query}`,
    { dirty },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Project-Version": String(projectVersion),
      },
    },
  );

  return { newVersionHeader: resp.headers?.["x-project-version"] };
}
