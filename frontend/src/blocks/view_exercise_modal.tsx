import {Exercise} from "../types";
import {Form, Modal} from "react-bootstrap";
import axios from "axios";
import Button from "react-bootstrap/Button";
import {EditableExerciseBlock} from "./edit_exercise";
import React, {useState} from "react";


export type ViewExerciseModalProps = {
  exercise?: Exercise
  show?: boolean
  setShow?(show: boolean): void
}

export function ViewExercisesModal({exercise, show, setShow}: ViewExerciseModalProps) {
  let [_show, _setShow] = useState<boolean>(false);
  // @ts-ignore
  _setShow = setShow || _setShow;
  if (show !== undefined) {
    _show = show;
  }
  const handleClose = () => _setShow(false);

  return <Modal show={show} onHide={handleClose} fullscreen={true}>
    <Modal.Header closeButton>
      <Modal.Title>{exercise?.name}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <div>video block</div>
      <hr/>
      {exercise != null && <EditableExerciseBlock value={exercise}/>}
    </Modal.Body>
  </Modal>
}