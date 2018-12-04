# ProxyGen
Generate Proxy using OpenAPI Spec and include a VerifyAPIKey policy automatically

## Pre-Reqs:
- NodeJS (6.x or later)

## Steps:
- Clone this repo and Navigate to the project directory
- run `npm install`
- run  `node index.js`
- This should create a proxy in your current directory with a Verify-API-Key policy added to the `policies` folder and also included in the Proxy Endpoint configuration

### To-Do:
- Add other policies like Flow Callout in the Preflow
- Fault Rules
