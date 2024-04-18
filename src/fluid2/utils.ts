/**
 * Clears all the pixels on the image data.
 *
 * @param image {ImageData}
 */
export function clearImageData(image: any) {
    for (let i = 0; i < image.data.length; i++) {
        if ((i % 4) === 0) {
            image.data[i] = 100;

        } else {
            image.data[i] = 0;
        }
    }
}
