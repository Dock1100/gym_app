import {Col, Container, Row, Button} from "react-bootstrap";
import React from "react";
import {Exercise, WithIsEnabled} from "../types";
import {MUSCLE_GROUPS, TMuscleGroup} from "../const";

export type ExercisesListTipsProps = {
  exercises: WithIsEnabled<Exercise>[]
  setExercises(exercises: WithIsEnabled<Exercise>[]): void
}


export type TExercisesByMg = { [key in TMuscleGroup]: WithIsEnabled<Exercise>[] }

export function getExercisesByMuscleGroups(exercises: WithIsEnabled<Exercise>[]) {
  const exercisesByMgGroups: TExercisesByMg = {} as TExercisesByMg
  for (let group of MUSCLE_GROUPS) {
    exercisesByMgGroups[group] = []
    for (let ex of exercises) {
      for (let ex_g of ex.primary_muscle_groups) {
        if (ex_g.toLowerCase().includes(group.toLowerCase())) {
          exercisesByMgGroups[group].push(ex)
        }
      }
    }
  }
  return exercisesByMgGroups
}

export function ExercisesListTips({exercises, setExercises}: ExercisesListTipsProps) {

  const exercisesByMgGroups = getExercisesByMuscleGroups(exercises.filter(e => e.isEnabled))

  const muscleGroupsWithoutExercises: TMuscleGroup[] = []
  const overloadedMG: TMuscleGroup[] = []
  for (let group of MUSCLE_GROUPS) {
    if (!exercisesByMgGroups[group].length) {
      muscleGroupsWithoutExercises.push(group)
    } else if (exercisesByMgGroups[group].length > 2) {
      overloadedMG.push(group)
    }
  }

  const muscleGroupsWithoutExercisesAndDisabledRoutine: TMuscleGroup[] = []
  const disabledExercisesByMgGroups = getExercisesByMuscleGroups(exercises.filter(e => !e.isEnabled))
  for (let group of MUSCLE_GROUPS) {
    if (disabledExercisesByMgGroups[group].length > 0) {
      if (!exercisesByMgGroups[group].length) {
        muscleGroupsWithoutExercisesAndDisabledRoutine.push(group)
      }
    }
  }

  for (let grop of muscleGroupsWithoutExercisesAndDisabledRoutine) {
    if (muscleGroupsWithoutExercises.indexOf(grop) > -1) {
      muscleGroupsWithoutExercises.splice(muscleGroupsWithoutExercises.indexOf(grop), 1)
    }
  }

  // too many exercises for same group
  const removeRedundantExercises = () => {
    let allExercises = [...exercises.filter(e => e.isEnabled)]
    let exercisesToRemove: string[] = []
    // overloadedMG
    // order exs by number of pmg
    for (let mg of overloadedMG) {
      let exsByMg = getExercisesByMuscleGroups(allExercises)
      const exs = exsByMg[mg]
      exs.sort((a, b) => a.primary_muscle_groups.length - b.primary_muscle_groups.length)
      let ex2remove = exs.pop()
      if (ex2remove) {
        ex2remove.isEnabled = false
        console.log('removeRedundantExercises', ex2remove.name)
        allExercises = allExercises.filter(ex => ex.name !== ex2remove!.name)
      }
    }
    setExercises(exercises)
  }
  // enable some missing
  const enableMissingDisabledExercises = () => {
    let disabledExsByMG = getExercisesByMuscleGroups(exercises.filter(e => !e.isEnabled))
    let enabledExsByMg = getExercisesByMuscleGroups([...exercises.filter(e => e.isEnabled)])
    // while there is and disabled exercise with missing muscle group
    // enable it
    for (let mg of muscleGroupsWithoutExercisesAndDisabledRoutine) {
          if (disabledExsByMG[mg].length > 0 && enabledExsByMg[mg].length == 0) {
            const exs = disabledExsByMG[mg]
            exs.sort((a, b) => a.primary_muscle_groups.length - b.primary_muscle_groups.length)
            exs[0].isEnabled = true
            disabledExsByMG = getExercisesByMuscleGroups(exercises.filter(e => !e.isEnabled))
            enabledExsByMg = getExercisesByMuscleGroups([...exercises.filter(e => e.isEnabled)])
          }
    }
    setExercises(exercises)
  }

  return <>
    {!exercises.length && <div className="h-100 w-100 d-flex align-items-center justify-content-center">
      <p className="text-muted">You don't have any, add some!</p>
    </div>}
    {exercises.length > 0 && <>
      {muscleGroupsWithoutExercises.length > 0 && <Container className="text-center">
        <Row className='align-items-center'>
          <Col xs={9}>
            <div className="text-muted">You should add also exercises for those muscle groups:</div>
            <div className="muscleGroups">
              {muscleGroupsWithoutExercises.map((m, i) => <span className="missing" key={m}>{m}</span>)}
            </div>
          </Col>
          <Col xs={3}>
            <Button variant="outline-primary"
                    style={{
                      backgroundColor: 'rgba(0,0,255,0.1)',
                      fontSize: '1.5em',
                      borderColor: 'rgba(0,0,255,0.1)',
                    }}
                    onClick={() => {
                      console.log('magic')
                    }}
            >🪄</Button>
          </Col>
        </Row>
        <hr/>
      </Container>}
      {muscleGroupsWithoutExercisesAndDisabledRoutine.length > 0 && <Container className="text-center">
        <Row className='align-items-center'>
          <Col xs={9}>
            <div className="text-muted">You have exercises for those muscle groups, but they are not active:</div>
            <div className="muscleGroups">
              {muscleGroupsWithoutExercisesAndDisabledRoutine.map((m, i) => <span className="missing"
                                                                                  style={{backgroundColor: 'rgba(125,255,24,0.7)'}}
                                                                                  key={m}>{m}</span>)}
            </div>
          </Col>
          <Col xs={3}>
            <Button variant="outline-primary"
                    style={{
                      backgroundColor: 'rgba(0,0,255,0.1)',
                      fontSize: '1.5em',
                      borderColor: 'rgba(0,0,255,0.1)',
                    }}
                    onClick={() => {
                      enableMissingDisabledExercises()
                    }}
            >🪄</Button>
          </Col>
        </Row>
        <hr/>
      </Container>}
      {overloadedMG.length > 0 && <Container className="text-center">
        <Row className='align-items-center'>
          <Col xs={9}>
            <div className="text-muted">You should reduce exercises for those muscle groups:</div>
            <div className="muscleGroups">
              {overloadedMG.map((m, i) => <span className="missing"
                                                style={{backgroundColor: 'rgba(255,122,24,0.7)'}}
                                                key={m}>{m}</span>)}
            </div>
          </Col>
          <Col xs={3}>
            <Button variant="outline-primary"
                    style={{
                      backgroundColor: 'rgba(0,0,255,0.1)',
                      fontSize: '1.5em',
                      borderColor: 'rgba(0,0,255,0.1)',
                    }}
                    onClick={removeRedundantExercises}
            >🪄</Button>
          </Col>
        </Row>
        <hr/>
      </Container>}
    </>}
  </>
}