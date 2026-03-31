export class PostLikedEvent {
  constructor(
    public readonly postId: string,
    public readonly actorId: string,
  ) {}
}
