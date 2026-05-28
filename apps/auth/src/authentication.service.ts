import { Metadata } from '@grpc/grpc-js';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AuthenticatedSessionResponse,
  Empty,
  PermissionSet,
  SystemWideErrorCodes,
  UpdateUserRequest,
} from '@repo/types';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { auth } from '@/src/lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { RpcException } from '@nestjs/microservices';
import { AddMembersDto } from '@/src/dto/add-members.dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  DeleteManyOrganizationsDto,
  SaveOrganizationRoleDto,
} from '@/src/dto/organization-ops.dto';
import crypto from 'crypto';
import { extractHeadersFromMetadata } from '@repo/common';
import { transformPermissionsObj } from '@repo/common';
import { DATABASE_CONNECTION, schema } from '@repo/database';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, eq, inArray, desc, asc, count, gte, or } from 'drizzle-orm';
import { FindManyQueryDto } from '@repo/types';
import { like } from 'drizzle-orm';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly baAuthService: AuthService<typeof auth>,
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async authenticate(request: Empty, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    try {
      const session = await this.baAuthService.api.getSession({
        headers: fromNodeHeaders(headers),
      });
      if (!session)
        throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);

      return session as unknown as AuthenticatedSessionResponse;
    } catch (error) {
      this.logger.error('Authentication failed.', error);
      throw new RpcException(SystemWideErrorCodes.AUTH_UNAUTHORIZED);
    }
  }

  async hasPermission(request: PermissionSet, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    const permissions = transformPermissionsObj(request);
    try {
      const hasPerm = await this.baAuthService.api.hasPermission({
        headers: fromNodeHeaders(headers),
        body: {
          permissions,
        },
      });

      if (hasPerm.success) {
        return {
          success: true,
        };
      }
      return {
        success: false,
      };
    } catch (error) {
      this.logger.error('Permission check failed.', error);
      return {
        success: false,
      };
    }
  }

  async updateUser(request: UpdateUserRequest, metadata: Metadata) {
    const headers = extractHeadersFromMetadata(metadata);
    try {
      const res = await this.baAuthService.api.updateUser({
        headers: fromNodeHeaders(headers),
        body: {
          ...request,
          gender: request.gender as any,
          lastActiveAt: request.lastActiveAt
            ? new Date(request.lastActiveAt)
            : undefined,
        },
      });

      return res;
    } catch (error) {
      this.logger.error('Failed to update user.', error);
      throw new RpcException(SystemWideErrorCodes.UPDATE_FAILED);
    }
  }

  async addMembers(addMembersDto: AddMembersDto) {
    try {
      const res = await Promise.all([
        ...addMembersDto.userIds.map((userId) =>
          this.baAuthService.api.addMember({
            body: {
              role: 'member' as any,
              userId: userId,
              organizationId: addMembersDto.organizationId,
            },
          }),
        ),
      ]);

      return res;
    } catch (error) {
      this.logger.error('Adding member failed.', error);
      if (error instanceof Error && (error as any)?.body)
        throw new BadRequestException({
          code: (error as any)?.body?.code,
          message: (error as any)?.body?.message,
        });
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async listOrganizationMembers(slug: string) {
    const members = this.db.query.organizations.findMany({
      where: eq(schema.organizations.slug, slug),
      with: {
        members: {
          with: {
            users: true,
          },
        },
      },
    });

    return members;
  }

  async getOrganizationsStats() {
    try {
      const [orgsCountRes, membersCountRes] = await Promise.all([
        this.db.select({ count: count() }).from(schema.organizations),
        this.db.select({ count: count() }).from(schema.members),
      ]);

      const totalOrgs = orgsCountRes[0]?.count ?? 0;
      const totalMembers = membersCountRes[0]?.count ?? 0;
      const avgMembersPerOrg =
        totalOrgs > 0 ? Number((totalMembers / totalOrgs).toFixed(1)) : 0;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentOrgsRes = await this.db
        .select({ count: count() })
        .from(schema.organizations)
        .where(gte(schema.organizations.createdAt, thirtyDaysAgo));

      const recentOrgs = recentOrgsRes[0]?.count ?? 0;

      return {
        totalOrgs,
        totalMembers,
        avgMembersPerOrg,
        recentOrgs,
      };
    } catch (error) {
      this.logger.error('Failed to get organizations stats.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async listOrganizations(findManyQueryDto: FindManyQueryDto) {
    try {
      const {
        keyword,
        page = 1,
        limit = 10,
        sort = 'createdAt,desc',
      } = findManyQueryDto;

      let orderBy: any;
      const [sortField, sortOrder] = sort.split(',');
      if (sortField && sortOrder && sortField in schema.organizations) {
        orderBy =
          sortOrder === 'desc'
            ? [
                desc(
                  schema.organizations[
                    sortField as keyof typeof schema.organizations.$inferSelect
                  ],
                ),
              ]
            : [
                asc(
                  schema.organizations[
                    sortField as keyof typeof schema.organizations.$inferSelect
                  ],
                ),
              ];
      }

      const whereConditions: any[] = [];
      if (keyword) {
        whereConditions.push(
          or(
            like(schema.organizations.name, `%${keyword}%`),
            like(schema.organizations.slug, `%${keyword}%`),
          ),
        );
      }

      const where =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [data, countResult] = await Promise.all([
        this.db.query.organizations.findMany({
          where,
          limit,
          offset: (page - 1) * limit,
          orderBy,
        }),
        this.db
          .select({ count: count() })
          .from(schema.organizations)
          .where(where),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      data['_totalCount'] = Number(totalCount);
      return data;
    } catch (error) {
      this.logger.error('Failed to list organizations.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async listUserOrganizations(findManyQueryDto: FindManyQueryDto) {
    try {
      const {
        keyword,
        page = 1,
        limit = 10,
        sort = 'createdAt,desc',
        ids,
      } = findManyQueryDto;

      let orderBy: any;
      const [sortField, sortOrder] = sort.split(',');
      if (sortField && sortOrder && sortField in schema.members) {
        orderBy =
          sortOrder === 'desc'
            ? [
                desc(
                  schema.members[
                    sortField as keyof typeof schema.members.$inferSelect
                  ],
                ),
              ]
            : [
                asc(
                  schema.members[
                    sortField as keyof typeof schema.members.$inferSelect
                  ],
                ),
              ];
      }

      const whereConditions: any[] = [];
      if (ids && ids.length > 0) {
        whereConditions.push(inArray(schema.members.userId, ids));
      }

      const where =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [data, countResult] = await Promise.all([
        this.db.query.members.findMany({
          where,
          limit,
          offset: (page - 1) * limit,
          orderBy,
          with: {
            organizations: true,
          },
        }),
        this.db
          .select({ count: count() })
          .from(schema.members)
          .where(where),
      ]);

      const totalCount = countResult[0]?.count ?? 0;
      data['_totalCount'] = Number(totalCount);
      return data;
    } catch (error) {
      this.logger.error('Failed to list user organizations.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async removeMembers(removeMembersDto: AddMembersDto) {
    try {
      const res = await this.db
        .delete(schema.members)
        .where(
          and(
            eq(schema.members.organizationId, removeMembersDto.organizationId),
            inArray(schema.members.userId, removeMembersDto.userIds),
          ),
        );
      return res;
    } catch (error) {
      this.logger.error('Removing members failed.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async createOrganizationAdmin(dto: CreateOrganizationDto, userId?: string) {
    try {
      const existing = await this.db.query.organizations.findFirst({
        where: eq(schema.organizations.slug, dto.slug),
      });
      if (existing) {
        throw new BadRequestException({
          code: SystemWideErrorCodes.BAD_REQUEST,
          message: 'Slug already exists',
        });
      }

      const orgId = crypto.randomUUID();

      const createdOrg = await this.db.transaction(async (tx) => {
        const createdOrg = await tx
          .insert(schema.organizations)
          .values({
            id: orgId,
            name: dto.name,
            slug: dto.slug,
            logo: dto.logo || null,
            createdAt: new Date(),
          })
          .returning();

        await tx.insert(schema.organizationRoles).values({
          id: crypto.randomUUID(),
          organizationId: orgId,
          role: 'member',
          permission: JSON.stringify({
            ac: ['read'],
          }),
          createdAt: new Date(),
        });

        if (userId) {
          await tx.insert(schema.members).values({
            id: crypto.randomUUID(),
            organizationId: orgId,
            userId: userId,
            role: 'owner',
            createdAt: new Date(),
          });
        }

        return createdOrg;
      });

      return createdOrg;
    } catch (error) {
      this.logger.error('Failed to create organization.', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async updateOrganizationAdmin(id: string, dto: UpdateOrganizationDto) {
    try {
      const existing = await this.db.query.organizations.findFirst({
        where: eq(schema.organizations.slug, dto.slug),
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException({
          code: SystemWideErrorCodes.BAD_REQUEST,
          message: 'Slug already exists',
        });
      }

      const updatedOrg = await this.db
        .update(schema.organizations)
        .set({
          name: dto.name,
          slug: dto.slug,
          logo: dto.logo || null,
        })
        .where(eq(schema.organizations.id, id))
        .returning();

      return updatedOrg;
    } catch (error) {
      this.logger.error('Failed to update organization.', error);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async deleteOrganizationAdmin(id: string) {
    try {
      const deletedOrg = await this.db
        .delete(schema.organizations)
        .where(eq(schema.organizations.id, id))
        .returning();

      return deletedOrg;
    } catch (error) {
      this.logger.error('Failed to delete organization.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async deleteManyOrganizationsAdmin(dto: DeleteManyOrganizationsDto) {
    try {
      if (!dto.ids || dto.ids.length === 0) {
        return { success: true };
      }
      await this.db
        .delete(schema.organizations)
        .where(inArray(schema.organizations.id, dto.ids));
    } catch (error) {
      this.logger.error('Failed to bulk delete organizations.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async listOrganizationRolesAdmin(id: string) {
    try {
      const roles = await this.db.query.organizationRoles.findMany({
        where: eq(schema.organizationRoles.organizationId, id),
      });
      return roles;
    } catch (error) {
      this.logger.error('Failed to list organization roles.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async saveOrganizationRoleAdmin(id: string, dto: SaveOrganizationRoleDto) {
    try {
      const existing = await this.db.query.organizationRoles.findFirst({
        where: and(
          eq(schema.organizationRoles.organizationId, id),
          eq(schema.organizationRoles.role, 'member'),
        ),
      });

      let updatedRole: typeof schema.organizationRoles.$inferSelect;

      if (existing) {
        updatedRole = (await this.db
          .update(schema.organizationRoles)
          .set({
            permission: JSON.stringify(dto.permission),
            updatedAt: new Date(),
          })
          .where(eq(schema.organizationRoles.id, existing.id))
          .returning()) as unknown as typeof schema.organizationRoles.$inferSelect;
      } else {
        updatedRole = (await this.db
          .insert(schema.organizationRoles)
          .values({
            id: crypto.randomUUID(),
            organizationId: id,
            role: 'member',
            permission: JSON.stringify(dto.permission),
            createdAt: new Date(),
          })
          .returning()) as unknown as typeof schema.organizationRoles.$inferSelect;
      }

      return updatedRole;
    } catch (error) {
      this.logger.error('Failed to save organization role.', error);
      throw new InternalServerErrorException({
        code: SystemWideErrorCodes.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
