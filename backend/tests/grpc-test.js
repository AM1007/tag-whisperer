import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROTO_PATH = join(__dirname, '..', 'src', 'grpc', 'subscription.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).subscription;
const client = new proto.SubscriptionService('localhost:50051', grpc.credentials.createInsecure());

client.Subscribe({ email: 'grpc@test.com', repo: 'lodash/lodash' }, (err, response) => {
  if (err) console.log('Subscribe error:', err.message);
  else console.log('Subscribe:', response.message);

  client.GetSubscriptions({ email: 'grpc@test.com' }, (err, response) => {
    if (err) console.log('GetSubscriptions error:', err.message);
    else console.log('Subscriptions:', response.subscriptions);
  });
});