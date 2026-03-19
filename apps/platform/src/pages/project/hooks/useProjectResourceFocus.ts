import { useEffect, useRef } from "react";
import type { NavigateFunction } from "react-router-dom";
import { buildProjectSectionPath } from "@app/navigation/paths";
import type { ProjectResourceFocus } from "@app/project/project.types";
import { RESOURCE_FOCUS_KEYS } from "../constants/projectResources.constants";

const isProjectResourceFocus = (
  value: string | null,
): value is ProjectResourceFocus => {
  return RESOURCE_FOCUS_KEYS.includes(value as ProjectResourceFocus);
};

interface UseProjectResourceFocusOptions {
  activeProjectId: string;
  navigate: NavigateFunction;
  rawFocus: string | null;
}

export const useProjectResourceFocus = ({
  activeProjectId,
  navigate,
  rawFocus,
}: UseProjectResourceFocusOptions) => {
  const knowledgeRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const agentsRef = useRef<HTMLDivElement>(null);
  const focus = isProjectResourceFocus(rawFocus) ? rawFocus : null;

  useEffect(() => {
    if (!focus) {
      if (rawFocus) {
        void navigate(buildProjectSectionPath(activeProjectId, "resources"), {
          replace: true,
        });
      }
      return;
    }

    const focusRef =
      focus === "knowledge"
        ? knowledgeRef
        : focus === "skills"
          ? skillsRef
          : agentsRef;

    focusRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    void navigate(buildProjectSectionPath(activeProjectId, "resources"), {
      replace: true,
    });
  }, [
    activeProjectId,
    agentsRef,
    focus,
    knowledgeRef,
    navigate,
    rawFocus,
    skillsRef,
  ]);

  return {
    focus,
    knowledgeRef,
    skillsRef,
    agentsRef,
  };
};
