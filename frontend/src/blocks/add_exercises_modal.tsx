import {Exercise} from "../types";
import {Container, Form, Modal} from "react-bootstrap";
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

export function parseYoutubeVideoId(url: string): string | null {
  const match = url.match(/^https?:\/\/(?:(?:youtu\.be\/)|(?:(?:www\.)?youtube\.com\/(?:(?:watch\?(?:[^&]+&)?vi?=)|(?:vi?\/)|(?:shorts\/))))([a-zA-Z0-9_-]{11,})/i)
  if (match) {
    return match[1]
  }
  return null
}

export function AddExercisesModal({show, setShow, onSave}: AddExercisesModalProps) {
  let [_show, _setShow] = useState<boolean>(false);
  let [playerState, setPlayerState] = useState<null>(null);
  // @ts-ignore
  _setShow = setShow || _setShow;
  if (show !== undefined) {
    _show = show;
  }
  const [isLoading, setIsLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=IODxDxX7oi4');
  // const [videoUrl, setVideoUrl] = useState<string>('https://www.youtube.com/watch?v=eMjyvIQbn9M');
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

  let youtubeVideoId: string | null = null
  if (exercises.length && exercises[0].video_url) {
    youtubeVideoId = parseYoutubeVideoId(exercises[0].video_url)
  }
  if (!youtubeVideoId && playerState) {
    setPlayerState(null)
  }

  return <Modal show={show} onHide={handleClose} fullscreen={true}>
    <Modal.Header closeButton>
      <Modal.Title>Add exercise</Modal.Title>
    </Modal.Header>
    <Modal.Body style={{padding: 0}}>
      <Container>
        <br/>
        <Form onSubmit={(e) => {
          e.preventDefault();
          console.log('videoUrl', videoUrl);
          setIsLoading(true);
          setExercises([])
          setPlayerState(null)
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
                let exercises: Exercise[] = []
                for (let exRaw of response.data.exercises) {
                  exercises.push({
                    name: exRaw.name,
                    summary: exRaw.summary,
                    video_url: response.data.url,
                    video_title: response.data.title,
                    primary_muscle_groups: exRaw.primary_muscle_groups,
                    secondary_muscle_groups: exRaw.secondary_muscle_groups,
                    movement_type: exRaw.movement_type,
                    steps: [{text: exRaw.start_position.text, timecode: exRaw.start_position.timecode}]
                      .concat(exRaw.steps.map((step: any) => ({text: step.text, timecode: step.timecode})))
                      .filter((step) => step.text.trim().length > 0)
                  })

                }
                console.log('setExercises', exercises)
                setExercises(exercises)
              } else {
                alert('failed to load');
                setExercises([])
              }
            }).catch(() => {
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
          {!isLoading && <Button type="submit" className="w-100">Process</Button>}
        </Form>
      </Container>
      <hr/>
      {show && youtubeVideoId && <>
        <div className='sticky-top' style={{
          aspectRatio: 16 / 9,
        }}>
          <div>youtube block</div>
          {/*<YouTube className='w-100 h-100' opts={{*/}
          {/*  width: "100%",*/}
          {/*  height: "100%",*/}
          {/*}} videoId={youtubeVideoId} onReady={(e) => {*/}
          {/*  // @ts-ignore*/}
          {/*  setPlayerState(e.target)*/}
          {/*}}/>*/}
        </div>
        <hr/>
      </>}
      <Container>
        {exercises.map((exercise: any, i) =>
          <><EditableExerciseBlock value={exercise} key={i}
                                 onTimeCodeClick={(timecode: number) => {
                                   // let p = playerState;
                                   // if (p) {
                                   //   p.seekTo(timecode, true)
                                   //   p.playVideo()
                                   // }
                                 }}
                                 onChange={(ex) => {
                                   let exercisesCopy = [...exercises];
                                   exercisesCopy[i] = ex;
                                   setExercises(exercisesCopy)
                                 }}/><hr/></>)}
      </Container>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="primary" onClick={handleSave} disabled={!exercises.length}>
        Save
      </Button>
    </Modal.Footer>
  </Modal>
}