import { SQL, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

export const createTSQuery = <T extends PgTable>(
  columns: (keyof T['_']['columns'])[],
  keyword: string,
): SQL | undefined => {
  const normalizedKeyword = keyword.trim();
  if (columns.length === 0 || !normalizedKeyword) return;

  // Add prefix operator (&*) for prefix matching to support partial keyword searches like "qug"
  const keywordWithPrefix = normalizedKeyword
    .split(' ')
    .map((word) => `${word}:*`)
    .join(' & ');
  const tsQuery = sql`to_tsquery('english', ${keywordWithPrefix})`;

  if (columns.length === 1) {
    const column = String(columns[0]);
    return sql`to_tsvector('english', ${sql.raw(column)}) @@ ${tsQuery}`;
  } else if (columns.length > 1) {
    const tsvectorParts = columns.map((col, idx) => {
      const weight = String.fromCharCode(65 + idx);
      return sql`setweight(to_tsvector('english', ${sql.raw(String(col))}), ${sql.raw(`'${weight}'`)})`;
    });

    return sql`(${sql.join(tsvectorParts, sql.raw(' || '))}) @@ ${tsQuery}`;
  }
};
