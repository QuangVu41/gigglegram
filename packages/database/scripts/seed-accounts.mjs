import dotenv from 'dotenv';
import { Client } from 'pg';
import { hashPassword } from 'better-auth/crypto';

dotenv.config({ path: '.env' });

const DEFAULT_PLAIN_PASSWORD = 'Password@123';
const TOTAL_USERS = 400;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is missing in .env');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const userIds = Array.from({ length: TOTAL_USERS }, (_, idx) => {
      const n = String(idx + 1).padStart(4, '0');
      return `user_${n}`;
    });

    const existingUsersRes = await client.query(
      `
      SELECT id
      FROM users
      WHERE id = ANY($1::text[])
      ORDER BY id
      `,
      [userIds],
    );

    if (existingUsersRes.rows.length === 0) {
      console.log(
        'No matching users found for user_0001..user_0400. Nothing to seed.',
      );
      return;
    }

    const ids = [];
    const accountIds = [];
    const providerIds = [];
    const userIdValues = [];
    const passwords = [];
    const updatedAts = [];

    for (const [index, row] of existingUsersRes.rows.entries()) {
      const id = row.id;
      const hash = await hashPassword(DEFAULT_PLAIN_PASSWORD);

      ids.push(`acc_${String(index + 1).padStart(4, '0')}`);
      accountIds.push(id);
      providerIds.push('credential');
      userIdValues.push(id);
      passwords.push(hash);
      updatedAts.push(new Date());
    }

    await client.query(
      `
      INSERT INTO accounts (
        id,
        account_id,
        provider_id,
        user_id,
        password,
        updated_at
      )
      SELECT *
      FROM unnest(
        $1::text[],
        $2::text[],
        $3::text[],
        $4::text[],
        $5::text[],
        $6::timestamp[]
      )
      ON CONFLICT (id) DO UPDATE
      SET
        account_id = EXCLUDED.account_id,
        provider_id = EXCLUDED.provider_id,
        user_id = EXCLUDED.user_id,
        password = EXCLUDED.password,
        updated_at = EXCLUDED.updated_at
      `,
      [ids, accountIds, providerIds, userIdValues, passwords, updatedAts],
    );

    console.log(
      `Seeded credential accounts for ${existingUsersRes.rows.length} users.`,
    );
    console.log(`Default plain password used: ${DEFAULT_PLAIN_PASSWORD}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Failed to seed accounts:', error);
  process.exit(1);
});
