
import { Accessor, createSignal, For, type Component } from 'solid-js';

import logo from './logo.svg';
import styles from './App.module.css';
import { backend_url } from './settings';
import { createMutable } from 'solid-js/store';
import { Players } from 'tone';
import { object } from 'zod';

type Player = {
  name: string;
  correct_letter: number;
  incorrect_letter: number;
  letter_index_upto: number;
  wpm: number;
  color: string;
}


const ws = new WebSocket(`${backend_url}/ws`)



const [server_data, setServerData] = createSignal<{[key: string]: Player}>({})

ws.onmessage = function (event) {
  console.log("onmessage: event", event.data)
  const j = JSON.parse(event.data)
  if (j['name']) {
    setServerData({...server_data(), [j['name']]: j})
  } else{
    setServerData(j)
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
    <div style={{display: "flex", "justify-content": "center", "align-items": "center", "font-size": "1.2rem", "flex-wrap": "wrap", "width": "100%"}}>
      <For each={sentence}>{(letter, index) =><span style={{
        "padding": "0 .07rem",
          "display": "inline",
          "width": [" ", "\n", "\t", "."].includes(letter.letter) ? ".2rem" : "auto",
          background: letter.typed === "correct" ? "rgb(0, 220, 0)" : letter.typed === "incorrect" ? "rgb(255, 0, 0)" : "white",
          color: letter.typed === "correct" ? "white" : letter.typed === "incorrect" ? "white" : "black" 
        }}>
          
         <UnderlinedChar char={letter.letter} 
         underlineColors={Object.values(server_data()).filter(player => player.letter_index_upto > index()+1).map(player => player.color)} 
         />
          
          

        </span>
      }</For>
    </div>
    <ServerData />
    <Other />
    </>
  );
};



function UnderlinedChar(props: {char: string, underlineColors: string[] }) {
  console.log({underlineColors: props.underlineColors})
  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      {props.char}
      {props.underlineColors.map((color, index) => (
        <span
          style={{
            position: 'absolute',
            content: '""',
            left: 0,
            width: '200%',
            height: '2px',
            background: color,
            bottom: `-${2 + index * 4}px`,
          }}
        ></span>
      ))}
    </span>
  );
}

function Other() {
  const doubly = "doubly underlined";
  const triply = "triply underlined";

  return (
    <div>
      <p>
        This is{' '}
        {doubly.split('').map((char, i) => (
          <UnderlinedChar char={char} underlineColors={['red', 'blue']} />
        ))}{' '}
        text.
      </p>
      <p>
        This is{' '}
        {triply.split('').map((char, i) => (
          <UnderlinedChar char={char} underlineColors={['red', 'blue', 'green']} />
        ))}{' '}
        text.
      </p>
    </div>
  );
}





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