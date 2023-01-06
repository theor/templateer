import { useState } from "react";
import * as Bulma from 'react-bulma-components';
import {  Icon } from "./App";
import {Action, useAppReducer} from "./Actions";

export function Toolbar() {
  const [state, dispatch] = useAppReducer();
  const [menuOpened, setMenuOpened] = useState(false);
  return <Bulma.Navbar color="link">
    <Bulma.Navbar.Brand>
       <Bulma.Navbar.Item onClick={() => dispatch({ type: 'new-project' })}>
         <Icon name="gopuram" classes={"ml-2"} />
       </Bulma.Navbar.Item> 
      <Bulma.Navbar.Burger onClick={() => setMenuOpened(!menuOpened)} className={`${menuOpened && 'isActive'}`} />

    </Bulma.Navbar.Brand>
    <Bulma.Navbar.Menu className={`${menuOpened && 'is-active'}`}>
      <Bulma.Navbar.Container>
        <Bulma.Navbar.Item onClick={() => dispatch({ type: 'open-project' })}>
            <Icon name="folder-open" />
        </Bulma.Navbar.Item>
        <Bulma.Navbar.Item onClick={() => dispatch({ type: 'save-project' })}>
            <Icon name="save" />
        </Bulma.Navbar.Item>
        <Bulma.Navbar.Item onClick={() => dispatch({ type: 'reload-project' })}>
            <Icon name="arrow-rotate-right" />
        </Bulma.Navbar.Item>
        <Bulma.Navbar.Item onClick={() => dispatch({ type: 'open', kind: 'csv' })}>
          <Bulma.Navbar.Link>
            <Icon name="folder-open" />
            Open CSV
          </Bulma.Navbar.Link>
        </Bulma.Navbar.Item>

        <Bulma.Navbar.Item>
          <Bulma.Navbar.Link onClick={() => dispatch({ type: 'open', kind: 'template' })}>
            <Icon name="folder-open" />
            Open template
          </Bulma.Navbar.Link>
        </Bulma.Navbar.Item>

        <Bulma.Navbar.Item>
          <Bulma.Navbar.Link onClick={() => dispatch({ type: 'export' })}>
            <Icon name="download" />
            Export all
          </Bulma.Navbar.Link>
        </Bulma.Navbar.Item>

        <Bulma.Navbar.Item hoverable> {/* active={!!(state.project.csv || state.project.template)} >*/}
          <Bulma.Navbar.Link>
            <Icon name="folder-open" />
            Project
          </Bulma.Navbar.Link>
          <Bulma.Navbar.Dropdown>
            <Bulma.Navbar.Item>CSV: {state.project.csv}</Bulma.Navbar.Item>
            <Bulma.Navbar.Item>Template: {state.project.template}</Bulma.Navbar.Item>
            <Bulma.Navbar.Item>Project: {state.project.projectFile}</Bulma.Navbar.Item>
          </Bulma.Navbar.Dropdown>
          
        </Bulma.Navbar.Item>
      </Bulma.Navbar.Container>
    </Bulma.Navbar.Menu>
  </Bulma.Navbar>;
}
