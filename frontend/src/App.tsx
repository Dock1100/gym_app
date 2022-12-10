import React, {useState} from 'react';
import Button from 'react-bootstrap/Button';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Col, Container, Form, Modal, Nav, Navbar, NavDropdown, Row, Stack} from "react-bootstrap";
import axios from "axios";


function App() {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  let lines = []
  for (let i = 0; i < 100; i++) {
    lines.push(<p>line {i}</p>)
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
            <Row>
              <Col></Col>
              <Col xs={6} className="text-center">
                My exercises
              </Col>
              <Col className="text-end">
                <Button variant="outline-primary" className="align-middle" onClick={handleShow}>Add</Button>
              </Col>
            </Row>
          </Container>
        </div>
        <div style={{overflow: "scroll", height: "100%", padding: '12px 0'}}>
          <div className="h-100 w-100 d-flex align-items-center justify-content-center" >
            <p className="text-muted">You don't have any, add some!</p>
          </div>
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
          footer
        </div>
      </div>

      <Modal show={show} onHide={handleClose} fullscreen={true}>
        <Modal.Header closeButton>
          <Modal.Title>Add exercise</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => {
            e.preventDefault();
            console.log('form submitted', e);
            const target = e.target as typeof e.target & {
              videoUrl: { value: string };
            };
            const videoUrl = target.videoUrl.value;
            console.log('videoUrl', videoUrl);
            axios({
              method: 'post',
              url: '/api/parse_video_by_url',
              data: {
                videoUrl: videoUrl
              }
            })
              .then(function (response) {
                console.log('response', response);
              });
          }}>
            <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
              <Form.Label>Youtube url</Form.Label>
              <Form.Control
                type="text"
                name="videoUrl"
                placeholder="https://www.youtube.com/watch?v=IODxDxX7oi4"
                value="https://www.youtube.com/watch?v=IODxDxX7oi4"
                autoFocus
              />
            </Form.Group>
            <Button type="submit">Parse</Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleClose} disabled>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default App;
