import { relations } from 'drizzle-orm';
import {
  accounts,
  invitations,
  members,
  sessions,
  users,
} from '@db/src/drizzle/schemas/auth-schemas';
import {
  posts,
  stories,
  storyHighlights,
} from '@db/src/drizzle/schemas/post-schemas';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  sessions: many(sessions),
  accounts: many(accounts),
  members: many(members),
  invitations: many(invitations),
  stories: many(stories),
  storyHighlights: many(storyHighlights),
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
