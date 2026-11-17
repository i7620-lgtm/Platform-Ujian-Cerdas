import React from "react";
import type { TeacherProfile } from "../../types";
import { SchoolLetterhead } from "./SchoolLetterhead";
import {
  formatFormalExamTypeTitle,
  type FormalIdentityField,
} from "./printDocumentUtils";

interface FormalPrintDocHeaderProps {
  profile?: TeacherProfile | null;
  overrideData?: Partial<TeacherProfile>;
  examType?: string;
  documentTitle: string;
  identityFields: FormalIdentityField[];
  className?: string;
}

export const FormalPrintDocHeader: React.FC<FormalPrintDocHeaderProps> = ({
  profile,
  overrideData,
  examType,
  documentTitle,
  identityFields,
  className = "",
}) => {
  const formalExamTitle = formatFormalExamTypeTitle(examType);

  return (
    <div className={`formal-kop-header text-black ${className}`}>
      <SchoolLetterhead profile={profile} overrideData={overrideData} />

      <div className="formal-title-container text-center my-2 print:my-1 space-y-0.5 leading-snug">
        <p className="formal-title-eval text-sm sm:text-[15px] font-bold uppercase tracking-wide text-black">
          {formalExamTitle}
        </p>
        <p className="formal-title-year text-xs sm:text-[13px] font-bold uppercase tracking-wide text-black">
          TAHUN AJARAN ...........................
        </p>
        <h1 className="formal-title-doc text-sm sm:text-base font-extrabold uppercase tracking-wider text-black pt-0.5">
          {documentTitle}
        </h1>
      </div>

      <div className="formal-id-block max-w-[500px] mx-auto my-3 print:my-1.5 text-xs sm:text-[13px] text-black leading-snug space-y-0.5 print:space-y-0">
        {identityFields.map((field, idx) => (
          <div
            key={`${field.label}-${idx}`}
            className="formal-id-row grid grid-cols-[150px_12px_1fr] items-baseline"
          >
            <span className="font-semibold uppercase tracking-wide">
              {field.label}
            </span>
            <span className="font-semibold text-center">:</span>
            <span className="font-normal pl-1 break-words">
              {field.value !== undefined && field.value !== null && field.value !== ""
                ? field.value
                : "\u00A0"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
