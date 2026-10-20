"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  resolveShareLink,
  fetchSharedProject,
  type SharedProject,
} from "@/lib/projects";
import { useSession } from "@/providers/session-provider";

type Props = {
  params: Promise<{ linkId: string }>;
};

type ShareInfo = {
  projectId: string;
  ownerId: string;
  permission: "read" | "edit";
  projectName?: string;
};

export default function SharePage({ params }: Props) {
  const { linkId } = use(params);
  const session = useSession();

  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isAuthed = session.user.type !== "anonymous";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // 1) público: valida link + permission (sem JWT)
        const i = await resolveShareLink(linkId);
        if (cancelled) return;

        setInfo(i);
        setError(false);

        // 2) privado: só se estiver autenticado
        if (isAuthed) {
          const p = await fetchSharedProject(linkId, session.token);
          if (cancelled) return;
          setProject(p);
        } else {
          setProject(null);
        }

        setLoading(false);
      } catch {
        if (!cancelled) {
          setInfo(null);
          setProject(null);
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [linkId, isAuthed, session.token]);

  if (loading) {
    return (
      <main className="p-8 flex items-center justify-center">
        <div className="inline-flex items-center">
          <span className="animate-spin mr-2">⏳</span>
          <span>Loading...</span>
        </div>
      </main>
    );
  }

  if (error || !info) {
    return (
      <main className="p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Invalid or revoked link</h1>
        <p className="text-sm text-muted-foreground">
          This share link is no longer valid.
        </p>
        <Link href="/dashboard" className="underline text-blue-500">
          Go back to dashboard
        </Link>
      </main>
    );
  }

  // URL do editor no dashboard
  const editorUrl = `/dashboard/${info.projectId}?owner=${info.ownerId}&share=${linkId}`;
  const nextParam = encodeURIComponent(editorUrl);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {/* 🔒 anónimo não vê o nome real */}
        Shared project{isAuthed && project ? `: ${project.name}` : ""}
      </h1>

      <p className="text-sm">
        Permission: <strong>{info.permission}</strong>
      </p>

      {/* ✅ READ: sempre pedir login para ver conteúdo */}
      {info.permission === "read" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Login is required to access shared project contents.
          </p>
          {isAuthed ? (
            <Link
              href={editorUrl}
              className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Open
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/login?next=${nextParam}`}
                className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Login and open
              </Link>
              <Link
                href={`/register?next=${nextParam}`}
                className="inline-flex items-center px-3 py-1.5 rounded bg-muted text-sm hover:bg-muted/80 border border-border"
              >
                Register and open
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ✅ EDIT: permite abrir editor (mas só funciona com login) */}
      {info.permission === "edit" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            This link allows editing. Login is required to open in the editor.
          </p>

          {isAuthed ? (
            <Link
              href={editorUrl}
              className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Open in editor
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/login?next=${nextParam}`}
                className="inline-flex items-center px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Login and open
              </Link>
              <Link
                href={`/register?next=${nextParam}`}
                className="inline-flex items-center px-3 py-1.5 rounded bg-muted text-sm hover:bg-muted/80 border border-border"
              >
                Register and open
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 🔒 só mostra imagens se estiver autenticado e já tiver project carregado */}
      {!isAuthed || !project ? null : project.imgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">This project has no images.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {project.imgs.map((img) => (
            <div key={img._id} className="border rounded shadow-sm overflow-hidden">
              <img src={img.url} alt={img.name} className="w-full h-auto object-cover" />
              <div className="px-2 py-1 text-xs text-muted-foreground truncate">
                {img.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
