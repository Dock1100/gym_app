import {TWeekDayName} from "./const";

export type Exercise = {
  video_url: string;
  video_title: string;
  name: string;
  summary: string;
  primary_muscle_groups: string[];
  secondary_muscle_groups: string[];
  movement_type: string;
  steps: {
    text: string;
    timecode: number | null;
  }[]
}

export type TrainingDays = {
  [key in TWeekDayName]: {
    exerciseNames: string[]
  }
}
