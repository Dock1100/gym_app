export type Exercise = {
  name: string;
  summary: string;
  primary_muscle_groups: string[];
  secondary_muscle_groups: string[];
  attention_to: string[];
  movement_type: string;
  is_stretching: boolean;
  start_position: {
    text: string;
  },
  steps: {
    text: string;
  }[]
}