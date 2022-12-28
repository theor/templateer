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
}

type AsyncAction =
  | { type: 'load', file: string }
  | { type: "update-preview", template: string, row: number }
  | { type: "open", file: 'csv' | 'template' }
type SyncAction =
  | { type: "set-preview", preview: string, template: string, row: number }
  | { type: 'set-data', data?: string[][] }

type Action = AsyncAction | SyncAction

function reducer(state: State, action: SyncAction): State {
  console.log(state, action);
  switch (action.type) {
    case 'set-preview':
      return { ...state, preview: action.preview, row: action.row, template: action.template};
    case 'set-data':
      return {...state, data: action.data};
  }
  return state;
}
type Reducer = (state: State, action: Action) => State;
const asyncHandlers: AsyncActionHandlers<Reducer, AsyncAction> = {
  "load": (s) => async (action) => {
    s.dispatch({ type: 'set-data', data: undefined });
    console.log("load", action, s);
    const content = await invoke<string>("getfile", { name: action.file });
    const parsed = Papa.parse<string[]>(content, { delimiter: ',' });
    if(parsed && parsed.data.length > 0)
    parsed.data[0] = parsed.data[0].map((h,i) => {
      const hh = h.trim();
      if(hh === "")
        return `${i}`;
      return hh;
    });
    // const content = await invoke<string>("greet", {name: e.payload});
    console.log("content", content, parsed);
    s.dispatch({ type: 'set-data', data: parsed.data });
  },

  "update-preview": (s) => async (action) => {
    console.log("update preview", action, s);
    s.dispatch({ type: 'set-preview', preview: "??", template: action.template, row: action.row });
    const preview = await doTemplate(action.template, s.getState().data ?? [], action.row);
    s.dispatch({ type: 'set-preview', preview: preview, template: action.template, row: action.row });
  },
  "open" : s => async (action) => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'CSV',
        extensions: ['csv']
      }]
    });
    if(typeof selected ===  'string')
      s.dispatch({type:'load', file: selected});
  },
};

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

  const initState: State = { row: 1, template: "", preview: "", data: [] };
  const [state, dispatch] = useReducerAsync(reducer, initState, asyncHandlers);

  // const [row, setRow] = useState(1);
  // const [template, setTemplate] = useState("# $Nom\n\n$Note");
  // const [preview, setPreview] = useState("");
  // const [csvContent, setCsvContent] = useState<string[][]>([]);


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
console.log(state);

  return (
    <>
    <Bulma.Navbar color="primary">
      <Bulma.Navbar.Brand>
      <Bulma.Navbar.Item>asd</Bulma.Navbar.Item>
      <Bulma.Navbar.Burger/>

      </Bulma.Navbar.Brand>
      <Bulma.Navbar.Menu>
        <Bulma.Navbar.Container>
          <Bulma.Navbar.Item>
          <Bulma.Navbar.Link onClick={() => dispatch({type: 'open', file: 'csv'})}>
            CSV
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
                { state.data && state.data?.length > 0 && <tr>{state.data[0].map((f, i) => <th key={i}>{f}</th>)}</tr>}
              </thead>
              <tbody>
                {state.data && state.data.map((crow, i) => i == 0
                  ? undefined
                  : <tr className={`${i ===state.row && 'is-selected'}`} onClick={_ => dispatch({ type: 'update-preview', row: i, template: state.template })} key={i}>{crow.map((f, j) => <td key={j}>{f}</td>)}</tr>
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
    </>
  );
}

export default App;


