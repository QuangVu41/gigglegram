import { relations } from 'drizzle-orm';
import {
  boolean,
  check,
  decimal,
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
import { sql } from 'drizzle-orm';
import { comments } from '@db/src/drizzle/schemas/real-time-schemas';

export const postUserTagsStatusEnum = pgEnum('post_user_tags_status', [
  'pending',
  'accepted',
  'rejected',
]);

export const postCollaboratorsStatusEnum = pgEnum(
  'post_collaborators_status',
  postUserTagsStatusEnum.enumValues,
);

export const postMediaStatus = pgEnum('post_status', [
  'pending',
  'published',
  'failed',
]);

export const languageEnum = pgEnum('language', ['en', 'vi']);

export const postMediaModerationStatus = pgEnum(
  'post_media_moderation_status',
  ['pending', 'approved', 'flagged'],
);

export const contentReportsType = pgEnum('content_reports_type', [
  'post',
  'story',
]);

export const storyStatus = pgEnum('story_status', postMediaStatus.enumValues);

export const reportReasonsCategoryEnum = pgEnum('report_reasons_category', [
  'spam',
  'harassment',
  'violence',
  'hate_speech',
  'misinformation',
  'copyright',
  'adult',
]);

export const contentReportsStatusEnum = pgEnum('content_reports_status', [
  'pending',
  'under_review',
  'resolved',
  'dismissed',
]);

export const contentReportsActionTakenEnum = pgEnum(
  'content_reports_action_taken',
  ['post_removed', 'account_warned', 'account_suspended', 'no_action'],
);

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
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    language: languageEnum('language').default('en').notNull(),
  },
  (table) => [
    index('posts_userId_idx').on(table.userId),
    index('posts_locationId_idx').on(table.locationId),
    index('posts_audioId_idx').on(table.audioId),
    index('posts_caption_search_idx').using(
      'gin',
      sql`to_tsvector('english', ${table.caption})`,
    ),
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
    originalRawFileUrl: varchar('original_raw_file_url').unique().notNull(),
    mediaType: varchar('media_type').notNull(),
    thumbnailUrl: varchar('thumbnail_url').notNull(),
    displayOrder: integer('display_order').notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    altText: text('alt_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    transcoderJobName: varchar('transcoder_job_name').unique(),
    status: postMediaStatus('status').default('pending').notNull(),
    moderationStatus: postMediaModerationStatus('moderation_status')
      .default('pending')
      .notNull(),
    moderationReason: text('moderation_reason'),
  },
  (table) => [index('postMedia_postId_idx').on(table.postId)],
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
    unique('postHashtags_postId_hashtagId_unique').on(
      table.postId,
      table.hashtagId,
    ),
  ],
);

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    latitude: decimal('latitude').notNull(),
    longitude: decimal('longitude').notNull(),
    city: text('city').notNull(),
    country: text('country').notNull(),
    postsCount: integer('posts_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('locations_name_city_country_search_idx').using(
      'gin',
      sql`(setweight(to_tsvector('english', ${table.name}), 'A') || setweight(to_tsvector('english', ${table.city}), 'B') || setweight(to_tsvector('english', ${table.country}), 'C'))`,
    ),
  ],
);

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaUrl: varchar('media_url'),
    originalRawFileUrl: varchar('original_raw_file_url').unique(),
    mediaType: varchar('media_type'),
    thumbnailUrl: varchar('thumbnail_url'),
    duration: integer('duration'),
    width: integer('width'),
    height: integer('height'),
    status: storyStatus('status').default('pending').notNull(),
    transcoderJobName: varchar('transcoder_job_name').unique(),
    viewsCount: integer('views_count').default(0).notNull(),
    moderationStatus: postMediaModerationStatus('moderation_status')
      .default('pending')
      .notNull(),
    moderationReason: text('moderation_reason'),
    altText: text('alt_text'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [index('stories_userId_idx').on(table.userId)],
);

