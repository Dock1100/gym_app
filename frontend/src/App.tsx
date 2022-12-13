import React, {Dispatch, SetStateAction, useEffect, useState} from 'react';
import Button from 'react-bootstrap/Button';

import './App.scss';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Col, Container, Form, InputGroup, Modal, Nav, Navbar, NavDropdown, Row, Stack, Table} from "react-bootstrap";
import axios from "axios";
import {EditableExerciseBlock} from "./blocks/edit_exercise";
import {Exercise, TrainingDays} from "./types";
import {AddExercisesModal} from "./blocks/add_exercises_modal";
import {ViewExercisesModal} from "./blocks/view_exercise_modal";
import {tab} from "@testing-library/user-event/dist/tab";
import {MUSCLE_GROUPS, TWeekDayName, WEEK_DAY_NAMES} from "./const";
import {EditTrainingSchedule} from "./blocks/edit_training_schedule";
import {
  FEEL_ICONS,
  TrainingLogRecord,
  TrainingLogRecordModal,
  TrainingLogRecordModalProps
} from "./blocks/trainingLogRecordModal";


type StoredStateType = {
  exercises: Exercise[]
  activeScreen: string
  numberOfTrainingsPerWeek: number | null
  trainingDays: TrainingDays
  suggestedTrainingDayNames: TWeekDayName[]
  suggestedTrainingExercises: TrainingDays
  logs: { [date: string]: { [exerciseName: string]: (TrainingLogRecord | null)[] } }
}

