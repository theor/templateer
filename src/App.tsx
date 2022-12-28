import { useState, useEffect, useCallback, Suspense } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import "bulma/css/bulma.min.css";
import * as Bulma from 'react-bulma-components';
import { emit, listen, UnlistenFn, EventCallback } from '@tauri-apps/api/event';
import * as Papa from 'papaparse';

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
  const unlisten = listen<string>('fs', e => {
    if (listenCallback)
      listenCallback(e.payload);
  });
  return <Suspense fallback={<span>Loading</span>}>
    <App2 unlisten={unlisten} />
  </Suspense>;
}

interface PanelProps {
  title: string;
  children: React.ReactNode;
}
const Panel = ({ title, children }: PanelProps) => {
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
function App2({ unlisten }: { unlisten: Promise<UnlistenFn> }) {
  // if(typeof unlisten === 'function')
  // unlisten();
  console.log(unlisten)
  const [row, setRow] = useState(1);
  const [template, setTemplate] = useState("# $Nom\n\n$Note");
  const [preview, setPreview] = useState("");
  const [csvContent, setCsvContent] = useState<string[][]>([]);
  // const [unlistenFn, setUnlistenFn] = useState<UnlistenFn|undefined>(undefined);



  // useEffect(() => {
  //   (async() => {
  //   const unlisten = await listen<string>('fs', e => {
  //     if(listenCallback)
  //       listenCallback(e);
  //   });
  //   setUnlistenFn(unlisten);
  // })();
  // return typeof unlistenFn === 'function' ? () => unlistenFn() : undefined;
  // });

  listenCallback = async (e) => {
    console.warn(e);
    const content = await invoke<string>("getfile", { name: e });
    const parsed = Papa.parse<string[]>(content, { delimiter: ',' });
    // const content = await invoke<string>("greet", {name: e.payload});
    console.log("content", content, parsed);
    setCsvContent(parsed.data);
  };
  useEffect(() => {
    // if(listenCallback)
      // listenCallback("../asd.csv");
  });
  useEffect(() => {
    doTemplate(template, csvContent, row).then(x => setPreview(x));
  }, [template, row])

  // greet();


  return (

    <Bulma.Section>
      <Bulma.Columns>
        <Panel title="Data">
          <Bulma.Block>
            <Bulma.Table striped size="fullwidth" hoverable>
              <thead>
                {csvContent?.length > 0 && <tr>{csvContent[0].map((f, i) => <th key={i}>{f}</th>)}</tr>}
              </thead>
              <tbody>
                {csvContent && csvContent.map((crow, i) => i == 0
                  ? undefined
                  : <tr className={`${i === row && 'is-selected'}`} onClick={_ => setRow(i)} key={i}>{crow.map((f, j) => <td key={j}>{f}</td>)}</tr>
                )}
              </tbody>
            </Bulma.Table>
          </Bulma.Block>
        </Panel>
        
        <Panel title="template">
          <Bulma.Block>
            <Bulma.Form.Textarea value={template} onChange={e => setTemplate(e.target.value)}>
            </Bulma.Form.Textarea>
          </Bulma.Block>

        </Panel>
        <Panel title="Preview">
          <Bulma.Block>
            <Bulma.Content dangerouslySetInnerHTML={{ __html: preview }}>
            </Bulma.Content>
          </Bulma.Block>
        </Panel>
      </Bulma.Columns>
    </Bulma.Section>
   
  );
}

export default App;
