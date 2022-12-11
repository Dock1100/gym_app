import {Exercise} from "../types";
import {Form, Modal} from "react-bootstrap";
import axios from "axios";
import Button from "react-bootstrap/Button";
import {EditableExerciseBlock} from "./edit_exercise";
import React, {useState} from "react";


export type AddExercisesModalProps = {
  show?: boolean
  setShow?(show: boolean): void
  onSave?(exercises: Exercise[]): void
  onHide?(): void
}

export function AddExercisesModal({show, setShow, onSave}: AddExercisesModalProps) {
  let [_show, _setShow] = useState<boolean>(false);
  // @ts-ignore
  _setShow = setShow || _setShow;
  if (show !== undefined) {
    _show = show;
  }
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=eMjyvIQbn9M');
  // https://www.youtube.com/watch?v=eMjyvIQbn9M
  // https://www.youtube.com/watch?v=R6gZoAzAhCg - very bad one
  // https://www.youtube.com/watch?v=IODxDxX7oi4
  const handleClose = () => _setShow(false);
  const handleSave = () => {
    handleClose();
    setExercises([]);
    if (onSave) {
      onSave(exercises);
    }
  }


  return <Modal show={show} onHide={handleClose} fullscreen={true}>
    <Modal.Header closeButton>
      <Modal.Title>Add exercise</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form onSubmit={(e) => {
        e.preventDefault();
        console.log('videoUrl', videoUrl);
        setIsLoading(true);
        axios({
          method: 'post',
          url: '/api/parse_video_by_url',
          data: {videoUrl}
        })
          .then(function (response) {
            console.log('response', response);
            setIsLoading(false);
            if (response.statusText == 'OK' && response.data.succeed_to_parse) {
              console.log('exercises', response.data.exercises);
              setExercises(response.data.exercises)
            } else {
              alert('failed to load');
              setExercises([])
            }
          }).catch(()=>{
            alert('failed to load, catch');
            setIsLoading(false);
            
        });
      }}>
        <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
          <Form.Label>Youtube url</Form.Label>
          <Form.Control
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            autoFocus
          />
        </Form.Group>
        {isLoading && <p>Loading...</p>}
        {!isLoading && <Button type="submit">Parse</Button>}
      </Form>
      <hr/>
      {!!exercises.length && <><div>video block</div><hr/></>}
      {exercises.map((exercise: any, i) =>
        <EditableExerciseBlock value={exercise} key={i}
                               onChange={(ex) => {
                                 let exercisesCopy = [...exercises];
                                 exercisesCopy[i] = ex;
                                 setExercises(exercisesCopy)
                               }}/>)}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="primary" onClick={handleSave} disabled={!exercises.length}>
        Save
      </Button>
    </Modal.Footer>
  </Modal>
}