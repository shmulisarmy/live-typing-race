export function UnderlinedChar(props: { char: string; underlineColors: string[]; }) {
  console.log({ underlineColors: props.underlineColors });
  return (
    <span style={{ position: 'relative', display: 'inline', width: props.char == " " ? "100%" : "auto" }}>
      {props.char}
      {props.underlineColors.map((color, index) => (
        <span
          style={{
            position: 'absolute',
            content: '""',
            left: 0,
            width: "200%",
            height: '2px',
            background: color,
            bottom: `-${2 + index * 4}px`,
          }}
        ></span>
      ))}
    </span>
  );
}
