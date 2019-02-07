module.exports = async function (context, myQueueItem) {
    context.log('JavaScript queue trigger function processed work item', myQueueItem);
    var smsRequest = require("request");
    var smsMsg = "Welcome to Ausgrid " + myQueueItem;

    smsRequest.post({
      "headers": { "content-type": "application/json", "Authorization": "Basic ZW1taXQua2FkYXlpZmNpOnNtc1Bhc3Mx", "Accept": "application/json" },
      "url": "http://api.messagenet.com.au/v2/message/simple_send",
      "body": JSON.stringify({
        "Message": smsMsg,
        "Recipient":"61433111696",
        "From":"Ausgrid Bot"    
      })
    }, (error, response, body) => {
      if(error) {
        return console.dir(error);
    }
    context.log("[" + body + "]" + smsMsg);

    context.bindings.outputTblStatus = [
      {
        PartitionKey: "Status",
        RowKey: "Send[0]",
        status: "[" + body + "]" + smsMsg,
        run_date: "07/02/2019"
      }
    ];
    context.done();

 /*
 From Postman

 Auth Key must be invalid
 Response => 401 Unauthorized
 Body =>
    {"message": "Authorization has been denied for this request." }
*/

  });      
};