import { relations } from 'drizzle-orm';
import {
  accounts,
  sessions,
  users,
} from '@db/src/drizzle/schemas/auth-schemas';
import { posts } from '@db/src/drizzle/schemas/post-schemas';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
