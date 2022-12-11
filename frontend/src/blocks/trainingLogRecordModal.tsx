import {Exercise} from "../types";
import {Col, Form, InputGroup, Modal, Row} from "react-bootstrap";
import axios from "axios";
import Button from "react-bootstrap/Button";
import {EditableExerciseBlock} from "./edit_exercise";
import React, {useState} from "react";


export type TrainingLogRecord = {
  repeats: number
  weight: number
  able_to_do_1_more_time: boolean
  feel: string
  harm: string[]
}

export type TrainingLogRecordModalProps = {
  title?: string | null
  value: Partial<TrainingLogRecord> | null
  setValue(value: Partial<TrainingLogRecord> | null): void
  onSave(value: Partial<TrainingLogRecord>): void
}

export function TrainingLogRecordModal({title, value, setValue, onSave}: TrainingLogRecordModalProps) {
  const show = value != null;

  const handleClose = () => setValue(null);

  return <Modal show={show} onHide={handleClose} backdrop="static"
                keyboard={false}
                centered
                size="sm"
                className={"training-log-record-modal"}
  >
    <Modal.Header closeButton>
      <Modal.Title>{title || 'TrainingLog'}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form>
        <Form.Group as={Row}>
          <Form.Label column xs="4">Repeats</Form.Label>
          <Col xs="8">
            <InputGroup className="w-100">
              <Form.Control type="number" placeholder="repeats" min="1" step="1"
                            value={value?.repeats || ''}
                            onChange={(e) => {
                              let v = parseInt(e.target.value)
                              setValue({...value, repeats: isNaN(v) ? undefined : Math.max(1, v)})
                            }}
              />
              <Button variant="outline-secondary"
                      onClick={() => setValue({...value, repeats: value?.repeats ? value.repeats + 1 : 1})}
              >+</Button>
              <Button variant="outline-secondary"
                      onClick={() => setValue({...value, repeats: value?.repeats ? Math.max(value.repeats - 1, 1) : 1})}
              >-</Button>
            </InputGroup>
          </Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Form.Label column xs="4">Weight</Form.Label>
          <Col xs="8">
            <InputGroup>
              <Form.Control type="number" placeholder="weight" min="1" step="0.5"
                            value={(value === undefined || value === null) ? '' : value.weight}
                            onChange={(e) => {
                              let lastChar = e.target.value[e.target.value.length - 1]
                              if (lastChar === '.' || lastChar === ',') {
                                // @ts-ignore
                                setValue({...value, weight: e.target.value})
                              }
                              let v = parseFloat(e.target.value)
                              setValue({
                                ...value,
                                weight: isNaN(v) ? undefined : Math.max(0, Math.round(v * 100) / 100)
                              })
                            }}/>
              <Button variant="outline-secondary"
                      onClick={() => setValue({...value, weight: value?.weight ? value.weight + 0.5 : 0.5})}
              >+</Button>
              <Button variant="outline-secondary"
                      onClick={() => setValue({...value, weight: value?.weight ? Math.max(value.weight - 0.5, 0) : 0})}
              >-</Button>
            </InputGroup>
          </Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Col><Form.Label htmlFor="oneMoreSwitch">Can do 1 more?</Form.Label></Col>
          <Col><Form.Check type="switch" id="oneMoreSwitch"/></Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Form.Label column xs="4">Feel</Form.Label>
          <Col xs="8">
            <InputGroup className="w-100">
              {/*too hard, energetic, exhausted*/}
              <Button className='icon' variant="outline-danger flex-grow-1" value="exhausted">☠️</Button>
              <Button className='icon' variant="outline-secondary flex-grow-1" value="too-hard">🪨</Button>
              <Button className='icon' variant="outline-primary flex-grow-1" value="energetic">🔋</Button>
              {/*Button - pick custom*/}
            </InputGroup>
          </Col>
        </Form.Group>
        <Form.Group as={Row}>
          <Form.Label column xs="4">Pain</Form.Label>
          <Col xs="8">
            <InputGroup className="w-100">
              {/*joint pain, back pain,
                 clicks in joints,
                 side pain,
                 can't breath,
                 muscle pain/muscles on fire (ok)
                 */}
              <Button className='icon' variant="outline-secondary flex-grow-1">1</Button>
              <Button className='icon' variant="outline-secondary flex-grow-1">2</Button>
              <Button className='icon' variant="outline-secondary flex-grow-1">3</Button>
              <Button className='icon' variant="outline-secondary flex-grow-1">4</Button>
            </InputGroup>
          </Col>
        </Form.Group>
      </Form>
    </Modal.Body>
    <Modal.Footer className='flex-grow-1 w-100'>
      <Row className="w-100">
        <Col>
          <Button>Record</Button>
          {/* https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b */}
        </Col>
        <Col className='text-end'>
          <Button disabled>Save</Button>
        </Col>
      </Row>

    </Modal.Footer>
  </Modal>
}