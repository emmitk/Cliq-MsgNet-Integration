module.exports = async function (context, req) {
  /* Steps:
     1 - Call a rest API to Cliq to get the data - timed ~11pm or 5am (ie enought time to send a msg and notify a user to charge the key)
     2 - Store data in a local database - key date
     3 - Filter data to identify users with 1 day expiry (possibly add to queue for processing)
     4 - Call Messagenet API to send sms's
     5 - Keep logs of all messages for audit purposes
     6 - Send Admin group a status message (ie no sms sent + email of users/or nightly API call was not successful)
  */
  context.log('JavaScript HTTP trigger function processed a request.');

  var request = require("request"); 
  var fs = require('fs')
    , path = require('path');
  var xml2js = require('xml2js');
    

  var lv_body="init";
  var pfxFilePath = path.resolve(__dirname, 'ssl/2-000095399-WebService.pfx');
  var mypfx = fs.readFileSync(pfxFilePath);
  var listUsersJSON;
  var gCounts = {
    total:0,
    active:0,
    expiring:0
    };

  var lv_cliqCert = process.env["CliqCert"];
  try {
//      const html = await callCliqWS('https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/?wsdl');
//      const html = await callCliqWS('https://www.microsoft.com');
      const listUsers = await callCliqWSPost('https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/');
//      context.log(listUsers);

      //Convert output to JSON
      xml2js.parseString(listUsers, function (err, result) {
        if (err) { context.log(err)};
        listUsersJSON = result;
      });

      //Should search for this rather than use indexes in case the schema changes
      const arrPersons = listUsersJSON["S:Envelope"]["S:Body"][0]["ns4:getPersonsResponse"][0]["person"];
      arrPersons.forEach(function(person) {
        gCounts.total++;
        if (person["deleted"] == "false") {
          gCounts.active++;
          context.log("Person:" + person["identity"] + "-" + person["firstName"] + " " + person["surname"]);
        }  
        
      });


      context.res = {
          // status: 200, 
          body: "Total:" + gCounts.total + "\nActive:" + gCounts.active
      };

//        context.bindings.outputQueueItem = "HTML:" ; // Also works with strings
      var l_datetime = Date.now().toString();
      context.log("l_datetime = " + l_datetime) ;
/*      context.bindings.outputQueueItem = [
          {
              "type":"sms",
              "number": "61433111696",
              "sender": "Emmit",
              "subject": "Subject heading",
              "msg": "Test Message from Azure " + l_datetime
          }//,
          //"some string"
      ]
*/
      context.bindings.outputTblStatus = [
        {
          PartitionKey: "Status",
          RowKey: l_datetime + "-Start",
          status: "Started",
          run_date: getDate()
        },
        {
          PartitionKey: "Status",
          RowKey: l_datetime + "-Finish",
          status: "Finished",
          run_date: getDate()
        }
      ];


/*
      context.bindings.tableBinding = [];
      for (var i = 1; i < 10; i++) {
          context.bindings.tableBinding.push({
              PartitionKey: "Status",
              RowKey: i.toString(),
              Name: "Name " + i
          });
      }        
*/        
  } catch (error) {
      context.log('ERROR:');
      context.log(error);
      context.res = {
          status: 400,
          body: "Something bad happened!!"
      };        
  }
  context.log('Post Call.');
  context.done();        
return;

// wrap a request in an promise
function callCliqWS(url) {  
  var options = {     
    method: 'GET',
    url: url,
    headers: { "content-type": "text/xml","charset":"UTF-8" },
    agentOptions: {
      pfx: mypfx,
      passphrase: 'e/*hX5' //<= move to keyvault
    }
  };

  return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
          if (error) reject(error);
          if (response.statusCode != 200) {
              reject('Invalid status code <' + response.statusCode + '>');
          }
          resolve(body);
      });
  });
}

// wrap a request in an promise
function callCliqWSPost(url) {  
  let envelope = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">' 
              + '<soapenv:Header/>'
              + '<soapenv:Body><v2:getPersons/></soapenv:Body>'
              + '</soapenv:Envelope>';
  var options = {     
    method: 'POST',
    url: url,
    headers: { "content-type": "text/xml;charset=UTF-8",
      "SOAPAction": url,
      "Accept-Encoding": "gzip,deflate",
      "Connection": "Keep-Alive"
    },
    agentOptions: {
      pfx: mypfx,
      passphrase: 'e/*hX5' //<= move to keyvault
    },
    body: envelope
  };

  return new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
          if (error) reject(error);
          if (response.statusCode != 200) {
              reject('Invalid status code <' + response.statusCode + '>');
          }
          resolve(body);
      });
  });
}


function callCliqWSPost0(url) {  
  let soap = require('strong-soap').soap;
  let xml2js = require('xml2js');
context.log("In callCliqWSPost");
  let envelope = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">' 
              + '<soapenv:Header/>'
              + '<soapenv:Body><v2:getPersons/></soapenv:Body>'
              + '</soapenv:Envelope>';

 let url_wsdl = 'https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/?wsdl';
  /*var parser = new xml2js.Parser();
   parser.parseString(envelope, {trim: true}, function (err, result) {
       context.log("Result XML:" + result);
});*/
  var options = {     
    method: 'POST',
//    url: url,
    headers: { 
      "content-type": "text/xml;charset=UTF-8",
 //     "SOAPAction": "https://abloycwm001.assaabloy.net:443/CLIQWebManager/ws/query/v2/",
      "SOAPAction": "",
      "Accept-Encoding": "gzip,deflate",
      "Connection": "Keep-Alive"
    },
/*    wsdl_options: {
      forever: true,
      rejectUnauthorized: false,
      strictSSL: false,
      pfx: mypfx,
      passphrase: 'e/*hX5' //<= move to keyvault
    },    */
    agentOptions: {
      pfx: mypfx,
      passphrase: 'e/*hX5' //<= move to keyvault
    }
    //body: envelope   
  };

    return new Promise((resolve, reject) => {
      soap.createClient(url_wsdl, options, function(err, client) {
      context.log('Soap client created');
      context.log('Soap client created:Err:'+ err.code + err + "\nClient:" + client);
//      var method = client.getPersons(args, function(err, result, envelope, options) {
//            context.log("result=" + result + err);
            resolve(client);
 //       });
      });    
      context.log('End: New Soap Request');
// resolve("test");
      context.log('End: New Soap Request resolved');
    });      
}



function getDate()
{
var today = new Date();
var dd = today.getDate();
var mm = today.getMonth() + 1; //January is 0!

var yyyy = today.getFullYear();
if (dd < 10) {
  dd = '0' + dd;
} 
if (mm < 10) {
  mm = '0' + mm;
} 
var today = dd + '/' + mm + '/' + yyyy;
return today;
} 

};
