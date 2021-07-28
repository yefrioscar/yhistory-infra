import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const PRIMARY_KEY_TRANSACTION = process.env.PRIMARY_KEY_TRANSACTION || '';
const TABLE_NAME_TRANSACTION = process.env.TABLE_NAME_TRANSACTION || '';
const PRIMARY_KEY_WALLET = process.env.PRIMARY_KEY_WALLET || '';
const TABLE_NAME_WALLET = process.env.TABLE_NAME_WALLET || '';

const db = new AWS.DynamoDB.DocumentClient();

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

export const handler = async (event: any = {}): Promise<any> => {

  if (!event.body) {
    return { statusCode: 400, body: 'invalid request, you are missing the parameter body' };
  }
  const item = typeof event.body == 'object' ? event.body : JSON.parse(event.body);
  item[PRIMARY_KEY_TRANSACTION] = uuidv4();
  const params = {
    TableName: TABLE_NAME_TRANSACTION,
    Item: item
  };

  try {
    await db.put(params).promise();
    return { statusCode: 201, body: '' };
  } catch (dbError) {
    const errorResponse = dbError.code === 'ValidationException' && dbError.message.includes('reserved keyword') ?
      DYNAMODB_EXECUTION_ERROR : RESERVED_RESPONSE;
    return { statusCode: 500, body: errorResponse };
  }
};