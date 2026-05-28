import { relations } from 'drizzle-orm';
import {
  accounts,
  invitations,
  members,
  sessions,
  users,
} from '@db/src/drizzle/schemas/auth-schemas';
import {
  likes,
  contentReports,
  posts,
  savedCollections,
  savedPosts,
  stories,
  storyHighlights,
} from '@db/src/drizzle/schemas/post-schemas';
import {
  followers,
  userNotificationSettings,
  userPrivacySettings,
} from '@db/src/drizzle/schemas/user-schemas';
import {
  commentLikes,
  comments,
  conversationParticipants,
  messages,
  notifications,
} from '@db/src/drizzle/schemas/real-time-schemas';

export const usersRelations = relations(users, ({ many, one }) => ({
  userPrivacySetting: one(userPrivacySettings),
  userNotificationSetting: one(userNotificationSettings),
  posts: many(posts),
  sessions: many(sessions),
  accounts: many(accounts),
  members: many(members),
  invitations: many(invitations),
  stories: many(stories),
  storyHighlights: many(storyHighlights),
  savedPosts: many(savedPosts),
  followers: many(followers, {
    relationName: 'user_followers',
  }),
  following: many(followers, {
    relationName: 'user_following',
  }),
  savedCollections: many(savedCollections),
  contentReports: many(contentReports),
  likes: many(likes),
  comments: many(comments),
  commentLikes: many(commentLikes),
  notifications: many(notifications, {
    relationName: 'user_notifications',
  }),
  notificationActors: many(notifications, {
    relationName: 'notification_actors',
  }),
  messages: many(messages),
  conversationParticipants: many(conversationParticipants),
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
