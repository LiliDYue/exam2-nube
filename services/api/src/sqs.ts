// services/api/src/sqs.ts
import AWS from 'aws-sdk';

const sqs = new AWS.SQS();

export const sendMessage = async (payload: any) => {
  await sqs.sendMessage({
    QueueUrl: process.env.SQS_URL!,
    MessageBody: JSON.stringify(payload)
  }).promise();
};