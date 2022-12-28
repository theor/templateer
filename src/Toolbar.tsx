import { useState } from "react";
import * as Bulma from 'react-bulma-components';
import { Action, Icon } from "./App";

export function Toolbar({ dispatch }: { dispatch: React.Dispatch<Action>; }) {
  const [menuOpened, setMenuOpened] = useState(false);
  return <Bulma.Navbar color="link">
    <Bulma.Navbar.Brand>
      {/* <Bulma.Navbar.Item>asd</Bulma.Navbar.Item> */}
      <Bulma.Navbar.Burger onClick={() => setMenuOpened(!menuOpened)} className={`${menuOpened && 'isActive'}`} />

    </Bulma.Navbar.Brand>
    <Bulma.Navbar.Menu className={`${menuOpened && 'is-active'}`}>
      <Bulma.Navbar.Container>
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
      </Bulma.Navbar.Container>
    </Bulma.Navbar.Menu>
  </Bulma.Navbar>;
}
