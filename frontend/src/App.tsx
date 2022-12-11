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
import {tab} from "@testing-library/user-event/dist/tab";


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
    exerciseNames: string[]
  }
}

type StoredStateType = {
  exercises: Exercise[],
  activeScreen: string,
  numberOfTrainingsPerWeek: number | null,
  trainingDays: TrainingDays
  suggestedTrainingDayNames: TWeekDayName[]
  suggestedTrainingExercises: TrainingDays
}

const DEFAULT_STORED_STATE: StoredStateType = {
  exercises: [],
  activeScreen: 'schedule',
  numberOfTrainingsPerWeek: null,
  trainingDays: {} as TrainingDays,
  suggestedTrainingDayNames: [],
  suggestedTrainingExercises: {} as TrainingDays,
}

function getMissingWeekDaysOrderedByMidDistance(trainingDayNames: TWeekDayName[], targetDaysNum: number): TWeekDayName[] {
  // [0 0 0 0 0 0 0]
  // [1 0 0 0 0 0 0]   [0 0*5 1*4.1 2*3.1 3*2.1 4*1.1 5*0]
  // [1 0 0 0 1 0 0]
  // [1 0 1 0 1 0 0]
  // [1 0 1 0 1 1 0]
  // [1 1 1 0 1 1 0]
  // [1 1 1 0 1 1 0]
  let orderedDays = []
  if (trainingDayNames.length == 0) {
    orderedDays.push(WEEK_DAY_NAMES[0])
  }
  while (orderedDays.length + trainingDayNames.length < WEEK_DAY_NAMES.length) {
    let fillMatrix = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 0; i < WEEK_DAY_NAMES.length; i++) {
      let d = WEEK_DAY_NAMES[i]
      if ((trainingDayNames.indexOf(d) == -1) && (orderedDays.indexOf(d) == -1)) {
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

function suggestMissingDayNames(trainingDayNames: TWeekDayName[], targetDaysNum: number): TWeekDayName[] {
  let daysNumToSuggest = targetDaysNum - trainingDayNames.length
  if (daysNumToSuggest <= 0) {
    return []
  }
  let suggestedTrainingDayNames = [] as TWeekDayName[]
  let missingDays = getMissingWeekDaysOrderedByMidDistance(trainingDayNames, targetDaysNum)
  for (let i = 0; i < daysNumToSuggest; i++) {
    suggestedTrainingDayNames.push(missingDays[i])
  }
  return suggestedTrainingDayNames
}

function deleteExcessDays(trainingDays: TrainingDays, targetDaysNum: number, exceptDays?: TWeekDayName[]): TrainingDays {
  let newTrainingDays = {} as TrainingDays
  if (exceptDays == undefined) {
    exceptDays = []
  }
  for (let d of exceptDays) {
    if (d in trainingDays) {
      newTrainingDays[d] = trainingDays[d]
    }
  }
  if (Object.keys(newTrainingDays).length < targetDaysNum) {
    // todo: fix
    let order = getMissingWeekDaysOrderedByMidDistance(Object.keys(newTrainingDays) as TWeekDayName[], targetDaysNum)
    for (let i = 0; i < order.length; i++) {
      let d = order[i]
      if (d in trainingDays) {
        newTrainingDays[d] = trainingDays[d]
      }
      if (Object.keys(newTrainingDays).length == targetDaysNum) {
        break
      }
    }
  }
  return newTrainingDays
}

function suggestMissingExercises(trainingDays: TrainingDays, suggestedTrainingDayNames: TWeekDayName[], exercises: Exercise[]): TrainingDays {
  // todo: implement
  let suggestedTrainingExercises = {} as TrainingDays
  let notUsedExerciseNames = []
  for (let e of exercises) {
    let is_missing = true
    for (let d of Object.keys(trainingDays) as TWeekDayName[]) {
      if (trainingDays[d].exerciseNames.indexOf(e.name) != -1) {
        is_missing = false
        break
      }
    }
    if (is_missing) {
      notUsedExerciseNames.push(e.name)
    }
  }
  for (let d of Object.keys(trainingDays) as TWeekDayName[]) {
    if (trainingDays[d].exerciseNames.length == 0 && notUsedExerciseNames.length > 0) {
      suggestedTrainingExercises[d] = {
        exerciseNames: [
          //@ts-ignore
          notUsedExerciseNames.pop()
        ]
      }
    }
  }

  for (let d of suggestedTrainingDayNames) {
    if (notUsedExerciseNames.length > 0) {
      suggestedTrainingExercises[d] = {
        exerciseNames: [
          //@ts-ignore
          notUsedExerciseNames.pop()
        ]
      }
    }
  }
  return suggestedTrainingExercises
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
  const exercisesByNames: { [key: string]: Exercise } = {}
  for (let e of exercises) {
    exercisesByNames[e.name] = e
  }
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
    setStoredState((p) => {
      let {trainingDays, suggestedTrainingDayNames, suggestedTrainingExercises} = p
      if (n == null) {
        trainingDays = {} as TrainingDays
        suggestedTrainingDayNames = []
        suggestedTrainingExercises = {} as TrainingDays
      } else if (n != p.numberOfTrainingsPerWeek) {
        trainingDays = deleteExcessDays(trainingDays, n)
        suggestedTrainingDayNames = suggestMissingDayNames(Object.keys(trainingDays) as TWeekDayName[], n)
        suggestedTrainingExercises = suggestMissingExercises(trainingDays, suggestedTrainingDayNames, exercises)
      }
      return {...p, numberOfTrainingsPerWeek: n, trainingDays, suggestedTrainingDayNames, suggestedTrainingExercises}
    })
  }
  const onTrainingDayMarkerChange = (day: TWeekDayName, checked: boolean) => {
    setStoredState((p) => {
      let {trainingDays, suggestedTrainingDayNames, numberOfTrainingsPerWeek} = p
      if (suggestedTrainingDayNames.indexOf(day) != -1) {
        trainingDays[day] = {exerciseNames: []}
      } else {
        if (checked) {
          trainingDays[day] = {exerciseNames: []}
          if (numberOfTrainingsPerWeek != null) {
            trainingDays = deleteExcessDays(trainingDays, numberOfTrainingsPerWeek, [day])
          }
        } else {
          delete trainingDays[day]
        }
      }
      suggestedTrainingDayNames = suggestMissingDayNames(Object.keys(trainingDays) as TWeekDayName[], numberOfTrainingsPerWeek || 0)
      let suggestedTrainingExercises = suggestMissingExercises(trainingDays, suggestedTrainingDayNames, exercises)
      return {...p, trainingDays, suggestedTrainingDayNames, numberOfTrainingsPerWeek, suggestedTrainingExercises}
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
                        size="sm"
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
                                    style={{opacity: storedState.suggestedTrainingDayNames.indexOf(d) != -1 ? 0.5 : 1}}
                                    checked={d in storedState.trainingDays || storedState.suggestedTrainingDayNames.indexOf(d) != -1}
                                    onChange={(e) => onTrainingDayMarkerChange(d, e.target.checked)}
                        />
                      </Form.Label>
                    )}
                  </Row>
                </Container>
              </Form>
            </Container>
            {numberOfTrainingsPerWeek != null && <Container>
              <br/>
              {WEEK_DAY_NAMES.filter((d) => d in storedState.trainingDays || storedState.suggestedTrainingDayNames.indexOf(d) != -1)
                .map((d, i) => <div key={i}
                  // style={{opacity: d in storedState.trainingDays ? 1 : 0.5}}
                >
                  <h5>{d} <span className="muscleGroups">
                    {(() => {
                      let primary = []
                      if (d in storedState.trainingDays) {
                        for (let ex_name of storedState.trainingDays[d].exerciseNames) {
                          let ex = exercisesByNames[ex_name]
                          for (let ex_g of ex.primary_muscle_groups) {
                            if (primary.indexOf(ex_g) == -1) {
                              primary.push(ex_g)
                            }
                          }
                        }
                      }
                      if (d in storedState.suggestedTrainingExercises) {
                        for (let ex_name of storedState.suggestedTrainingExercises[d].exerciseNames) {
                          let ex = exercisesByNames[ex_name]
                          for (let ex_g of ex.primary_muscle_groups) {
                            if (primary.indexOf(ex_g) == -1) {
                              primary.push(ex_g)
                            }
                          }
                        }
                      }
                      primary.sort()
                      return primary.map((m: string, i) => <span className="primary" key={m}>{m.toLowerCase()}</span>)
                    })()}
                  </span></h5>
                  {d in storedState.trainingDays && storedState.trainingDays[d].exerciseNames.map((exName, i) => <Container
                    className="exerciseListItem" key={i}
                    onClick={(e) => setViewExerciseModalObj(exercisesByNames[exName])}
                  >
                    {exName}
                  </Container>)}
                  {d in storedState.suggestedTrainingExercises && storedState.suggestedTrainingExercises[d].exerciseNames.map((exName, i) => <Container
                    className="exerciseListItem" key={i}
                    onClick={(e) => setViewExerciseModalObj(exercisesByNames[exName])}
                  >
                    {exName}
                  </Container>)}
                </div>)}
            </Container>}
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