const DEFAULT_STORED_STATE: StoredStateType = {
  exercises: [],
  activeScreen: 'schedule',
  numberOfTrainingsPerWeek: null,
  trainingDays: {} as TrainingDays,
  suggestedTrainingDayNames: [],
  suggestedTrainingExercises: {} as TrainingDays,
  logs: {},
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

  let [calendarDate, setCalendarDate] = useState<Date | null>(null)

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
  const [editingTrainingLog, setEditingTrainingLog] = useState<{
    log: Partial<TrainingLogRecord>
    dateString: string
    exerciseName: string
    idx: number | null
  } | null>(null)

  const crudLog = (log: TrainingLogRecord | null, exerciseName: string, dateString: string, index: number | null) => {
    let allLogs = storedState.logs[dateString] || {}
    let dayLogs = allLogs[exerciseName] || []
    if (index != null) {
      if (index >= dayLogs.length) {
        for (let i = dayLogs.length; i < index; i++) {
          dayLogs.push(null)
        }
      }
      dayLogs[index] = log
    } else {
      dayLogs.push(log)
    }
    setStoredState((p) => ({
      ...p,
      logs: {...p.logs, [dateString]: {...allLogs, [exerciseName]: dayLogs}}
    }))
  }


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

  if (activeScreen == 'calendar' && calendarDate == null) {
    setCalendarDate(new Date())
    return <></>
  }

  if (!calendarDate) {
    calendarDate = new Date()
  }
  let calendarFirstDay = calendarDate
  calendarFirstDay = new Date(calendarFirstDay.getFullYear(), calendarFirstDay.getMonth(), 1)
  let firstWeekOffsetDays = calendarFirstDay.getDay()
  if (calendarFirstDay.getDay() != 1) {
    firstWeekOffsetDays = calendarFirstDay.getDay()
    if (firstWeekOffsetDays == 0) {
      firstWeekOffsetDays = 7
    }
    calendarFirstDay.setDate(calendarFirstDay.getDate() - firstWeekOffsetDays + 1)
  }
  firstWeekOffsetDays = firstWeekOffsetDays - 1

  let calendarWeeksNum = Math.ceil((
    new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate()
    + firstWeekOffsetDays
  ) / 7)
  let nextMonthDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
  if (new Date(nextMonthDate.getTime()).getDay() == 1) {
    calendarWeeksNum += 1
  }

  let calendarExerciseNames: string[] = []
  let day = calendarDate.getDay()
  if (day == 0) {
    day = 7
  }
  let dayName = WEEK_DAY_NAMES[day - 1]
  if (dayName in storedState.trainingDays) {
    calendarExerciseNames = [...storedState.trainingDays[dayName].exerciseNames]
  }
  if (dayName in storedState.suggestedTrainingExercises) {
    calendarExerciseNames = [...calendarExerciseNames, ...storedState.suggestedTrainingExercises[dayName].exerciseNames]
  }
  let calendarDateString = `${calendarDate.getFullYear()}-${calendarDate.getMonth() + 1}-${calendarDate.getDate()}`
  if (storedState.logs[calendarDateString]) {
    calendarExerciseNames = [
      ...calendarExerciseNames,
      ...Object.keys(storedState.logs[calendarDateString])
        .filter(name => calendarExerciseNames.indexOf(name) == -1)
    ]
  }

  let calendarExercises = calendarExerciseNames.map(name => exercises.find(ex => ex.name == name)).filter(ex => ex != null) as Exercise[]

  return (
    <>
      <div style={{padding: '48px 0', height: "100%"}}>
        <div className='navigationHeader' style={{
          background: "white",
          lineHeight: '48px',
          boxShadow: "0 0px 10px rgba(0,0,0,0.3)",
          position: 'fixed',
          width: '100%',
          top: 0,
          height: '48px'
        }}>
          <Container>{/*header*/}
            {activeScreen == 'exercises' && <Row>
              <Col></Col>
              <Col xs={6} className="text-center">
                My exercises
              </Col>
              <Col className="text-end">
                <Button variant="outline-primary"
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
            {activeScreen == 'trainings' && <Row>
              <Col><Button variant="outline-primary" size="sm"
                           onClick={() => {
                             let current = new Date(calendarDate || new Date())
                             let daysPrevMonth = new Date(current.getFullYear(), current.getMonth(), 0).getDate()
                             let prevDate = new Date(current)
                             if (daysPrevMonth < current.getDate()) {
                               prevDate = new Date(current.getFullYear(), current.getMonth(), 0)
                             } else {
                               prevDate.setMonth(current.getMonth() - 1)
                             }
                             setCalendarDate(prevDate)
                           }}
              >&lt;</Button></Col>
              <Col xs={8} className="text-center">
                <Button variant="outline-primary" size="sm"
                        onClick={() => setCalendarDate(new Date())}
                >
                  {calendarDate &&
                    (calendarDate.getDate() == new Date().getDate() && calendarDate.getFullYear() == new Date().getFullYear() ? 'Today: ' : '') +
                    calendarDate.toLocaleDateString('en-us', {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })}
                </Button>
              </Col>
              <Col className="text-end">
                <Button variant="outline-primary" size="sm"
                        onClick={() => {
                          let current = new Date(calendarDate || new Date())
                          let daysNextMonth = new Date(current.getFullYear(), current.getMonth() + 2, 0).getDate()
                          let nextDate = new Date(current)
                          if (daysNextMonth < current.getDate()) {
                            nextDate = new Date(current.getFullYear(), current.getMonth() + 1, 1)
                          } else {
                            nextDate.setMonth(current.getMonth() + 1)
                          }
                          setCalendarDate(nextDate)
                        }}
                >&gt;</Button>
              </Col>
            </Row>}
            {activeScreen == 'about' && <Row>
              <Col></Col>
              <Col xs={8} className="text-center">About</Col>
              <Col className="text-end"></Col>
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
          {activeScreen == 'schedule' && <EditTrainingSchedule
            numberOfTrainingsPerWeek={storedState.numberOfTrainingsPerWeek}
            setNumberOfTrainingsPerWeek={setNumberOfTrainingsPerWeek}
            suggestedTrainingDayNames={storedState.suggestedTrainingDayNames}
            trainingDays={storedState.trainingDays}
            onTrainingDayMarkerChange={onTrainingDayMarkerChange}
            suggestedTrainingExercises={storedState.suggestedTrainingExercises}
            setViewExerciseModalObj={setViewExerciseModalObj}
            exercisesByNames={exercisesByNames}
          />}
          {activeScreen == 'trainings' && <>
            <Container>
              <table className={'trainingsTable'}>
                <thead>
                <tr>
                  {WEEK_DAY_NAMES.map((day, i) => <th key={i}>{day[0]}</th>)}
                </tr>
                </thead>
                <tbody>
                {(() => {
                  let rows = []
                  for (let week_i = 0; week_i < calendarWeeksNum; week_i++) {
                    let cells = []
                    for (let i = 0; i < 7; i++) {
                      let day = new Date(calendarFirstDay.getTime() + (week_i * 7 + i) * 1000 * 86400)
                      cells.push(<td key={i} className={
                        (
                          (day.getMonth() > calendarDate.getMonth() || day.getFullYear() > calendarDate.getFullYear()) ? ' next' :
                            (day.getFullYear() < calendarDate.getFullYear() || day.getMonth() < calendarDate.getMonth()) ? ' prev' : ''
                        )
                        + (day.getDate() == calendarDate.getDate() && day.getMonth() == calendarDate.getMonth() ? ' selected' : '')
                        + (day.getDate() == new Date().getDate() ? ' today' : '')
                        + (
                          (day >= new Date() && (WEEK_DAY_NAMES[i] in storedState.trainingDays || storedState.suggestedTrainingDayNames.indexOf(WEEK_DAY_NAMES[i]) != -1))
                          || (`${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}` in storedState.logs)
                            ? ' trainingDay' : '')
                      }
                                     onClick={() => {
                                       setCalendarDate(day)
                                     }}
                      >
                        <div>{day.getDate()}</div>
                      </td>)
                    }
                    rows.push(<tr key={week_i}>{cells}</tr>)
                  }
                  return rows
                })()}
                </tbody>
              </table>
            </Container>

            {calendarExercises.map((exercise: Exercise, i) => <Container
              className="exerciseListItem" key={i}
            >
              <Row>
                <Col>{exercise.name}</Col>
                <Col className="text-end">
                  <Button size="sm" variant="link" style={{position: 'relative', top: '-2px'}}
                          onClick={(e) => setViewExerciseModalObj(exercise)}>info</Button>
                </Col>
              </Row>
              <div className="muscleGroups">
                {exercise.primary_muscle_groups.map((m, i) => <span className="primary" key={m}>{m}</span>)}
                {exercise.secondary_muscle_groups.map((m, i) => <span className="secondary" key={m}>{m}</span>)}
              </div>
              <br/>
              <Row>
                {(() => {
                    let dayLog = storedState.logs[calendarDateString] || {}
                    let savedRecs = dayLog[exercise.name] || []
                    let recs = [...savedRecs]
                    let maxRecs = Math.max(5, recs.length)
                    for (let i = recs.length; i < maxRecs; i++) {
                      recs.push(null)
                    }
                    let cells = []
                    for (let i = 0; i < maxRecs; i++) {
                      let rec: TrainingLogRecord | null = recs[i]
                      let isPredicted = false
                      if (rec == null && (i == 0 || recs[i - 1] != null)) {
                        isPredicted = true
                      }
                      let bgColor = undefined
                      if (rec != null) {
                        let red = 'rgba(255,0,0,0.2)'
                        let yellow = 'rgba(255,166,0,0.2)'
                        let green = 'rgba(0,255,0,0.2)'
                        if (rec.feel == 'bad' || rec.feel == 'exhausted') {
                          bgColor = yellow
                        }
                        if (rec.harm.length > 0) {
                          if (rec.harm.indexOf('burn') > -1) {
                            if (rec.harm.length > 1) {
                              bgColor = red
                            } else {
                              bgColor = green
                            }
                          } else {
                            bgColor = red
                          }
                        }
                        if (!bgColor && !rec.able_to_do_1_more_time) {
                          bgColor = green
                        }
                      }
                      cells.push(<Col key={i} xs="2" className="text-center" style={{padding: "3px"}}
                                      onClick={(rec || isPredicted) ? () => setEditingTrainingLog({
                                        log: rec || {},
                                        exerciseName: exercise.name,
                                        idx: i,
                                        dateString: calendarDateString,
                                      }) : (() => {
                                      })}
                      >
                        <div style={{backgroundColor: bgColor, borderRadius: "4px"}}
                             className={isPredicted ? 'text-muted' : ''}>
                          {(rec || isPredicted) && <>
                            {rec !== null ? rec.repeats : '20'}
                            <span style={{display: 'block', lineHeight: '0.5em', fontSize: '0.6em'}}>x</span>
                            {rec !== null ? rec.weight : '5'}<span style={{fontSize: '0.8em'}}>kg</span>
                          </>}
                        </div>
                      </Col>)
                    }
                    cells.push(<Col xs="2" className='text-end' style={{position: 'relative'}}>
                      <Button className='h-100'
                              disabled={savedRecs.length == maxRecs}
                              onClick={() => setEditingTrainingLog({
                                log: {} as Partial<TrainingLogRecord>,
                                exerciseName: exercise.name,
                                idx: null,
                                dateString: calendarDateString,
                              })}>+</Button>
                    </Col>)
                    return cells
                  }
                )()}
              </Row>
            </Container>)}
          </>}
          {activeScreen == 'about' && <Container>
            <div>logo</div>
            <div>*protorype</div>
            In case of any questions, suggestions or issues, please contact me at:
            <a href="mailto:antony.pererva+gymapp@gmail.com">antony.pererva@gmail.com</a><br/>
            {/* todo: discord */}
          </Container>}
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
                    onClick={(e) => setActiveScreen('exercises')}>Exercises</Button>
            <Button size="sm" variant={activeScreen == 'schedule' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('schedule')}>Schedule</Button>
            <Button size="sm" variant={activeScreen == 'trainings' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('trainings')}>Trainings</Button>
            <Button size="sm" variant={activeScreen == 'about' ? "primary" : "outline-primary"}
                    onClick={(e) => setActiveScreen('about')}>i</Button>
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

      <TrainingLogRecordModal
        value={editingTrainingLog != null ? editingTrainingLog.log : null}
        title={editingTrainingLog?.exerciseName}
        setValue={(rec) => {
          if (rec == null) {
            setEditingTrainingLog(null)
          } else {
            // @ts-ignore
            setEditingTrainingLog({...editingTrainingLog, log: rec})
          }
        }}
        onSave={(rec) => {
          console.log('on save', rec)
          if (editingTrainingLog) {
            crudLog(rec, editingTrainingLog.exerciseName, editingTrainingLog.dateString, editingTrainingLog.idx)
          }
          setEditingTrainingLog(null)
        }}
      />
    </>
  );
}

export default App;
