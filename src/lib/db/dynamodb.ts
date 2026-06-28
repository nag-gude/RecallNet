import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RecallStore } from "./store";
import type {
  OwnershipEvent,
  Product,
  RecallEvent,
  ShareReport,
  UserRecallStatus,
} from "../types";

const productsTable = process.env.DYNAMODB_PRODUCTS_TABLE ?? "recallnet-products";
const ownershipTable = process.env.DYNAMODB_OWNERSHIP_TABLE ?? "recallnet-ownership-events";
const recallsTable = process.env.DYNAMODB_RECALLS_TABLE ?? "recallnet-recall-events";
const statusTable = process.env.DYNAMODB_STATUS_TABLE ?? "recallnet-user-recall-status";

function docClient() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-east-1",
  });
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

export class DynamoDBStore implements RecallStore {
  private doc = docClient();

  async ping(): Promise<boolean> {
    try {
      await this.doc.send(new ScanCommand({ TableName: productsTable, Limit: 1 }));
      return true;
    } catch {
      return false;
    }
  }

  async getProduct(productId: string): Promise<Product | null> {
    const res = await this.doc.send(
      new GetCommand({ TableName: productsTable, Key: { productId } }),
    );
    return (res.Item as Product) ?? null;
  }

  async putProduct(product: Product): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: productsTable, Item: product }));
  }

  async listProducts(): Promise<Product[]> {
    const res = await this.doc.send(new ScanCommand({ TableName: productsTable }));
    return (res.Items as Product[]) ?? [];
  }

  async findProductByUpc(upc: string): Promise<Product | null> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: productsTable,
        IndexName: "UpcIndex",
        KeyConditionExpression: "upc = :upc",
        ExpressionAttributeValues: { ":upc": upc },
        Limit: 1,
      }),
    );
    return (res.Items?.[0] as Product) ?? null;
  }

  async findProductByTokens(brand: string, model: string): Promise<Product | null> {
    const products = await this.listProducts();
    const b = brand.toLowerCase();
    const m = model.toLowerCase();
    return (
      products.find(
        (p) =>
          p.brand.toLowerCase().includes(b) &&
          (p.model.toLowerCase().includes(m) || m.includes(p.model.toLowerCase())),
      ) ?? null
    );
  }

  async putOwnershipEvent(event: OwnershipEvent): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: ownershipTable,
        Item: {
          ...event,
          PK: `USER#${event.userId}`,
          SK: `EVENT#${event.timestamp}#${event.eventId}`,
          GSI1PK: event.productId,
          GSI1SK: `USER#${event.userId}`,
        },
      }),
    );
  }

  async listOwnershipByUser(userId: string): Promise<OwnershipEvent[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: ownershipTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `USER#${userId}` },
      }),
    );
    return (res.Items as OwnershipEvent[]) ?? [];
  }

  async listOwnersByProduct(productId: string): Promise<string[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: ownershipTable,
        IndexName: "ProductOwnersIndex",
        KeyConditionExpression: "GSI1PK = :pid",
        ExpressionAttributeValues: { ":pid": productId },
      }),
    );
    const items = res.Items ?? [];
    return [...new Set(items.map((i) => (i as OwnershipEvent).userId))];
  }

  async putRecallEvent(recall: RecallEvent): Promise<void> {
    for (const productId of recall.productIds) {
      await this.doc.send(
        new PutCommand({
          TableName: recallsTable,
          Item: {
            ...recall,
            PK: `RECALL#${recall.recallId}`,
            SK: `EVENT#${recall.publishedAt}`,
            GSI1PK: productId,
            GSI1SK: recall.publishedAt,
            GSI2PK: recall.status,
            GSI2SK: recall.publishedAt,
          },
        }),
      );
    }
  }

  async getRecall(recallId: string): Promise<RecallEvent | null> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: recallsTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `RECALL#${recallId}` },
        Limit: 1,
      }),
    );
    return (res.Items?.[0] as RecallEvent) ?? null;
  }

  async listActiveRecalls(): Promise<RecallEvent[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: recallsTable,
        IndexName: "ActiveRecallsIndex",
        KeyConditionExpression: "GSI2PK = :active",
        ExpressionAttributeValues: { ":active": "ACTIVE" },
        ScanIndexForward: false,
      }),
    );
    const seen = new Set<string>();
    const recalls: RecallEvent[] = [];
    for (const item of res.Items ?? []) {
      const r = item as RecallEvent;
      if (!seen.has(r.recallId)) {
        seen.add(r.recallId);
        recalls.push(r);
      }
    }
    return recalls;
  }

  async listRecallsForProduct(productId: string): Promise<RecallEvent[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: recallsTable,
        IndexName: "ProductRecallsIndex",
        KeyConditionExpression: "GSI1PK = :pid",
        ExpressionAttributeValues: { ":pid": productId },
      }),
    );
    const seen = new Set<string>();
    const recalls: RecallEvent[] = [];
    for (const item of res.Items ?? []) {
      const r = item as RecallEvent;
      if (!seen.has(r.recallId)) {
        seen.add(r.recallId);
        recalls.push(r);
      }
    }
    return recalls;
  }

  async putUserRecallStatus(status: UserRecallStatus): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: statusTable,
        Item: {
          PK: `USER#${status.userId}`,
          SK: `RECALL#${status.recallId}`,
          ...status,
        },
      }),
    );
  }

  async listUserRecallStatus(userId: string): Promise<UserRecallStatus[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: statusTable,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": `USER#${userId}` },
      }),
    );
    return (res.Items as UserRecallStatus[]) ?? [];
  }

  async deleteUserRecallStatus(userId: string, recallId: string): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: statusTable,
        Key: { PK: `USER#${userId}`, SK: `RECALL#${recallId}` },
      }),
    );
  }

  async putShareReport(report: ShareReport): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: statusTable,
        Item: { PK: `REPORT#${report.token}`, SK: "META", ...report },
      }),
    );
  }

  async getShareReport(token: string): Promise<ShareReport | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: statusTable,
        Key: { PK: `REPORT#${token}`, SK: "META" },
      }),
    );
    return (res.Item as ShareReport) ?? null;
  }
}
