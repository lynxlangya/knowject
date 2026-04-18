import type { SkillSummaryResponse } from "@api/skills";
import { Modal, Select, Typography } from "antd";
import { tp } from "../project.i18n";

interface ProjectSkillAccessModalProps {
  open: boolean;
  submitting?: boolean;
  skillsCatalog: SkillSummaryResponse[];
  boundSkillIds: string[];
  selectedSkillIds: string[];
  onSelectedSkillIdsChange: (skillIds: string[]) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

const buildSkillOptionLabel = (skill: SkillSummaryResponse): string => {
  return `${skill.name} · ${
    skill.source === "preset"
      ? tp("resources.item.presetSkill")
      : tp("resources.item.teamSkill")
  }`;
};

export const ProjectSkillAccessModal = ({
  open,
  submitting = false,
  skillsCatalog,
  boundSkillIds,
  selectedSkillIds,
  onSelectedSkillIdsChange,
  onCancel,
  onConfirm,
}: ProjectSkillAccessModalProps) => {
  const availableSkills = skillsCatalog.filter(
    (skill) =>
      skill.source === "team" &&
      skill.bindable &&
      !boundSkillIds.includes(skill.id),
  );
  const skillOptions = availableSkills.map((skill) => ({
    value: skill.id,
    label: buildSkillOptionLabel(skill),
  }));

  return (
    <Modal
      title={tp("resources.skillAccess.title")}
      open={open}
      destroyOnHidden
      confirmLoading={submitting}
      okText={tp("resources.skillAccess.confirm")}
      cancelText={tp("resources.skillAccess.cancel")}
      okButtonProps={{
        disabled: selectedSkillIds.length === 0,
      }}
      onCancel={onCancel}
      onOk={onConfirm}
    >
      <div className="flex flex-col gap-3">
        <Typography.Paragraph className="mb-0! text-sm! text-slate-600!">
          {tp("resources.skillAccess.description")}
        </Typography.Paragraph>

        <Select
          mode="multiple"
          allowClear
          showSearch
          value={selectedSkillIds}
          placeholder={tp("resources.skillAccess.placeholder")}
          options={skillOptions}
          notFoundContent={tp("resources.skillAccess.empty")}
          onChange={onSelectedSkillIdsChange}
        />
      </div>
    </Modal>
  );
};
