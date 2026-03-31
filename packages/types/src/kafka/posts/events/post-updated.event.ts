export class PostUpdatedEvent {
  constructor(
    public readonly postId: string,
    public readonly newHashtagIds: string[],
    public readonly deletingHashtagIds: string[],
    public readonly newCollaboratorIds: string[],
    public readonly deletingCollaboratorIds: string[],
    public readonly newPostUserTagsIds: string[],
    public readonly deletingPostUserTagsIds: string[],
  ) {}
}
