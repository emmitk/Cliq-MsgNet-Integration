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
      
  
    var lv_body="init";
    var pfxFilePath = path.resolve(__dirname, '../ssl/2-000095399-WebService.pfx');
    var mypfx = fs.readFileSync(pfxFilePath);
    var mypwd =  process.env["cliqPassphrase"];
    var auditLogJSON;
    var gCounts = {
      total:0,
      active:0,
      expiring:0
    };
  
    try {
        context.log("Pre call");
        const auditLog = await callCliqWSPost('https://abloycwm001.assaabloy.net/CLIQWebManager/ws/query/v2/');
        context.log(auditLog);
  
        //Convert output to JSON
        xml2js.parseString(auditLog, function (err, result) {
          if (err) { context.log(err)};
          auditLogJSON = result;
        });
        context.log(JSON.stringify(auditLogJSON));
 /* 
        //Should search for this rather than use indexes in case the schema changes
        const arrPersons = listUsersJSON["S:Envelope"]["S:Body"][0]["ns4:getPersonsResponse"][0]["person"];
        arrPersons.forEach(function(person) {
          gCounts.total++;
          if (person["deleted"] == "false") {
            gCounts.active++;
            context.log("Person:" + person["identity"] + "-" + person["firstName"] + " " + person["surname"]);
          }  
          
        });
  
  */
        context.res = {
            // status: 200, 
            body: "Total:" + gCounts.total + "\nActive:" + gCounts.active
        };

/*
        if (error free) {
            context.res = {
                status: 200, //default
                body: "Hello " + (req.query.name || req.body.name)
            };
        }
        else {
            context.res = {
                status: 400,
                body: "Please pass a name on the query string or in the request body"
            };
        }
*/            

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
            RowKey: l_datetime + "-Start-Audit-Log",
            status: "Started",
            run_date: getDate()
          },
          {
            PartitionKey: "Status",
            RowKey: l_datetime + "-Finish-Audit-Log",
            status: "Finished",
            run_date: getDate()
          }
        ];
  
    //cliq-siem
    const auditOnlyJSON = auditLogJSON["S:Envelope"]["S:Body"][0]["ns4:getAuditTrailsResponse"][0]["auditTrails"];
    context.bindings.outputBlob = {"auditTrails": auditOnlyJSON};
    //XML => auditLog
  
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
  function callCliqWS(url) {  
    var options = {     
      method: 'GET',
      url: url,
      headers: { "content-type": "text/xml","charset":"UTF-8" },
      agentOptions: {
        pfx: mypfx,
        passphrase: mypwd //<= move to keyvault
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

    let envelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v2="http://cliq.shared.assaabloy.com/ws/query/v2/">
       <soapenv:Header/>
        <soapenv:Body>
         <v2:getAuditTrails>
             <importDateInterval>
             <from>2018-04-01T00:00+08:00</from>
             <!--Optional:-->
             <to>2019-03-01T00:00+08:00</to>
             <!--You may enter ANY elements at this point-->
          </importDateInterval>
          <!--Optional:-->
          <pagination>
             <firstResult>0</firstResult>
             <maxResults>1000</maxResults>
             <!--You may enter ANY elements at this point-->
          </pagination>
         </v2:getAuditTrails>
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