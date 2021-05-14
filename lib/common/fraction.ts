import {Fraction} from './types'

// Internal representation of grades are in fractions of millipoints (1/1000 of a point)

export function fractionToPercent(frac: Fraction): string {
  const value = Math.floor((frac.n * 10000) / frac.d);
  const wholeValue = Math.floor(value / 100);
  const fracValue = value % 100;
  let ret = String(wholeValue);
  if (fracValue > 0) {
    ret += '.';
    if (fracValue < 10) {
      ret += '0';
    }
    if (fracValue === 10) {
      ret += '1';
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

export function fractionToString(frac: Fraction): string {
  return `${millipointToString(frac.n)} / ${millipointToString(frac.d)}`;
}

export function fractionToLetterGrade(frac: Fraction): string {
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
