import {NextApiRequest, NextApiResponse} from 'next'
import {AzureBlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";

const page = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const imageData = req.body; // get image data from request body

        // TODO: Implement the uploader function that will handle the upload to your blob storage.
        const uploadImageToBlobStorage = (data: any) => {
            let blobStorageClient: AzureBlobStorage = new AzureBlobStorage(
                getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
                getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
                getEnvVariable('AZURE_BLOB_STORAGE_IMAGE_CONTAINER')
            );
            console.log('TODO: implement upload to blob storage');
        }

        // Call uploader function
        uploadImageToBlobStorage(imageData);

        res.status(200).json({message: 'Image uploaded'});
    } else {
        // If it's not a POST request, return 405 - Method Not Allowed
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

export default page;
