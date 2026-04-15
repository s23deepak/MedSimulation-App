import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Session extends Model {
  static table = 'sessions';

  @field('session_id') session_id!: string;
  @field('case_id') case_id!: string;
  @field('case_title') case_title!: string;
  @field('resident_name') resident_name!: string;
  @field('status') status!: string;
  @field('started_at') started_at!: number;
  @field('completed_at') completed_at!: number | null;
  @field('elapsed_seconds') elapsed_seconds!: number;
  @field('history') history!: string;
  @field('exams_performed') exams_performed!: string;
  @field('investigations_ordered') investigations_ordered!: string;
  @field('imaging_viewed') imaging_viewed!: string;
  @field('submitted_diagnosis') submitted_diagnosis!: string | null;
  @field('submitted_management') submitted_management!: string | null;
  @field('score') score!: string | null;
  @field('debrief') debrief!: string | null;

  get parsedHistory() {
    try {
      return JSON.parse(this.history);
    } catch {
      return [];
    }
  }

  get parsedExamsPerformed() {
    try {
      return JSON.parse(this.exams_performed);
    } catch {
      return [];
    }
  }

  get parsedInvestigationsOrdered() {
    try {
      return JSON.parse(this.investigations_ordered);
    } catch {
      return [];
    }
  }

  get parsedImagingViewed() {
    try {
      return JSON.parse(this.imaging_viewed);
    } catch {
      return [];
    }
  }

  get parsedScore() {
    try {
      return JSON.parse(this.score || '{}');
    } catch {
      return null;
    }
  }

  get parsedDebrief() {
    try {
      return JSON.parse(this.debrief || '{}');
    } catch {
      return null;
    }
  }
}
