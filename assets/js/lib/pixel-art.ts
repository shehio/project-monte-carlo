export function pixelSVG(w: number, h: number, pixels: (string | number)[][], color: string): string {
  let rects = '';
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      if (pixels[y][x]) {
        rects += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' +
                 (typeof pixels[y][x] === 'string' ? pixels[y][x] : color) + '"/>';
      }
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h +
         '" shape-rendering="crispEdges">' + rects + '</svg>';
}

export const PA = '#00d4aa';
export const PD = '#555';
export const PW = '#c8c8c8';
export const PR = '#e84057';
export const PE = '#111';
