import { useState, useEffect, useCallback } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import "bulma/css/bulma.min.css";
import * as Bulma from 'react-bulma-components';
import { emit, listen, UnlistenFn, EventCallback } from '@tauri-apps/api/event'
// Check if the `$APPDATA/avatar.png` file exists
let listenCallback: EventCallback<string>|undefined = undefined;
const unlisten = await listen<string>('fs', e => {
  if(listenCallback)
    listenCallback(e);
});
function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [csv, setCsv] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    setGreetMsg(await invoke("cwd"));

  }

  listenCallback = async (e) => {
    console.warn(e);
    const content = await invoke<string>("getfile", {name: e.payload});
    // const content = await invoke<string>("greet", {name: e.payload});
    console.log("content", content);
    setGreetMsg(content);
  };

  // greet();


  return (
    <Bulma.Section>
      <Bulma.Container>
        <Bulma.Columns>
          <Bulma.Columns.Column>
            <h1 className="title">
              Hello World
            </h1>
            <p className="subtitle">
              My first website with <strong>Bulma</strong>!
            </p>
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
