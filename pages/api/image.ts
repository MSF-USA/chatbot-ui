import {NextApiRequest, NextApiResponse} from 'next'
import {AzureBlobStorage, BlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";
import Hasher from "@/utils/app/hash";
import {CustomJWT} from "@/types/jwt";
import {getToken} from "next-auth/jwt";

const page = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const imageData = req.body; // get image data from request body

        // get filename from params
        const filename = req.query.filename as string;

        const getContentType = (extension: string): string => {
            switch (extension) {
                case 'jpg':
                case 'jpeg':
                    return 'image/jpeg';
                case 'png':
                    return 'image/png';
                case 'gif':
                    return 'image/gif';
                default:
                    return 'application/octet-stream';
            }
        }

        const uploadImageToBlobStorage = async (data: any) => {
            // @ts-ignore
            const token: CustomJWT = await getToken({req});
            const userId: string = token.userId ?? 'anonymous';

            let blobStorageClient: BlobStorage = new AzureBlobStorage(
                getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
                getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
                getEnvVariable('AZURE_BLOB_STORAGE_IMAGE_CONTAINER')
            );

            const hashedFileContents = Hasher.sha256(data).slice(0, 200);
            const extension: string | undefined = filename.split('.').pop();

            let contentType;
            if (extension)
                contentType = getContentType(extension);
            else
                contentType = 'application/octet-stream';

            return await blobStorageClient.upload(
                `${userId}/uploads/images/${hashedFileContents}.${extension}`,
                data,
                {
                    blobHTTPHeaders: {
                        blobContentType: contentType
                    }
                }
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

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb' // Set desired value here
        }
    }
}

export default page;
