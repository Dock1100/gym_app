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


// https://github.com/microsoft/TypeScript/issues/28046#issuecomment-431871542
function stringLiterals<T extends string>(...args: T[]): T[] {
  return args;
}

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;

const MUSCLE_GROUPS = stringLiterals("neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings");
type TMuscleGroup = ElementType<typeof MUSCLE_GROUPS>;

const WEEK_DAY_NAMES = stringLiterals('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday');
type TWeekDayName = ElementType<typeof WEEK_DAY_NAMES>;

type TrainingDays = {
  [key in TWeekDayName]: {
    exercises: string[]
  }
}

type StoredStateType = {
  exercises: Exercise[],
  activeScreen: string,
  numberOfTrainingsPerWeek: number | null,
  trainingDays: TrainingDays
  suggestedTrainingDays: TrainingDays
}

const DEFAULT_STORED_STATE: StoredStateType = {
  exercises: [],
  activeScreen: 'schedule',
  numberOfTrainingsPerWeek: null,
  trainingDays: {} as TrainingDays,
  suggestedTrainingDays: {} as TrainingDays
}

function getMissingWeekDaysOrderedByMidDistance(trainingDays: TrainingDays, targetDaysNum: number): TWeekDayName[] {
  // [0 0 0 0 0 0 0]
  // [1 0 0 0 0 0 0]   [0 0*5 1*4.1 2*3.1 3*2.1 4*1.1 5*0]
  // [1 0 0 0 1 0 0]
  // [1 0 1 0 1 0 0]
  // [1 0 1 0 1 1 0]
  // [1 1 1 0 1 1 0]
  // [1 1 1 0 1 1 0]
  let orderedDays = []
  if (Object.keys(trainingDays).length == 0) {
    orderedDays.push(WEEK_DAY_NAMES[0])
  }
  while (orderedDays.length + Object.keys(trainingDays).length < WEEK_DAY_NAMES.length) {
    let fillMatrix = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < WEEK_DAY_NAMES.length; i++) {
      let d = WEEK_DAY_NAMES[i]
      if (!(d in trainingDays) && (orderedDays.indexOf(d) == -1)) {
      } else {
        fillMatrix[i] = 1
      }
    }
    let distances = [0, 0, 0, 0, 0, 0, 0]
    for (let di = 0; di < 7; di++) {
      if (fillMatrix[di] == 1) {
        distances[di] = -1
        continue
      }
      let right = 0
      for (let i = 1; i < 7; i++) {
        if (fillMatrix[(di + i) % 7] == 1) {
          right = i
          break
        }
      }
      let left = 0
      for (let i = 1; i < 7; i++) {
        if (fillMatrix[(7 + di - i) % 7] == 1) {
          left = i
          break
        }
      }
      if (targetDaysNum < 4) {
        distances[di] = (left) * (right + 0.1)
      } else {
        distances[di] = (left + 0.1) * (right)
      }
    }
    let day = WEEK_DAY_NAMES[distances.indexOf(Math.max(...distances))]
    orderedDays.push(day)
  }
  // @ts-ignore
  return orderedDays
}

function suggestMissingDays(trainingDays: TrainingDays, targetDaysNum: number): TrainingDays {
  let daysNumToSuggest = targetDaysNum - Object.keys(trainingDays).length
  if (daysNumToSuggest <= 0) {
    return {} as TrainingDays
  }
  let suggestedTrainingDays = {} as TrainingDays
  let missingDays = getMissingWeekDaysOrderedByMidDistance(trainingDays, targetDaysNum)
  for (let i = 0; i < daysNumToSuggest; i++) {
    suggestedTrainingDays[missingDays[i]] = {exercises: []}
  }
  return suggestedTrainingDays
}

