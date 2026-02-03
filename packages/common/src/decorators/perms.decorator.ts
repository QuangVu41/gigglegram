import { AcStatementsTypes } from '@repo/types';
import { SetMetadata } from '@nestjs/common';
import { usersRelations } from '@repo/database';

export type UserRelationKey = keyof ReturnType<typeof usersRelations.config>;

export type PermsType<
  T extends keyof AcStatementsTypes = keyof AcStatementsTypes,
> = {
  [key in T]?: AcStatementsTypes[key][number][];
};

export type ownedResourcePermsType = {
  resourceKey: UserRelationKey;
  resourceParamIdKey: string;
};

export type PermsDecType = {
  perms: PermsType<keyof AcStatementsTypes>;
  ownedResource?: ownedResourcePermsType;
};

export const Perms = (
  perms: PermsType<keyof AcStatementsTypes>,
  ownedResource?: ownedResourcePermsType,
) => SetMetadata('perms', { perms, ownedResource });
