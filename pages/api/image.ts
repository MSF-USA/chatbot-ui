import {NextApiRequest, NextApiResponse} from 'next'
import {AzureBlobStorage, BlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";
import Hasher from "@/utils/app/hash";
import {getToken} from "next-auth/jwt";
import {JWT, Session} from "next-auth";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/pages/api/auth/[...nextauth]";

const page = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === 'POST') {
        const imageData = req.body; // get image data from request body

        // get filename from params
        const filename = req.query.filename as string;

        const getContentType = (extension: string): string => {
            switch (extension.toLowerCase().trim()) {
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

        const uploadImageToBlobStorage = async (data: string) => {
            const token: JWT | null = (await getToken({req})) as JWT | null;
            if (!token) throw new Error(`Token could not be pulled from request`);
            const session: Session | null = await getServerSession(authOptions as any);
            if (!session) throw new Error("Failed to pull session!");

            // @ts-ignore
            const userId: string = session?.user?.id ?? token.userId ?? 'anonymous';

            let blobStorageClient: BlobStorage = new AzureBlobStorage(
              getEnvVariable({name: 'AZURE_BLOB_STORAGE_NAME', user: session.user}),
              getEnvVariable({name: 'AZURE_BLOB_STORAGE_KEY', user: session.user}),
              getEnvVariable(
                {
                    name: 'AZURE_BLOB_STORAGE_CONTAINER',
                    throwErrorOnFail: false,
                    defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
                    user: session.user
                }
              ),
              session.user
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
