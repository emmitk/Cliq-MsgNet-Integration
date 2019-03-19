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
  var gCounts = {
    total:0,
    active:0,
    expiring:0
  };

  try {
      context.log("Pre call");
      const listUsers  = await cliq_getPersons_ws();
      //context.log(listUsers );

      //Convert output to JSON
      xml2js.parseString(listUsers , function (err, result) {
        if (err) { context.log(err); error_occurred = true };
        listUsersJSON  = result;
      });
      context.log(JSON.stringify(listUsersJSON ));
 
      //Should search for this rather than use indexes in case the schema changes
      const arrPersons = listUsersJSON["S:Envelope"]["S:Body"][0]["ns4:getPersonsResponse"][0]["person"];
      arrPersons.forEach(function(person) {
        gCounts.total++;
        if (person["deleted"] == "false") {
          gCounts.active++;
          context.log("Person:" + person["identity"] + "-" + person["firstName"] + " " + person["surname"]);
          let listUserKeys  = await cliq_getKeysForPerson_ws(person["identity"]);
          context.log(listUserKeys);
          //Convert output to JSON
          xml2js.parseString(listUserKeys , function (err, result) {
            if (err) { context.log(err); error_occurred = true };
            listUserKeysJSON  = result;
            let arrUserKeys = listUserKeysJSON["S:Envelope"]["S:Body"][0]["ns4:getKeysForPersonResponse"][0]["key"];
/*
<identity>811826fd-7533-4491-9cfc-79a83f5fb800</identity>
            <type>TEMPORARY_KEY</type>
            <name>CLIQ KEY</name>
            <marking>DK/4</marking>
            <deleted>true</deleted>

*/            
            arrUserKeys.forEach(function(key) {
              if (key["deleted"] == "false") {
                context.log("Key:" + key["identity"] + "-" + key["type"] + "-" + key["name"] + "-" + key["marking"]);
              }
            });
          });
        }          
      });

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
function cliq_getKeysForPerson_ws(i_key) {  
  let url = 'https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/';
  let envelope = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">
    <soapenv:Header/>
    <soapenv:Body>
     <v2:getKeysForPerson>
        <!--Optional:-->
        <personIdentity>` + i_key + `</personIdentity>
     </v2:getKeysForPerson>
    </soapenv:Body>
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