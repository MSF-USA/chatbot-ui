/**
 * This function fetches an image from a given URL and converts it to a Base64 string.
 *
 * The function first makes a fetch request to the given `imageUrl`. If the response is not OK (HTTP status code not in the range 200-299), it throws an error.
 * If the request is successful, it attempts to create a buffer from the array buffer of the response body. This operation can be more efficient if running server-side.
 * If creating the buffer operation fails for any reason, the function falls back to a less efficient but more compatible method. It creates a new Uint8Array out of the response array buffer and converts it to a string.
 *
 * If there are any errors during these processes, it throws an error with a relevant message.
 *
 * @async
 * @param {string} imageUrl - The URL of the image to fetch and convert to Base64.
 * @return {Promise<string>} A promise that resolves with the Base64 string of the image.
 *
 * @throws {Error} If the network response is not OK or if there is an error during the fetch request or the Buffer/arrayBuffer creation
 *
 * @example
 *
 * const imageBase64 = await getBase64FromImageURL('https://example.com/image.jpg');
 * console.log(imageBase64);
 */
export const getBase64FromImageURL = async (
  imageUrl: string,
  init?: RequestInit | undefined,
): Promise<string> => {
  try {
    const response = await fetch(imageUrl, init);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    try {
      // More efficient server-side method
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.toString();
    } catch (bufferError) {
      // less efficient, client-side compatible method
      const arrayBuffer = await response.arrayBuffer();
      // @ts-ignore
      return String.fromCharCode(...new Uint8Array(arrayBuffer));
    }
  } catch (error) {
    throw new Error(`Error fetching the image: ${error}`);
  }
};
