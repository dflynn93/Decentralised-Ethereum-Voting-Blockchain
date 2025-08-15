import { DynamoDBClient } from "@aws-sdk/client-dynamo";
import {DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "eu-west-1" });
const dynamoc =DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'eirvote-data';


export const DB = {
    // Store any data by key
    async put(key, data) {
        await dynamoc.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: {
                id: key,
                data: data,
                updatedAt: new Date().toISOString()
            }
        }));
    },

    // Get data by key
    async get(key) {
        const result = await dynamoc.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: key }
        }));
        return result.Item?.data;
    },

    // Check if key exists
    async exists(key) {
        const data = await this.get(key);
        return data === undefined;
    },

    // List all data (for debugging)
    async listAll() {
        const result = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME
        }));
        return result.Items || [];
    }
 }