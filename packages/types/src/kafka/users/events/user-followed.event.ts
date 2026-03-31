export class UserFollowedEvent {
  constructor(
    public readonly followerUserId: string,
    public readonly followingUserId: string,
  ) {}
}
