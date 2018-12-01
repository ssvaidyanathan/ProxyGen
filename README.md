# ProxyGen
Generate Proxy and including a VerifyAPIKey policy automatically

## Pre-Reqs:
- NodeJS (6.x or later)

## Steps:
- Clone this repo and Navigate to the project directory
- run `npm install`
- run  `node index.js`
- This should create a proxy called `testProxy` in your current directory with a Verify-API-Key policy added to the `policies` folder and also included in the Proxy Endpoint configuration

### To-DO:
- Externalize the params using commander or similar
- Use URL or files for `source` attributes
