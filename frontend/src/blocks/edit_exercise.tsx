import {Col, Form, Row} from "react-bootstrap";
import React from "react";
import {Exercise} from "../types";


export type EditableExerciseBlockProps = {
  value?: Exercise
  onChange?(value: Exercise): void
  onTimeCodeClick?(timeCode: number): void
}

export function secToTime(seconds: number, separator: string = ":") {
    return [
        Math.floor(seconds / 60 / 60),
        Math.floor(seconds / 60 % 60),
        Math.floor(seconds % 60)
    ].join(separator)
    .replace(/\b(\d)\b/g, "0$1").replace(/^00\:/,'')
}


export function EditableExerciseBlock({onTimeCodeClick, value, onChange}: EditableExerciseBlockProps) {
  const [_exercise, _setExercise] = React.useState<Exercise>(value || {
    name: '',
    summary: '',
    video_url: '',
    video_title: '',
    primary_muscle_groups: [],
    secondary_muscle_groups: [],
    attention_to: [],
    movement_type: '',
    is_stretching: false,
    start_position: {text: '', timecode: 0},
    steps: []
  } as Exercise);

  const exercise = value || _exercise;

  const changeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('changeHandler', e.target.name, e.target.value);
    const _onChange = onChange || _setExercise;
    _onChange({...exercise, [e.target.name]: e.target.value});
  }

  return (<Form>
    <Form.Group as={Row}>
      <Form.Label column xs="3">Name</Form.Label>
      <Col xs="9"><Form.Control type="text" name="name" value={exercise.name} onChange={changeHandler}/></Col>
    </Form.Group>
    <br/>
    <p>Summary:</p>
    <p>{exercise.summary}</p>
    <p>Movement: {exercise.movement_type}</p>
    <p>Muscle groups:</p>
    <p>primary: {exercise.primary_muscle_groups.join(', ')}</p>
    <p>secondary: {exercise.secondary_muscle_groups.join(', ')}</p>
    <p>Steps:</p>
    <ul>
      {exercise.steps.map((step: any, i: number) => <li key={i}>
        {step.timecode != null && <a href='#' onClick={() => onTimeCodeClick && onTimeCodeClick(step.timecode)}>{secToTime(step.timecode)}</a>} {step.text}
      </li>)}
    </ul>
  </Form>)

}