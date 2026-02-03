import { ActionList, PermissionSet } from '@repo/types';

export const transformToPermissionSet = (perms: {
  [key: string]: string[];
}): PermissionSet => {
  const permissions: { [key: string]: ActionList } = {};

  Object.entries(perms).forEach(([resource, actions]) => {
    permissions[resource] = { actions };
  });

  return { permissions };
};
