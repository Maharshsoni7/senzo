import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from 'react-native-svg';

export type ChefLook = {
  skin: string;
  hair: string;
  apron: string;
  longHair: boolean;
  beard: boolean;
};

// Looks used across the mockups (G01, G04, G17, G24).
const LOOKS: ChefLook[] = [
  { skin: '#D9A273', hair: '#1E1612', apron: '#B8361F', longHair: true, beard: false },
  { skin: '#9C6440', hair: '#120E0C', apron: '#2F6B4F', longHair: true, beard: false },
  { skin: '#C88B5E', hair: '#1B1310', apron: '#2D4E86', longHair: true, beard: false },
  { skin: '#B67A4E', hair: '#2A2420', apron: '#3E7A3A', longHair: false, beard: true },
  { skin: '#E0B08A', hair: '#8E9196', apron: '#6B2D5C', longHair: true, beard: false },
  { skin: '#B67A4E', hair: '#1B1714', apron: '#7A3E1D', longHair: false, beard: true },
  { skin: '#8E5B39', hair: '#151210', apron: '#1F5F6B', longHair: false, beard: false },
  { skin: '#B87D52', hair: '#20150F', apron: '#A23E6B', longHair: true, beard: false },
];

/** Stable look per chef until the API sends one. */
export function lookFor(chefId: string): ChefLook {
  let h = 0;
  for (let i = 0; i < chefId.length; i++) h = (h * 31 + chefId.charCodeAt(i)) >>> 0;
  return LOOKS[h % LOOKS.length]!;
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Illustrated chef (mockup ChefFig). `bust` crops to the head for avatars. */
export function ChefFig({
  look,
  initials,
  width = 200,
  bust = false,
}: {
  look: ChefLook;
  initials: string;
  width?: number;
  bust?: boolean;
}) {
  const { skin, hair, apron } = look;
  const coat = { fill: '#FFFFFF', stroke: '#D5D8DB', strokeWidth: 1.5 };
  return (
    <Svg
      width={width}
      height={bust ? width : Math.round(width * 2.1)}
      viewBox={bust ? '50 6 100 100' : '0 0 200 420'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M74 296 L96 296 L95 396 L76 396 Z" fill="#2B2F33" />
      <Path d="M104 296 L126 296 L124 396 L105 396 Z" fill="#2B2F33" />
      <Ellipse cx="83" cy="400" rx="17" ry="7" fill="#1B1D1F" />
      <Ellipse cx="117" cy="400" rx="17" ry="7" fill="#1B1D1F" />
      <Path
        d="M64 92 Q60 152 80 154 L120 154 Q140 152 136 92 Z"
        fill={hair}
        opacity={look.longHair ? 1 : 0}
      />
      <Path d="M58 150 Q100 134 142 150 L150 302 L50 302 Z" {...coat} />
      <Path d="M58 152 Q40 170 38 252 L53 254 Q56 192 68 172 Z" {...coat} />
      <Path d="M142 152 Q160 170 162 252 L147 254 Q144 192 132 172 Z" {...coat} />
      <Circle cx="45" cy="261" r="9" fill={skin} />
      <Circle cx="155" cy="261" r="9" fill={skin} />
      <Path d="M66 214 L134 214 L140 322 L60 322 Z" fill={apron} />
      <Rect x="60" y="208" width="80" height="9" rx="3" fill={apron} />
      <Path
        d="M86 228 L114 228 L114 246 L86 246 Z"
        fill="none"
        stroke="rgba(255,255,255,.55)"
        strokeWidth={2}
      />
      <Circle cx="90" cy="172" r="3" fill="#9EA4AA" />
      <Circle cx="110" cy="172" r="3" fill="#9EA4AA" />
      <Circle cx="90" cy="192" r="3" fill="#9EA4AA" />
      <Circle cx="110" cy="192" r="3" fill="#9EA4AA" />
      <Rect x="90" y="118" width="20" height="26" fill={skin} />
      <Path d="M84 140 L116 140 L100 160 Z" fill={apron} />
      <Circle cx="70" cy="99" r="6" fill={skin} />
      <Circle cx="130" cy="99" r="6" fill={skin} />
      <Ellipse cx="100" cy="97" rx="30" ry="33" fill={skin} />
      <Path
        d="M72 106 Q74 140 100 134 Q126 140 128 106 Q122 128 100 128 Q78 128 72 106 Z"
        fill={hair}
        opacity={look.beard ? 1 : 0}
      />
      <Path d="M70 90 Q100 64 130 90 L131 76 Q100 56 69 76 Z" fill={hair} />
      <Path d="M83 90 L94 88" stroke={hair} strokeWidth={3} strokeLinecap="round" />
      <Path d="M106 88 L117 90" stroke={hair} strokeWidth={3} strokeLinecap="round" />
      <Circle cx="89" cy="99" r="3.2" fill="#1B1D1F" />
      <Circle cx="111" cy="99" r="3.2" fill="#1B1D1F" />
      <Path
        d="M90 113 Q100 121 110 113"
        fill="none"
        stroke="#1B1D1F"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Circle cx="78" cy="42" r="18" {...coat} />
      <Circle cx="122" cy="42" r="18" {...coat} />
      <Circle cx="100" cy="32" r="23" {...coat} />
      <Rect x="70" y="52" width="60" height="24" rx="4" {...coat} />
      <Rect x="116" y="164" width="24" height="13" rx="2" fill="#1B1D1F" />
      <SvgText x="128" y="174" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#FFFFFF">
        {initials}
      </SvgText>
    </Svg>
  );
}
