import {Exercise} from "../types";
import {Col, Form, InputGroup, Modal, Row} from "react-bootstrap";
import axios from "axios";
import Button from "react-bootstrap/Button";
import {EditableExerciseBlock} from "./edit_exercise";
import React, {useState} from "react";
import {ElementType, stringLiterals} from "../const";


export const FEEL_OPTIONS = stringLiterals("bad", "exhausted", "ok", "energetic");
export type TFeelOption = ElementType<typeof FEEL_OPTIONS>;

export const FEEL_ICONS = {
  bad: "🤢",
  exhausted: "😮‍💨",
  ok: "😐",
  energetic: "🤩",
}

export const HARM_OPTIONS = stringLiterals(
  "no_air",
  "dizzy",
  "joint",
  "burn"
);
export type THarmOption = ElementType<typeof HARM_OPTIONS>;

export const HARM_ICONS = {
  no_air: "🫁🚫",
  dizzy: "😵‍💫",
  joint: "🦿‍🩹",
  burn: "💪🔥",
}

export const GOOD_HARM_OPTIONS = ["burn"];
export const BAD_HARM_OPTIONS = ["joint"];

export type TrainingLogRecord = {
  repeats: number
  weight: number
  able_to_do_1_more_time: boolean
  feel: TFeelOption
  harm: THarmOption[]
  tips?: string | null
}

export type TrainingLogRecordModalProps = {
  title?: string | null
  value: Partial<TrainingLogRecord> | null
  setValue(value: Partial<TrainingLogRecord> | null): void
  onSave(value: TrainingLogRecord): void
}

const MAX_REC_LENGTH_MS = 30000

const createMicRecorder = (onRecorded: ({
                                          micRec,
                                          recorder
                                        }: { micRec: Blob, recorder: MediaRecorder }) => void, maxDurationMs: number = MAX_REC_LENGTH_MS) => {
  return new Promise<MediaRecorder>((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();
      const audioChunks: Blob[] = [];

      const cleanup = () => {
        console.log("cleanup");
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach(track => track.stop());
      }

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks);
        audioBlob.arrayBuffer().then((data) => {
          console.log('arrayBuffer', data)
        })
        cleanup();
        onRecorded({micRec: audioBlob, recorder: mediaRecorder});
      });

      mediaRecorder.addEventListener("error", (e) => {
        cleanup();
        console.log('mediaRecorder.error', e)
        debugger;
        reject(e);
      });
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, maxDurationMs);
      resolve(mediaRecorder);
    }).catch((err) => {
      console.error(`failed to create media recorder`, err)
      debugger;
      reject(err)
    });
  });
}


