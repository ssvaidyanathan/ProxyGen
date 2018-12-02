var prompt = require("prompt");
var colors = require("colors/safe");

var fs = require('fs');
var xml2js = require('xml2js');
var  openapi2apigee = require('openapi2apigee/lib/commands/generateApi/generateApi.js');
var parser = new xml2js.Parser({ explicitArray: true });
var builder = new xml2js.Builder();
var async = require("async"); 


var schema = {
    properties: {
      apiProxy: {
        description: colors.yellow("Please provide the Apigee proxy name"),
        message: colors.red("Apigee proxy name cannot be empty!"),
        required: true
      },
      source: {
        description: colors.yellow("Please provide the OpenAPI Spec URL or full path of the file"),
        message: colors.red("Source cannot be empty!"),
        required: true
      },
      destination: {
        description: colors.yellow("Please provide the file path where the proxy needs to be created"),
        message: colors.red("Destination cannot be empty!"),
        required: true
      }
    }
  };

//
// Start the prompt
//
prompt.start();
//
// Get two properties from the user: email, password
//
prompt.get(schema, function (err, options) {
  //console.log(JSON.stringify(options));
  generateAPI(options.apiProxy, options.source, options.destination);
});

//OpenAPI2Apigee creates an apiproxy.zip, deleting that
function deleteZip(apiProxy){
  fs.unlink(__dirname+'/'+apiProxy+'/apiproxy.zip',function(err){
       if(err) return console.log(err);
       console.log('file deleted successfully');
   });  
}

//Create Verify API Key policy in the policies directory
function addVerifyAPIKeyPolicy(apiProxy){
  var verifyapikey = {
   "VerifyAPIKey":{
      "$":{
          "async": "false",
          "continueOnError": "false",
          "enabled": "true",
          "name": "Verify-API-Key"
      },
      "DisplayName":"Verify-API-Key",
      "Properties":null,
      "APIKey":{
        "$":{
          "ref":"request.queryparam.apikey"
        }
      }
   }
  };
  var xml = builder.buildObject(verifyapikey);
  fs.writeFile(__dirname+'/'+apiProxy+'/apiproxy/policies/Verify-API-Key.xml', xml, function(err, data){
      if (err) console.log(err);
      console.log("Successfully Written to File.");
  });
}

//Add Verify-API-Key policy to the Proxy endpoint configuration
function addPolicyToProxyEndpoint(apiProxy, policyName){
  var preflowStep = {
      "Step":{
      "Name": policyName
    } 
  };
  fs.readFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', function(err, data) {
      parser.parseString(data, function (err, result) {
          result.ProxyEndpoint.PreFlow[0].Request[0] = preflowStep;
          var xml = builder.buildObject(result);
          fs.writeFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', xml, function(err, data){
            if (err) console.log(err);
            console.log("Successfully update Proxy configuration");
        });
      });
  });
}

//Add Verify-API-Key policy to the bundle descriptor file
function addPolicyToDescriptor(apiProxy, policyName){
  fs.readFile(__dirname + '/' +apiProxy+ '/apiproxy/'+apiProxy+'.xml', function(err, data) {
      parser.parseString(data, function (err, result) {
          result.APIProxy.Policies = {
            "Policy": policyName
          };
          var xml = builder.buildObject(result);
          fs.writeFile(__dirname + '/' +apiProxy+ '/apiproxy/'+apiProxy+'.xml', xml, function(err, data){
            if (err) console.log(err);
            console.log("Successfully update Proxy descriptor");
        });
      });
  });
}

//Remove Verify-API-Key from Proxy endpoint configuration
function removePolicyToProxyEndpoint(apiProxy){
  fs.readFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', function(err, data) {
      parser.parseString(data, function (err, result) {
          result.ProxyEndpoint.PreFlow[0].Request[0] = {};
          var xml = builder.buildObject(result);
          fs.writeFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', xml, function(err, data){
            if (err) console.log(err);
            console.log("Successfully update Proxy configuration");
        });
      });
  });
}

function generateAPI(apiProxy, source, destination){
  var options = {
    source,
    destination
  };
  openapi2apigee.generateApi(apiProxy, options, function(err){
    if(err) return console.log(err);
    deleteZip(apiProxy);
    addVerifyAPIKeyPolicy(apiProxy);
    addPolicyToProxyEndpoint(apiProxy, "Verify-API-Key");
    addPolicyToDescriptor(apiProxy, "Verify-API-Key");
  });
}

//In case to revert the Proxy endpoint config
//removePolicyToProxyEndpoint("testProxy");



