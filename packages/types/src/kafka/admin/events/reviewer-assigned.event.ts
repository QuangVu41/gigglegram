export class ReviewerAssignedEvent {
  constructor(
    public readonly reportId: string,
    public readonly assignerId: string,
    public readonly reviewerId: string,
  ) {}
}
