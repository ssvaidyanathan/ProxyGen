var prompt = require("prompt");
var colors = require("colors/safe");

var fs = require('fs');
var xml2js = require('xml2js');
var  openapi2apigee = require('openapi2apigee/lib/commands/generateApi/generateApi.js');
var parser = new xml2js.Parser({ explicitArray: true });
var builder = new xml2js.Builder();
var async = require("async"); 
var swaggerParser = require('swagger-parser');

var schema = {
    properties: {
      apiProxy: {
        description: colors.yellow("Please provide the Apigee proxy name"),
        message: colors.red("Apigee proxy name cannot be empty!"),
        required: true
      },
      source: {
        description: colors.yellow("Please provide the OpenAPI Spec URL or full path of the file (https://petstore.swagger.io/v2/swagger.json)"),
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
function addVerifyAPIKeyPolicy(apiProxy, policyName){
  var verifyapikey = {
   "VerifyAPIKey":{
      "$":{
          "async": "false",
          "continueOnError": "false",
          "enabled": "true",
          "name": policyName
      },
      "DisplayName": policyName,
      "Properties":null,
      "APIKey":{
        "$":{
          "ref":"request.queryparam.apikey"
        }
      }
   }
  };
  var xml = builder.buildObject(verifyapikey);
  fs.writeFile(__dirname+'/'+apiProxy+'/apiproxy/policies/'+policyName+'.xml', xml, function(err, data){
      if (err) console.log(err);
      console.log("Successfully Written to File.");
  });
}

//Create JS policy in the policies directory
function addJSPolicy(apiProxy, policyName){
  var jsPolicy = {
   "Javascript":{
      "$":{
          "async": "false",
          "continueOnError": "false",
          "enabled": "true",
          "timeLimit": "200",
          "name": policyName
      },
      "DisplayName":policyName,
      "Properties":null,
      "ResourceURL": "jsc://"+policyName+".js"
   }
  };
  var xml = builder.buildObject(jsPolicy);
  fs.writeFile(__dirname+'/'+apiProxy+'/apiproxy/policies/'+policyName+'.xml', xml, function(err, data){
      if (err) console.log(err);
      console.log("Successfully Written to File.");
  });
}

function addPoliciesToProxyEndpoint(apiProxy, policyName){
  var preflowStep = {
      "Step":{
      "Name": policyName
    } 
  };
  fs.readFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', function(err, data) {
      parser.parseString(data, function (err, result) {
          result.ProxyEndpoint.PreFlow[0].Request[0] = preflowStep;
          var flag = false;
          result.ProxyEndpoint.Flows[0].Flow.forEach(function(flow, i){
            if(flow.$.name === "OpenAPI"){
              flag = true;
              return;
            }
          });
          if(!flag){
            var openAPICondFlow = {
              "$": {
                "name" :"OpenAPI"
              },
              "Condition": ["(proxy.pathsuffix MatchesPath \"/openapi\") and (request.verb = \"GET\")"],
              "Description": ["OpenAPI Specification"],
              "Request": [""],
              "Response": [{
                "Step":{
                  "Name": "JS-OpenAPISpecResponse"
                }
              }]
            };
            result.ProxyEndpoint.Flows[0].Flow.push(openAPICondFlow);
          }
          var routeRule = [
              {
                "$":{
                  "name": "noRoute"
                },
                "Condition": ["(proxy.pathsuffix MatchesPath \"/openapi\") and (request.verb = \"GET\")"]
              },
              {
                "$":{
                  "name": "default"
                },
                "TargetEndpoint": ["default"]
              }
            ];
          
          result.ProxyEndpoint.RouteRule = null;
          result.ProxyEndpoint.RouteRule = routeRule;

          var xml = builder.buildObject(result);
          fs.writeFile(__dirname + '/' +apiProxy+ '/apiproxy/proxies/default.xml', xml, function(err, data){
            if (err) console.log(err);
            console.log("Successfully updated Proxy configuration");
          });
      });
  });
}

//Add policies to the bundle descriptor file
function addPoliciesToDescriptor(apiProxy, policyNames){
  fs.readFile(__dirname + '/' +apiProxy+ '/apiproxy/'+apiProxy+'.xml', function(err, data) {
      parser.parseString(data, function (err, result) {
          result.APIProxy.Policies = {
              "Policy": policyNames
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

function addJSResource(apiProxy, source, fileName){
  var dir = __dirname + '/' +apiProxy+ '/apiproxy/resources';
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  var dir = __dirname + '/' +apiProxy+ '/apiproxy/resources/jsc';
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
  swaggerParser.parse(source, function (err, api, metadata) {
    var jsFileContent = "var spec = "+ JSON.stringify(api)+ ";\n";
    jsFileContent = jsFileContent + "response.headers[\"Content-Type\"]=\"application/json\";\n";
    jsFileContent = jsFileContent + "response.content.asJSON = spec;\n";
    var filepath = __dirname + '/' +apiProxy+ '/apiproxy/resources/jsc/'+fileName+'.js';
    fs.writeFile(filepath, jsFileContent, function(err, data){
        if (err) throw err;
        console.log("The file was succesfully saved!");
    }); 
  })
}

function generateAPI(apiProxy, source, destination){
  var options = {
    source,
    destination
  };
  openapi2apigee.generateApi(apiProxy, options, function(err){
    if(err) return console.log(err);
    async.series([
      function (callback) {
        deleteZip(apiProxy);
        callback();
      },
      function (callback) {
        addVerifyAPIKeyPolicy(apiProxy, "Verify-API-Key");
        callback();
      },
      function (callback) {
        addPoliciesToProxyEndpoint(apiProxy, "Verify-API-Key");
        callback();
      },
      function (callback) {
        addJSPolicy(apiProxy, "JS-OpenAPISpecResponse");
        callback();
      },
      function (callback) {
        addPoliciesToDescriptor(apiProxy, ["Verify-API-Key", "JS-OpenAPISpecResponse"]);
        callback();
      },
      function (callback) {
        addJSResource(apiProxy, source, "JS-OpenAPISpecResponse");
        callback();
      }
    ])
  });
}
//swaggerParser.parse(options.source, function (err, api, metadata) {
  //console.log(api);
//}
//In case to revert the Proxy endpoint config
//removePolicyToProxyEndpoint("testProxy");
