import { useState, useEffect, useCallback } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import "bulma/css/bulma.min.css";
import * as Bulma from 'react-bulma-components';
import { emit, listen, UnlistenFn, EventCallback } from '@tauri-apps/api/event';
 import * as Papa from 'papaparse';
// Check if the `$APPDATA/avatar.png` file exists
let listenCallback: EventCallback<string>|undefined = undefined;

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [csvContent, setCsvContent] = useState<unknown>([]);
  const [unlistenFn, setUnlistenFn] = useState<UnlistenFn|undefined>(undefined);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("cwd"));

  }

  useEffect(() => {
    (async() => {
    const unlisten = await listen<string>('fs', e => {
      if(listenCallback)
        listenCallback(e);
    });
    setUnlistenFn(unlisten);
  })();
  return typeof unlistenFn === 'function' ? () => unlistenFn() : undefined;
  });

  listenCallback = async (e) => {
    console.warn(e);
    const content = await invoke<string>("getfile", {name: e.payload});
    const parsed = Papa.parse(content, {header:true,delimiter: ','});
    // const content = await invoke<string>("greet", {name: e.payload});
    console.log("content", content, parsed);
    setCsvContent(parsed.data);
  };

  // greet();


  return (
    <Bulma.Section>
      <Bulma.Container>
        <Bulma.Columns>
          <Bulma.Columns.Column>
          <Bulma.Block>
            <Bulma.Content>
              {JSON.stringify(csvContent)}
              </Bulma.Content>
            </Bulma.Block>
          </Bulma.Columns.Column>
          <Bulma.Columns.Column>
            <Bulma.Block>
              {greetMsg}
            </Bulma.Block>
          </Bulma.Columns.Column>
        </Bulma.Columns>
      </Bulma.Container>
    </Bulma.Section>
    // <div className="container">
    //   <h1>Welcome to Tauri!</h1>

    //   <div className="row">
    //     <a href="https://vitejs.dev" target="_blank">
    //       <img src="/vite.svg" className="logo vite" alt="Vite logo" />
    //     </a>
    //     <a href="https://tauri.app" target="_blank">
    //       <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
    //     </a>
    //     <a href="https://reactjs.org" target="_blank">
    //       <img src={reactLogo} className="logo react" alt="React logo" />
    //     </a>
    //   </div>

    //   <p>Click on the Tauri, Vite, and React logos to learn more.</p>

    //   <div className="row">
    //     <div>
    //       <input
    //         id="greet-input"
    //         onChange={(e) => setName(e.currentTarget.value)}
    //         placeholder="Enter a name..."
    //       />
    //       <button type="button" onClick={() => greet()}>
    //         Greet
    //       </button>
    //     </div>
    //   </div>
    //   <p>{greetMsg}</p>
    // </div>
  );
}

export default App;
