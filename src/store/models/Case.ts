import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Case extends Model {
  static table = 'cases';

  @field('case_id') case_id!: string;
  @field('title') title!: string;
  @field('specialty') specialty!: string;
  @field('difficulty') difficulty!: string;
  @field('presentation') presentation!: string;
  @field('patient_image_url') patient_image_url!: string | null;
  @field('imaging_studies') imaging_studies!: string;
  @field('physical_exam') physical_exam!: string;
  @field('investigations') investigations!: string;
  @field('correct_diagnosis') correct_diagnosis!: string;
  @field('correct_management') correct_management!: string;
  @field('learning_points') learning_points!: string;
  @field('source') source!: string | null;
  @field('source_ref') source_ref!: string | null;
  @field('created_at') created_at!: number;
  @field('updated_at') updated_at!: number;

  get parsedImagingStudies() {
    try {
      return JSON.parse(this.imaging_studies);
    } catch {
      return [];
    }
  }

  get parsedPhysicalExam() {
    try {
      return JSON.parse(this.physical_exam);
    } catch {
      return {};
    }
  }

  get parsedInvestigations() {
    try {
      return JSON.parse(this.investigations);
    } catch {
      return {};
    }
  }

  get parsedManagement() {
    try {
      return JSON.parse(this.correct_management);
    } catch {
      return [];
    }
  }

  get parsedLearningPoints() {
    try {
      return JSON.parse(this.learning_points);
    } catch {
      return [];
    }
  }
}