export const storyHighlights = pgTable(
  'story_highlights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title').notNull(),
    coverStoryId: uuid('cover_story_id').references(() => stories.id, {
      onDelete: 'set null',
    }),
    storiesCount: integer('stories_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('storyHighlights_userId_idx').on(table.userId)],
);

export const storyHighlightItems = pgTable(
  'story_highlight_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    highlightId: uuid('highlight_id')
      .notNull()
      .references(() => storyHighlights.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('storyHighlightItems_highlightId_idx').on(table.highlightId),
    index('storyHighlightItems_storyId_idx').on(table.storyId),
    unique('storyHighlightItems_highlightId_storyId_unique').on(
      table.highlightId,
      table.storyId,
    ),
  ],
);

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

export const savedPosts = pgTable(
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
    unique('savedPosts_userId_postId_unique').on(table.userId, table.postId),
  ],
);

export const savedAudioTracks = pgTable(
  'saved_audio_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    audioTrackId: uuid('audio_track_id')
      .notNull()
      .references(() => audioTracks.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('savedAudioTracks_userId_idx').on(table.userId),
    index('savedAudioTracks_audioTrackId_idx').on(table.audioTrackId),
    unique('savedAudioTracks_userId_audioTrackId_unique').on(
      table.userId,
      table.audioTrackId,
    ),
  ],
);

export const postCollaborators = pgTable(
  'post_collaborators',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: postCollaboratorsStatusEnum('status').default('pending').notNull(),
    isOriginalAuthor: boolean('is_original_author').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at'),
  },
  (table) => [
    index('postCollaborators_postId_idx').on(table.postId),
    index('postCollaborators_userId_idx').on(table.userId),
    unique('postCollaborators_postId_userId_unique').on(
      table.postId,
      table.userId,
    ),
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
    acceptedAt: timestamp('accepted_at'),
  },
  (table) => [
    index('postUserTags_postId_idx').on(table.postId),
    index('postUserTags_userId_idx').on(table.userId),
    index('postUserTags_mediaId_idx').on(table.mediaId),
    unique('postUserTags_postId_userId_mediaId_unique').on(
      table.postId,
      table.userId,
      table.mediaId,
    ),
  ],
);

export const reportReasons = pgTable('report_reasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  reasonCode: varchar('reason_code').notNull().unique(),
  description: text('description').notNull(),
  displayOrder: decimal('display_order').notNull(),
  category: reportReasonsCategoryEnum('category').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportedUserId: text('reported_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    storyId: uuid('story_id').references(() => stories.id, {
      onDelete: 'cascade',
    }),
    reasonId: uuid('reason_id')
      .notNull()
      .references(() => reportReasons.id, {
        onDelete: 'set null',
      }),
    additionalInfo: text('additional_info'),
    status: contentReportsStatusEnum('status').default('pending').notNull(),
    type: contentReportsType('type').notNull().default('post'),
    reviewedBy: text('reviewed_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    reviewerNotes: text('reviewer_notes'),
    actionTaken: contentReportsActionTakenEnum('action_taken'),
    reportedAt: timestamp('reported_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
    reviewedAt: timestamp('reviewed_at'),
  },
  (table) => [
    index('contentReports_reporterId_idx').on(table.reporterId),
    index('contentReports_reportedUserId_idx').on(table.reportedUserId),
    index('contentReports_postId_idx').on(table.postId),
    index('contentReports_storyId_idx').on(table.storyId),
    index('contentReports_reasonId_idx').on(table.reasonId),
    index('contentReports_status_idx').on(table.status),
    check(
      'content_reports_one_ref_check',
      sql`(
            (post_id IS NOT NULL)::int + 
            (story_id IS NOT NULL)::int
          ) <= 1`,
    ),
  ],
);

