export class PostDeletedEvent<T extends object = {}> {
  constructor(
    public readonly postId: string,
    public readonly hashtagIds: string[],
    public readonly postMediaData: T,
    public readonly locationId?: string,
    public readonly audioId?: string,
  ) {}
}
