import { createHmac, timingSafeEqual } from 'node:crypto';
import { KMSClient, SignCommand, VerifyCommand } from '@aws-sdk/client-kms';
import type { AuditSignature } from '../shared/platform.js';

const textEncoder = new TextEncoder();

/**
 * Sign the current audit-chain head before it is persisted. A local HMAC is
 * useful for development and single-tenant deployments; production can use
 * AWS KMS without changing the audit format or application API.
 */
export async function signAuditHead(head: string | undefined, tenantId: string): Promise<AuditSignature | undefined> {
  if (!head) return undefined;
  const secret = process.env.AGENTBREAK_AUDIT_SIGNING_SECRET;
  const message = JSON.stringify({ tenantId, head });
  if (secret && !process.env.AGENTBREAK_AWS_KMS_KEY_ID) {
    return {
      algorithm: 'HMAC-SHA256',
      tenantId,
      keyId: process.env.AGENTBREAK_AUDIT_SIGNING_KEY_ID || 'env:AGENTBREAK_AUDIT_SIGNING_SECRET',
      signedHash: head,
      signature: createHmac('sha256', secret).update(message).digest('base64url'),
      signedAt: new Date().toISOString(),
    };
  }

  const keyId = process.env.AGENTBREAK_AWS_KMS_KEY_ID;
  if (!keyId) return undefined;
  const client = new KMSClient({ region: process.env.AWS_REGION });
  const response = await client.send(new SignCommand({
    KeyId: keyId,
    Message: textEncoder.encode(message),
    MessageType: 'RAW',
    SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
  }));
  if (!response.Signature) throw new Error('AWS KMS did not return an audit signature.');
  return {
    algorithm: 'AWS-KMS-SHA256',
    tenantId,
    keyId,
    signedHash: head,
    signature: Buffer.from(response.Signature).toString('base64'),
    signedAt: new Date().toISOString(),
  };
}

export async function verifyAuditSignature(signature: AuditSignature | undefined, head: string, tenantId: string) {
  if (!signature) return { signed: false, valid: false };
  if (signature.signedHash !== head || signature.tenantId !== tenantId) return { signed: true, valid: false };
  const message = JSON.stringify({ tenantId, head });
  if (signature.algorithm === 'HMAC-SHA256') {
    if (!process.env.AGENTBREAK_AUDIT_SIGNING_SECRET) return { signed: true, valid: false };
    const expected = createHmac('sha256', process.env.AGENTBREAK_AUDIT_SIGNING_SECRET).update(message).digest();
    const supplied = Buffer.from(signature.signature, 'base64url');
    return { signed: true, valid: expected.length === supplied.length && timingSafeEqual(expected, supplied) };
  }
  if (signature.keyId !== process.env.AGENTBREAK_AWS_KMS_KEY_ID) return { signed: true, valid: false };
  const client = new KMSClient({ region: process.env.AWS_REGION });
  const response = await client.send(new VerifyCommand({ KeyId: signature.keyId, Message: textEncoder.encode(message), MessageType: 'RAW', Signature: Buffer.from(signature.signature, 'base64'), SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_256' }));
  return { signed: true, valid: response.SignatureValid === true };
}
