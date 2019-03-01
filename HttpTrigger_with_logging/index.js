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
    var lv_body="init";

    var lv_cliqCert = process.env["CliqCert"];
    
    try {
        context.log('Pre work');
        const html = await callCliqWS('https://microsoft.com')
        context.log('SHOULD WORK:');
        context.log(html);

        
        // try downloading an invalid url
        const lv_body = await callCliqWSPost("http://test.com")
        context.res = {
            // status: 200, 
            body: "HTML:" + html + lv_body
        };
//        context.bindings.outputQueueItem = "HTML:" ; // Also works with strings
        var l_datetime = Date.now();
        context.bindings.outputQueueItem = [
            {
                "type":"sms",
                "number": "61433111696",
                "sender": "Emmit",
                "subject": "Subject heading",
                "msg": "Test Message from Azure " + l_datetime.toString()
            }//,
            //"some string"
        ]

        context.bindings.outputTblStatus = [
          {
            PartitionKey: "Status",
            RowKey: l_datetime.toString(),
            status: "Started",
            run_date: getDate()
          },
          {
            PartitionKey: "Status",
            RowKey: l_datetime.toString(),
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
        context.error('ERROR:');
        context.error(error);
        context.res = {
            status: 400,
            body: "Something bad happened!!"
        };        
    }
    context.log('Post Call.');
    context.done();        



// wrap a request in an promise
  function callCliqWS(url) {  
    return new Promise((resolve, reject) => {


        request(url, (error, response, body) => {
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
  
  function callCliqWSPost(url) {  
    return new Promise((resolve, reject) => {
      context.log('Pre PostCall');
      request.post({
        "headers": { "content-type": "application/json" },
        "url": "http://httpbin.org/post", // <-- Update url
        "body": JSON.stringify({
            "firstname": "Nic",
            "lastname": "Raboy"
        }) 
      }, (error, response, body) => {
        if(error) {
            return context.dir(error);
        }
        resolve(body);
        context.dir(JSON.parse(body));
      }); 
      context.log('Post PostCall');
    });
  }
};
