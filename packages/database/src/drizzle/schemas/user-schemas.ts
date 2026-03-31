import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from '@db/src/drizzle/schemas/auth-schemas';
import { relations } from 'drizzle-orm';

export const userPrivacySettingsWhoCanCommentEnum = pgEnum(
  'user_privacy_settings_who_can_comment',
  ['everyone', 'followers', 'no_one'],
);

export const userPrivacySettingsWhoCanTagEnum = pgEnum(
  'user_privacy_settings_who_can_tag',
  userPrivacySettingsWhoCanCommentEnum.enumValues,
);

export const userPrivacySettingsWhoCanMentionEnum = pgEnum(
  'user_privacy_settings_who_can_mention',
  userPrivacySettingsWhoCanCommentEnum.enumValues,
);

export const userPrivacySettingsWhoCanMessageEnum = pgEnum(
  'user_privacy_settings_who_can_message',
  userPrivacySettingsWhoCanCommentEnum.enumValues,
);

export const followersStatusEnum = pgEnum('followers_status', [
  'pending',
  'accepted',
  'rejected',
]);

export const followers = pgTable(
  'followers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    followerId: text('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: followersStatusEnum('status').notNull().default('accepted'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('followers_follower_id_idx').on(table.followerId),
    index('followers_following_id_idx').on(table.followingId),
  ],
);

export const userPrivacySettings = pgTable(
  'user_privacy_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountPrivate: boolean('account_private').notNull().default(false),
    whoCanComment: userPrivacySettingsWhoCanCommentEnum('who_can_comment')
      .notNull()
      .default('everyone'),
    whoCanTag: userPrivacySettingsWhoCanTagEnum('who_can_tag')
      .notNull()
      .default('everyone'),
    whoCanMention: userPrivacySettingsWhoCanMentionEnum('who_can_mention')
      .notNull()
      .default('everyone'),
    whoCanMessage: userPrivacySettingsWhoCanMessageEnum('who_can_message')
      .notNull()
      .default('everyone'),
    hideActivityStatus: boolean('hide_activity_status')
      .notNull()
      .default(false),
    hideLikesCount: boolean('hide_likes_count').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_privacy_settings_user_id_idx').on(table.userId)],
);

export const userNotificationSettings = pgTable(
  'user_notification_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    likesNotifications: boolean('likes_notifications').notNull().default(true),
    commentsNotifications: boolean('comments_notifications')
      .notNull()
      .default(true),
    newFollowersNotifications: boolean('new_followers_notifications')
      .notNull()
      .default(true),
    mentionsNotifications: boolean('mentions_notifications')
      .notNull()
      .default(true),
    messagesNotifications: boolean('messages_notifications')
      .notNull()
      .default(true),
    videoCallsNotifications: boolean('video_calls_notifications')
      .notNull()
      .default(true),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('user_notification_settings_user_id_idx').on(table.userId)],
);

export const followerRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
    relationName: 'user_following',
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
    relationName: 'user_followers',
  }),
}));

export const userPrivacySettingsRelations = relations(
  userPrivacySettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userPrivacySettings.userId],
      references: [users.id],
    }),
  }),
);

export const userNotificationSettingsRelations = relations(
  userNotificationSettings,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotificationSettings.userId],
      references: [users.id],
    }),
  }),
);
