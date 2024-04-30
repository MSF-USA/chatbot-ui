import {NextApiRequest, NextApiResponse} from 'next'
import {AzureBlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";
import Hasher from "@/utils/app/hash";

const page = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const imageData = req.body; // get image data from request body

        // get filename from params
        const filename = req.query.filename as string;

        // TODO: Implement the uploader function that will handle the upload to your blob storage.
        const uploadImageToBlobStorage = async (data: any) => {
            let blobStorageClient: AzureBlobStorage = new AzureBlobStorage(
                getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
                getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
                getEnvVariable('AZURE_BLOB_STORAGE_IMAGE_CONTAINER')
            );

            const hashedFileContents = Hasher.sha256(data).slice(0, 200);
            const extension = filename.split('.').pop();
            return await blobStorageClient.upload(
                `${hashedFileContents}.${extension}`,
                data
            )
        }

        // Call uploader function
        const imageURI: string = await uploadImageToBlobStorage(imageData);

        res.status(200).json({message: 'Image uploaded', uri: imageURI});
    } else {
        // If it's not a POST request, return 405 - Method Not Allowed
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default page;
