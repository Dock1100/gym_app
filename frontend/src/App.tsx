import React from 'react';
import Button from 'react-bootstrap/Button';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import {Col, Container, Nav, Navbar, NavDropdown, Row, Stack} from "react-bootstrap";


function App() {

  let lines = []
  for (let i = 0; i < 100; i++) {
    lines.push(<p>line {i}</p>)
  }
  return (
    <>
      <div style={{padding: '48px 0px', height: "100%"}}>
        <div style={{background: "white", lineHeight: '48px', boxShadow: "0 0px 10px rgba(0,0,0,0.3)", position: 'fixed', width: '100%', top: 0, height: '48px'}}>
          <Row>
            <Col>left</Col>
            <Col xs={6} className="text-center">center</Col>
            <Col className="text-end">right</Col>
          </Row>
        </div>
        <div style={{overflow: "scroll", height: "100%"}}>
            {lines}
        </div>
        <div style={{background: "white", lineHeight: '48px', boxShadow: "0 0px 10px rgba(0,0,0,0.3)", position: 'fixed', width: '100%', bottom: 0, height: '48px'}}>
          footer
        </div>
      </div>
    </>
  );
}

export default App;
