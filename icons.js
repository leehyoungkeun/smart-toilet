// 아이콘 — react-native-svg 기반
// 사용: <Icon name="qr" size={26} color="#fff" />
import React from 'react';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';

const P = (props) => (
  <Path
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  />
);

const paths = {
  pin: (c, w) => (
    <>
      <P d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={c} strokeWidth={w} />
      <Circle cx="12" cy="10" r="3" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  thermo: (c, w) => <P d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" stroke={c} strokeWidth={w} />,
  droplet: (c, w) => <P d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={c} strokeWidth={w} />,
  wind: (c, w) => <P d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" stroke={c} strokeWidth={w} />,
  dust: (c) => (
    <>
      {[[5,6],[12,5],[19,7],[8,12],[16,12.5],[6,18],[13,18],[19,16.5]].map(([x,y],i)=>(
        <Circle key={i} cx={x} cy={y} r="1.6" fill={c} />
      ))}
    </>
  ),
  qr: (c, w) => (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1" fill="none" stroke={c} strokeWidth={w} />
      <Rect x="14" y="3" width="7" height="7" rx="1" fill="none" stroke={c} strokeWidth={w} />
      <Rect x="3" y="14" width="7" height="7" rx="1" fill="none" stroke={c} strokeWidth={w} />
      <P d="M14 14h3v3M21 14v7h-7M17 21h.01" stroke={c} strokeWidth={w} />
    </>
  ),
  clipboard: (c, w) => (
    <>
      <P d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke={c} strokeWidth={w} />
      <Rect x="8" y="2" width="8" height="4" rx="1" fill="none" stroke={c} strokeWidth={w} />
      <P d="M9 14l2 2 4-4" stroke={c} strokeWidth={w} />
    </>
  ),
  message: (c, w) => <P d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={c} strokeWidth={w} />,
  smile: (c, w) => (
    <>
      <Circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth={w} />
      <P d="M8 14s1.5 2 4 2 4-2 4-2" stroke={c} strokeWidth={w} />
      <Line x1="9" y1="9" x2="9.01" y2="9" stroke={c} strokeWidth={w} />
      <Line x1="15" y1="9" x2="15.01" y2="9" stroke={c} strokeWidth={w} />
    </>
  ),
  info: (c, w) => (
    <>
      <Circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth={w} />
      <Line x1="12" y1="16" x2="12" y2="12" stroke={c} strokeWidth={w} />
      <Line x1="12" y1="8" x2="12.01" y2="8" stroke={c} strokeWidth={w} />
    </>
  ),
  shield: (c, w) => (
    <>
      <P d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth={w} />
      <P d="M9 12l2 2 4-4" stroke={c} strokeWidth={w} />
    </>
  ),
  shieldPlain: (c, w) => <P d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={c} strokeWidth={w} />,
  camera: (c, w) => (
    <>
      <P d="M23 7l-7 5 7 5V7z" stroke={c} strokeWidth={w} />
      <Rect x="1" y="5" width="15" height="14" rx="2" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  ear: (c, w) => (
    <>
      <P d="M6 8.5a6.5 6.5 0 1 1 13 0c0 6-6 6-6 10a3.5 3.5 0 0 1-7 0" stroke={c} strokeWidth={w} />
      <P d="M9.5 9a2.5 2.5 0 1 1 5 0c0 1.4-1 2-1 3" stroke={c} strokeWidth={w} />
    </>
  ),
  bell: (c, w) => (
    <>
      <P d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke={c} strokeWidth={w} />
      <P d="M13.7 21a2 2 0 0 1-3.4 0" stroke={c} strokeWidth={w} />
    </>
  ),
  back: (c, w) => (
    <>
      <Line x1="19" y1="12" x2="5" y2="12" stroke={c} strokeWidth={w} />
      <Polyline points="12 19 5 12 12 5" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  check: (c, w) => <Polyline points="20 6 9 17 4 12" fill="none" stroke={c} strokeWidth={w} />,
  home: (c, w) => (
    <>
      <P d="M3 22h18" stroke={c} strokeWidth={w} />
      <P d="M5 22V10l7-5 7 5v12" stroke={c} strokeWidth={w} />
      <P d="M9 22v-6h6v6" stroke={c} strokeWidth={w} />
    </>
  ),
  wrench: (c, w) => <P d="M14 4v10.5a4 4 0 1 1-4-4h10M18 4v6" stroke={c} strokeWidth={w} />,
  bag: (c, w) => (
    <>
      <Rect x="3" y="8" width="18" height="13" rx="2" fill="none" stroke={c} strokeWidth={w} />
      <P d="M3 8l3-5h12l3 5M3 13h18" stroke={c} strokeWidth={w} />
    </>
  ),
  building: (c, w) => <P d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={c} strokeWidth={w} />,
  clock: (c, w) => (
    <>
      <Circle cx="12" cy="12" r="10" fill="none" stroke={c} strokeWidth={w} />
      <Polyline points="12 6 12 12 16 14" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  wrenchTool: (c, w) => <P d="M14.7 6.3a4 4 0 0 0-5.6 5.6l-6 6 3 3 6-6a4 4 0 0 0 5.6-5.6l-2.1 2.1-2.5-2.5z" stroke={c} strokeWidth={w} />,
  chart: (c, w) => <P d="M3 3v18h18M7 14l3-3 3 3 5-6" stroke={c} strokeWidth={w} />,
  alert: (c, w) => (
    <>
      <Circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth={w} />
      <P d="M12 8v4M12 16h.01" stroke={c} strokeWidth={w} />
    </>
  ),
  image: (c, w) => (
    <>
      <P d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={c} strokeWidth={w} />
      <Circle cx="12" cy="13" r="4" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  minus: (c, w) => <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth={w} />,
  plus: (c, w) => (
    <>
      <Line x1="12" y1="5" x2="12" y2="19" stroke={c} strokeWidth={w} />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={c} strokeWidth={w} />
    </>
  ),
  scan: (c, w) => (
    <>
      <Circle cx="11" cy="11" r="7" fill="none" stroke={c} strokeWidth={w} />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={c} strokeWidth={w} />
      <Circle cx="11" cy="11" r="2.2" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  gear: (c, w) => (
    <>
      <Circle cx="12" cy="12" r="3" fill="none" stroke={c} strokeWidth={w} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke={c} strokeWidth={w} />
    </>
  ),
  dispense: (c, w) => (
    <>
      <P d="M6 2v6a6 6 0 0 0 12 0V2M6 2h12M12 14v8M8 22h8" stroke={c} strokeWidth={w} />
    </>
  ),
};

export default function Icon({ name, size = 24, color = '#2C6CD0', strokeWidth = 2 }) {
  const draw = paths[name];
  if (!draw) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {draw(color, strokeWidth)}
    </Svg>
  );
}
