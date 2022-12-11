import {Container, Form, Row} from "react-bootstrap";
import React from "react";
import {TWeekDayName, WEEK_DAY_NAMES} from "../const";
import {Exercise, TrainingDays} from "../types";

export type EditTrainingScheduleProps = {
  numberOfTrainingsPerWeek: number | null
  setNumberOfTrainingsPerWeek: (numberOfTrainingsPerWeek: number | null) => void
  suggestedTrainingDayNames: TWeekDayName[]
  trainingDays: TrainingDays
  onTrainingDayMarkerChange: (day: TWeekDayName, checked: boolean) => void
  suggestedTrainingExercises: TrainingDays
  setViewExerciseModalObj: (ex: Exercise | null) => void
  exercisesByNames: { [name: string]: Exercise }
}

export function EditTrainingSchedule({
                                       numberOfTrainingsPerWeek,
                                       setNumberOfTrainingsPerWeek,
                                       suggestedTrainingDayNames,
                                       trainingDays,
                                       onTrainingDayMarkerChange,
                                       suggestedTrainingExercises,
                                       setViewExerciseModalObj,
                                       exercisesByNames,
                                     }: EditTrainingScheduleProps) {
  return <>
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
                            style={{opacity: suggestedTrainingDayNames.indexOf(d) != -1 ? 0.5 : 1}}
                            checked={d in trainingDays || suggestedTrainingDayNames.indexOf(d) != -1}
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
      {WEEK_DAY_NAMES.filter((d) => d in trainingDays || suggestedTrainingDayNames.indexOf(d) != -1)
        .map((d, i) => <div key={i}
          // style={{opacity: d in storedState.trainingDays ? 1 : 0.5}}
        >
          <h5>{d} <span className="muscleGroups">
                    {(() => {
                      let primary = []
                      if (d in trainingDays) {
                        for (let ex_name of trainingDays[d].exerciseNames) {
                          let ex = exercisesByNames[ex_name]
                          for (let ex_g of ex.primary_muscle_groups) {
                            if (primary.indexOf(ex_g) == -1) {
                              primary.push(ex_g)
                            }
                          }
                        }
                      }
                      if (d in suggestedTrainingExercises) {
                        for (let ex_name of suggestedTrainingExercises[d].exerciseNames) {
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
          {d in trainingDays && trainingDays[d].exerciseNames.map((exName, i) => <Container
            className="exerciseListItem" key={i}
            onClick={(e) => setViewExerciseModalObj(exercisesByNames[exName])}
          >
            {exName}
          </Container>)}
          {d in suggestedTrainingExercises && suggestedTrainingExercises[d].exerciseNames.map((exName, i) =>
            <Container
              className="exerciseListItem" key={i}
              onClick={(e) => setViewExerciseModalObj(exercisesByNames[exName])}
            >
              {exName}
            </Container>)}
        </div>)}
    </Container>}
  </>
}