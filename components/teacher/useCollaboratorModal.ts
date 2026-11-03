import { useCallback, useState } from "react";
import type { Exam } from "../../types";
import { storageService } from "../../services/storage";

interface UseCollaboratorModalParams {
  exam: Exam;
  onUpdate: () => void;
}

export const useCollaboratorModal = ({
  exam,
  onUpdate,
}: UseCollaboratorModalParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [copiedRole, setCopiedRole] = useState<
    "viewer" | "editor" | "public" | null
  >(null);

  const collaborators = exam.config.collaborators || [];

  const viewerCollaborator = collaborators
    .filter((c) => c.role === "viewer")
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const editorCollaborator = collaborators
    .filter((c) => c.role === "editor")
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const publicCollaborator = collaborators
    .filter((c) => c.role === "public")
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const getRoleLabel = (role: "viewer" | "editor" | "public") => {
    switch (role) {
      case "viewer":
        return "Pengawas (Live Monitor)";
      case "editor":
        return "Editor (Shared)";
      case "public":
        return "Orang Tua / Publik (Live Stream)";
    }
  };

  const handleCreateLink = useCallback(
    async (role: "viewer" | "editor" | "public") => {
      setIsLoading(true);
      try {
        const label = getRoleLabel(role);
        await storageService.addCollaborator(exam.code, label, role);
        onUpdate();
      } catch {
        alert("Gagal membuat link.");
      } finally {
        setIsLoading(false);
      }
    },
    [exam.code, onUpdate],
  );

  const handleResetLink = useCallback(
    async (role: "viewer" | "editor" | "public", oldToken: string) => {
      if (
        !confirm("Link lama akan hangus dan link baru akan dibuat. Lanjutkan?")
      )
        return;
      setIsLoading(true);
      try {
        await storageService.removeCollaborator(exam.code, oldToken);
        const label = getRoleLabel(role);
        await storageService.addCollaborator(exam.code, label, role);
        onUpdate();
      } catch {
        alert("Gagal mereset link.");
      } finally {
        setIsLoading(false);
      }
    },
    [exam.code, onUpdate],
  );

  const handleDeleteLink = useCallback(
    async (token: string) => {
      if (!confirm("Link ini akan dinonaktifkan. Lanjutkan?")) return;
      setIsLoading(true);
      try {
        await storageService.removeCollaborator(exam.code, token);
        onUpdate();
      } catch {
        alert("Gagal menghapus link.");
      } finally {
        setIsLoading(false);
      }
    },
    [exam.code, onUpdate],
  );

  const getLink = useCallback(
    (token: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("collab_code", exam.code);
      url.searchParams.set("collab_token", token);
      url.searchParams.delete("view");
      url.searchParams.delete("preview");
      url.searchParams.delete("join");
      url.searchParams.delete("live");
      return url.toString();
    },
    [exam.code],
  );

  const copyLink = useCallback(
    (token: string, role: "viewer" | "editor" | "public") => {
      navigator.clipboard.writeText(getLink(token));
      setCopiedRole(role);
      setTimeout(() => setCopiedRole(null), 2000);
    },
    [getLink],
  );

  return {
    isLoading,
    copiedRole,
    viewerCollaborator,
    editorCollaborator,
    publicCollaborator,
    handleCreateLink,
    handleResetLink,
    handleDeleteLink,
    getLink,
    copyLink,
  };
};
