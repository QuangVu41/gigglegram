export class PostDeletedEvent<T extends object = {}> {
  constructor(
    public readonly userId: string,
    public readonly postId: string,
    public readonly hashtagIds: string[],
    public readonly postMediaData: T,
    public readonly locationId?: string,
    public readonly audioId?: string,
    public readonly collectionIds?: string[],
  ) {}
}
