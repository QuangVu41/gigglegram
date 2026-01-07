import { relations } from 'drizzle-orm';
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '@db/src/drizzle/schemas/auth-schemas';

export const postUserTagsStatusEnum = pgEnum('post_user_tags_status', [
  'pending',
  'approved',
  'rejected',
]);

export const postStatus = pgEnum('post_status', [
  'pending',
  'published',
  'failed',
]);

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id').references(() => locations.id, {
      onDelete: 'set null',
    }),
    audioId: uuid('audio_id').references(() => audioTracks.id, {
      onDelete: 'set null',
    }),
    caption: text('caption'),
    commentsDisabled: boolean('comments_disabled').default(false).notNull(),
    likesHidden: boolean('likes_hidden').default(false).notNull(),
    likesCount: integer('likes_count').default(0).notNull(),
    commentsCount: integer('comments_count').default(0).notNull(),
    sharesCount: integer('shares_count').default(0).notNull(),
    savesCount: integer('saves_count').default(0).notNull(),
    viewsCount: integer('views_count').default(0).notNull(),
    playsCount: integer('plays_count').default(0).notNull(),
    isReel: boolean('is_reel').default(false).notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    status: postStatus('status').default('pending').notNull(),
    transcoderJobName: varchar('transcoder_job_name').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('posts_userId_idx').on(table.userId),
    index('posts_locationId_idx').on(table.locationId),
    index('posts_audioId_idx').on(table.audioId),
  ],
);

export const audioTracks = pgTable(
  'audio_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    uploaderId: text('uploader_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    title: varchar('title'),
    audioUrl: varchar('audio_url').notNull(),
    duration: integer('duration').notNull(),
    thumbnailUrl: varchar('thumbnail_url'),
    usageCount: integer('usage_count').default(0).notNull(),
    isOriginal: boolean('is_original').default(true).notNull(),
    isTrending: boolean('is_trending').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('audioTracks_uploaderId_idx').on(table.uploaderId)],
);

export const hashtags = pgTable('hashtags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull().unique(),
  postsCount: integer('posts_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const postHashtags = pgTable(
  'post_hashtags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    hashtagId: uuid('hashtag_id')
      .notNull()
      .references(() => hashtags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('postHashtags_postId_idx').on(table.postId),
    index('postHashtags_hashtagId_idx').on(table.hashtagId),
  ],
);

export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    mediaUrl: varchar('media_url').notNull(),
    originalRawFileUrl: varchar('original_raw_file_url').unique(),
    mediaType: varchar('media_type').notNull(),
    thumbnailUrl: varchar('thumbnail_url').notNull(),
    displayOrder: integer('display_order').notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    altText: text('alt_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('postMedia_postId_idx').on(table.postId)],
);

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  latitude: decimal('latitude').notNull(),
  longitude: decimal('longitude').notNull(),
  city: varchar('city').notNull(),
  country: varchar('country').notNull(),
  postsCount: integer('posts_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const savedCollections = pgTable(
  'saved_collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name').notNull(),
    postsCount: integer('posts_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('savedCollections_userId_idx').on(table.userId)],
);

export const savedPost = pgTable(
  'saved_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id').references(() => savedCollections.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('savedPosts_userId_idx').on(table.userId),
    index('savedPosts_postId_idx').on(table.postId),
    index('savedPosts_collectionId_idx').on(table.collectionId),
  ],
);

export const postUserTags = pgTable(
  'post_user_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => postMedia.id, { onDelete: 'cascade' }),
    xPosition: decimal('x_position').notNull(),
    yPosition: decimal('y_position').notNull(),
    status: postUserTagsStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    approvedAt: timestamp('approved_at'),
  },
  (table) => [
    index('postUserTags_postId_idx').on(table.postId),
    index('postUserTags_userId_idx').on(table.userId),
    index('postUserTags_mediaId_idx').on(table.mediaId),
  ],
);

// ---------- RELATIONS ----------
export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  postHashtags: many(postHashtags),
  postMedia: many(postMedia),
}));

export const postMediaRelations = relations(postMedia, ({ one }) => ({
  post: one(posts, {
    fields: [postMedia.postId],
    references: [posts.id],
  }),
}));

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  postHashtags: many(postHashtags),
}));

export const postHashtagsRelations = relations(postHashtags, ({ one }) => ({
  post: one(posts, {
    fields: [postHashtags.postId],
    references: [posts.id],
  }),
  hashtag: one(hashtags, {
    fields: [postHashtags.hashtagId],
    references: [hashtags.id],
  }),
}));
