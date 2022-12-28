import { useState, useEffect, useCallback, Suspense } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import "bulma/css/bulma.min.css";
import * as Bulma from 'react-bulma-components';
import { emit, listen, UnlistenFn, EventCallback } from '@tauri-apps/api/event';
import { open, save } from '@tauri-apps/api/dialog';
import * as Papa from 'papaparse';
import { useReducerAsync, AsyncActionHandlers } from "use-reducer-async";

type Project = {
  file: string;
  csv: string;
  template: string;
}
// Check if the `$APPDATA/avatar.png` file exists
function doTemplate(tpl: string, data: string[][], dataRow: number): Promise<string> {
  if (!data || data.length <= 1)
    return Promise.resolve("<no data>");
  var headers = data[0];
  var row = data[dataRow];
  let res = tpl;
  headers.forEach((h, i) => res = res.replaceAll(`$${h}`, row[i]));
  return invoke<string>("render", { markdown: res });

}
let listenCallback: ((path: string) => void) | undefined = undefined;

function App() {
  console.log("rec")
  console.trace();
  // const unlisten = listen<string>('fs', e => {
  //   if (listenCallback)
  //     listenCallback(e.payload);
  // });
  return <App2 />
  // <Suspense fallback={<span>Loading</span>}>
  // unlisten={unlisten} />
  // </Suspense>;
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
}
const Panel = ({ title, children }: PanelProps) => {
  return <Bulma.Columns.Column>
    <Bulma.Heading>{title}</Bulma.Heading>
    {children}
  </Bulma.Columns.Column>;
  const [opened, setOpened] = useState(true);
  return <Bulma.Columns.Column narrow={!opened}>
    {opened ? <>
      <div className="rotated-wrapper">
        <span onClick={() => setOpened(!opened)} className="has-background-light">{title}</span>
      </div>
      {children} </> :
      <div className="rotated-wrapper">
        <span onClick={() => setOpened(!opened)} className="rotated has-background-light">{title}</span>
      </div>}
  </Bulma.Columns.Column>

}

interface State {
  row: number;
  template: string;
  preview: string;
  data?: string[][];
  progress?: number;
}

const htmlTemplate = (title: string, content: string) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css">
  </head>
  <body>
    <section class="section">
      <div class="container">
        <div class="content">
          ${content}
        </div>
      </div>
    </section>  
  </body>
