import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isValidEmail, isValidRepo, parseRepo } from '../utils/validation.js';
import { checkRepoExists } from '../services/githubService.js';
import {
  createSubscription,
  confirmSubscription,
  unsubscribe,
  getSubscriptionsByEmail,
} from '../services/subscriptionService.js';
import { sendConfirmationEmail } from '../services/emailService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROTO_PATH = join(__dirname, 'subscription.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition).subscription;

async function subscribeHandler(call, callback) {
  const { email, repo } = call.request;

  if (!email || !repo || !isValidEmail(email) || !isValidRepo(repo)) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid input' });
  }

  const { owner, name } = parseRepo(repo);

  try {
    const exists = await checkRepoExists(owner, name);
    if (!exists) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Repository not found on GitHub' });
    }

    const result = await createSubscription(email, owner, name);
    if (result.conflict) {
      return callback({ code: grpc.status.ALREADY_EXISTS, message: 'Already subscribed' });
    }

    await sendConfirmationEmail(email, repo, result.confirmToken);
    callback(null, { message: 'Subscription successful. Confirmation email sent.' });
  } catch (err) {
    console.error('gRPC Subscribe error:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
  }
}

async function confirmHandler(call, callback) {
  const { token } = call.request;

  if (!token) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid token' });
  }

  try {
    const found = await confirmSubscription(token);
    if (!found) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Token not found' });
    }
    callback(null, { message: 'Subscription confirmed successfully' });
  } catch (err) {
    console.error('gRPC Confirm error:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
  }
}

async function unsubscribeHandler(call, callback) {
  const { token } = call.request;

  if (!token) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid token' });
  }

  try {
    const found = await unsubscribe(token);
    if (!found) {
      return callback({ code: grpc.status.NOT_FOUND, message: 'Token not found' });
    }
    callback(null, { message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('gRPC Unsubscribe error:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
  }
}

async function getSubscriptionsHandler(call, callback) {
  const { email } = call.request;

  if (!email || !isValidEmail(email)) {
    return callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Invalid email' });
  }

  try {
    const rows = await getSubscriptionsByEmail(email);
    const subscriptions = rows.map((r) => ({
      email: r.email,
      repo: r.repo,
      confirmed: r.confirmed,
      last_seen_tag: r.last_seen_tag || '',
    }));
    callback(null, { subscriptions });
  } catch (err) {
    console.error('gRPC GetSubscriptions error:', err);
    callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
  }
}

export function startGrpcServer() {
  const server = new grpc.Server();

  server.addService(proto.SubscriptionService.service, {
    Subscribe: subscribeHandler,
    Confirm: confirmHandler,
    Unsubscribe: unsubscribeHandler,
    GetSubscriptions: getSubscriptionsHandler,
  });

  const GRPC_PORT = process.env.GRPC_PORT || 50051;

  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('gRPC server failed to start:', err);
        return;
      }
      console.log(`gRPC server running on port ${port}`);
    }
  );
}