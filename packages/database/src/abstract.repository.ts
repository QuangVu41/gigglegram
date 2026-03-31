import {
  BuildQueryResult,
  DBQueryConfig,
  eq,
  ExtractTablesWithRelations,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTable } from 'drizzle-orm/pg-core';
import * as schema from '@db/src/drizzle/schemas';
import { NotFoundException } from '@nestjs/common';
import { FindManyQueryDto, SystemWideErrorCodes } from '@repo/types';
import { KnownKeysOnly } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { asc } from 'drizzle-orm';

export type TTablesRelationalConfig = ExtractTablesWithRelations<typeof schema>;

export abstract class AbstractRepository<
  TTable extends PgTable,
  TTableName extends keyof TTablesRelationalConfig =
    keyof TTablesRelationalConfig,
  TSelect = TTable['_']['inferSelect'],
  TInsert = TTable['_']['inferInsert'],
> {
  constructor(
    protected readonly db: NodePgDatabase<typeof schema>,
    protected readonly table: TTable,
    protected readonly tableName: TTableName,
  ) {}

  async findMany<
    TConfig extends DBQueryConfig<
      'many',
      true,
      TTablesRelationalConfig,
      TTablesRelationalConfig[TTableName]
    >,
  >(
    config?: KnownKeysOnly<
      TConfig,
      DBQueryConfig<
        'many',
        true,
        TTablesRelationalConfig,
        TTablesRelationalConfig[TTableName]
      >
    >,
    findManyQueryDto?: FindManyQueryDto,
  ): Promise<
    BuildQueryResult<
      TTablesRelationalConfig,
      TTablesRelationalConfig[TTableName],
      TConfig
    >[]
  > {
    findManyQueryDto = findManyQueryDto || new FindManyQueryDto();

    let orderBy: any;
    const { page, limit, sort } = findManyQueryDto;
    const offset = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(',');
    if (sortField && sortOrder && sortField in this.table)
      orderBy =
        sortOrder === 'desc'
          ? [desc(this.table[sortField])]
          : [asc(this.table[sortField])];

    const [data, dataCount] = await Promise.all([
      (this.db.query[this.tableName as any] as any).findMany({
        offset,
        limit,
        orderBy,
        ...config,
      }),
      this.db.select({ count: count() }).from(this.table),
    ]);

    const totalCount = Number(dataCount[0]?.count ?? 0);

    data['_totalCount'] = totalCount;

    return data;
  }

  async findFirst<
    TConfig extends Omit<
      DBQueryConfig<
        'many',
        true,
        TTablesRelationalConfig,
        TTablesRelationalConfig[TTableName]
      >,
      'limit'
    >,
  >(
    config?: KnownKeysOnly<
      TConfig,
      Omit<
        DBQueryConfig<
          'many',
          true,
          TTablesRelationalConfig,
          TTablesRelationalConfig[TTableName]
        >,
        'limit'
      >
    >,
  ): Promise<
    | BuildQueryResult<
        TTablesRelationalConfig,
        TTablesRelationalConfig[TTableName],
        TConfig
      >
    | undefined
  > {
    const result = await (
      this.db.query[this.tableName as any] as any
    ).findFirst(config);

    if (!result)
      throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });

    return result ?? undefined;
  }

  async create(item: TInsert): Promise<TSelect> {
    const [result] = await this.db
      .insert(this.table)
      .values(item as any)
      .returning();
    return result as TSelect;
  }

  async update(
    id: TSelect[keyof TSelect & 'id'],
    item: Partial<TInsert>,
  ): Promise<TSelect | undefined> {
    if (!Object.values(item).some((value) => value !== undefined)) return;

    const [result] = await this.db
      .update(this.table)
      .set(item as any)
      // @ts-expect-error - Drizzle's internal table ID mapping can be strict;
      .where(eq(this.table.id, id))
      .returning();

    return result as TSelect;
  }

  async delete(
    id: TSelect[keyof TSelect & 'id'],
  ): Promise<TSelect | undefined> {
    const existingRecord = await (
      this.db.query[this.tableName as any] as any
    ).findFirst({ where: eq((this.table as any).id, id) });

    if (!existingRecord)
      throw new NotFoundException({ code: SystemWideErrorCodes.NOT_FOUND });

    const [result] = await this.db
      .delete(this.table)
      // @ts-expect-error - Drizzle's internal table ID mapping can be strict;
      .where(eq(this.table.id, id))
      .returning();

    return result as TSelect;
  }
}
