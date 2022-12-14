import {Exercise} from "../types";
import {Container, Form, Modal} from "react-bootstrap";
import axios from "axios";
import Button from "react-bootstrap/Button";
import {EditableExerciseBlock} from "./edit_exercise";
import React, {useRef, useState} from "react";
import ReactPlayer from 'react-player/youtube';


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
  const handleClose = () => {
    console.log('ViewExercisesModal handleClose')
    _setShow(false);
  }

  const playerRef = useRef<ReactPlayer>(null);
  const [playerPlaying, setPlayerPlaying] = useState<boolean>(false);

  if (!show && playerPlaying) {
    setPlayerPlaying(false)
  }

  let youtubeVideoUrl: string | null = null
  if (exercise && exercise.video_url) {
    youtubeVideoUrl = exercise.video_url
  }

  return <Modal show={show} onHide={handleClose} fullscreen={true}>
    <Modal.Header closeButton>
      <Modal.Title>{exercise?.name}</Modal.Title>
    </Modal.Header>
    <Modal.Body style={{padding: 0}}>
      {show && youtubeVideoUrl && <>
        <div className='sticky-top' style={{
          aspectRatio: 16 / 9,
        }}>
          <ReactPlayer url={youtubeVideoUrl} width="100%" height="100%" className="w-100 h-100"
                       ref={playerRef}
                       playing={playerPlaying}
          />
        </div>
        <hr/>
      </>}
      <Container>
        <hr/>
        {exercise != null && <EditableExerciseBlock
          value={exercise}
          onTimeCodeClick={(timecode: number) => {
            playerRef.current?.seekTo(timecode, 'seconds');
            setPlayerPlaying(!!(playerRef.current))
          }}/>}
      </Container>
    </Modal.Body>
  </Modal>
}