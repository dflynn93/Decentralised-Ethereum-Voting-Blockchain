import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "eu-west-1" });
const dynamo =DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'eirvote-data';


export const DB = {
    // Store any data by key
    async put(key, data) {
        await dynamo.send(new PutCommand({
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
        const result = await dynamo.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: key }
        }));
        return result.Item?.data;
    },

    // Check if key exists
    async exists(key) {
        const data = await this.get(key);
        return data !== undefined;
    },

    // List all data (for debugging)
    async listAll() {
        const result = await dynamo.send(new ScanCommand({
            TableName: TABLE_NAME
        }));
        return result.Items || [];
    }
 };


 // Admin management
 export const adminData = {
    // Store admin wallet as verified
    async addAdmin(walletAddress) {
        const admins = await this.getAdmins() || [];
        if (!admins.includes(walletAddress)) {
            admins.push(walletAddress);
            await DB.put('admin_wallets', admins);
        }
    },

    // Get all admin wallets
    async getAdmins() {
        return await DB.get('admin_wallets') || [
            '0x1Da5916E8443b0f028d2bdA63b8639eF609e9bDe'
        ];
    },

    // Check if wallet is admin
    async isAdmin(walletAddress) {
        const admins = await this.getAdmins();
        return admins.includes(walletAddress);
    }
 };