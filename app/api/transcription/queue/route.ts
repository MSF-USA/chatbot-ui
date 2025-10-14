import { NextRequest, NextResponse } from "next/server";
import { AzureBlobStorage } from "@/lib/utils/server/blob";
import { v4 as uuidv4 } from 'uuid';
import { auth } from "@/auth";
import { DequeuedMessageItem } from '@azure/storage-queue';
import {Session} from "next-auth";

// Allowed queue categories for security
const ALLOWED_QUEUE_CATEGORIES = ['transcription', 'general'] as const;
type QueueCategory = typeof ALLOWED_QUEUE_CATEGORIES[number];

async function initializeBlobStorage(req: NextRequest) {
    const session: Session | null = await auth();
    if (!session) throw new Error("Failed to pull session!");

    const user = session.user;

    const storageAccountName = process.env.AZURE_BLOB_STORAGE_NAME;
    const storageAccountAccessKey = process.env.AZURE_BLOB_STORAGE_KEY;
    const containerName = process.env.AZURE_BLOB_STORAGE_CONTAINER || 'messages';

    if (!storageAccountName || !storageAccountAccessKey) {
        throw new Error('Storage account name or access key is not set.');
    }

    return {
        azureBlobStorage: new AzureBlobStorage(storageAccountName, storageAccountAccessKey, containerName, user),
        user,
    };
}

