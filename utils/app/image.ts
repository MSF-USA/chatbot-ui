export const getBase64FromImageURL = async (imageUrl: string): Promise<string> => {
    try {
        const response = await fetch(imageUrl);

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
}
