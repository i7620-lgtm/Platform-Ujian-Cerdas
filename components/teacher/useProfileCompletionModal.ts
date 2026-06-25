import { useEffect, useCallback, useState } from "react";
import type { TeacherProfile } from "../../types";
import { storageService } from "../../services/storage";

interface UseProfileCompletionModalProps {
  profile: TeacherProfile;
  onComplete: (updatedProfile: TeacherProfile) => void;
}

export const useProfileCompletionModal = ({
  profile,
  onComplete,
}: UseProfileCompletionModalProps) => {
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [regency, setRegency] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFullName(profile.fullName === "Pengguna" ? "" : profile.fullName);
    setSchool(profile.school === "-" ? "" : profile.school);
    setRegency(profile.regency === "-" ? "" : profile.regency || "");
    setIsLoading(false);
    setError("");

    return () => {
      setFullName("");
      setSchool("");
      setRegency("");
      setIsLoading(false);
      setError("");
    };
  }, [profile]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fullName || !school || !regency) {
        setError("Mohon lengkapi semua data profil.");
        return;
      }

      setIsLoading(true);
      try {
        const updates = {
          fullName,
          school,
          regency,
          accountType: profile.accountType,
        };
        await storageService.updateTeacherProfile(profile.id, updates);
        onComplete({ ...profile, ...updates });
      } catch (err: unknown) {
        const errorObj = err as Error;
        setError(errorObj.message || "Gagal memperbarui profil.");
      } finally {
        setIsLoading(false);
      }
    },
    [fullName, school, regency, profile, onComplete],
  );

  return {
    fullName,
    setFullName,
    school,
    setSchool,
    regency,
    setRegency,
    isLoading,
    error,
    handleSubmit,
  };
};
