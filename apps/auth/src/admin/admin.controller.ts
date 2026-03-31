import { Controller, Get, Query } from '@nestjs/common';
import { AdminService } from '@/src/admin/admin.service';
import { DateRangeQueryDto } from '@/src/admin/dto/date-range-query.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats/active-users')
  async getActiveUsersStats(@Query() dateRangeQueryDto: DateRangeQueryDto) {
    return await this.adminService.getActiveUsersStats(dateRangeQueryDto);
  }

  @Get('stats/total-users')
  async getTotalUsersStats() {
    return await this.adminService.getTotalUsersStats();
  }

  @Get('stats/new-signups')
  async getNewSignupsStats(@Query() dateRangeQueryDto: DateRangeQueryDto) {
    return await this.adminService.getNewSignupsStats(dateRangeQueryDto);
  }

  @Get('stats/user-retention-rate')
  async getUserRetentionRateStats(
    @Query() dateRangeQueryDto: DateRangeQueryDto,
  ) {
    return await this.adminService.getUserRetentionRateStats(dateRangeQueryDto);
  }

  @Get('stats/content-activity/media-volume')
  async getMediaVolumeStats(@Query() dateRangeQueryDto: DateRangeQueryDto) {
    return await this.adminService.getMediaVolumeStats(dateRangeQueryDto);
  }

  @Get('stats/content-activity/engagement-breakdown')
  async getEngagementBreakdownStats(
    @Query() dateRangeQueryDto: DateRangeQueryDto,
  ) {
    return await this.adminService.getEngagementBreakdownStats(
      dateRangeQueryDto,
    );
  }

  @Get('stats/content-activity/average-engagement-per-post')
  async getAverageEngagementPerPostStats(
    @Query() dateRangeQueryDto: DateRangeQueryDto,
  ) {
    return await this.adminService.getAverageEngagementPerPostStats(
      dateRangeQueryDto,
    );
  }

  @Get('stats/content-activity/popular-content')
  async getPopularContentStats() {
    return await this.adminService.getPopularContentStats();
  }

  @Get('stats/storage-usage')
  async getStorageUsageStats() {
    return await this.adminService.getStorageUsageStats();
  }

  @Get('stats/moderation/average-response-time')
  async getAverageResponseTimeStats(
    @Query() dateRangeQueryDto: DateRangeQueryDto,
  ) {
    return await this.adminService.getAverageResponseTimeStats(
      dateRangeQueryDto,
    );
  }

  @Get('stats/kafka-lag')
  async getKafkaLagStats() {
    return await this.adminService.getKafkaLagStats();
  }
}
