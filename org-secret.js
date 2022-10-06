const sodium = require('tweetsodium')
const { Octokit } = require('@octokit/core')

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.GH_ORG_TOKEN })

async function updateSecret() {
  //const encryptionKey = crypto.randomBytes(16).toString('hex');
  process.env.DYNAMIC_PLUGIN_DEV_IMAGE
  const image = process.env.DYNAMIC_PLUGIN_DEV_IMAGE
  console.log(image)

  const publicKeyResponse = await octokit.request('GET /orgs/RHEcosystemAppEng/actions/secrets/public-key', {
    org: 'RHEcosystemAppEng'
  })
  const publicKey = publicKeyResponse.data.key
  const publicKeyId = publicKeyResponse.data.key_id

  // Convert the message and key to Uint8Array's (Buffer implements that interface)
  const imageBytes = Buffer.from(image)
  const keyBytes = Buffer.from(publicKey, 'base64')

  // Encrypt using LibSodium.
  const encryptedBytes = sodium.seal(imageBytes, keyBytes)

  // Base64 the encrypted secret
  const encryptedImage = Buffer.from(encryptedBytes).toString('base64')

  await octokit.request('PUT /orgs/RHEcosystemAppEng/actions/secrets/DYNAMIC_PLUGIN_DEV_IMAGE', {
    org: 'ORG',
    secret_name: 'DYNAMIC_PLUGIN_DEV_IMAGE',
    key_id: publicKeyId,
    encrypted_value: encryptedImage,
    visibility: 'all'
    //selected_repository_ids: [
     // 1296269,
      //1296280
    //]
  })
}

return updateSecret()
