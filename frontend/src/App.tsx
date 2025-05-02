
import { Accessor, createSignal, For, Match, Show, Switch, type Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import { backend_url } from './settings';
import { createMutable, produce } from 'solid-js/store';
import { Players } from 'tone';
import { object, string } from 'zod';
import { UnderlinedChar } from './UnderlinedChar';

type Player = {
  name: string;
  correct_letter: number;
  incorrect_letter: number;
  letter_index_upto: number;
  wpm: number;
  color: string;
}

const   power_up = "*"
const ws = new WebSocket(`${backend_url}/ws`)



const [server_data, setServerData] = createSignal<{[key: string]: Player}>({})

ws.onmessage = function (event) {
  console.log("onmessage: event", event.data)
  const j = JSON.parse(event.data)
  if (j['type'] == "power_up_gotten"){
    const index: number = j['index'] 
    power_ups_gotten[String(index)] = true 
  }
  switch (j['type']) {
    case "players":
      setServerData(j['players'])
      break;
    case "player_jump":
      const from: number = j['from'] 
      const to: number = j['to'] 
      for (let i = from; i < to; i++) {
        sentence[i].typed = "correct"
      } 
      setLetterUpto(to)
      break;
    case "player-typed":
      const player: Player = j['player'] 
      setServerData({...server_data(), [player.name]: player})
      break;
    default:
      break;
  }
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

const power_ups_gotten = createMutable<{[key: string]: boolean}>({})
fetch(`${backend_url}/power_ups_gotten`).then(response => response.json()).then(data => {
  for (const [index, value] of Object.entries(data.power_ups_gotten)) {
    power_ups_gotten[String(index)] = value as boolean
  }
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
    <>
    <div style={{display: "flex", "justify-content": "center", "align-items": "center", "font-size": "1.2rem", "flex-wrap": "wrap", "width": "100%",
      gap: ".2rem",
      "font-family": "monospace"
    }}>
      <For each={sentence}>{(letter: LetterInfo, index: Accessor<number>) =><span style={{
        "padding": "0 .05rem",
        "margin-top": ".5rem",
          "display": "inline",
          "width": [" ", "\n", "\t", "."].includes(letter.letter) ? ".2rem" : "auto",
          color: letter.typed === "correct" ? "rgb(0, 220, 0)" : letter.typed === "incorrect" ? "rgb(255, 0, 0)" : "black",
          // background: letter.typed === "correct" ? "white" : letter.typed === "incorrect" ? "white" : "black" 
        }}>
        <Switch>
          <Match when={letter.letter == power_up}>
          <span style={{color: "green", "font-weight": "bold",
          "font-family": "cursive",
              padding: "1px 2px",
              "margin": "2px 4px",
              // border: "solid 2px lightgreen",
              "border-radius": "8px",
              "box-shadow": "0 0 10px lightgreen"
            }}>
            {' +10 '}
          </span>
          </Match>
          <Match when={letter.letter !== power_up}>
            <UnderlinedChar char={letter.letter} 
            underlineColors={Object.values(server_data()).filter(player => player.letter_index_upto > index()+1).map(player => player.color)} 
            />
          </Match>
        </Switch>
          {/* <Show when={(() => {
            console.log("recalc of power_up_gotten", power_ups_gotten[String(index())])
              const power_up_gotten = power_ups_gotten[String(index())]
              return letter.letter !== power_up || power_up_gotten == false
            })()}>
         <UnderlinedChar char={letter.letter} 
         underlineColors={Object.values(server_data()).filter(player => player.letter_index_upto > index()+1).map(player => player.color)} 
         />
         </Show> */}
        </span>
      }</For>
    </div>
    {JSON.stringify(power_ups_gotten)}

    <ServerData />
    </>
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