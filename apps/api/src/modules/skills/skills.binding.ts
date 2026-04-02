import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import { createValidationErrorShape } from '@lib/validation.js';
import { findRegisteredSkillById } from './skills.registry.js';
import {
  buildSkillBindableFlag,
  normalizeStoredSkillForRead,
} from './skills.shared.js';
import type { SkillsRepository } from './skills.repository.js';

export interface SkillBindingValidator {
  assertBindableSkillIds(
    skillIds: string[],
    options: {
      fieldName: 'boundSkillIds' | 'skillIds';
    },
  ): Promise<void>;
}

export const createSkillBindingValidator = ({
  repository,
}: {
  repository: Pick<SkillsRepository, 'findSkillsByIds'>;
}): SkillBindingValidator => {
  return {
    assertBindableSkillIds: async (skillIds, { fieldName }) => {
      const normalizedIds = Array.from(new Set(skillIds.map((skillId) => skillId.trim()).filter(Boolean)));

      if (normalizedIds.length === 0) {
        return;
      }

      const presetSkillIds = normalizedIds.filter((skillId) =>
        findRegisteredSkillById(skillId),
      );
      const storedSkillIds = normalizedIds.filter(
        (skillId) => !presetSkillIds.includes(skillId),
      );
      const storedSkills =
        storedSkillIds.length > 0 ? await repository.findSkillsByIds(storedSkillIds) : [];
      const storedSkillMap = new Map(
        storedSkills.map((skill) => [skill._id.toHexString(), skill] as const),
      );

      const missingSkillIds: string[] = [];
      const inactiveSkillLabels: string[] = [];

      normalizedIds.forEach((skillId) => {
        if (presetSkillIds.includes(skillId)) {
          return;
        }

        const skill = storedSkillMap.get(skillId);

        if (!skill) {
          missingSkillIds.push(skillId);
          return;
        }

        const normalizedSkill = normalizeStoredSkillForRead(skill);

        if (!buildSkillBindableFlag(normalizedSkill.status)) {
          inactiveSkillLabels.push(`${skill.name}（${skillId}）`);
        }
      });

      if (missingSkillIds.length === 0 && inactiveSkillLabels.length === 0) {
        return;
      }

      throw new AppError({
        ...createValidationErrorShape(
          getFallbackMessage('validation.skills.binding.invalid'),
          {
            [fieldName]: getFallbackMessage('validation.skills.binding.invalid'),
          },
          'validation.skills.binding.invalid',
        ),
        details: {
          fields: {
            [fieldName]: getFallbackMessage('validation.skills.binding.invalid'),
          },
          missingSkillIds,
          inactiveSkillLabels,
        },
      });
    },
  };
};
