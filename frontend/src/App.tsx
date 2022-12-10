import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';

import './App.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Col, Container, Form, InputGroup, Modal, Nav, Navbar, NavDropdown, Row, Stack} from "react-bootstrap";
import axios from "axios";
import {EditableExerciseBlock} from "./blocks/edit_exercise";
import {Exercise} from "./types/exercise";
import {AddExercisesModal} from "./blocks/add_exercises_modal";
import {ViewExercisesModal} from "./blocks/view_exercise_modal";

const MUSCLE_GROUPS = ["neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings"]

type StoredStateType = {
  exercises: Exercise[],
  activeScreen: string,
}

function App() {
  const [storedState, setStoredState] = useState<StoredStateType>(() => {
      let savedState = localStorage.getItem('storedState')
      try {
        if (savedState) {
          let parsedState = JSON.parse(savedState) as StoredStateType
          console.log('loaded storedState', parsedState)
          return parsedState
        }
      } catch (e) {
        console.log('failed to load storedState', e)
      }

      return {
        exercises: [],
        activeScreen: 'schedule'
      }
    }
  )

  localStorage.setItem('storedState', JSON.stringify(storedState))


  const {exercises, activeScreen} = storedState
  const setExercises: Dispatch<SetStateAction<Exercise[]>> = (ep) => {
    setStoredState((p) => {
      if (!!ep && 'function' === typeof ep) {
        return {
          ...p,
          exercises: ep(p.exercises)
        }
      }
      return {...p, exercises: ep}
    })
  }


  const setActiveScreen = (activeScreen: string) => {
    setStoredState((p) => ({...p, activeScreen}))
  }
// const [activeScreen, setActiveScreen] = useState('schedule');
// const [exercises, setExercises] = useState<Exercise[]>([]);

  const [addExercisesModalShow, setAddExercisesModalShow] = useState(false);
  const [viewExerciseModalObj, setViewExerciseModalObj] = useState<Exercise | null>(null)

  const muscleGroupsWithoutExercises = []

  for (let group of MUSCLE_GROUPS) {
    let has_ex = false
    for (let ex of exercises) {
      for (let ex_g of ex.primary_muscle_groups) {
        if (ex_g.toLowerCase().includes(group.toLowerCase())) {
          has_ex = true;
          break;
        }
      }
      if (has_ex) {
        break
      }
    }
    if (!has_ex) {
      muscleGroupsWithoutExercises.push(group)
    }
  }

  return (
    <>
      <div style={{padding: '48px 0', height: "100%"}}>
        <div style={{
          background: "white",
          lineHeight: '48px',
          boxShadow: "0 0px 10px rgba(0,0,0,0.3)",
          position: 'fixed',
          width: '100%',
          top: 0,
          height: '48px'
        }}>
          <Container>
            {activeScreen == 'exercises' && <Row>
              <Col></Col>
              <Col xs={6} className="text-center">
                My exercises
              </Col>
              <Col className="text-end">
                <Button variant="outline-primary" className="align-middle"
                        onClick={(e) => setAddExercisesModalShow(true)}
                >Add</Button>
              </Col>
            </Row>}
            {activeScreen == 'schedule' && <Row>
              <Col></Col>
              <Col xs={6} className="text-center">
                Training schedule
              </Col>
              <Col className="text-end">
              </Col>
            </Row>}
          </Container>
        </div>
        <div style={{overflow: "scroll", height: "100%", padding: '12px 0'}}>
          {activeScreen == 'exercises' && <>
            {!exercises.length && <div className="h-100 w-100 d-flex align-items-center justify-content-center">
              <p className="text-muted">You don't have any, add some!</p>
            </div>}
            {!!exercises.length && muscleGroupsWithoutExercises.length > 0 && <Container className="text-center">
              <div className="text-muted">You should add also exercises for those muscle groups:</div>
              <div className="muscleGroups">
                {muscleGroupsWithoutExercises.map((m, i) => <span className="missing" key={m}>{m}</span>)}
              </div>
              <br/>
            </Container>}
            {exercises.map((exercise, i) => <Container
              className="exerciseListItem" key={i}
              onClick={(e) => setViewExerciseModalObj(exercise)}
            >
              {exercise.name}
              <div className="muscleGroups">
                {exercise.primary_muscle_groups.map((m, i) => <span className="primary" key={m}>{m}</span>)}
                {exercise.secondary_muscle_groups.map((m, i) => <span className="secondary" key={m}>{m}</span>)}
              </div>
            </Container>)}
          </>}
          {activeScreen == 'trainings' && <>
            <Container className="text-center">
              <Button>Record</Button>
              {/* https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b */}
            </Container>
          </>}
        </div>
        <div style={{
          background: "white",
          lineHeight: '48px',
          boxShadow: "0 0px 10px rgba(0,0,0,0.3)",
          position: 'fixed',
          width: '100%',
          bottom: 0,
          height: '48px'
        }}>
          <Container className={"d-flex h-100 justify-content-around align-items-center"}>
            <Button size="sm" variant={activeScreen == 'exercises' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('exercises')}>Exercises</Button>{' '}
            <Button size="sm" variant={activeScreen == 'schedule' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('schedule')}>Schedule</Button>{' '}
            <Button size="sm" variant={activeScreen == 'trainings' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('trainings')}>Trainings</Button>{' '}
          </Container>
        </div>
      </div>

      <AddExercisesModal show={addExercisesModalShow}
                         setShow={setAddExercisesModalShow}
                         onSave={(exs) => setExercises((prev) => ([...prev, ...exs]))}
      />
      <ViewExercisesModal show={viewExerciseModalObj != null}
        // @ts-ignore
                          exercise={viewExerciseModalObj}
                          setShow={(show) => setViewExerciseModalObj(show ? viewExerciseModalObj : null)}
      />
    </>
  );
}

export default App;
