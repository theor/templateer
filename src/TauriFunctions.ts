import {invoke} from "@tauri-apps/api/tauri";

const save = (path:string, file: string|null, content:string) => invoke("save", { folder:path, file: file ?? "", template:content})
function render(res: string) {
    return invoke<string>("render", {markdown: res});
}
function getFile(path: string) {
    return invoke<string>("getfile", { name: path })
}
export const TauriFunctions = {
    save,
    render,
    getFile,
}

export default TauriFunctions;