/*
 ** GET request:
 * - messageId: string - unique identifier for the message
 * - category: string / enum - category name (queue name)
 *
 * Returns the message's position in the queue and the original message
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(req.url);
        const messageId = searchParams.get('messageId');
        const category = searchParams.get('category');

        if (!messageId || !category) {
            return NextResponse.json({ error: 'Missing messageId or category' }, { status: 400 });
        }

        // Validate queue category against whitelist
        if (!ALLOWED_QUEUE_CATEGORIES.includes(category.toLowerCase() as QueueCategory)) {
            return NextResponse.json({
                error: 'Invalid queue category',
                allowedCategories: ALLOWED_QUEUE_CATEGORIES
            }, { status: 400 });
        }

        const { azureBlobStorage, user } = await initializeBlobStorage(req);
        const queueName = category.toLowerCase();

        // Peeking messages to find the message and estimate position
        // Azure Queue Storage allows peeking up to 32 messages at a time
        // TODO: Handle conditions where there are more than 32 messages
        const maxPeekMessages = 32;
        const peekedMessages = await azureBlobStorage.getQueueClient(queueName)
            .peekMessages({ numberOfMessages: maxPeekMessages });

        const messages = peekedMessages.peekedMessageItems;

        let position = -1;
        let originalMessage: any = null;

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const messageContent = JSON.parse(base64Decode(message.messageText));

            if (messageContent.messageId === messageId) {
                if (messageContent.userId !== user.id) {
                    return NextResponse.json({ message: 'Forbidden: this message is not marked with your user identifier.' }, { status: 403 });
                }
                position = i + 1; // Positions start at 1
                originalMessage = messageContent;
                break;
            }
        }

        if (position === -1) {
            return NextResponse.json({ error: 'Message not found or not in the first 32 messages' }, { status: 404 });
        }

        return NextResponse.json({ position, message: originalMessage.message }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/*
 ** POST request:
 * - message: string | arbitrary object - the thing to add to the queue
 * - category: string / enum - category name (queue name)
 *
 * The message will contain a blobPath field, but we don't interact directly with blobs
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const { azureBlobStorage, user } = await initializeBlobStorage(req);

        const body = await req.json();
        const messageContent = body.message;
        const category = body.category;

        if (!messageContent || !category) {
            return NextResponse.json({ error: 'Missing message or category' }, { status: 400 });
        }

        // Validate queue category against whitelist
        if (!ALLOWED_QUEUE_CATEGORIES.includes(category.toLowerCase())) {
            return NextResponse.json({
                error: 'Invalid queue category',
                allowedCategories: ALLOWED_QUEUE_CATEGORIES
            }, { status: 400 });
        }

        const queueName = category.toLowerCase();

        // Ensure the queue exists
        const queueClient = azureBlobStorage.getQueueClient(queueName);
        const exists = await queueClient.exists();
        if (!exists) {
            await azureBlobStorage.createQueue(queueName);
        }

        const messageId = uuidv4();

        // Include messageId and userId in the message content
        const message = {
            messageId,
            userId: user.id,
            message: messageContent,
        };

        const messageText = base64Encode(JSON.stringify(message));

        const response = await azureBlobStorage.addMessage(queueName, messageText);


        return NextResponse.json({
            messageId: response.messageId,
            insertedOn: response.insertedOn,
            expiresOn: response.expiresOn,
        }, { status: 201 });
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/*
 ** PATCH request:
 * - messageId: string - unique identifier for the message
 * - message: string | arbitrary object - updated message content
 * - category: string / enum - category name (queue name)
 *
 * Updates the existing message in the queue
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        const { azureBlobStorage, user } = await initializeBlobStorage(req);

        const body = await req.json();
        const messageId = body.messageId;
        const category = body.category;
        const newMessageContent = body.message;

        if (!messageId || !category || !newMessageContent) {
            return NextResponse.json({ error: 'Missing messageId, category, or message' }, { status: 400 });
        }

        // Validate queue category against whitelist
        if (!ALLOWED_QUEUE_CATEGORIES.includes(category.toLowerCase() as QueueCategory)) {
            return NextResponse.json({
                error: 'Invalid queue category',
                allowedCategories: ALLOWED_QUEUE_CATEGORIES
            }, { status: 400 });
        }

        const queueName = category.toLowerCase();
        const queueClient = azureBlobStorage.getQueueClient(queueName);

        // TODO: Handle conditions where there are more than 32 messages
        const receiveResponse = await queueClient.receiveMessages({ numberOfMessages: 32, visibilityTimeout: 30 });

        let targetMessage: DequeuedMessageItem | null = null;

        for (const message of receiveResponse.receivedMessageItems) {
            const messageContent = JSON.parse(base64Decode(message.messageText));

            if (messageContent.messageId === messageId) {
                // Check if the message belongs to the user
                if (messageContent.userId !== user.id) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                targetMessage = message;
                break;
            }
        }

        if (!targetMessage) {
            return NextResponse.json({ error: 'Message not found in the queue' }, { status: 404 });
        }

        const updatedMessageContent = {
            ...JSON.parse(base64Decode(targetMessage.messageText)),
            message: newMessageContent,
        };

        const updatedMessageText = base64Encode(JSON.stringify(updatedMessageContent));

        // Update the message in the queue
        await azureBlobStorage.updateMessage(
            queueName,
            targetMessage.messageId,
            targetMessage.popReceipt,
            updatedMessageText
        );

        return NextResponse.json({ message: 'Message updated successfully' }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/*
 ** DELETE request:
 * - messageId: string - unique identifier for the message
 * - category: string / enum - category name (queue name)
 *
 * Deletes the message from the queue
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(req.url);
        const messageId = searchParams.get('messageId');
        const category = searchParams.get('category');

        if (!messageId || !category) {
            return NextResponse.json({ error: 'Missing messageId or category' }, { status: 400 });
        }

        // Validate queue category against whitelist
        if (!ALLOWED_QUEUE_CATEGORIES.includes(category.toLowerCase() as QueueCategory)) {
            return NextResponse.json({
                error: 'Invalid queue category',
                allowedCategories: ALLOWED_QUEUE_CATEGORIES
            }, { status: 400 });
        }

        const { azureBlobStorage, user } = await initializeBlobStorage(req);

        const queueName = category.toLowerCase();
        const queueClient = azureBlobStorage.getQueueClient(queueName);

        // TODO: Handle conditions where there are more than 32 messages
        const receiveResponse = await queueClient.receiveMessages({ numberOfMessages: 32, visibilityTimeout: 30 });

        let targetMessage: DequeuedMessageItem | null = null;

        for (const message of receiveResponse.receivedMessageItems) {
            const messageContent = JSON.parse(base64Decode(message.messageText));

            if (messageContent.messageId === messageId) {
                // Check if the message belongs to the user
                if (messageContent.userId !== user.id) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
                }
                targetMessage = message;
                break;
            }
        }

        if (!targetMessage) {
            return NextResponse.json({ error: 'Message not found in the queue' }, { status: 404 });
        }

        await azureBlobStorage.deleteMessage(queueName, targetMessage.messageId, targetMessage.popReceipt);

        return NextResponse.json({ message: 'Message deleted successfully' }, { status: 200 });
    } catch (error: any) {
        console.error(error);
        if (error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

function base64Encode(text: string): string {
    return Buffer.from(text, 'utf-8').toString('base64');
}

function base64Decode(encodedText: string): string {
    return Buffer.from(encodedText, 'base64').toString('utf-8');
}