export const likes = pgTable(
  'likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('likes_userId_idx').on(table.userId),
    index('likes_postId_idx').on(table.postId),
    unique('likes_userId_postId_unique').on(table.userId, table.postId),
  ],
);

// ---------- RELATIONS ----------
export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [posts.locationId],
    references: [locations.id],
  }),
  audioTrack: one(audioTracks, {
    fields: [posts.audioId],
    references: [audioTracks.id],
  }),
  postCollaborators: many(postCollaborators),
  postUserTags: many(postUserTags),
  postHashtags: many(postHashtags),
  postMedia: many(postMedia),
  savedPosts: many(savedPosts),
  contentReports: many(contentReports),
  likes: many(likes),
  comments: many(comments),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
}));

export const savedCollectionsRelations = relations(
  savedCollections,
  ({ one, many }) => ({
    user: one(users, {
      fields: [savedCollections.userId],
      references: [users.id],
    }),
    savedPosts: many(savedPosts),
  }),
);

export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
  user: one(users, {
    fields: [savedPosts.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [savedPosts.postId],
    references: [posts.id],
  }),
  collection: one(savedCollections, {
    fields: [savedPosts.collectionId],
    references: [savedCollections.id],
  }),
}));

export const savedAudioTracksRelations = relations(savedAudioTracks, ({ one }) => ({
  user: one(users, {
    fields: [savedAudioTracks.userId],
    references: [users.id],
  }),
  audioTrack: one(audioTracks, {
    fields: [savedAudioTracks.audioTrackId],
    references: [audioTracks.id],
  }),
}));

export const postUserTagsRelations = relations(postUserTags, ({ one }) => ({
  post: one(posts, {
    fields: [postUserTags.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postUserTags.userId],
    references: [users.id],
  }),
  media: one(postMedia, {
    fields: [postUserTags.mediaId],
    references: [postMedia.id],
  }),
}));

export const postCollaboratorsRelations = relations(
  postCollaborators,
  ({ one }) => ({
    post: one(posts, {
      fields: [postCollaborators.postId],
      references: [posts.id],
    }),
    user: one(users, {
      fields: [postCollaborators.userId],
      references: [users.id],
    }),
  }),
);

export const audioTracksRelations = relations(audioTracks, ({ one, many }) => ({
  uploader: one(users, {
    fields: [audioTracks.uploaderId],
    references: [users.id],
  }),
  posts: many(posts),
  savedAudioTracks: many(savedAudioTracks),
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  posts: many(posts),
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

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  storyHighlightItems: many(storyHighlightItems),
  storyHighlights: many(storyHighlights),
}));

export const storyHighlightsRelations = relations(
  storyHighlights,
  ({ one, many }) => ({
    user: one(users, {
      fields: [storyHighlights.userId],
      references: [users.id],
    }),
    storyHighlightItems: many(storyHighlightItems),
    story: one(stories, {
      fields: [storyHighlights.coverStoryId],
      references: [stories.id],
    }),
  }),
);

export const storyHighlightItemsRelations = relations(
  storyHighlightItems,
  ({ one }) => ({
    highlight: one(storyHighlights, {
      fields: [storyHighlightItems.highlightId],
      references: [storyHighlights.id],
    }),
    story: one(stories, {
      fields: [storyHighlightItems.storyId],
      references: [stories.id],
    }),
  }),
);

export const contentReportsRelations = relations(contentReports, ({ one }) => ({
  reporter: one(users, {
    fields: [contentReports.reporterId],
    references: [users.id],
  }),
  reportedUser: one(users, {
    fields: [contentReports.reportedUserId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [contentReports.postId],
    references: [posts.id],
  }),
  story: one(stories, {
    fields: [contentReports.storyId],
    references: [stories.id],
  }),
  reason: one(reportReasons, {
    fields: [contentReports.reasonId],
    references: [reportReasons.id],
  }),
  reviewer: one(users, {
    fields: [contentReports.reviewedBy],
    references: [users.id],
  }),
}));