export function TrainingLogRecordModal({title, value, setValue, onSave}: TrainingLogRecordModalProps) {
  const [showInfoModal, setShowInfoModal] = useState<'harm' | 'feel' | null>(null);
  const show = value != null;
  const showMainModal = show && showInfoModal == null;
  const [isProcessingRecord, setIsProcessingRecord] = useState(false);

  const handleMainClose = () => {
    setValue(null);
  }
  const handleInfoClose = () => {
    setShowInfoModal(null);
  }
  const [activeRecorder, setActiveRecorder] = useState<MediaRecorder | null>(null);

  const toggleRecording = () => {
    if (activeRecorder) {
      if (activeRecorder.state !== 'inactive') {
        activeRecorder.stop();
      }
      setActiveRecorder(null);
    } else {
      createMicRecorder(({micRec, recorder}) => {
        console.log('micRec', micRec)
        let formData = new FormData();
        let mime = recorder.mimeType;
        let ext = mime.split('/')[1].split(';')[0];
        let fileName = `rec_${Date.now()}.${ext}`;
        let file = new File([micRec], fileName);
        formData.append('file', file, fileName);
        formData.append('rec_key', fileName);

        setIsProcessingRecord(true);
        setActiveRecorder(null);

        return axios.post(`/api/upload_and_parse_training_log`,
          formData, {
            headers: {
              'Content-Type': `multipart/form-data`,
            },
          }).then((response) => {
          console.log('response', response)
          console.log('data', response.data)
          if (response.statusText == 'OK' && response.data.succeed_to_parse) {
            let log = response.data.training_log
            setIsProcessingRecord(false)
            setValue({
              repeats: log.repeats,
              weight: log.weight,
              able_to_do_1_more_time: log.able_to_do_more,
              feel: log.feel,
              harm: log.harm,
              tips: log.tips,
            })
          } else {
            setIsProcessingRecord(false)
            alert('failed to parse audio, use manual input')
          }
        }).catch((err) => {
          setIsProcessingRecord(false)
          alert('failed to parse audio, use manual input')
        })
      }).then((mediaRecorder) => {
        setActiveRecorder(mediaRecorder);
      })
    }
  }

  let tipsText = value?.tips || '';
  if (tipsText.length == 0) {
    let tips = []
    let hasHarm = (value?.harm && value.harm.length > 0) || (value?.feel && value?.feel == 'bad');
    let hasBadHarm = value?.harm?.some((h) => BAD_HARM_OPTIONS.includes(h));
    let hasGoodHarm = value?.harm?.some((h) => GOOD_HARM_OPTIONS.includes(h));
    if (hasHarm) {
      tips.push('Take rest and reduce the weight you are using.')
    }
    if (hasBadHarm) {
      tips.push('Speak to a medical if your pain or joint clicks persists for a long time.')
    }
    if (!hasBadHarm && (hasGoodHarm || !value?.able_to_do_1_more_time)) {
      if (value?.feel == 'bad')
        tips.push('You did great, but next time try easier.')
    } else {
      tips.push('Nicely done, keep pushing.')
    }
    tipsText = tips.join(' ');
  }

  return <>
    <Modal show={showMainModal} onHide={handleMainClose} backdrop="static"
           keyboard={false}
           centered
           className={"training-log-record-modal"}
    >
      <Modal.Header closeButton>
        <Modal.Title className="h5 text-center">{title || 'TrainingLog'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group as={Row}>
            <Form.Label column xs="4">Repeats<span style={{color: "red"}}>*</span></Form.Label>
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
                        onClick={() => setValue({
                          ...value,
                          repeats: value?.repeats ? Math.max(value.repeats - 1, 1) : 1
                        })}
                >-</Button>
              </InputGroup>
            </Col>
          </Form.Group>
          <Form.Group as={Row}>
            <Form.Label column xs="4">Weight<span style={{color: "red"}}>*</span></Form.Label>
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
                        onClick={() => setValue({
                          ...value,
                          weight: value?.weight ? Math.max(value.weight - 0.5, 0) : 0
                        })}
                >-</Button>
              </InputGroup>
            </Col>
          </Form.Group>
          <Form.Group as={Row}>
            <Col xs={8}><Form.Label htmlFor="oneMoreSwitch">Can not do one more?</Form.Label></Col>
            <Col xs={4}><Form.Check type="switch" id="oneMoreSwitch"
                                    checked={!value?.able_to_do_1_more_time}
                                    onClick={(e) => {
                                      // @ts-ignore
                                      setValue({...value, able_to_do_1_more_time: !e.target.checked})
                                    }}
            /></Col>
          </Form.Group>
          <Form.Group as={Row}>
            <Form.Label column xs="3">Feel<span style={{color: "red"}}>*</span> <a href='#'
                                                                                   onClick={() => setShowInfoModal('feel')}>i</a>
            </Form.Label>
            <Col xs="9">
              <InputGroup className="w-100">
                {FEEL_OPTIONS.map((feel, i) =>
                  <Button key={i} className='icon flex-grow-1'
                          variant={((value?.feel !== feel) ? 'outline-' : '') + (
                            i < 1 ? 'danger' : i < 2 ? 'warning' : i < 3 ? 'secondary' : 'success'
                          )}
                          onClick={(e) => setValue({
                            ...value,
                            feel: (value?.feel == feel) ? undefined : feel,
                            tips: null
                          })}
                  >{FEEL_ICONS[feel]}</Button>)}
                {/*Button - pick custom*/}
              </InputGroup>
            </Col>
          </Form.Group>
          <Form.Group as={Row}>
            <Form.Label column xs="3">Harm <a href='#' onClick={() => setShowInfoModal('harm')}>i</a></Form.Label>
            <Col xs="9">
              <InputGroup className="w-100">
                {HARM_OPTIONS.map((harm, i) =>
                  <Button key={i} className='icon  flex-grow-1'
                          variant={(!(value?.harm && value.harm.indexOf(harm) > -1) ? 'outline-' : '') + (
                            GOOD_HARM_OPTIONS.indexOf(harm) > -1 ? 'success' : 'danger'
                          )}
                          onClick={(e) => setValue({
                            ...value,
                            harm: (value?.harm && value.harm.indexOf(harm) > -1)
                              ? value.harm.filter((h) => h !== harm)
                              : (value?.harm || []).concat([harm]),
                            tips: null,
                          })}
                  >{HARM_ICONS[harm]}</Button>)}
              </InputGroup>
            </Col>
          </Form.Group>
        </Form>
        {tipsText && <>
          <hr/>
          <p><b>Tip:</b> {tipsText}</p></>}
      </Modal.Body>
      <Modal.Footer className='flex-grow-1 w-100'>
        <Row className="w-100">
          {isProcessingRecord && <Button variant="primary" disabled>Processing</Button>}
          {!isProcessingRecord && <>
            <Col>
              <Button disabled={isProcessingRecord}
                      onClick={toggleRecording}>{!activeRecorder ? 'Record' : 'Stop'}</Button>
              {/* https://medium.com/@bryanjenningz/how-to-record-and-play-audio-in-javascript-faa1b2b3e49b */}
            </Col>
            <Col className='text-end'>
              <Button
                disabled={!value || !value.feel || !value.repeats || !value.weight || !!activeRecorder || isProcessingRecord}
                onClick={() => {
                  if (value != null) {
                    if (value.harm == undefined) {
                      value.harm = []
                    }
                    if (value.able_to_do_1_more_time === undefined) {
                      value.able_to_do_1_more_time = false
                    }
                    // @ts-ignore
                    onSave(value)
                  }
                }}
              >Save</Button>
            </Col>
          </>}
        </Row>

      </Modal.Footer>
    </Modal>
    <Modal show={showInfoModal != null} onHide={handleInfoClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {showInfoModal === 'feel' && 'Feel info'}
          {showInfoModal === 'harm' && 'Harm info'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul>
          {showInfoModal === 'feel' &&
            FEEL_OPTIONS.map((feel, i) =>
              <>
                <dt>{FEEL_ICONS[feel]}</dt>
                <dd>{feel}</dd>
              </>)}
          {showInfoModal === 'harm' &&
            HARM_OPTIONS.map((harm, i) =>
              <>
                <dt>{HARM_ICONS[harm]}</dt>
                <dd>{harm}</dd>
              </>)}
        </ul>
      </Modal.Body>
    </Modal>
  </>
}