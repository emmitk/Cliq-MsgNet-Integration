module.exports = async function (context, req) {
  /* Steps:
     1 - Call a rest API to Cliq to get the data - timed ~11pm or 5am (ie enought time to send a msg and notify a user to charge the key)
     2 - Store data in a local database - key date
     3 - Filter data to identify users with 1 day expiry (possibly add to queue for processing)
     4 - Call Messagenet API to send sms's
     5 - Keep logs of all messages for audit purposes
     6 - Send Admin group a status message (ie no sms sent + email of users/or nightly API call was not successful)
  */

  var request = require("request"); 
  var fs = require('fs')
    , path = require('path');
  var xml2js = require('xml2js');
  var error_occurred = false;
      
  var pfxFilePath = path.resolve(__dirname, '../ssl/2-000095399-WebService.pfx');
  var mypfx = fs.readFileSync(pfxFilePath);
  var mypwd = process.env["cliqPassphrase"];
  var listUsersJSON;
  var listUserKeysJSON;
  var keyDetailsJSON;
  var gCounts = {
    total:0,
    active:0,
    expiring:0
  };
  var arrMessages = [];

  var l_datetime = Date.now().toString();
  context.log("l_datetime = " + l_datetime) ;

  try {
      context.log("Pre call");
      const listUsers  = await cliq_getPersons_ws();
      //context.log(listUsers );

      //Convert output to JSON
      xml2js.parseString(listUsers , function (err, result) {
        if (err) { context.log(err); error_occurred = true };
        listUsersJSON  = result;
      });
      //context.log(JSON.stringify(listUsersJSON ));
   } catch (error) {
      error_occurred = true;
      context.log(error);
   }

  try {
      //Should search for this rather than use indexes in case the schema changes
      const arrPersons = listUsersJSON["S:Envelope"]["S:Body"][0]["ns4:getPersonsResponse"][0]["person"];
//      context.log(listUserKeys);
    
    for ( i=0; i< arrPersons.length; i++) {
      person = arrPersons[i];
        gCounts.total++;
        if (person["deleted"] == "false") {
          gCounts.active++;
          context.log("Person:" + person["identity"] + "-" + person["firstName"] + " " + person["surname"]);          
          let listUserKeys  = await cliq_getKeysForPerson_ws(person["identity"]);

          //context.log(listUserKeys);
          //Convert output to JSON

          xml2js.parseString(listUserKeys , function (err, result) {
            if (err) { context.log(err); error_occurred = true };
            listUserKeysJSON  = result;
          });

            let arrUserKeys = listUserKeysJSON["S:Envelope"]["S:Body"][0]["ns4:getKeysForPersonResponse"];         
            
            if (listUserKeysJSON["S:Envelope"]["S:Body"][0]["ns4:getKeysForPersonResponse"][0]["key"] !== undefined) { //ignore where user has no keys
              arrUserKeys = arrUserKeys[0]["key"];
              for (j=0; j<arrUserKeys.length; j++) {
                key = arrUserKeys[j];

                if (key["deleted"] == "false") {
                  context.log("Key:" + key["identity"] + "-" + key["type"] + "-" + key["name"] + "-" + key["marking"]);
                  let keyDetails  = await cliq_getKeyDetails_ws(key["identity"]);
//                  context.log(keyDetails);
                  xml2js.parseString(keyDetails , function (err, result) {
                    if (err) { context.log(err); error_occurred = true };
                    keyDetailsJSON  = result;
                  });
//                  context.log(keyDetailsJSON["S:Envelope"]["S:Body"][0]["ns4:getKeyDetailsResponse"][0]["keyDetails"][0]["operationalStatus"]);
                  let arrKeyDetails = keyDetailsJSON["S:Envelope"]["S:Body"][0]["ns4:getKeyDetailsResponse"][0]["keyDetails"];
                  context.log("Operational Status:" + arrKeyDetails[0]["operationalStatus"] + " |  Last remote Update:" + arrKeyDetails[0]["lastRemoteUpdate"]);
                  let msgDigest = {
                    "type":"sms",
                    "number": "61433111696",
                    "sender": "AG Admin",
                    "subject": "Subject heading",
                    "msg": "Test Message from Azure at" + l_datetime + " for " + person["firstName"] + " " + person["surname"]
                  };
                  gCounts.expiring = msgDigest.length;
                  arrMessages.push(msgDigest);
                }
              }
            }        
        }          
    }

      if (!error_occurred) {
          context.res = {
              status: 200, //default
              body: "Total:" + gCounts.total + "\nActive:" + gCounts.active
            };
      }
      else {
          context.res = {
              status: 400,
              body: "Some error occured in the webservice response!"
          };
      }
            
      context.bindings.outputQueueItem = arrMessages;

      context.bindings.outputTblStatus = [
        {
          PartitionKey: "ExpiryCheck",
          RowKey: l_datetime + "-Start",
          status: "Started",
          run_date: getDate()
        },
        {
          PartitionKey: "ExpiryCheck",
          RowKey: l_datetime + "-Count",
          status: "Total:" + gCounts.total + "\nActive:" + gCounts.active + "\nExpiring:" + gCounts.expiring,
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



// wrap a request in an promise
function cliq_getPersons_ws() {  
  let url = 'https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/';
  let envelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">
     <soapenv:Header/>
     <soapenv:Body><v2:getPersons/></soapenv:Body>
    </soapenv:Envelope>`;

  
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
      passphrase: mypwd 
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
 
// wrap a request in an promise
function cliq_getKeysForPerson_ws(i_person) {  
  let url = 'https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/';
  let envelope = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">
    <soapenv:Header/>
    <soapenv:Body>
     <v2:getKeysForPerson>
        <!--Optional:-->
        <personIdentity>` + i_person + `</personIdentity>
     </v2:getKeysForPerson>
    </soapenv:Body>
  </soapenv:Envelope>`;

  //context.log("\nEnvelope=" + envelope);
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
      passphrase: mypwd 
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

// wrap a request in an promise
function cliq_getKeyDetails_ws(i_key) {  
  let url = 'https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/';
  let envelope = `
   <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">
    <soapenv:Header/>
    <soapenv:Body>
      <v2:getKeyDetails>
         <!--Optional:-->
         <keyIdentity>` + i_key + `</keyIdentity>
      </v2:getKeyDetails>
    </soapenv:Body>
   </soapenv:Envelope>`;


  //context.log("\nEnvelope=" + envelope);
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
      passphrase: mypwd 
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
