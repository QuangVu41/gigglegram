import {
  ENGAGEMENTS_SERVICE_GROUP_ID,
  FEED_SERVICE_GROUP_ID,
  REALTIME_SERVICE_GROUP_ID,
} from "@ts/src/kafka";
import * as postTopics from "@ts/src/kafka/posts/topics";
import * as userTopics from "@ts/src/kafka/users/topics";
import * as adminTopics from "@ts/src/kafka/admin/topics";

export const KAFKA_LAG_CONFIG = {
  consumerGroups: [
    {
      groupId: ENGAGEMENTS_SERVICE_GROUP_ID,
      topics: [
        postTopics.POSTS_TOPIC_POST_CREATED,
        postTopics.POSTS_TOPIC_POST_UPDATED,
        postTopics.POSTS_TOPIC_POST_DELETED,
        userTopics.USERS_TOPIC_USER_FOLLOWED,
        userTopics.USERS_TOPIC_USER_UNFOLLOWED,
      ],
    },
    {
      groupId: FEED_SERVICE_GROUP_ID,
      topics: [postTopics.POSTS_TOPIC_POST_CREATED],
    },
    {
      groupId: REALTIME_SERVICE_GROUP_ID,
      topics: [
        userTopics.USERS_TOPIC_USER_FOLLOWED,
        userTopics.USERS_TOPIC_USER_FOLLOW_ACCEPTED,
        postTopics.POSTS_TOPIC_POST_LIKED,
        postTopics.POSTS_TOPIC_POST_CREATED,
        postTopics.POSTS_TOPIC_POST_COLLABORATOR_ACCEPTED,
        adminTopics.POST_REPORTS_TOPIC_REVIEWER_ASSIGNED,
        adminTopics.POST_REPORTS_TOPIC_REPORT_UPDATED,
      ],
    },
  ],
  thresholds: {
    warning: 1_000,
    critical: 10_000,
  },
};

export type LagLevel = "healthy" | "warning" | "critical" | "alert";
