import { useState } from "react";
import { Toaster } from 'sonner';
import { invoke } from "@tauri-apps/api/core";
import FirstRunWizard from "./components/FirstRunWizard";
import { AppTitleBar } from "./components/AppTitleBar";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <div className="ng-layout-base h-dvh w-full">
      <div className="ng-appbar">
        <AppTitleBar />
      </div>

      <main className="ng-layout-content p-4 overflow-auto">
        <Toaster position="top-right" />

        <FirstRunWizard onFinish={() => { }} />

        <form
          className="row mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button type="submit">Greet</button>
        </form>
        <p>{greetMsg}</p>
      </main>
    </div>
  );
}

export default App;