</html>`;

type AsyncAction =
  | { type: 'load', path: string, kind: 'csv' | 'template' }
  | { type: "update-preview", template: string, row: number }
  | { type: "open", kind: 'csv' | 'template' }
  | { type: "export" }
type SyncAction =
  | { type: "set-preview", preview: string, template: string, row: number }
  | { type: 'set-data', data?: string[][] }
  | { type: 'loading', progress?: number }

type Action = AsyncAction | SyncAction

function reducer(state: State, action: SyncAction): State {
  console.log(state, action);
  switch (action.type) {
    case 'set-preview':
      return { ...state, preview: action.preview, row: action.row, template: action.template };
    case 'set-data':
      return { ...state, data: action.data };
    case 'loading':
      return { ...state, progress: action.progress };
  }
  return state;
}
type Reducer = (state: State, action: Action) => State;
const asyncHandlers: AsyncActionHandlers<Reducer, AsyncAction> = {
  "load": (s) => async (action) => {
    if (action.kind === 'template') {
      s.dispatch({type:"update-preview", row: s.getState().row,template: await invoke<string>("getfile", { name: action.path })})
      // s.dispatch({type: "set-preview", template: "", row: s.getState().row, preview: ""})
      
      // const content = await invoke<string>("getfile", { name: action.path });
      // s.dispatch({type: "set-preview", template:content, row: s.getState().row, preview: ""})
    } else {
      s.dispatch({ type: 'set-data', data: undefined });
      console.log("load", action, s);
      const content = await invoke<string>("getfile", { name: action.path });
      const parsed = Papa.parse<string[]>(content, { delimiter: ',' });
      if (parsed && parsed.data.length > 0)
        parsed.data[0] = parsed.data[0].map((h, i) => {
          const hh = h.trim();
          if (hh === "")
            return `${i}`;
          return hh;
        });
      // const content = await invoke<string>("greet", {name: e.payload});
      console.log("content", content, parsed);
      s.dispatch({ type: 'set-data', data: parsed.data });
    }
  },

  "update-preview": (s) => async (action) => {
    console.log("update preview", action, s);
    s.dispatch({ type: 'set-preview', preview: "??", template: action.template, row: action.row });
    const preview = await doTemplate(action.template, s.getState().data ?? [], action.row);
    s.dispatch({ type: 'set-preview', preview: preview, template: action.template, row: action.row });
  },
  "open": s => async (action) => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: action.kind === 'csv' ? 'CSV' : "HTML template",
        extensions: [ action.kind === 'csv' ? 'csv' : "html"]
      }]
    });
    if (typeof selected === 'string')
      s.dispatch({ type: 'load', path: selected, kind: action.kind });
  },
  "export": s => async (action) => {
    const state = s.getState();
    if (!state.data)
      return;
    const folder = await open({ directory: true });
    console.log(folder);
    if (typeof folder === 'string') {
      s.dispatch({ type: 'loading', progress: 0 });
      try {
        for (let index = 1; index < state.data.length; index++) {
          s.dispatch({ type: 'loading', progress: 100 * index / state.data.length });
          const row = state.data[index];
          // await new Promise(resolve => setTimeout(resolve, 1000));
          const tpl = await doTemplate(state.template, state.data, index);
          invoke("save", { folder, file: `out-${index}.html`, template: htmlTemplate(`${index}`, tpl) });
        }
      } finally {
        s.dispatch({ type: 'loading', progress: undefined });
      }
    }
  }
};
const Icon = ({name}:{name:string}) => 
<Bulma.Icon><i className={`fas fa-${name} mr-2`} aria-hidden="true"></i></Bulma.Icon>
function App2() {
  // if(typeof unlisten === 'function')
  // unlisten();
  // console.log(unlisten)

  // useEffect(() => {
  //   const unlisten = listen<string>('fs', e => {
  //     if (listenCallback)
  //       listenCallback(e.payload);
  //   });
  // }, []);

  const initState: State = { row: 1, template: "", preview: "", data: [], progress: undefined };
  const [state, dispatch] = useReducerAsync(reducer, initState, asyncHandlers);
const [menuOpened, setMenuOpened] = useState(false);

  // listenCallback = async (e) => {
  //   dispatch({ type: 'load', file: e });

  // };
  // useEffect(() => {
  //   if (listenCallback)
  //     listenCallback("../asd.csv");
  // dispatch({type:'load', file: "../asd.csv"})
  // }, []);
  // useEffect(() => {
  //   doTemplate(template, data, row).then(x => dispatch({type: "update-preview", html:x}));
  // }, [template, row])

  // greet();
  // console.log(state);

  return (
    <>
      <Bulma.Navbar color="link">
        <Bulma.Navbar.Brand>
          {/* <Bulma.Navbar.Item>asd</Bulma.Navbar.Item> */}
          <Bulma.Navbar.Burger onClick={() => setMenuOpened(!menuOpened)} className={`${menuOpened && 'isActive'}`}/>

        </Bulma.Navbar.Brand>
        <Bulma.Navbar.Menu className={`${menuOpened && 'is-active'}`}>
          <Bulma.Navbar.Container>
            <Bulma.Navbar.Item onClick={() => dispatch({ type: 'open', kind: 'csv' })}>
              <Bulma.Navbar.Link>
                <Icon name="folder-open"/>
                Open CSV
              </Bulma.Navbar.Link>
            </Bulma.Navbar.Item>

            <Bulma.Navbar.Item>
              <Bulma.Navbar.Link onClick={() => dispatch({ type: 'open', kind: 'template' })}>
                <Icon name="folder-open"/>
                Open template
              </Bulma.Navbar.Link>
            </Bulma.Navbar.Item>

            <Bulma.Navbar.Item>
              <Bulma.Navbar.Link onClick={() => dispatch({ type: 'export' })}>
                <Icon name="download"/>
                Export all
              </Bulma.Navbar.Link>
            </Bulma.Navbar.Item>
          </Bulma.Navbar.Container>
        </Bulma.Navbar.Menu>
      </Bulma.Navbar>
      <Bulma.Section>
        <Bulma.Columns>
          <Panel title="Data">
            <Bulma.Block>
              <Bulma.Table striped size="fullwidth" hoverable>
                <thead>
                  {state.data && state.data?.length > 0 ? <tr>
                    <th>#</th>
                    {state.data[0].map((f, i) => <th key={i}>{f}</th>)}
                  </tr> : <tr>No data yet</tr>}
                </thead>
                <tbody>
                  {state.data && state.data.map((crow, i) => i == 0
                    ? undefined
                    : <tr className={`${i === state.row && 'is-selected'}`} onClick={_ => dispatch({ type: 'update-preview', row: i, template: state.template })} key={i}>
                      <td>{i}</td>
                      {crow.map((f, j) => <td key={j}>{f}</td>)}
                    </tr>
                  )}
                </tbody>
              </Bulma.Table>
            </Bulma.Block>
          </Panel>

          <Panel title="Template">
            <Bulma.Block>
              <Bulma.Form.Textarea value={state.template} onChange={e => dispatch({ type: 'update-preview', row: state.row, template: e.target.value })}>
              </Bulma.Form.Textarea>
            </Bulma.Block>

          </Panel>
          <Panel title="Preview">
            <Bulma.Block>
              <Bulma.Content dangerouslySetInnerHTML={{ __html: state.preview }}>
              </Bulma.Content>
            </Bulma.Block>
          </Panel>
        </Bulma.Columns>
      </Bulma.Section>
      {state.progress &&
        <Bulma.Modal show={true} showClose={false}>
          <div className="modal-background"></div>
          <Bulma.Modal.Content>
            <Bulma.Block className="has-text-light">
              Export
            </Bulma.Block>
            <Bulma.Progress value={state.progress} max={100} size={"large"} />
          </Bulma.Modal.Content>
        </Bulma.Modal>
      }
    </>
  );
}

export default App;


