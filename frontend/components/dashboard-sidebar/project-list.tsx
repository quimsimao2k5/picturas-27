"use client";

import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import {
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "../ui/sidebar";
import ProjectItem from "./project-item";
import { useSession } from "@/providers/session-provider";
import { useGetProjects, useResolveShareLink } from "@/lib/queries/projects";
import { Search } from "lucide-react";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { Transition } from "@headlessui/react";
import { Project } from "@/lib/projects";
import { useSearchParams } from "next/navigation";

export default function ProjectList() {
  const session = useSession();
  const projects = useGetProjects(session.user._id, session.token);

  const searchParams = useSearchParams();
  const shareId = searchParams.get("share"); // shareId da URL

  // ✅ resolve do share link (projectId, ownerId, permission, projectName)
  const shared = useResolveShareLink(shareId ?? undefined);

  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredProjects, setFilteredProjects] = useState<Project[]>(
    projects.data || [],
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (projects.data) {
      setFilteredProjects(
        projects.data.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      );
      setLastUpdated(new Date());
    }
  }, [searchQuery, projects.data]);

  useEffect(() => {
    if (searchOpen) {
      const i = setInterval(() => {
        if (lastUpdated) {
          const now = new Date();
          const diffSecs = (now.getTime() - lastUpdated.getTime()) / 1000;
          if (diffSecs > 5 && searchQuery === "") {
            setSearchOpen(false);
            setLastUpdated(null);
          }
        }
      }, 1000);
      return () => clearInterval(i);
    }
  }, [searchQuery, lastUpdated, searchOpen]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex justify-between items-center">
        <span>Your projects</span>
        <Button
          variant="ghost"
          className="size-fit p-1"
          onClick={() => {
            setSearchOpen(!searchOpen);
            if (searchOpen) setLastUpdated(null);
            else setLastUpdated(new Date());
          }}
        >
          <Search className="size-[1em]" />
        </Button>
      </SidebarGroupLabel>

      {projects.data && projects.data.length > 0 && (
        <Transition
          show={searchOpen}
          enter="transition-opacity duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 bg-sidebar-accent text-sidebar-accent-foreground h-6 rounded-md text-sm active:outline-none focus:outline-none mb-2"
          />
        </Transition>
      )}

      <SidebarGroupContent>
        <SidebarMenu>
          {/* Projetos do utilizador */}
          {!projects.isLoading &&
            projects.data &&
            (filteredProjects.length > 0
              ? filteredProjects.map((p) => <ProjectItem key={p._id} p={p} />)
              : projects.data.length > 0 && (
                  <SidebarMenuItem>
                    <span className="pl-2">No search results.</span>
                  </SidebarMenuItem>
                ))}

          {projects.isLoading && (
            <SidebarMenuItem className="flex flex-col gap-2 px-2 pt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton className="w-full h-5" key={i} />
              ))}
            </SidebarMenuItem>
          )}

          {/* ✅ CASO 1: Sem projetos do utilizador, mas share válido */}
          {!projects.isLoading &&
            projects.data &&
            projects.data.length === 0 &&
            shareId &&
            shared.isSuccess &&
            shared.data && (
              <SidebarMenuItem>
                <Link
                  href={`/dashboard/${shared.data.projectId}?owner=${shared.data.ownerId}&share=${shareId}`}
                  className="pl-2 underline"
                >
                  {shared.data.projectName ?? "Shared project"}{" "}
                  <span className="text-xs text-muted-foreground">
                    (Shared, permission: {shared.data.permission})
                  </span>
                </Link>
              </SidebarMenuItem>
            )}

          {/* CASO 2: Sem projetos e sem share válido */}
          {!projects.isLoading &&
            projects.data &&
            projects.data.length === 0 &&
            (!shareId || shared.isError || !shared.data) && (
              <SidebarMenuItem>
                <span className="pl-2">Empty for now.</span>
              </SidebarMenuItem>
            )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
