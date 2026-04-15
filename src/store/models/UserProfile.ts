import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class UserProfile extends Model {
  static table = 'user_profiles';

  @field('name') name!: string;
  @field('email') email!: string | null;
  @field('total_sessions') total_sessions!: number;
  @field('average_score') average_score!: number;
  @field('created_at') created_at!: number;
}
