/*

BoxBlur - a fast almost Box Blur For Canvas

Edited by Yorick to make it faster in modern browsers

Version: 	0.3
Author:		Mario Klingemann
Contact: 	mario@quasimondo.com
Website:	http://www.quasimondo.com/
Twitter:	@quasimondo

In case you find this class useful - especially in commercial projects -
I am not totally unhappy for a small donation to my PayPal account
mario@quasimondo.de

Copyright (c) 2010 Mario Klingemann

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
/* const */ var boxBlurCanvasRGB = (function() {

/* const */ var mul_table = new Uint8Array([1,57,41,21,203,34,97,73,227,91,149,62,105,45,39,137,241,107,3,173,39,71,65,
    238,219,101,187,87,81,151,141,133,249,117,221,209,197,187,177,169,5,153,73,139,133,127,243,233,223,107,103,99,
    191,23,177,171,165,159,77,149,9,139,135,131,253,245,119,231,224,109,211,103,25,195,189,23,45,175,171,83,81,79,
    155,151,147,9,141,137,67,131,129,251,123,30,235,115,113,221,217,53,13,51,50,49,193,189,185,91,179,175,43,169,
    83,163,5,79,155,19,75,147,145,143,35,69,17,67,33,65,255,251,247,243,239,59,29,229,113,111,219,27,213,105,207,
    51,201,199,49,193,191,47,93,183,181,179,11,87,43,85,167,165,163,161,159,157,155,77,19,75,37,73,145,143,141,35,
    138,137,135,67,33,131,129,255,63,250,247,61,121,239,237,117,29,229,227,225,111,55,109,216,213,211,209,207,205,
    203,201,199,197,195,193,48,190,47,93,185,183,181,179,178,176,175,173,171,85,21,167,165,41,163,161,5,79,157,78,
    154,153,19,75,149,74,147,73,144,143,71,141,140,139,137,17,135,134,133,66,131,65,129,1]);
       
    /* const */ var shg_table = new Uint8Array([0,9,10,10,14,12,14,14,16,15,16,15,16,15,15,17,18,17,12,18,16,17,17,19,19,18,
    19,18,18,19,19,19,20,19,20,20,20,20,20,20,15,20,19,20,20,20,21,21,21,20,20,20,21,18,21,21,21,21,20,21,17,21,21,
    21,22,22,21,22,22,21,22,21,19,22,22,19,20,22,22,21,21,21,22,22,22,18,22,22,21,22,22,23,22,20,23,22,22,23,23,21,
    19,21,21,21,23,23,23,22,23,23,21,23,22,23,18,22,23,20,22,23,23,23,21,22,20,22,21,22,24,24,24,24,24,22,21,24,23,
    23,24,21,24,23,24,22,24,24,22,24,24,22,23,24,24,24,20,23,22,23,24,24,24,24,24,24,24,23,21,23,22,23,24,24,24,22,
    24,24,24,23,22,24,24,25,23,25,25,23,24,25,25,24,22,25,25,25,24,23,24,25,25,25,25,25,25,25,25,25,25,25,25,23,25,
    23,24,25,25,25,25,25,25,25,25,25,24,22,25,25,23,25,25,20,24,25,24,25,25,22,24,25,24,25,24,25,25,24,25,25,25,25,
    22,25,25,25,24,25,24,25,18])
    
        , min = Math.min
        , max = Math.max
    
    function boxBlurCanvasRGB( context, top_x, top_y, width, height, radius, iterations ){
        if ( isNaN(radius) || radius < 1 ) return;
        
        radius |= 0;
        
        if ( isNaN(iterations) ) iterations = 1;
        iterations |= 0;
        if ( iterations > 3 ) iterations = 3;
        if ( iterations < 1 ) iterations = 1;
    
        /* const */
        var wm = width - 1
          , hm = height - 1
          , wshiftd = width << 2
          , rad1 = radius + 1
    
          , mul_sum = mul_table[radius]
          , shg_sum = shg_table[radius]
    
          , r = new Int16Array(width * height)
          , g = new Int16Array(width * height)
          , b = new Int16Array(width * height)
          , a = new Float64Array(width * height)
      
          , vminx = new Uint16Array(width)
          , vmaxx = new Uint16Array(width)
    
          , vminy = new Uint16Array(height)
          , vmaxy = new Uint16Array(height)
        
        var hassubarray = 'Uint8ClampedArray' in window
        var rightmost_radius = min(wm, radius)
    
        // set the vmin/vmax
        // this could be optimized, but it's only used once
        for(var x = 0; x < width; ++x) {
            vminx[x] = min(x + rad1, wm) << 2 // should be alright
            vmaxx[x] = max(x - radius, 0) << 2
        }
        for (var y = 0; y < height; ++y) {
            vminy[y] = min(y + rad1, hm)
            vmaxy[y] = max(y - radius, 0)
        }
        
        if (hassubarray) {// firefox
            return function() {
                /* const */ var imageData = context.getImageData( top_x, top_y, width, height )
                , pixels = imageData.data;
                var its = iterations
                var left, right, top, bottom
                if (hassubarray) var px_32 = new Uint32Array(pixels.buffer)
    
                while ( --its != -1 ){
                    for (var y=0, yi = 0, yw = 0; y < height; ++y, yw += wshiftd ){
                        var yw_px = pixels.subarray(yw, wshiftd + yw)
                          , rsum = yw_px[0] * rad1
                          , gsum = yw_px[1] * rad1
                          , bsum = yw_px[2] * rad1
                        
                        // leftmost pixel
                        for(var i = 1; i <= rightmost_radius; ++i)
                            if (px_32[yw>>2 + i] & 0x00FFFFFF) {
                                rsum += yw_px[(i<<2)]
                                gsum += yw_px[(i<<2) + 1]
                                bsum += yw_px[(i<<2) + 2]
                            }
                        if (radius > wm) {
                            rsum += yw_px[wshiftd-4] * (radius - wm)
                            gsum += yw_px[wshiftd-3] * (radius - wm)
                            bsum += yw_px[wshiftd-2] * (radius - wm)
                        }
    
                        // now loop over all the pixels
                        // calculate the sums of the radius adjacent pixels (horizontal)
                        for (var x = 0; x < width; ++x, ++yi) {
                            r[yi] = rsum
                            g[yi] = gsum
                            b[yi] = bsum
    
                            var p1 = vminx[x]
                              , p2 = vmaxx[x]
                            if ((px_32[(yw + p1) >> 2] | px_32[(yw + p2) >> 2]) & 0x00FFFFFF) {
                                // 2 addition + 2 bitshifts + one and + one or is probably faster than
                                // 3 sets, 3 addition, 3 subtract
                                rsum += yw_px[p1  ] - yw_px[p2  ]
                                gsum += yw_px[p1+1] - yw_px[p2+1]
                                bsum += yw_px[p1+2] - yw_px[p2+2] }
                        }
                    }
                    for (var x = 0, yp = 0; x < width; yp = ++x){
                        var rsum = r[yp] * rad1
                          , gsum = g[yp] * rad1
                          , bsum = b[yp] * rad1
    
                        // topmost pixel
                        for(var i = 1; i <= radius; i++ ){
                            if (i <= hm) yp += width
                            rsum += r[yp];
                            gsum += g[yp];
                            bsum += b[yp];
                        }
                        for(var y = 0, yi=x; y < height; ++y, yi += width) {
                            var tmp = px_32[yi]
                            if ((bsum | gsum | rsum) == 0) px_32[yi] &= 0xFF000000
                            else px_32[yi] = px_32[yi] & 0xFF000000 | (bsum * mul_sum) >> shg_sum << 16 |
                                                    (gsum * mul_sum) >> shg_sum << 8  |
                                                    (rsum * mul_sum) >> shg_sum
                            if (tmp != px_32[yi]) {
                                if (top === undefined    || top > y) top = y
                                if (bottom === undefined || y > bottom) bottom = y
                                if (left === undefined   || left > x) left = x
                                if (right === undefined  ||right < x) right = x
                            }
                            var p1 = x + vminy[y] * width
                              , p2 = x + vmaxy[y] * width
    
                            rsum += r[p1] - r[p2];
                            gsum += g[p1] - g[p2];
                            bsum += b[p1] - b[p2];
                        }
                    }
                }
                context.putImageData( imageData, top_x, top_y, left, top, right - left, bottom - top);
            }
        }
        else {// silly browsers (chrome)
            return function() {
                /* const */ var imageData = context.getImageData( top_x, top_y, width, height )
                , pixels = imageData.data;
                var its = iterations
                if (hassubarray) var px_32 = new Uint32Array(pixels.buffer)
    
                while ( --its != -1 ){
                    for (var y=0, yi = 0, yw = 0; y < height; ++y, yw += wshiftd ){
                        var rsum = pixels[yw+0] * rad1
                          , gsum = pixels[yw+1] * rad1
                          , bsum = pixels[yw+2] * rad1
    
                    
                        // leftmost pixel
                        for(var i = 1; i <= radius; ++i ){
                            var p = yw+(min(wm, i) << 2)
                            rsum += pixels[p  ];
                            gsum += pixels[p+1];
                            bsum += pixels[p+2];
                        }
    
                        // now loop over all the pixels
                        // calculate the sums of the radius adjacent pixels (horizontal)
                        for (var x = 0; x < width; ++x,++yi ){
                            r[yi] = rsum
                            g[yi] = gsum
                            b[yi] = bsum
                            
                            var p1 = yw+vminx[x]
                              , p2 = yw+vmaxx[x]
                            rsum += pixels[p1  ] - pixels[p2  ]
                            gsum += pixels[p1+1] - pixels[p2+1]
                            bsum += pixels[p1+2] - pixels[p2+2]
                        }
                    }
                    for (var x = 0, yp = 0; x < width; yp = ++x){
                        var rsum = r[yp] * rad1
                          , gsum = g[yp] * rad1
                          , bsum = b[yp] * rad1
    
                        // topmost pixel
                        for(var i = 1; i <= radius; i++ ){
                            if (i <= hm) yp += width
                            rsum += r[yp];
                            gsum += g[yp];
                            bsum += b[yp];
                        }
                        for (var y = 0, yi = x << 2; y < height; ++y, yi += wshiftd){
                            pixels[yi]   = (rsum * mul_sum) >> shg_sum;
                            pixels[yi+1] = (gsum * mul_sum) >> shg_sum;
                            pixels[yi+2] = (bsum * mul_sum) >> shg_sum;
    
                            var p1 = x + vminy[y] * width
                              , p2 = x + vmaxy[y] * width
    
                            rsum += r[p1] - r[p2];
                            gsum += g[p1] - g[p2];
                            bsum += b[p1] - b[p2];
                        }
                    }
                }
                // silly browsers don't get dirty rects
                context.putImageData( imageData, top_x, top_y );
            }
        }
    
    }
    return boxBlurCanvasRGB
    })()



    export { boxBlurCanvasRGB }