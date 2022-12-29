import {AsyncActionHandlers} from "use-reducer-async";
import {invoke} from "@tauri-apps/api/tauri";
import * as Papa from "papaparse";
import {open} from "@tauri-apps/api/dialog";
import {createContext, useContext} from "react";
import {act} from "react-dom/test-utils";

type Project = {
    projectFile?: string;
    csv?: string;
    template?: string;
}
export interface State {
    row: number;
    template: string;
    preview: string;
    data?: string[][];
    progress?: number;
    project: Project;
}
type Kind = 'csv' | 'template';
type AsyncAction =
    | {type: 'reload-project'}
    | { type: 'load', path: string, kind: Kind }
    | { type: "update-preview", template: string, row: number }
    | { type: "open", kind: Kind }
    | { type: "export" }
type SyncAction =
    | { type: "update-project", kind: Kind, value: string }
    | { type: "set-preview", preview: string, template: string, row: number }
    | { type: 'set-data', data?: string[][] }
    | { type: 'loading', progress?: number }

export type Action = AsyncAction | SyncAction


function doTemplate(tpl: string, data: string[][], dataRow: number): Promise<string> {
    if (!data || data.length <= 1)
        return Promise.resolve("<no data>");
    var headers = data[0];
    var row = data[dataRow];
    let res = tpl;
    headers.forEach((h, i) => res = res.replaceAll(`$${h}`, row[i]));
    return invoke<string>("render", { markdown: res });

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


export function reducer(state: State, action: SyncAction): State {
    console.log(state, action);
    switch (action.type) {
        case 'set-preview':
            return { ...state, preview: action.preview, row: action.row, template: action.template };
        case 'set-data':
            return { ...state, data: action.data };
        case 'loading':
            return { ...state, progress: action.progress };
        case "update-project":
            switch(action.kind){
                case "csv":
                    return {...state, project: {...state.project, csv: action.value}}
                case "template":
                    return {...state, project: {...state.project, template: action.value}}
            }
    }
    return state;
}
type Reducer = (state: State, action: Action) => State;
export const asyncHandlers: AsyncActionHandlers<Reducer, AsyncAction> = {
    "reload-project": s => async action => {
        const state = s.getState();
        if(state.project.csv){
            s.dispatch({type:"load", kind: "csv",path: state.project.csv})
        }
        if(state.project.template){
            s.dispatch({type:"load", kind: "template", path: state.project.template})
            
        }
    },
    "load": (s) => async (action) => {
        s.dispatch({type: 'update-project', kind:action.kind, value: action.path});
        if (action.kind === 'template') {
            s.dispatch({ type: "update-preview", row: s.getState().row, template: await invoke<string>("getfile", { name: action.path }) })
            // s.dispatch({type: "set-preview", template: "", row: s.getState().row, preview: ""})

            // const content = await invoke<string>("getfile", { name: action.path });
            // s.dispatch({type: "set-preview", template:content, row: s.getState().row, preview: ""})
        } else {
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
        // console.log("update preview", action, s);
        s.dispatch({ type: 'set-preview', preview: "??", template: action.template, row: action.row });
        const preview = await doTemplate(action.template, s.getState().data ?? [], action.row);
        s.dispatch({ type: 'set-preview', preview: preview, template: action.template, row: action.row });
    },
    "open": s => async (action) => {
        const selected = await open({
            multiple: false,
            filters: [{
                name: action.kind === 'csv' ? 'CSV' : "HTML template",
                extensions: [action.kind === 'csv' ? 'csv' : "html"]
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
export type AppContext = {
  state: State,
  dispatch: React.Dispatch<Action>,
};
export const AppContext = createContext<AppContext | undefined>(undefined);
export function useAppReducer(): [State, React.Dispatch<Action>] {//, React.KeyboardEventHandler] {
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