import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '@db/src/drizzle/schemas/auth-schemas';
import {
  postCollaborators,
  contentReports,
  posts,
  postUserTags,
  stories,
} from '@db/src/drizzle/schemas/post-schemas';
import { followers } from '@db/src/drizzle/schemas/user-schemas';
import { relations, sql } from 'drizzle-orm';

export const notificationsTypeEnum = pgEnum('notifications_type_enum', [
  'like',
  'comment',
  'follow',
  'mention',
  'follow_request',
  'follow_accept',
  'comment_like',
  'comment_reply',
  'tag',
  'post_share',
  'collab_invite',
  'collab_accept',
  'reel_like',
  'save',
  'assign_reviewer',
  'report_update',
  'media_violation',
]);

export const messagesTypeEnum = pgEnum('messages_type_enum', [
  'text',
  'image',
  'video',
  'file',
  'system',
]);

export const conversationsTypeEnum = pgEnum('conversations_type_enum', [
  'direct',
  'group',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    actorId: text('actor_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationsTypeEnum('type').notNull(),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    postUserTagId: uuid('post_user_tag_id').references(() => postUserTags.id, {
      onDelete: 'cascade',
    }),
    postCollabId: uuid('post_collab_id').references(
      () => postCollaborators.id,
      {
        onDelete: 'cascade',
      },
    ),
    commentId: uuid('comment_id').references(() => comments.id, {
      onDelete: 'cascade',
    }),
    reportId: uuid('report_id').references(() => contentReports.id, {
      onDelete: 'cascade',
    }),
    storyId: uuid('story_id').references(() => stories.id, {
      onDelete: 'cascade',
    }),
    content: text('content'),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_userId_idx').on(table.userId),
    index('notifications_actorId_idx').on(table.actorId),
    index('notifications_postId_idx').on(table.postId),
    index('notifications_postUserTagId_idx').on(table.postUserTagId),
    index('notifications_postCollabId_idx').on(table.postCollabId),
    index('notifications_commentId_idx').on(table.commentId),
    index('notifications_reportId_idx').on(table.reportId),
    index('notifications_storyId_idx').on(table.storyId),
    index('notifications_userId_isRead_idx').on(table.userId, table.isRead),
    index('notifications_createdAt_idx').on(table.createdAt),
    check(
      'notifications_one_ref_check',
      sql`(${table.postId} IS NOT NULL) OR (${table.postUserTagId} IS NOT NULL) OR (${table.postCollabId} IS NOT NULL) OR (${table.commentId} IS NOT NULL) OR (${table.reportId} IS NOT NULL) OR (${table.storyId} IS NOT NULL) OR (${table.type} IN ('follow', 'follow_request', 'follow_accept'))`,
    ),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    parentCommentId: uuid('parent_comment_id').references(
      (): AnyPgColumn => comments.id,
      {
        onDelete: 'cascade',
      },
    ),
    content: text('content').notNull(),
    likesCount: integer('likes_count').notNull().default(0),
    repliesCount: integer('replies_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('comments_postId_idx').on(table.postId),
    index('comments_userId_idx').on(table.userId),
    index('comments_parentCommentId_idx').on(table.parentCommentId),
  ],
);

export const commentLikes = pgTable(
  'comment_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('comment_likes_commentId_idx').on(table.commentId),
    index('comment_likes_userId_idx').on(table.userId),
    unique('comment_likes_userId_commentId_unique').on(
      table.userId,
      table.commentId,
    ),
  ],
);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: conversationsTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
  lastMessageAt: timestamp('last_message_at'),
});

export const conversationParticipants = pgTable(
  'conversation_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    isAdmin: boolean('is_admin').notNull().default(false),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastReadAt: timestamp('last_read_at'),
    notificationsEnabled: boolean('notifications_enabled')
      .notNull()
      .default(true),
    isDeleted: boolean('is_deleted').notNull().default(false),
  },
  (table) => [
    index('conversation_participants_conversationId_idx').on(
      table.conversationId,
    ),
    index('conversation_participants_userId_idx').on(table.userId),
    unique('conversation_participants_conversationId_userId_unique').on(
      table.conversationId,
      table.userId,
    ),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    content: text('content'),
    type: messagesTypeEnum('type').notNull(),
    replyToMessageId: uuid('reply_to_message_id').references(
      (): AnyPgColumn => messages.id,
      {
        onDelete: 'cascade',
      },
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    isDeleted: boolean('is_deleted').notNull().default(false),
  },
  (table) => [
    index('messages_senderId_idx').on(table.senderId),
    index('messages_conversationId_idx').on(table.conversationId),
    index('messages_replyToMessageId_idx').on(table.replyToMessageId),
  ],
);

export const messageMedia = pgTable(
  'message_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    mediaUrl: varchar('media_url').notNull(),
    mediaType: varchar('media_type').notNull(),
    displayOrder: integer('display_order').notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    altText: text('alt_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('messageMedia_messageId_idx').on(table.messageId)],
);

// ---------- RELATIONS ----------
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: 'user_notifications',
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: 'notification_actors',
  }),
  post: one(posts, {
    fields: [notifications.postId],
    references: [posts.id],
  }),
  postUserTag: one(postUserTags, {
    fields: [notifications.postUserTagId],
    references: [postUserTags.id],
  }),
  postCollab: one(postCollaborators, {
    fields: [notifications.postCollabId],
    references: [postCollaborators.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
  report: one(contentReports, {
    fields: [notifications.reportId],
    references: [contentReports.id],
  }),
  story: one(stories, {
    fields: [notifications.storyId],
    references: [stories.id],
  }),
  follow: one(followers, {
    fields: [notifications.actorId, notifications.userId],
    references: [followers.followerId, followers.followingId],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'comment_replies',
  }),
  replies: many(comments, {
    relationName: 'comment_replies',
  }),
  likes: many(commentLikes),
}));

export const commentLikesRelations = relations(commentLikes, ({ one }) => ({
  comment: one(comments, {
    fields: [commentLikes.commentId],
    references: [comments.id],
  }),
  user: one(users, {
    fields: [commentLikes.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyToMessage: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  media: many(messageMedia),
}));

export const messageMediaRelations = relations(messageMedia, ({ one }) => ({
  message: one(messages, {
    fields: [messageMedia.messageId],
    references: [messages.id],
  }),
}));

export const participantsRelations = relations(
  conversationParticipants,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationParticipants.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationParticipants.userId],
      references: [users.id],
    }),
  }),
);

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));
