const NUMERALS: [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** 1 → "I", 14 → "XIV". Non-positive or non-integer input returns "". */
export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value <= 0 || value >= 4000) return "";
  let rest = value;
  let out = "";
  for (const [n, numeral] of NUMERALS) {
    while (rest >= n) {
      out += numeral;
      rest -= n;
    }
  }
  return out;
}
