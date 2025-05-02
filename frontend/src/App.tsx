
import { createSignal, For, type Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import { backend_url } from './settings';
import { createMutable } from 'solid-js/store';

type Player = {
  name: string;
  correct_letter: number;
  incorrect_letter: number;
  letter_index_upto: number;
  wpm: number;
}


const ws = new WebSocket(`${backend_url}/ws`)



const [server_data, setServerData] = createSignal({})

ws.onmessage = function (event) {
  console.log("onmessage: event", event.data)
  setServerData(JSON.parse(event.data))
}
type LetterInfo = {
  letter: string;
  typed: "correct" | "incorrect" | false
}


const [letterUpto, setLetterUpto] = createSignal(0)
const sentence = createMutable<LetterInfo[]>([
  
])
fetch(`${backend_url}/sentence`).then(response => response.json()).then(data => {
  data.sentence.split("").forEach((letter: string) => {
    sentence.push({ letter, typed: false })
  })
})



window.addEventListener("keydown", e => {
  const key = e.key
  console.log(e.key)
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift", "Control", "Meta", "Alt"].includes(e.key)) {
    return
  }
  if (e.key == "Backspace") {
    sentence[letterUpto() - 1].typed = false
    setLetterUpto(letterUpto() - 1)
  } else {
    if (letterUpto() >= sentence.length) {
      return
    }
    if (sentence[letterUpto()].letter !== e.key) {
      sentence[letterUpto()].typed = "incorrect"
    } else {
      sentence[letterUpto()].typed = "correct"
    }
    setLetterUpto(letterUpto() + 1)
  }
  ws.send(key)
})

const App: Component = () => {
  return (
    <div class={styles.App}>
      <For each={sentence}>{(letter: LetterInfo) => <span style={{ color: letter.typed === "correct" ? "green" : letter.typed === "incorrect" ? "red" : "black" }}>{letter.letter}</span>}</For>
      <ServerData />
    </div>
  );
};




function ServerData() {

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Correct letters</th>
          <th>Incorrect letters</th>
          <th>Letter index upto</th>
          <th>WPM</th>
        </tr>
      </thead>
      <tbody>
        <For each={Object.keys(server_data())}>{(key) => (
          <tr>
            <td>{key}</td>
            <td>{server_data()[key].correct_letter}</td>
            <td>{server_data()[key].incorrect_letter}</td>
            <td>{server_data()[key].letter_index_upto}</td>
            <td>{server_data()[key].wpm}</td>
          </tr>
        )}</For>
      </tbody>
    </table>
  );
};


export default App;