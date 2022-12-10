import {Col, Form, Row} from "react-bootstrap";
import React from "react";
import {Exercise} from "../types/exercise";


export type EditableExerciseBlockProps = {
  value?: Exercise
  onChange?(value: Exercise): void
}

export function EditableExerciseBlock({value, onChange}: EditableExerciseBlockProps) {
  const [_exercise, _setExercise] = React.useState<Exercise>(value || {
    name: '',
    summary: '',
    primary_muscle_groups: [],
    secondary_muscle_groups: [],
    attention_to: [],
    movement_type: '',
    is_stretching: false,
    start_position: {text: ''},
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
    <p>Muscle groups:</p>
    <p>primary: {exercise.primary_muscle_groups.join(', ')}</p>
    <p>secondary: {exercise.secondary_muscle_groups.join(', ')}</p>
    <p>Type: {exercise.is_stretching ? 'stretching' : exercise.movement_type}</p>
    <p>Pay attention to:</p>
    <ul>
      {exercise.attention_to.map((item: any, i: number) => <li key={i}>{item}</li>)}
    </ul>
    <p>Steps:</p>
    <ul>
      <li>{exercise.start_position.text}</li>
      {exercise.steps.map((step: any, i: number) => <li key={i}>{step.text}</li>)}
    </ul>
  </Form>)

}