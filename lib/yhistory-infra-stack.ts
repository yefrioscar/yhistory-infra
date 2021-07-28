import { Cors, LambdaIntegration, RestApi } from "@aws-cdk/aws-apigateway";
import { AttributeType, Table } from "@aws-cdk/aws-dynamodb";
import { Runtime } from "@aws-cdk/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import { RemovalPolicy } from "@aws-cdk/core";
import { join } from "path";

export class YhistoryInfraStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // The code that defines your stack goes here
        const dynamoTransactionTable = new Table(this, "transaction", {
            partitionKey: {
                name: "transactionId",
                type: AttributeType.STRING,
            },
            tableName: "transaction",

            /**
             *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
             * the new table, and it will remain in your account until manually deleted. By setting the policy to
             * DESTROY, cdk destroy will delete the table (even if it has data in it)
             */
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        const dynamoWalletTable = new Table(this, "wallet", {
            partitionKey: {
                name: "walletId",
                type: AttributeType.STRING,
            },
            tableName: "wallet",

            /**
             *  The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
             * the new table, and it will remain in your account until manually deleted. By setting the policy to
             * DESTROY, cdk destroy will delete the table (even if it has data in it)
             */
            removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
        });

        const nodeJsFunctionProps: NodejsFunctionProps = {
            bundling: {
                externalModules: [
                    "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
                ],
            },
            depsLockFilePath: join(__dirname, '..', "lambda", "package-lock.json"),
            environment: {
                PRIMARY_KEY_TRANSACTION: "transactionId",
                TABLE_NAME_TRANSACTION: dynamoTransactionTable.tableName,
                PRIMARY_KEY_WALLET: "walletId",
                TABLE_NAME_WALLET: dynamoWalletTable.tableName,
            },
            runtime: Runtime.NODEJS_12_X,
        };

        console.log(join(__dirname, '..', "lambda", "create-transaction.ts"))

        const createTransactionLambda = new NodejsFunction(this, "createTransactionFunction", {
            entry: join(__dirname, '..', "lambda", "create-transaction.ts"),
            ...nodeJsFunctionProps,
        });

        dynamoTransactionTable.grantReadWriteData(createTransactionLambda);
        dynamoWalletTable.grantReadWriteData(createTransactionLambda);


        const createIntegration = new LambdaIntegration(createTransactionLambda);

        const api = new RestApi(this, 'yHistoryApi', {
          restApiName: 'YHistory Api',
          defaultCorsPreflightOptions: {
            allowOrigins: Cors.ALL_ORIGINS
          }
        });

        const items = api.root.addResource('transactions');
        items.addMethod('GET', createIntegration);
        items.addMethod('POST', createIntegration);
    }
}
