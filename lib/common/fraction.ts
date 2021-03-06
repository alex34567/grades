import {Fraction} from './types'

// Internal representation of grades are in fractions of millipoints (1/1000 of a point)

export function fractionToPercent(frac: Fraction): string {
  if (frac.d === 0) {
    return 'N/A'
  }
  const value = Math.floor((frac.n * 10000) / frac.d);
  const wholeValue = Math.floor(value / 100);
  const fracValue = value % 100;
  let ret = String(wholeValue);
  if (fracValue > 0) {
    ret += '.';
    if (fracValue < 10) {
      ret += '0';
    }
    if (fracValue % 10 === 0) {
      ret += String(fracValue / 10);
    } else {
      ret += String(fracValue);
    }
  }
  ret += '%';
  return ret;
}

export function millipointToString(millipoints: number): string {
  const whole = Math.floor(millipoints / 1000);
  const frac = millipoints % 1000;
  let ret = String(whole);
  if (frac > 0) {
    ret += '.';
    let noZeroEndFrac = frac;
    while (noZeroEndFrac % 10 === 0) {
      noZeroEndFrac = noZeroEndFrac / 10;
    }
    if (frac < 10) {
      ret += '0';
    }
    if (frac < 100) {
      ret += '0';
    }
    ret += String(noZeroEndFrac);
  }
  return ret;
}

const MILLIPOINT_REGEX = /^\s*(\d*)(?:\.(\d{0,3})0*)?\s*$/

export function stringToMillipoint(millipoint: string): number | null {
  const trimmed = millipoint.trim()
  if (trimmed === '' || trimmed === '.') {
    return null
  }

  const match = MILLIPOINT_REGEX.exec(millipoint)
  if (!match) {
    return null
  }
  let whole = 0
  if (match[1]) {
    whole = Number(match[1])
  }
  let fracDigit = 0
  const fracDigitText = match[2]
  if (fracDigitText) {
    const fracDigitCount = fracDigitText.length
    fracDigit = Number(fracDigitText)
    const newFracDigitCount = String(fracDigit).length
    const padding = fracDigitCount - newFracDigitCount
    if (padding < 2 && fracDigit < 10) {
      fracDigit *= 10
    }
    if (padding < 1 && fracDigit < 100) {
      fracDigit *= 10
    }
  }

  return whole * 1000 + fracDigit
}

export function fractionToString(frac: Fraction): string {
  return `${millipointToString(frac.n)} / ${millipointToString(frac.d)}`;
}

export function fractionToLetterGrade(frac: Fraction): string {
  if (frac.d === 0) {
    return 'N/A'
  }
  const value = Math.floor((frac.n * 10) / frac.d);
  if (value >= 9) {
    return 'A';
  } else if (value >= 8) {
    return 'B';
  } else if (value >= 7) {
    return 'C';
  } else if (value >= 6) {
    return 'D';
  } else {
    return 'F';
  }
}
