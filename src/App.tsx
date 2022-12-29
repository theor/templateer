import { createContext, useState, useEffect, useCallback, Suspense, useContext, useRef } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import "bulma/css/bulma.min.css";
import * as Bulma from 'react-bulma-components';
import { emit, listen, UnlistenFn, EventCallback } from '@tauri-apps/api/event';
import * as Papa from 'papaparse';
import { useReducerAsync, AsyncActionHandlers } from "use-reducer-async";
import { DockLayout, LayoutData, LayoutBase, PanelData } from 'rc-dock'
import "rc-dock/dist/rc-dock.css";
import { Toolbar } from "./Toolbar";
import {Action, asyncHandlers, reducer, State} from "./Actions";

type Project = {
  file: string;
  csv: string;
  template: string;
}

let listenCallback: ((path: string) => void) | undefined = undefined;


// Hook
function useEventListener(eventName: string, handler: EventListener, element = window) {
  // Create a ref that stores handler
  const savedHandler = useRef<EventListener>();
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  useEffect(
    () => {
      // Make sure element supports addEventListener
      // On
      const isSupported = element && element.addEventListener;
      if (!isSupported) return;
      // Create event listener that calls handler function stored in ref
      const eventListener = (event: Event) => savedHandler.current!(event);
      // Add event listener
      element.addEventListener(eventName, eventListener);
      // Remove event listener on cleanup
      return () => {
        element.removeEventListener(eventName, eventListener);
      };
    },
    [eventName, element] // Re-run if eventName or element changes
  );
}

function App() {
  const initState: State = { row: 1, template: "", preview: "", data: [], progress: undefined };
  const [state, dispatch] = useReducerAsync(reducer, initState, asyncHandlers);

  const handler = useCallback(
    (x:KeyboardEvent) => {
      console.log(x, state)
      // Update coordinates
      if (!state.data || state.data.length < 3)
        return;
      if (x.ctrlKey) {
        console.warn("MOVE")
        switch (x.code) {
          case "ArrowDown":
            x.preventDefault();
            dispatch({ type: 'update-preview', row: 1 + ((state.row) % (state.data.length - 1)), template: state.template }); break;
          case "ArrowUp":
            x.preventDefault();
            dispatch({ type: 'update-preview', row: 1 + (state.row - 1 + state.data.length - 2) % (state.data.length - 1), template: state.template }); break;
        }
      }
    },
    [dispatch, state]
  );
  // Add event listener using our hook
  useEventListener("keyup", handler as EventListener);

  return <AppContext.Provider value={{ state, dispatch }}>
    <App2 />
  </AppContext.Provider>
}


export const Icon = ({ name }: { name: string }) =>
  <Bulma.Icon><i className={`fas fa-${name} mr-2`} aria-hidden="true"></i></Bulma.Icon>;

// interface AppProps {
//   state: State,
//   dispatch: React.Dispatch<Action>,
// }

const DataPanel = () => {
  const [state, dispatch] = useAppReducer();
  return <Bulma.Block>
    <Bulma.Table striped size="fullwidth" hoverable>
      <thead>
        {state.data && state.data?.length > 0 ? <tr>
          <th>#</th>
          {state.data[0].map((f, i) => <th key={i}>{f}</th>)}
        </tr> : <tr><td>No data yet</td></tr>}
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
};
const TemplatePanel = () => {
  const [state, dispatch] = useAppReducer();
  // console.warn(state.template);
  return (
    // <Bulma.Block>
    <Bulma.Form.Textarea style={{ maxHeight: "unset", height: "100%" }} value={state.template} onChange={e => dispatch({ type: 'update-preview', row: state.row, template: e.target.value })}>
    </Bulma.Form.Textarea>
    // </Bulma.Block>
  );
}

function useAppReducer(): [State, React.Dispatch<Action>] {//, React.KeyboardEventHandler] {
  const { state, dispatch } = useContext(AppContext)!;
  const onKeyDown: React.KeyboardEventHandler = x => {
    console.log("dispatch down")
    if (!state.data || state.data.length < 3)
      return;
    if (x.ctrlKey) {
      switch (x.code) {
        case "ArrowDown":
          x.preventDefault();
          dispatch({ type: 'update-preview', row: 1 + (state.row) % (state.data.length - 1), template: state.template }); break;
        case "ArrowUp":
          x.preventDefault();
          dispatch({ type: 'update-preview', row: 1 + (state.row - 1 + state.data.length - 2) % (state.data.length - 1), template: state.template }); break;
      }
    }
  };
  return [state, dispatch];//, onKeyDown];
}

const PreviewPanel = () => {
  const [state, _dispatch] = useAppReducer();
  return <Bulma.Block>
    <Bulma.Content dangerouslySetInnerHTML={{ __html: state.preview }}>
    </Bulma.Content>
  </Bulma.Block>;
}

type AppContext = {
  state: State,
  dispatch: React.Dispatch<Action>,
};
const AppContext = createContext<AppContext | undefined>(undefined);
function App2() {
  const [state, dispatch] = useAppReducer();

  const l: LayoutBase = {
    dockbox: {
      mode: 'horizontal',
      children: [
        {
          tabs: [
            { id: 'data', },
          ]
        },
        {
          tabs: [
            { id: 'template' },]
        },
        {
          tabs: [
            { id: 'preview' },]
        },
      ]
    }
  };
  const [layout, setLayout] = useState<LayoutBase>(l);

  return (
    <div>
      <Toolbar dispatch={dispatch} />

      <DockLayout
        layout={layout as LayoutData}
        onLayoutChange={x => {
          console.log("layout change", x)
          return setLayout(x);
        }}
        loadTab={x => {
          switch (x.id) {
            case 'data': return { id: 'data', title: 'Data', cached: false, content: x => <DataPanel /> };
            case 'template': return { id: 'template', title: 'Template', content: x => <TemplatePanel /> };
            case 'preview': return { id: 'preview', title: 'Preview', content: x => <PreviewPanel /> };
            default: return { id: '??', title: '??', content: <span>??</span> }
          }
        }}
        style={{
          position: "absolute",
          left: 10,
          top: 60,
          right: 10,
          bottom: 10,
        }}
      />
      {/* <Bulma.Section>
        <Bulma.Columns> */}
      {/* <DataPanel state={state} dispatch={dispatch} />
          <TemplatePanel state={state} dispatch={dispatch} />
          <PreviewPanel state={state} dispatch={dispatch} /> */}



      {/* </Bulma.Columns>
      </Bulma.Section> */}
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
    </div>
  );
}

export default App;



