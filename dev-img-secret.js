const sodium = require('tweetsodium');
const { Octokit } = require('@octokit/core');

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GH_TOKEN });

async function updateSecret() {
  const image = process.env.DYNAMIC_PLUGIN_DEV_IMAGE;
  console.log(image);

  const publicKeyResponse = await octokit.request(
    'GET /repos/RHEcosystemAppEng/dbaas-operator/actions/secrets/public-key',
    {
      owner: 'RHEcosystemAppEng',
      repo: 'dbaas-operator'
    }
  );
  const publicKey = publicKeyResponse.data.key;
  const publicKeyId = publicKeyResponse.data.key_id;

  // Convert the message and key to Uint8Array's (Buffer implements that interface)
  const imageBytes = Buffer.from(image);
  const keyBytes = Buffer.from(publicKey, 'base64');

  // Encrypt using LibSodium.
  const encryptedBytes = sodium.seal(imageBytes, keyBytes);

  // Base64 the encrypted secret
  const encryptedImage = Buffer.from(encryptedBytes).toString('base64');

  await octokit.request('PUT /repos/RHEcosystemAppEng/dbaas-operator/actions/secrets/DYNAMIC_PLUGIN_DEV_IMAGE', {
    owner: 'RHEcosystemAppEng',
    repo: 'dbaas-operator',
    secret_name: 'DYNAMIC_PLUGIN_DEV_IMAGE',
    key_id: publicKeyId,
    encrypted_value: encryptedImage
  });
}

return updateSecret();