function App() {
  const [storedState, setStoredState] = useState<StoredStateType>(() => {
      let savedState = localStorage.getItem('storedState')
      try {
        if (savedState) {
          let parsedState = JSON.parse(savedState) as StoredStateType
          // MIGRATIONS!!!!!)))))))
          for (let key of Object.keys(DEFAULT_STORED_STATE)) {
            if (!(key in parsedState)) {
              // @ts-ignore
              parsedState[key] = DEFAULT_STORED_STATE[key]
            }
          }
          console.log('loaded storedState', parsedState)
          return parsedState
        }
      } catch (e) {
        console.log('failed to load storedState', e)
      }

      return DEFAULT_STORED_STATE
    }
  )

  localStorage.setItem('storedState', JSON.stringify(storedState))


  const {exercises, activeScreen, numberOfTrainingsPerWeek} = storedState
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
  const setNumberOfTrainingsPerWeek = (n: number | null) => {
    console.log('setNumberOfTrainingsPerWeek', n)
    setStoredState((p) => {
      let {trainingDays, suggestedTrainingDays} = p
      if (n == null) {
        console.log('reset')
        trainingDays = {} as TrainingDays
        suggestedTrainingDays = {} as TrainingDays
      } else if (n != p.numberOfTrainingsPerWeek) {
        console.log('recalc')
        if (Object.keys(trainingDays).length > n) {
          trainingDays = Object.fromEntries(Object.entries(trainingDays).slice(0, n)) as TrainingDays
        }
        suggestedTrainingDays = suggestMissingDays(trainingDays, n)
      }
      return {...p, numberOfTrainingsPerWeek: n, trainingDays, suggestedTrainingDays}
    })
  }
  const onTrainingDayMarkerChange = (day: TWeekDayName, checked: boolean) => {
    setStoredState((p) => {
      let {trainingDays, suggestedTrainingDays} = p
      if (day in suggestedTrainingDays) {
        trainingDays[day] = {...suggestedTrainingDays[day]}
        delete suggestedTrainingDays[day]
      } else {
        if (checked) {
          trainingDays[day] = {exercises: []}
        } else {
          delete trainingDays[day]
        }
      }
      suggestedTrainingDays = suggestMissingDays(trainingDays, p.numberOfTrainingsPerWeek || 0)
      return {...p, trainingDays, suggestedTrainingDays}
    })
  }
  const setActiveScreen = (activeScreen: string) => {
    setStoredState((p) => ({...p, activeScreen}))
  }


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
          {activeScreen == 'schedule' && <>
            <Container className="text-center">
              <Form onSubmit={(e) => {
                e.preventDefault();
              }}>
                <Form.Group>
                  <Form.Label>How many trainings per week?</Form.Label>
                  <Form.Select value={numberOfTrainingsPerWeek == null ? "null" : numberOfTrainingsPerWeek}
                               onChange={(e) => {
                                 let value: number | null = parseInt(e.target.value)
                                 if (isNaN(value)) {
                                   value = null
                                 }
                                 setNumberOfTrainingsPerWeek(value)
                               }}
                  >
                    <option value="null">Pick from list</option>
                    <option value="1">One</option>
                    <option value="2">Two</option>
                    <option value="3">Three (recommended for start)</option>
                    <option value="4">Four</option>
                    <option value="5">Five</option>
                    <option value="6">Six</option>
                    <option value="7">Seven</option>
                  </Form.Select>
                </Form.Group>
                <Container>
                  <Row>
                    {WEEK_DAY_NAMES.map((d, i) =>
                      <Form.Label key={i} column={true}
                                  className={numberOfTrainingsPerWeek == null ? 'text-muted' : ''}
                      >
                        {d[0]}
                        <Form.Check type="checkbox" disabled={numberOfTrainingsPerWeek == null}
                                    style={{opacity: d in storedState.suggestedTrainingDays ? 0.5 : 1}}
                                    checked={d in storedState.trainingDays || d in storedState.suggestedTrainingDays}
                                    onChange={(e) => onTrainingDayMarkerChange(d, e.target.checked)}
                        />
                      </Form.Label>
                    )}
                  </Row>
                </Container>
              </Form>
            </Container>
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
