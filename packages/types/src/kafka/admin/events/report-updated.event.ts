export class ReportUpdatedEvent {
  constructor(
    public readonly reportId: string,
    public readonly reviewerId: string,
  ) {}
}
