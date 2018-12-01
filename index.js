var fs = require('fs');
var xml2js = require('xml2js');
var  openapi2apigee = require('openapi2apigee/lib/commands/generateApi/generateApi.js');
var parser = new xml2js.Parser({ explicitArray: true });
var builder = new xml2js.Builder();
var async = require("async");

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

var apiProxy = "testProxy";
var options = {
    source: "http://petstore.swagger.io/v2/swagger.json",
    destination: "."
  };
openapi2apigee.generateApi(apiProxy, options, function(err){
  if(err) return console.log(err);
  deleteZip("testProxy");
  addVerifyAPIKeyPolicy("testProxy");
  addPolicyToProxyEndpoint("testProxy", "Verify-API-Key");
  addPolicyToDescriptor("testProxy", "Verify-API-Key");
});

//In case to revert the Proxy endpoint config
//removePolicyToProxyEndpoint("testProxy");



