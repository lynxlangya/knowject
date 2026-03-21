import { AppError } from '@lib/app-error.js';
import { getFallbackMessage } from '@lib/locale.messages.js';
import { createValidationErrorShape } from '@lib/validation.js';
import { findRegisteredSkillById } from './skills.registry.js';
import { buildSkillBindableFlag } from './skills.shared.js';
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

      const builtinSkillIds = normalizedIds.filter((skillId) => findRegisteredSkillById(skillId));
      const storedSkillIds = normalizedIds.filter((skillId) => !builtinSkillIds.includes(skillId));
      const storedSkills =
        storedSkillIds.length > 0 ? await repository.findSkillsByIds(storedSkillIds) : [];
      const storedSkillMap = new Map(
        storedSkills.map((skill) => [skill._id.toHexString(), skill] as const),
      );

      const missingSkillIds: string[] = [];
      const unpublishedSkillLabels: string[] = [];

      normalizedIds.forEach((skillId) => {
        if (builtinSkillIds.includes(skillId)) {
          return;
        }

        const skill = storedSkillMap.get(skillId);

        if (!skill) {
          missingSkillIds.push(skillId);
          return;
        }

        if (!buildSkillBindableFlag(skill.source, skill.lifecycleStatus)) {
          unpublishedSkillLabels.push(`${skill.name}（${skillId}）`);
        }
      });

      if (missingSkillIds.length === 0 && unpublishedSkillLabels.length === 0) {
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
          unpublishedSkillLabels,
        },
      });
    },
  };
};
